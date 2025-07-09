import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(
    req: NextRequest,
    { params }: { params: { symbol: string } }
) {
    const { symbol } = params;

    try {
        // Perform Yahoo Finance search for the given symbol or query
        const searchResults = await yahooFinance.search(symbol);

        return NextResponse.json(searchResults, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch Yahoo Finance search data', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
