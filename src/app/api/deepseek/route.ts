// src/app/api/deepseek/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint: POST /api/deepseek
 * Body: { message: string }
 *
 * Notes:
 * - Set DEEPSEEK_API_KEY in your environment (e.g., .env.local or Vercel env vars).
 * - Optionally set DEEPSEEK_BASE_URL to the real Deepseek API base (default is a placeholder).
 * - Replace request/response shaping below to match the real Deepseek API spec.
 */

export async function POST(request: NextRequest) {
  try {
    const API_KEY = process.env.DEEPSEEK_API_KEY;
    const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.example/v1/query';

    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'DEEPSEEK_API_KEY تنظیم نشده است' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const message = body?.message;
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'فیلد message ضروری است' }, { status: 400 });
    }

    // Limit message length to avoid accidental huge payloads/costs
    const safeMessage = message.slice(0, 2000);

    // Example request shape — adapt to Deepseek's official API
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        input: safeMessage,
        // Add other parameters required by Deepseek (model, options, etc.)
      }),
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error('Deepseek API error', resp.status, text);
      return NextResponse.json(
        { success: false, error: 'خطا از سرویس Deepseek', details: text },
        { status: resp.status }
      );
    }

    // Try to parse JSON, otherwise return raw text
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    // Normalize commonly-used shapes (adjust according to Deepseek's spec)
    const normalized = data?.reply ?? data?.data ?? data;

    return NextResponse.json({ success: true, data: normalized });
  } catch (err) {
    console.error('/api/deepseek error:', err);
    return NextResponse.json({ success: false, error: 'خطای داخلی سرور' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'سالم', api: 'Deepseek proxy', timestamp: new Date().toISOString() });
}
