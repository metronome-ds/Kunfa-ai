/**
 * LBO Calculator API Route
 * POST endpoint for calculating LBO metrics and saving results
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateLBO, type LBOInputs } from '@/lib/calculators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate inputs
    const inputs: LBOInputs = {
      purchasePrice: body.purchasePrice,
      equityPercentage: body.equityPercentage,
      debtPercentage: body.debtPercentage,
      interestRate: body.interestRate,
      holdPeriodYears: body.holdPeriodYears,
      exitMultiple: body.exitMultiple,
      revenue: body.revenue,
      ebitdaMargin: body.ebitdaMargin,
      revenueGrowthRate: body.revenueGrowthRate,
    };

    // Validate that inputs are numbers
    if (
      typeof inputs.purchasePrice !== 'number' ||
      typeof inputs.equityPercentage !== 'number' ||
      typeof inputs.debtPercentage !== 'number' ||
      typeof inputs.interestRate !== 'number' ||
      typeof inputs.holdPeriodYears !== 'number' ||
      typeof inputs.exitMultiple !== 'number' ||
      typeof inputs.revenue !== 'number' ||
      typeof inputs.ebitdaMargin !== 'number' ||
      typeof inputs.revenueGrowthRate !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid input types. All fields must be numbers.' },
        { status: 400 },
      );
    }

    // Validate ranges
    if (
      inputs.purchasePrice <= 0 ||
      inputs.equityPercentage < 0 ||
      inputs.equityPercentage > 100 ||
      inputs.debtPercentage < 0 ||
      inputs.debtPercentage > 100 ||
      inputs.interestRate < 0 ||
      inputs.holdPeriodYears <= 0 ||
      inputs.exitMultiple <= 0 ||
      inputs.revenue <= 0 ||
      inputs.ebitdaMargin < 0 ||
      inputs.ebitdaMargin > 100 ||
      inputs.revenueGrowthRate < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid input values. Please check your inputs are within valid ranges.' },
        { status: 400 },
      );
    }

    // Check equity + debt = 100%
    if (Math.abs(inputs.equityPercentage + inputs.debtPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Equity and Debt percentages must sum to 100%.' },
        { status: 400 },
      );
    }

    // Calculate LBO
    const result = calculateLBO(inputs);

    return NextResponse.json({
      success: true,
      data: {
        inputs,
        result,
      },
    });
  } catch (error) {
    console.error('LBO calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate LBO metrics' },
      { status: 500 },
    );
  }
}
