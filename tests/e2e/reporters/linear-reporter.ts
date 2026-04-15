import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import path from 'path';

/**
 * Maps each test file to a Linear ticket identifier.
 * After all tests complete, the reporter aggregates results per ticket and
 * calls the Linear GraphQL API to update states and add comments.
 */
const TICKET_MAP: Record<string, string> = {
  '01-landing-page.spec.ts': 'KUN-112',
  '02-startup-dashboard.spec.ts': 'KUN-115',
  '03-investor-dashboard.spec.ts': 'KUN-115',
  '04-feature-gates.spec.ts': 'KUN-118',
  '05-services.spec.ts': 'KUN-115',
  '06-deal-room.spec.ts': 'KUN-115',
  '07-file-upload.spec.ts': 'KUN-116',
  '08-entity-switcher.spec.ts': 'KUN-112',
  '09-entity-creation.spec.ts': 'KUN-113',
  '10-entity-switching.spec.ts': 'KUN-114',
  '11-entity-edge-cases.spec.ts': 'KUN-117',
  '12-subscription-promo.spec.ts': 'KUN-118',
  '13-communities.spec.ts': 'KUN-115',
  '14-admin-panel.spec.ts': 'KUN-115',
};

interface TestFileResult {
  passed: number;
  failed: number;
  failures: { testName: string; error: string; screenshotPath?: string }[];
}

interface TicketAggregate {
  identifier: string;
  total: number;
  passed: number;
  failed: number;
  failures: { testName: string; error: string; screenshotPath?: string }[];
}

const LINEAR_API = 'https://api.linear.app/graphql';

async function linearQuery(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Linear API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

class LinearReporter implements Reporter {
  private results: Map<string, TestFileResult> = new Map();
  private apiKey: string | undefined;

  onBegin(_config: FullConfig, _suite: Suite) {
    this.apiKey = process.env.LINEAR_API_KEY;
    if (!this.apiKey) {
      console.log('[linear-reporter] LINEAR_API_KEY not set — will log results to console only.');
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const filePath = test.location.file;
    const fileName = path.basename(filePath);

    if (!this.results.has(fileName)) {
      this.results.set(fileName, { passed: 0, failed: 0, failures: [] });
    }
    const fileResult = this.results.get(fileName)!;

    if (result.status === 'passed') {
      fileResult.passed++;
    } else if (result.status === 'failed' || result.status === 'timedOut') {
      fileResult.failed++;
      const errorMessage = result.errors.map((e) => e.message || e.toString()).join('\n') || 'Unknown error';
      const screenshot = result.attachments.find((a) => a.name === 'screenshot')?.path;
      fileResult.failures.push({
        testName: test.title,
        error: errorMessage.substring(0, 500),
        screenshotPath: screenshot,
      });
    }
  }

  async onEnd(_result: FullResult) {
    // Aggregate results per ticket
    const tickets = new Map<string, TicketAggregate>();

    for (const [fileName, fileResult] of this.results) {
      const ticketId = TICKET_MAP[fileName];
      if (!ticketId) continue;

      if (!tickets.has(ticketId)) {
        tickets.set(ticketId, { identifier: ticketId, total: 0, passed: 0, failed: 0, failures: [] });
      }
      const agg = tickets.get(ticketId)!;
      agg.total += fileResult.passed + fileResult.failed;
      agg.passed += fileResult.passed;
      agg.failed += fileResult.failed;
      agg.failures.push(...fileResult.failures);
    }

    // Log summary
    const timestamp = new Date().toISOString();
    console.log(`\n[linear-reporter] Results summary (${timestamp}):`);
    for (const [ticketId, agg] of tickets) {
      const status = agg.failed === 0 ? 'PASS' : 'FAIL';
      console.log(`  ${ticketId}: ${status} (${agg.passed}/${agg.total} passed)`);
      if (agg.failures.length > 0) {
        for (const f of agg.failures) {
          console.log(`    - ${f.testName}: ${f.error.substring(0, 120)}`);
        }
      }
    }

    // If no API key, skip Linear updates
    if (!this.apiKey) {
      console.log('[linear-reporter] Skipping Linear API updates (no API key).');
      return;
    }

    // Get team workflow states (to find "Done" state)
    let doneStateId: string | null = null;
    try {
      const teamRes = await linearQuery(this.apiKey, `
        query {
          teams {
            nodes {
              id
              key
              states {
                nodes { id name type }
              }
            }
          }
        }
      `);
      const teams = teamRes.data?.teams?.nodes || [];
      for (const team of teams) {
        const doneState = team.states.nodes.find(
          (s: { name: string; type: string }) => s.type === 'completed' && s.name === 'Done',
        );
        if (doneState) {
          doneStateId = doneState.id;
          break;
        }
      }
    } catch (err) {
      console.error('[linear-reporter] Failed to fetch team states:', err);
      return;
    }

    // Update each ticket
    for (const [, agg] of tickets) {
      try {
        // Look up issue
        const issueRes = await linearQuery(this.apiKey, `
          query($id: String!) {
            issueVcsBranchSearch(branchName: $id) {
              id
              identifier
              state { name type }
            }
          }
        `, { id: agg.identifier });

        // Fall back to search by identifier
        let issueId: string | null = issueRes.data?.issueVcsBranchSearch?.id || null;
        if (!issueId) {
          const searchRes = await linearQuery(this.apiKey, `
            query($filter: IssueFilter) {
              issues(filter: $filter, first: 1) {
                nodes { id identifier state { name type } }
              }
            }
          `, {
            filter: {
              identifier: { eq: agg.identifier },
            },
          });
          issueId = searchRes.data?.issues?.nodes?.[0]?.id || null;
        }

        if (!issueId) {
          console.log(`[linear-reporter] Could not find issue ${agg.identifier} — skipping.`);
          continue;
        }

        if (agg.failed === 0) {
          // All passed — mark as Done + comment
          if (doneStateId) {
            await linearQuery(this.apiKey, `
              mutation($id: String!, $input: IssueUpdateInput!) {
                issueUpdate(id: $id, input: $input) { success }
              }
            `, { id: issueId, input: { stateId: doneStateId } });
          }

          await linearQuery(this.apiKey, `
            mutation($input: CommentCreateInput!) {
              commentCreate(input: $input) { success }
            }
          `, {
            input: {
              issueId,
              body: `All ${agg.total} tests passed. Automated via Playwright. ${timestamp}`,
            },
          });
          console.log(`[linear-reporter] ${agg.identifier}: marked as Done, comment added.`);
        } else {
          // Some failed — leave state, add failure comment
          const failLines = agg.failures
            .map((f) => `- **${f.testName}**: ${f.error.substring(0, 200)}`)
            .join('\n');
          const screenshotLines = agg.failures
            .filter((f) => f.screenshotPath)
            .map((f) => `- \`${f.screenshotPath}\``)
            .join('\n');

          let body = `${agg.failed}/${agg.total} tests failed. Automated via Playwright. ${timestamp}\n\n**Failed tests:**\n${failLines}`;
          if (screenshotLines) {
            body += `\n\n**Screenshot paths:**\n${screenshotLines}`;
          }

          await linearQuery(this.apiKey, `
            mutation($input: CommentCreateInput!) {
              commentCreate(input: $input) { success }
            }
          `, { input: { issueId, body } });
          console.log(`[linear-reporter] ${agg.identifier}: failure comment added.`);
        }
      } catch (err) {
        console.error(`[linear-reporter] Error updating ${agg.identifier}:`, err);
      }
    }
  }
}

export default LinearReporter;
