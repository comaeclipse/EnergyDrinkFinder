import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 1) {
      return NextResponse.json({ success: true, data: { drinks: [] } });
    }

    // Split query into words for smarter matching
    const words = query.trim().split(/\s+/);

    let whereCondition: any;

    if (words.length === 1) {
      // Single word: search in brand OR flavor
      whereCondition = {
        OR: [
          {
            brand: {
              contains: words[0],
              mode: 'insensitive',
            },
          },
          {
            flavor: {
              contains: words[0],
              mode: 'insensitive',
            },
          },
        ],
      };
    } else {
      // Multiple words: try brand + flavor matching
      // e.g., "monster ultra" -> brand contains "monster" AND flavor contains "ultra"
      const firstWord = words[0];
      const remainingWords = words.slice(1).join(' ');

      whereCondition = {
        OR: [
          // Match: first word in brand AND remaining words in flavor
          {
            AND: [
              {
                brand: {
                  contains: firstWord,
                  mode: 'insensitive',
                },
              },
              {
                flavor: {
                  contains: remainingWords,
                  mode: 'insensitive',
                },
              },
            ],
          },
          // Fallback: entire query in brand
          {
            brand: {
              contains: query,
              mode: 'insensitive',
            },
          },
          // Fallback: entire query in flavor
          {
            flavor: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    // Search for drinks matching the query
    const drinks = await prisma.energy_drinks.findMany({
      where: whereCondition,
      select: {
        id: true,
        brand: true,
        flavor: true,
        size_ml: true,
        caffeine_mg: true,
        image_url: true,
      },
      take: 20, // Increased from 10 to show more results
      orderBy: [
        {
          brand: 'asc',
        },
        {
          flavor: 'asc',
        },
      ],
    });

    return NextResponse.json({ success: true, data: { drinks } });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
