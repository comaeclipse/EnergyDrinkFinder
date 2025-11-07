import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all drinks with optional filtering and sorting
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brand = searchParams.get('brand');
    const sortBy = searchParams.get('sortBy') || 'brand';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const drinks = await prisma.energy_drinks.findMany({
      where: brand
        ? {
            brand: {
              contains: brand,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      data: { drinks },
    });
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drinks' },
      { status: 500 }
    );
  }
}

// POST - Create new drink
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, flavor, size_ml, caffeine_mg, barcode } = body;

    // Validation
    if (!brand || !flavor || !size_ml) {
      return NextResponse.json(
        { success: false, error: 'Brand, flavor, and size are required' },
        { status: 400 }
      );
    }

    const drink = await prisma.energy_drinks.create({
      data: {
        brand,
        flavor,
        size_ml: parseInt(size_ml),
        caffeine_mg: caffeine_mg ? parseInt(caffeine_mg) : null,
        barcode: barcode || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { drink },
    });
  } catch (error) {
    console.error('Error creating drink:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create drink' },
      { status: 500 }
    );
  }
}

// PUT - Update drink
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, brand, flavor, size_ml, caffeine_mg, barcode } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Drink ID is required' },
        { status: 400 }
      );
    }

    const drink = await prisma.energy_drinks.update({
      where: { id: parseInt(id) },
      data: {
        brand,
        flavor,
        size_ml: parseInt(size_ml),
        caffeine_mg: caffeine_mg ? parseInt(caffeine_mg) : null,
        barcode: barcode || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { drink },
    });
  } catch (error) {
    console.error('Error updating drink:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update drink' },
      { status: 500 }
    );
  }
}

// DELETE - Delete drink
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Drink ID is required' },
        { status: 400 }
      );
    }

    await prisma.energy_drinks.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Drink deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting drink:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete drink' },
      { status: 500 }
    );
  }
}
