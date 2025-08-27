import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the search params
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('apiUrl');
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    if (!baseUrl) {
      return NextResponse.json({ error: 'API URL is required' }, { status: 400 });
    }

    // Construct the full URL
    const url = `${baseUrl}${path}`;

    // Make the request to the API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer gKkzrOv5W5552YtMKON0nbIQe2aPw9MS'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}