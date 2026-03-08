import { NextRequest, NextResponse } from 'next/server';

/**
 * @route   GET /api/tracking/status
 * @desc    Get overall tracking system status
 * @access  Private (requires JWT)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'No token provided' },
        { status: 401 }
      );
    }

    // Forward to tracking service
    const response = await fetch('http://localhost:3003/tracking/status', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tracking status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tracking status',
        message: 'An error occurred while fetching tracking status',
      },
      { status: 500 }
    );
  }
}
