// Kunfa Bug Bot — Slack → Claude → Linear Pipeline
// Supabase Edge Function
// Deploy: supabase functions deploy slack-bug-bot --no-verify-jwt --project-ref akvjxobgnbbljmtvrlhk

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const LINEAR_API_KEY = Deno.env.get("LINEAR_API_KEY")!;
const LINEAR_TEAM_ID = "1df01333-a780-43db-bb2b-066cb950125b";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Replace these with your actual Slack channel IDs ──
const BUGS_CHANNEL_ID = Deno.env.get("BUGS_CHANNEL_ID") ?? "C0APD2M58E7";
const FEATURES_CHANNEL_ID = Deno.env.get("FEATURES_CHANNEL_ID") ?? "C0APP1X9N84";

const KUNFA_SYSTEM_PROMPT = `You are an expert QA engineer and product manager for Kunfa.AI — an AI-powered venture intelligence platform for the GCC region. Your job is to take raw, messy feedback messages (often from a non-technical user) and convert them into clean, structured tickets.

## About Kunfa
- **Stack**: Next.js 14 (App Router), Supabase (project: akvjxobgnbbljmtvrlhk), Vercel, Stripe, Resend
- **GitHub**: metronome-ds/Kunfa-ai
- **What it does**: Connects investors to investor-ready startups in the GCC. Helps founders get investor-ready.

## Core Features & Pages
- **Deal Room**: DocSend-style document sharing between founders and investors. Has sharing modal, document upload, viewer analytics.
- **Company Profiles**: Startup profiles with AI scoring engine, claim flow for founders to claim their company.
- **Investor Dashboard**: Deal flow management, saved companies, portfolio view, re-scoring triggers.
- **Search & Discovery**: Browse/search startups by sector, stage, geography. Filter and sort.
- **Team Management**: Multi-seat access for investment teams. Invite members, role management.
- **Auth System**: Supabase Auth — email confirmation, magic links, password reset. Role-based access (Investor, Founder, Admin).
- **Payments/Billing**: Stripe integration — subscriptions, billing portal, webhook handling.
- **Email Notifications**: Resend integration for transactional emails (welcome, invite, document shared, etc.).
- **Onboarding**: Multi-step onboarding for both investors and founders.
- **Admin Panel**: Platform management, user management, re-scoring, approvals.

## Database / Backend
- Supabase Postgres with Row Level Security (RLS) on all tables
- Key tables: companies, users, profiles, documents, deal_rooms, invitations, subscriptions, scores, teams, team_members
- Common RLS issues: policies not granting proper access for cross-role interactions (e.g., founder sharing to investor)
- Edge Functions for server-side logic
- Supabase Storage for document/file uploads

## User Roles
- **Investor**: Browses startups, views deal rooms, saves companies, manages team
- **Founder**: Claims company profile, uploads documents to deal room, manages pitch materials
- **Admin**: Platform management, scoring, approvals

## Common Bug Patterns
- 403 errors → Usually RLS policy issues
- Blank/loading pages → Usually data fetch failures or missing RLS grants
- Stripe errors → Webhook configuration, price ID mismatches, or subscription status checks
- Auth issues → Email confirmation flow, magic link expiry, session management
- Mobile responsiveness → Tailwind breakpoint issues, modal overflow

## Your Task
Given a raw message (and optionally a screenshot description), produce a JSON object with:
{
  "title": "Clear, specific title — [Feature Area] — [What's wrong/requested]",
  "description": "Structured description with context about what part of the platform this affects and why",
  "steps_to_reproduce": "If a bug: numbered steps to reproduce. If feature request: user story format.",
  "suspected_cause": "If a bug: your best guess at the technical root cause based on the platform architecture. If feature: leave empty.",
  "priority": "urgent | high | medium | low",
  "label": "Bug | Feature",
  "area": "Deal Room | Company Profiles | Investor Dashboard | Search & Discovery | Team Management | Auth | Payments | Email | Onboarding | Admin | Mobile UI | API | Other",
  "affected_role": "Investor | Founder | Admin | All",
  "platform": "Desktop | Mobile | Both | Unknown"
}

Be specific and contextual. Use your knowledge of the Kunfa architecture to infer what's likely going wrong. If the message is vague, still create a useful ticket but add "[Needs Clarification]" to the title.

RESPOND WITH ONLY THE JSON OBJECT. No markdown, no backticks, no explanation.`;

// ── Helpers ──

async function downloadSlackImage(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });
    if (!resp.ok) return "";
    const buf = await resp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return base64;
  } catch (e) {
    console.error("Failed to download image:", e);
    return "";
  }
}

async function callClaude(
  messageText: string,
  imageBase64: string | null,
  channelType: "bug" | "feature"
): Promise<Record<string, string>> {
  const userContent: Array<Record<string, unknown>> = [];

  if (imageBase64) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: imageBase64,
      },
    });
  }

  const contextPrefix =
    channelType === "bug"
      ? "This is a BUG REPORT from the #bugs channel."
      : "This is a FEATURE REQUEST from the #feature-requests channel.";

  userContent.push({
    type: "text",
    text: `${contextPrefix}\n\nRaw message from user:\n"${messageText}"\n\n${imageBase64 ? "A screenshot is attached above — analyze it for additional context about what page/feature is affected and any visible errors." : "No screenshot attached."}`,
  });

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: KUNFA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Claude API error:", resp.status, errText);
    throw new Error(`Claude API error: ${resp.status}`);
  }

  const data = await resp.json();
  const text = data.content
    .filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("");

  // Parse JSON — strip any accidental markdown fences
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(clean);
}

async function createLinearIssue(ticket: Record<string, string>) {
  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
  `;

  const description = [
    `**Area:** ${ticket.area || "Unknown"}`,
    `**Affected Role:** ${ticket.affected_role || "Unknown"}`,
    `**Platform:** ${ticket.platform || "Unknown"}`,
    `**Type:** ${ticket.label || "Bug"}`,
    "",
    "## Description",
    ticket.description || "",
    "",
    ticket.steps_to_reproduce ? `## Steps to Reproduce\n${ticket.steps_to_reproduce}` : "",
    "",
    ticket.suspected_cause ? `## Suspected Cause\n${ticket.suspected_cause}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const variables = {
    input: {
      teamId: LINEAR_TEAM_ID,
      title: ticket.title || "Untitled Issue",
      description,
      priority: priorityMap[ticket.priority] || 3,
    },
  };

  const resp = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Linear API error:", resp.status, errText);
    throw new Error(`Linear API error: ${resp.status}`);
  }

  const data = await resp.json();
  if (data.errors) {
    console.error("Linear GraphQL errors:", JSON.stringify(data.errors));
    throw new Error(`Linear GraphQL error: ${data.errors[0].message}`);
  }

  return data.data.issueCreate.issue;
}

async function postSlackReply(channel: string, threadTs: string, text: string) {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      thread_ts: threadTs,
      text,
    }),
  });
}

// ── Main Handler ──

Deno.serve(async (req) => {
  try {
    // Immediately reject Slack retries to prevent duplicate processing
    const retryNum = req.headers.get('X-Slack-Retry-Num');
    if (retryNum) {
      console.log('[SLACK BOT] Slack retry detected, skipping. Retry:', retryNum);
      return new Response('OK', { status: 200 });
    }

    const body = await req.json();

    // Slack URL verification challenge
    if (body.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only process message events
    if (body.type !== "event_callback" || !body.event) {
      return new Response("ok", { status: 200 });
    }

    const event = body.event;

    // Skip bot messages, message edits, and other subtypes
    if (event.subtype || event.bot_id) {
      return new Response("ok", { status: 200 });
    }

    // Only process messages from our target channels
    if (event.channel !== BUGS_CHANNEL_ID && event.channel !== FEATURES_CHANNEL_ID) {
      return new Response("ok", { status: 200 });
    }

    // Deduplicate events using persistent DB check
    const eventId = body.event_id || event.client_msg_id || event.ts;

    const { data: existing } = await supabaseClient
      .from('slack_event_log')
      .select('id')
      .eq('slack_event_id', eventId)
      .maybeSingle();

    if (existing) {
      console.log('[SLACK BOT] Duplicate event, skipping:', eventId);
      return new Response('OK', { status: 200 });
    }

    const channelType = event.channel === BUGS_CHANNEL_ID ? "bug" : "feature";
    const messageText = event.text || "";

    // Check for image attachments
    let imageBase64: string | null = null;
    if (event.files && event.files.length > 0) {
      const imageFile = event.files.find(
        (f: { mimetype: string }) =>
          f.mimetype && f.mimetype.startsWith("image/")
      );
      if (imageFile) {
        const url = imageFile.url_private || imageFile.url_private_download;
        if (url) {
          imageBase64 = await downloadSlackImage(url);
          if (!imageBase64) imageBase64 = null;
        }
      }
    }

    // Call Claude to format the ticket
    console.log(`Processing ${channelType} from channel ${event.channel}: "${messageText}"`);
    const ticket = await callClaude(messageText, imageBase64, channelType);
    console.log("Claude ticket:", JSON.stringify(ticket));

    // Create Linear issue
    const issue = await createLinearIssue(ticket);
    console.log("Linear issue created:", issue.identifier, issue.url);

    // Log event to prevent future duplicates
    await supabaseClient.from('slack_event_log').insert({
      slack_event_id: eventId,
      slack_message_ts: event.ts,
      channel_id: event.channel,
      linear_issue_id: issue.id || issue.identifier,
    });

    // Reply in Slack thread
    await postSlackReply(
      event.channel,
      event.ts,
      `✅ Ticket created: *${issue.identifier}* — ${ticket.title}\n🔗 ${issue.url}`
    );

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Error processing event:", err);
    return new Response("error", { status: 200 }); // Return 200 to prevent Slack retries
  }
});
