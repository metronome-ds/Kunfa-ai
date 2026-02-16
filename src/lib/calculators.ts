/**
 * Financial calculators library
 * Comprehensive financial calculation functions for LBO, Valuation, and Due Diligence
 */

/**
 * LBO Calculator
 */
export interface LBOInputs {
  purchasePrice: number;
  equityPercentage: number;
  debtPercentage: number;
  interestRate: number;
  holdPeriodYears: number;
  exitMultiple: number;
  revenue: number;
  ebitdaMargin: number;
  revenueGrowthRate: number;
}

export interface LBOResult {
  totalDebt: number;
  equityInvested: number;
  annualEBITDA: number;
  debtSchedule: DebtScheduleItem[];
  exitEnterpriseValue: number;
  exitEquityValue: number;
  moic: number;
  irr: number;
}

export interface DebtScheduleItem {
  year: number;
  beginningDebt: number;
  interestExpense: number;
  ebitda: number;
  debtPaydown: number;
  endingDebt: number;
}

/**
 * Calculate LBO metrics
 */
export function calculateLBO(inputs: LBOInputs): LBOResult {
  const { purchasePrice, equityPercentage, debtPercentage, interestRate, holdPeriodYears, exitMultiple, revenue, ebitdaMargin, revenueGrowthRate } = inputs;

  // Calculate initial capital structure
  const totalDebt = purchasePrice * (debtPercentage / 100);
  const equityInvested = purchasePrice * (equityPercentage / 100);
  const annualEBITDA = revenue * (ebitdaMargin / 100);

  // Build debt schedule
  const debtSchedule: DebtScheduleItem[] = [];
  let currentDebt = totalDebt;
  let currentRevenue = revenue;
  let currentEBITDA = annualEBITDA;

  for (let year = 1; year <= holdPeriodYears; year++) {
    const beginningDebt = currentDebt;
    const interestExpense = currentDebt * (interestRate / 100);
    const ebitda = currentEBITDA;

    // Calculate available for debt paydown (simplified: EBITDA - Interest)
    // In real models, would deduct taxes, capex, working capital, etc.
    const availableForDebtPaydown = Math.max(0, ebitda - interestExpense);
    const debtPaydown = Math.min(availableForDebtPaydown, currentDebt);
    const endingDebt = currentDebt - debtPaydown;

    debtSchedule.push({
      year,
      beginningDebt,
      interestExpense,
      ebitda,
      debtPaydown,
      endingDebt,
    });

    // Grow revenue and EBITDA for next year
    currentRevenue *= 1 + revenueGrowthRate / 100;
    currentEBITDA = currentRevenue * (ebitdaMargin / 100);
    currentDebt = endingDebt;
  }

  // Calculate exit values
  const finalYearEBITDA = debtSchedule[debtSchedule.length - 1].ebitda;
  const exitEnterpriseValue = finalYearEBITDA * exitMultiple;
  const exitEquityValue = exitEnterpriseValue - debtSchedule[debtSchedule.length - 1].endingDebt;

  // Calculate MOIC
  const moic = exitEquityValue / equityInvested;

  // Calculate IRR using Newton's method
  const irr = calculateIRR([{ year: 0, cashFlow: -equityInvested }, { year: holdPeriodYears, cashFlow: exitEquityValue }]);

  return {
    totalDebt,
    equityInvested,
    annualEBITDA,
    debtSchedule,
    exitEnterpriseValue,
    exitEquityValue,
    moic,
    irr,
  };
}

/**
 * Calculate IRR using Newton's method
 * IRR is the discount rate where NPV = 0
 */
function calculateIRR(cashFlows: { year: number; cashFlow: number }[], initialGuess: number = 0.1, tolerance: number = 0.0001, maxIterations: number = 100): number {
  let rate = initialGuess;

  for (let i = 0; i < maxIterations; i++) {
    // Calculate NPV and its derivative
    let npv = 0;
    let npvDerivative = 0;

    for (const cf of cashFlows) {
      const discountFactor = Math.pow(1 + rate, cf.year);
      npv += cf.cashFlow / discountFactor;
      npvDerivative -= (cf.year * cf.cashFlow) / Math.pow(1 + rate, cf.year + 1);
    }

    // Newton's method: rate_new = rate_old - NPV / NPV'
    const rateNew = rate - npv / npvDerivative;

    // Check for convergence
    if (Math.abs(rateNew - rate) < tolerance) {
      return rateNew * 100; // Convert to percentage
    }

    rate = rateNew;
  }

  return rate * 100; // Convert to percentage
}

/**
 * Valuation Calculator - DCF Method
 */
export interface DCFInputs {
  projectedCashFlows: number[]; // 5 years of projected cash flows
  discountRate: number; // WACC
  terminalGrowthRate: number;
}

export interface DCFResult {
  pvCashFlows: number[];
  sumPVCashFlows: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
}

/**
 * Calculate DCF valuation
 */
export function calculateDCF(inputs: DCFInputs): DCFResult {
  const { projectedCashFlows, discountRate, terminalGrowthRate } = inputs;
  const discountRateDecimal = discountRate / 100;
  const terminalGrowthRateDecimal = terminalGrowthRate / 100;

  // Calculate PV of projected cash flows
  const pvCashFlows = projectedCashFlows.map((cf, year) => {
    const discountFactor = Math.pow(1 + discountRateDecimal, year + 1);
    return cf / discountFactor;
  });

  const sumPVCashFlows = pvCashFlows.reduce((a, b) => a + b, 0);

  // Calculate terminal value
  const lastCashFlow = projectedCashFlows[projectedCashFlows.length - 1];
  const terminalValue = (lastCashFlow * (1 + terminalGrowthRateDecimal)) / (discountRateDecimal - terminalGrowthRateDecimal);

  // Calculate PV of terminal value
  const discountFactorTerminal = Math.pow(1 + discountRateDecimal, projectedCashFlows.length);
  const pvTerminalValue = terminalValue / discountFactorTerminal;

  // Enterprise value
  const enterpriseValue = sumPVCashFlows + pvTerminalValue;

  return {
    pvCashFlows,
    sumPVCashFlows,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
  };
}

/**
 * Valuation Calculator - Comparable Companies (Comps)
 */
export interface CompsInputs {
  revenue: number;
  ebitda: number;
  evRevenueMultiple: number;
  evEbitdaMultiple: number;
}

export interface CompsResult {
  valuationByRevenue: number;
  valuationByEBITDA: number;
  averageValuation: number;
}

/**
 * Calculate valuation using comparable companies method
 */
export function calculateComps(inputs: CompsInputs): CompsResult {
  const { revenue, ebitda, evRevenueMultiple, evEbitdaMultiple } = inputs;

  const valuationByRevenue = revenue * evRevenueMultiple;
  const valuationByEBITDA = ebitda * evEbitdaMultiple;
  const averageValuation = (valuationByRevenue + valuationByEBITDA) / 2;

  return {
    valuationByRevenue,
    valuationByEBITDA,
    averageValuation,
  };
}

/**
 * Valuation Calculator - Venture Capital Method
 */
export interface VCMethodInputs {
  expectedExitValue: number;
  targetReturnMultiple: number;
  timeToExitYears: number;
}

export interface VCMethodResult {
  preMoneyValuation: number;
  postMoneyValuation: number;
  requiredFundingAmount: number;
  equityStake: number;
}

/**
 * Calculate valuation using venture capital method
 */
export function calculateVCMethod(inputs: VCMethodInputs): VCMethodResult {
  const { expectedExitValue, targetReturnMultiple, timeToExitYears } = inputs;

  // Post-money valuation at time of exit
  const postMoneyValuationAtExit = expectedExitValue;

  // Post-money valuation today using return multiple
  // We need to find the post-money such that: (Exit Value / Post-Money) = Return Multiple
  // But we don't have investment amount yet, so we'll calculate based on typical assumptions
  const postMoneyValuation = expectedExitValue / targetReturnMultiple;

  // Pre-money valuation (assuming typical 20% equity stake for early investment)
  // In VC method: Post-Money = Pre-Money + Investment
  // Typical early-stage investment takes 20-25% stake
  const equityStake = 0.2; // 20% typical early stage
  const requiredFundingAmount = postMoneyValuation * equityStake;
  const preMoneyValuation = postMoneyValuation - requiredFundingAmount;

  return {
    preMoneyValuation: Math.max(0, preMoneyValuation),
    postMoneyValuation,
    requiredFundingAmount,
    equityStake: equityStake * 100,
  };
}

/**
 * Due Diligence Helper
 */
export interface DDItem {
  id: string;
  category: 'Financial' | 'Legal' | 'Operational' | 'Commercial' | 'Technical';
  itemName: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

/**
 * Get due diligence checklist items
 */
export function getDueDiligenceChecklist(): DDItem[] {
  return [
    // Financial DD
    {
      id: 'fin-1',
      category: 'Financial',
      itemName: 'Revenue and EBITDA Verification',
      description: 'Verify historical revenue, EBITDA, and growth rates from audited financial statements',
      priority: 'high',
      completed: false,
    },
    {
      id: 'fin-2',
      category: 'Financial',
      itemName: 'Cash Flow Analysis',
      description: 'Analyze operating, investing, and financing cash flows over past 3 years',
      priority: 'high',
      completed: false,
    },
    {
      id: 'fin-3',
      category: 'Financial',
      itemName: 'Balance Sheet Review',
      description: 'Review assets, liabilities, equity structure and off-balance sheet items',
      priority: 'high',
      completed: false,
    },
    {
      id: 'fin-4',
      category: 'Financial',
      itemName: 'Accounts Receivable Aging',
      description: 'Analyze quality of receivables and bad debt provisions',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'fin-5',
      category: 'Financial',
      itemName: 'Debt and Covenants',
      description: 'Review all debt instruments, covenants, and refinancing requirements',
      priority: 'high',
      completed: false,
    },
    {
      id: 'fin-6',
      category: 'Financial',
      itemName: 'Tax Returns and Compliance',
      description: 'Review last 3 years of tax returns, tax disputes, and contingent liabilities',
      priority: 'high',
      completed: false,
    },
    {
      id: 'fin-7',
      category: 'Financial',
      itemName: 'Accounting Policies',
      description: 'Review accounting policies, estimates, and any accounting changes',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'fin-8',
      category: 'Financial',
      itemName: 'Management Accounts',
      description: 'Review monthly management accounts, variance analysis, and forecasts',
      priority: 'medium',
      completed: false,
    },

    // Legal DD
    {
      id: 'legal-1',
      category: 'Legal',
      itemName: 'Corporate Structure',
      description: 'Verify corporate organization, ownership structure, and cap table',
      priority: 'high',
      completed: false,
    },
    {
      id: 'legal-2',
      category: 'Legal',
      itemName: 'Articles of Incorporation',
      description: 'Review charter documents, bylaws, and governance documents',
      priority: 'high',
      completed: false,
    },
    {
      id: 'legal-3',
      category: 'Legal',
      itemName: 'Material Contracts',
      description: 'Review key customer, supplier, and employment contracts',
      priority: 'high',
      completed: false,
    },
    {
      id: 'legal-4',
      category: 'Legal',
      itemName: 'Litigation and Claims',
      description: 'Identify any pending or threatened litigation, arbitration, or claims',
      priority: 'high',
      completed: false,
    },
    {
      id: 'legal-5',
      category: 'Legal',
      itemName: 'Intellectual Property',
      description: 'Verify ownership of patents, trademarks, copyrights, and trade secrets',
      priority: 'high',
      completed: false,
    },
    {
      id: 'legal-6',
      category: 'Legal',
      itemName: 'Regulatory Compliance',
      description: 'Review compliance with industry regulations, licenses, and permits',
      priority: 'high',
      completed: false,
    },
    {
      id: 'legal-7',
      category: 'Legal',
      itemName: 'Insurance Policies',
      description: 'Review all insurance policies, coverage, and claims history',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'legal-8',
      category: 'Legal',
      itemName: 'Employment Agreements',
      description: 'Review management and key employee agreements, non-competes, and severance',
      priority: 'medium',
      completed: false,
    },

    // Operational DD
    {
      id: 'ops-1',
      category: 'Operational',
      itemName: 'Production Capacity',
      description: 'Assess current capacity utilization and ability to scale production',
      priority: 'high',
      completed: false,
    },
    {
      id: 'ops-2',
      category: 'Operational',
      itemName: 'Supply Chain',
      description: 'Review supplier relationships, concentration, and supply chain resilience',
      priority: 'high',
      completed: false,
    },
    {
      id: 'ops-3',
      category: 'Operational',
      itemName: 'Operations Facilities',
      description: 'Inspect facilities, equipment, technology, and capital expenditure needs',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'ops-4',
      category: 'Operational',
      itemName: 'Management Team',
      description: 'Assess management depth, experience, and bench strength',
      priority: 'high',
      completed: false,
    },
    {
      id: 'ops-5',
      category: 'Operational',
      itemName: 'Key Person Dependencies',
      description: 'Identify critical people and succession plans',
      priority: 'high',
      completed: false,
    },
    {
      id: 'ops-6',
      category: 'Operational',
      itemName: 'Operating Systems',
      description: 'Review IT systems, software, and business process automation',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'ops-7',
      category: 'Operational',
      itemName: 'Environmental Health and Safety',
      description: 'Review EHS practices, compliance, and incident history',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'ops-8',
      category: 'Operational',
      itemName: 'Quality Control',
      description: 'Assess quality standards, customer satisfaction, and warranty issues',
      priority: 'medium',
      completed: false,
    },

    // Commercial DD
    {
      id: 'comm-1',
      category: 'Commercial',
      itemName: 'Customer Concentration',
      description: 'Analyze customer concentration risk and top customer relationships',
      priority: 'high',
      completed: false,
    },
    {
      id: 'comm-2',
      category: 'Commercial',
      itemName: 'Customer Retention',
      description: 'Review customer churn rates, renewal rates, and customer satisfaction',
      priority: 'high',
      completed: false,
    },
    {
      id: 'comm-3',
      category: 'Commercial',
      itemName: 'Market Position',
      description: 'Assess competitive position, market share, and growth opportunities',
      priority: 'high',
      completed: false,
    },
    {
      id: 'comm-4',
      category: 'Commercial',
      itemName: 'Pricing and Margins',
      description: 'Review pricing strategy, gross margins, and pricing power',
      priority: 'high',
      completed: false,
    },
    {
      id: 'comm-5',
      category: 'Commercial',
      itemName: 'Sales and Marketing',
      description: 'Review sales channel strategy, customer acquisition cost, and LTV',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'comm-6',
      category: 'Commercial',
      itemName: 'Product Roadmap',
      description: 'Review product development plans and innovation pipeline',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'comm-7',
      category: 'Commercial',
      itemName: 'Brand and Reputation',
      description: 'Assess brand value, customer perception, and online reputation',
      priority: 'low',
      completed: false,
    },
    {
      id: 'comm-8',
      category: 'Commercial',
      itemName: 'Distribution Channels',
      description: 'Review distribution partners, channel economics, and concentration',
      priority: 'medium',
      completed: false,
    },

    // Technical DD
    {
      id: 'tech-1',
      category: 'Technical',
      itemName: 'Technology Stack',
      description: 'Review core technology, architecture, and technology choices',
      priority: 'high',
      completed: false,
    },
    {
      id: 'tech-2',
      category: 'Technical',
      itemName: 'Data Security',
      description: 'Assess data security practices, encryption, and compliance (GDPR, HIPAA)',
      priority: 'high',
      completed: false,
    },
    {
      id: 'tech-3',
      category: 'Technical',
      itemName: 'System Architecture',
      description: 'Review system architecture, scalability, and performance',
      priority: 'high',
      completed: false,
    },
    {
      id: 'tech-4',
      category: 'Technical',
      itemName: 'Development Practices',
      description: 'Review code quality, testing, CI/CD pipelines, and deployment practices',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'tech-5',
      category: 'Technical',
      itemName: 'Third-Party Integrations',
      description: 'Identify dependencies on third-party services and vendor risk',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'tech-6',
      category: 'Technical',
      itemName: 'Disaster Recovery',
      description: 'Review backup and disaster recovery procedures',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'tech-7',
      category: 'Technical',
      itemName: 'Intellectual Property Tech',
      description: 'Verify ownership of source code, proprietary algorithms, and databases',
      priority: 'high',
      completed: false,
    },
    {
      id: 'tech-8',
      category: 'Technical',
      itemName: 'Technical Debt',
      description: 'Assess accumulated technical debt and remediation plans',
      priority: 'medium',
      completed: false,
    },
  ];
}

/**
 * Sensitivity Analysis Helper
 */
export interface SensitivityResult {
  exitMultiple: number;
  growthRate: number;
  moic: number;
  irr: number;
}

/**
 * Calculate sensitivity analysis for LBO model
 */
export function calculateSensitivityAnalysis(baseInputs: LBOInputs, exitMultipleRange: number[] = [4, 5, 6, 7, 8], growthRateRange: number[] = [5, 10, 15, 20, 25]): SensitivityResult[] {
  const results: SensitivityResult[] = [];

  for (const growthRate of growthRateRange) {
    for (const exitMultiple of exitMultipleRange) {
      const modifiedInputs = {
        ...baseInputs,
        exitMultiple,
        revenueGrowthRate: growthRate,
      };

      const lboResult = calculateLBO(modifiedInputs);

      results.push({
        exitMultiple,
        growthRate,
        moic: lboResult.moic,
        irr: lboResult.irr,
      });
    }
  }

  return results;
}
