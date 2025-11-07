import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 1) {
      return NextResponse.json({ drinks: [] });
    }

    // Search for drinks matching the query in brand or flavor
    const drinks = await prisma.energy_drinks.findMany({
      where: {
        OR: [
          {
            brand: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            flavor: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        brand: true,
        flavor: true,
        size_ml: true,
        caffeine_mg: true,
        image_url: true,
      },
      take: 10,
      orderBy: {
        brand: 'asc',
      },
    });

    return NextResponse.json({ drinks });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
