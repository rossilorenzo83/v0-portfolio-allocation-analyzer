import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// For App Router (Next.js 13+)
export async function GET(
    req: NextRequest,
    { params }: { params: { symbol: string } }
) {
    const { symbol } = await params;

    try {
        // Fetch quote data from yahoo-finance2 (runs server-side, no CORS issues)
        const quote = await yahooFinance.quote(symbol);

        return NextResponse.json(quote, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch Yahoo Finance data', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}