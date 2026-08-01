// src/app/api/assessment/answer/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AssessmentRequest {
  question: string;
  userAnswer: string;
  context?: string;
  language?: 'fa' | 'en';
}

interface AnalysisResponse {
  correctness_score: number;
  reasoning_quality_score: number;
  feedback: string;
  explanation: string;
  misconceptions: string[];
  next_steps: string[];
}

export async function POST(request: NextRequest) {
  try {
    // تحقق از API Key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API Key تنظیم نشده است' },
        { status: 500 }
      );
    }

    // دریافت داده‌های درخواست
    const body: AssessmentRequest = await request.json();
    const { question, userAnswer, context = '', language = 'fa' } = body;

    // تحقق از ورودی‌ها
    if (!question || !userAnswer) {
      return NextResponse.json(
        { error: 'سوال و پاسخ ضروری است' },
        { status: 400 }
      );
    }

    // ساخت پیام برای Claude
    const systemPrompt = `شما یک معلم و متخصص ارزیابی هستید. 
وظیفه شما تحلیل پاسخ دانشجو به سوال داده شده است.
باید:
1. درستی پاسخ را بررسی کنید (0-100)
2. کیفیت استدلال را ارزیابی کنید (0-100)
3. بازخورد مختصر فارسی بدهید
4. توضیح تفصیلی بدهید
5. اشتباهات مفهومی را شناسایی کنید
6. قدم‌های بعدی برای یادگیری پیشنهاد دهید

خروجی باید JSON باشد.`;

    const userPrompt = `
سوال: ${question}

${context ? `متن پیشینه:\n${context}\n` : ''}

پاسخ دانشجو:
${userAnswer}

لطفاً تحلیل کامل بدهید و خروجی را به این فرمت JSON بدهید:
{
  "correctness_score": عدد 0-100,
  "reasoning_quality_score": عدد 0-100,
  "feedback": "بازخورد مختصر",
  "explanation": "توضیح تفصیلی",
  "misconceptions": ["اشتباه 1", "اشتباه 2"],
  "next_steps": ["قدم 1", "قدم 2"]
}`;

    // فراخوانی Claude API
    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // استخراج متن پاسخ
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // تجزیه JSON
    let analysisData: AnalysisResponse;
    try {
      // پاک‌سازی متن (حذف markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON تشخیص داده نشد');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('خطا در تجزیه JSON:', parseError);
      // بازگشت پاسخ اصلی اگر JSON نتوانست تجزیه شود
      analysisData = {
        correctness_score: 50,
        reasoning_quality_score: 50,
        feedback: 'تحلیل انجام شد اما JSON تجزیه نشد',
        explanation: responseText,
        misconceptions: [],
        next_steps: ['مجدداً سعی کنید'],
      };
    }

    // بازگشت نتیجه
    return NextResponse.json({
      success: true,
      analysis: analysisData,
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'claude-opus-4-1',
        language,
      },
    });
  } catch (error) {
    console.error('خطا در API:', error);

    // تفکیک خطاهای مختلف
    let errorMessage = 'خطای داخلی سرور';
    let statusCode = 500;

    if (error instanceof Anthropic.AuthenticationError) {
      errorMessage = 'خطای احراز هویت API';
      statusCode = 401;
    } else if (error instanceof Anthropic.RateLimitError) {
      errorMessage = 'تعداد درخواست‌ها بیش از حد است';
      statusCode = 429;
    } else if (error instanceof Anthropic.APIError) {
      errorMessage = `خطای API: ${error.message}`;
      statusCode = 500;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: statusCode }
    );
  }
}

// GET endpoint برای سلامتی بررسی
export async function GET() {
  return NextResponse.json({
    status: 'سالم',
    api: 'Assessment API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
