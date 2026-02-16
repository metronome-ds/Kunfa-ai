/**
 * Valuation Calculator API Route
 * POST endpoint for calculating valuations using multiple methods
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDCF,
  calculateComps,
  calculateVCMethod,
  type DCFInputs,
  type CompsInputs,
  type VCMethodInputs,
} from '@/lib/calculators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method } = body;

    if (!method || !['dcf', 'comps', 'vc'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid method. Must be one of: dcf, comps, vc' },
        { status: 400 },
      );
    }

    if (method === 'dcf') {
      const inputs: DCFInputs = {
        projectedCashFlows: body.projectedCashFlows,
        discountRate: body.discountRate,
        terminalGrowthRate: body.terminalGrowthRate,
      };

      // Validate inputs
      if (
        !Array.isArray(inputs.projectedCashFlows) ||
        inputs.projectedCashFlows.length !== 5 ||
        !inputs.projectedCashFlows.every((cf) => typeof cf === 'number' && cf > 0) ||
        typeof inputs.discountRate !== 'number' ||
        inputs.discountRate <= 0 ||
        typeof inputs.terminalGrowthRate !== 'number' ||
        inputs.terminalGrowthRate < 0
      ) {
        return NextResponse.json(
          { error: 'Invalid DCF inputs. Check cash flows are positive and rates are valid.' },
          { status: 400 },
        );
      }

      const result = calculateDCF(inputs);
      return NextResponse.json({
        success: true,
        method: 'dcf',
        data: {
          inputs,
          result,
        },
      });
    }

    if (method === 'comps') {
      const inputs: CompsInputs = {
        revenue: body.revenue,
        ebitda: body.ebitda,
        evRevenueMultiple: body.evRevenueMultiple,
        evEbitdaMultiple: body.evEbitdaMultiple,
      };

      // Validate inputs
      if (
        typeof inputs.revenue !== 'number' ||
        inputs.revenue <= 0 ||
        typeof inputs.ebitda !== 'number' ||
        inputs.ebitda <= 0 ||
        typeof inputs.evRevenueMultiple !== 'number' ||
        inputs.evRevenueMultiple <= 0 ||
        typeof inputs.evEbitdaMultiple !== 'number' ||
        inputs.evEbitdaMultiple <= 0
      ) {
        return NextResponse.json(
          { error: 'Invalid Comps inputs. All values must be positive numbers.' },
          { status: 400 },
        );
      }

      const result = calculateComps(inputs);
      return NextResponse.json({
        success: true,
        method: 'comps',
        data: {
          inputs,
          result,
        },
      });
    }

    if (method === 'vc') {
      const inputs: VCMethodInputs = {
        expectedExitValue: body.expectedExitValue,
        targetReturnMultiple: body.targetReturnMultiple,
        timeToExitYears: body.timeToExitYears,
      };

      // Validate inputs
      if (
        typeof inputs.expectedExitValue !== 'number' ||
        inputs.expectedExitValue <= 0 ||
        typeof inputs.targetReturnMultiple !== 'number' ||
        inputs.targetReturnMultiple <= 0 ||
        typeof inputs.timeToExitYears !== 'number' ||
        inputs.timeToExitYears <= 0
      ) {
        return NextResponse.json(
          { error: 'Invalid VC Method inputs. All values must be positive numbers.' },
          { status: 400 },
        );
      }

      const result = calculateVCMethod(inputs);
      return NextResponse.json({
        success: true,
        method: 'vc',
        data: {
          inputs,
          result,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Valuation calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate valuation' },
      { status: 500 },
    );
  }
}
