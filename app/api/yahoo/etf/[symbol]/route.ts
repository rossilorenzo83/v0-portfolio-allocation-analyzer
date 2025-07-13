import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(
    req: NextRequest,
    { params }: { params: { symbol: string } }
) {
    const { symbol } = await params;

    try {
        const modules = await yahooFinance.quoteSummary(symbol, {
            modules: ['topHoldings', 'fundProfile', 'summaryProfile'],
        });
        return NextResponse.json(modules, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch ETF composition', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
