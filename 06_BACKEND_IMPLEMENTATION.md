# Backend API Implementation
## Next.js API Routes + Services

---

## 1. API Routes Structure

### 1.1 Authentication Routes

```typescript
// src/app/api/auth/login/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcrypt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Check user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = generateToken();
    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token: sessionToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date() })
      .eq('id', user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
        },
        session: sessionToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}
```

### 1.2 Assessment Routes

```typescript
// src/app/api/assessment/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAdaptiveQuestion } from '@/services/ai/question-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, domainId } = await request.json();

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        domain_id: domainId,
        start_time: new Date(),
        status: 'in_progress',
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Get user's knowledge profile
    const { data: userKnowledge } = await supabase
      .from('user_knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .in(
        'node_id',
        await getNodesInDomain(domainId)
      );

    // Get domain knowledge graph
    const { data: nodes } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('domain_id', domainId);

    // Generate first question
    const firstQuestion = await generateAdaptiveQuestion({
      userId,
      domainId,
      userKnowledge: userKnowledge || [],
      availableNodes: nodes || [],
      sessionHistory: [],
    });

    // Store question
    const { data: questionRecord } = await supabase
      .from('assessment_questions')
      .insert({
        session_id: session.id,
        node_id: firstQuestion.nodeId,
        question_text_fa: firstQuestion.questionText,
        question_type: firstQuestion.type,
        difficulty_level: firstQuestion.difficulty,
        generated_by: 'ai_adaptive',
        question_order: 0,
      })
      .select()
      .single();

    return NextResponse.json({
      sessionId: session.id,
      question: {
        id: questionRecord?.id,
        text: firstQuestion.questionText,
        type: firstQuestion.type,
        hint: firstQuestion.hint,
      },
      progress: {
        questionNumber: 1,
        totalQuestions: 10, // default
      },
    });
  } catch (error) {
    console.error('Assessment start error:', error);
    return NextResponse.json(
      { error: 'Failed to start assessment' },
      { status: 500 }
    );
  }
}

async function getNodesInDomain(domainId: string): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('knowledge_nodes')
    .select('id')
    .eq('domain_id', domainId);

  return data?.map(n => n.id) || [];
}
```

### 1.3 Answer Submission Route

```typescript
// src/app/api/assessment/answer/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeAnswer } from '@/services/ai/answer-analyzer';
import { scoreAnswer } from '@/services/knowledge/knowledge-scorer';
import { detectMisconceptions } from '@/services/ai/misconception-detector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { questionId, answer, timeToAnswer } = await request.json();

    // Store answer
    const { data: answerRecord, error: answerError } = await supabase
      .from('user_answers')
      .insert({
        question_id: questionId,
        answer_text_fa: answer,
        time_to_answer_seconds: timeToAnswer,
        submitted_at: new Date(),
      })
      .select()
      .single();

    if (answerError) throw answerError;

    // Get question details
    const { data: question } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    // Analyze answer using Claude API
    const analysis = await analyzeAnswer({
      question: question?.question_text_fa,
      answer,
      correctAnswer: question?.correct_answer_summary,
    });

    // Score the answer
    const scores = scoreAnswer({
      analysis,
      difficulty: question?.difficulty_level,
    });

    // Detect misconceptions
    const misconceptions = await detectMisconceptions({
      analysis,
      answer,
      nodeId: question?.node_id,
    });

    // Update answer record with analysis
    await supabase
      .from('user_answers')
      .update({
        correctness_score: scores.correctness,
        reasoning_quality_score: scores.reasoning,
        feedback_fa: analysis.feedback,
        explanation_fa: analysis.explanation,
        detected_misconceptions: misconceptions,
        ai_analysis: analysis.raw,
      })
      .eq('id', answerRecord?.id);

    // Update user's knowledge node
    await updateUserKnowledge(
      question?.node_id,
      scores,
      misconceptions
    );

    return NextResponse.json({
      analysis: {
        correctness_score: scores.correctness,
        reasoning_score: scores.reasoning,
        misconceptions_found: misconceptions,
        feedback_fa: analysis.feedback,
        explanation_fa: analysis.explanation,
        next_steps: analysis.nextSteps,
      },
      mastery_update: {
        previous_score: 0, // fetch from DB
        new_score: scores.correctness,
        delta: scores.correctness,
      },
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process answer' },
      { status: 500 }
    );
  }
}

async function updateUserKnowledge(
  nodeId: string,
  scores: { correctness: number; reasoning: number },
  misconceptions: any[]
) {
  // Logic to update user_knowledge_nodes and misconceptions
}
```

### 1.4 Knowledge Graph Route

```typescript
// src/app/api/knowledge-graph/[domain]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get all nodes in domain
    const { data: nodes } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('domain_id', params.domain);

    // Get relationships
    const { data: relationships } = await supabase
      .from('knowledge_relationships')
      .select('*')
      .in('source_node_id', nodes?.map(n => n.id) || []);

    // Get user's knowledge for each node
    const { data: userKnowledge } = await supabase
      .from('user_knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .in('node_id', nodes?.map(n => n.id) || []);

    // Convert to React Flow format
    const graphNodes = nodes?.map(node => {
      const userNode = userKnowledge?.find(uk => uk.node_id === node.id);
      return {
        id: node.id,
        data: {
          label: node.name_fa,
          masteryScore: userNode?.mastery_score || 0,
          difficulty: node.difficulty,
        },
        position: { x: 0, y: 0 }, // Calculated by layout algorithm
      };
    });

    const graphEdges = relationships?.map(rel => ({
      id: `${rel.source_node_id}-${rel.target_node_id}`,
      source: rel.source_node_id,
      target: rel.target_node_id,
      data: { type: rel.relationship_type },
    }));

    return NextResponse.json({
      nodes: graphNodes,
      edges: graphEdges,
    });
  } catch (error) {
    console.error('Knowledge graph fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph' },
      { status: 500 }
    );
  }
}
```

### 1.5 Recommendations Route

```typescript
// src/app/api/recommendations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/services/recommendations/recommender';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const recommendations = await getRecommendations({
      userId,
      limit: 10,
    });

    return NextResponse.json({
      recommendations: recommendations.map(rec => ({
        id: rec.id,
        resource: {
          title_fa: rec.resource.title_fa,
          description_fa: rec.resource.description_fa,
          type: rec.resource.resource_type,
          url: rec.resource.url,
          duration: rec.resource.duration_minutes,
          rating: rec.resource.quality_rating,
        },
        reason_fa: rec.recommendation_reason_fa,
        match_percentage: rec.match_percentage,
        why_recommended: rec.recommendation_reason_fa,
      })),
    });
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
```

---

## 2. Service Layer

### 2.1 Question Generator Service

```typescript
// src/services/ai/question-generator.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface GenerateQuestionParams {
  userId: string;
  domainId: string;
  userKnowledge: any[];
  availableNodes: any[];
  sessionHistory: any[];
}

export async function generateAdaptiveQuestion(params: GenerateQuestionParams) {
  const {
    userKnowledge,
    availableNodes,
    sessionHistory,
  } = params;

  // Determine optimal next node
  const nextNode = selectNextNode(userKnowledge, availableNodes, sessionHistory);

  // Build prompt for Claude
  const prompt = `
تو یک معلم فلسفه باهوش هستی. باید یک سؤال خوب و چالش‌برانگیز برای یک دانشجو بسازی.

درباره گره دانشی: "${nextNode.name_fa}"
توضیح: ${nextNode.description_fa}

سطح فعلی دانشجو: ${nextNode.difficulty + 1}/5

من می‌خواهم یک سؤال "باز" (open-ended) درست کنی که:
1. نیاز به درک عمیق دارد (نه صرف حفظ)
2. مناسب سطح دشواری است
3. فارسی صحیح و روان است
4. به کاوش تفکر دانشجو کمک می‌کند

خروجی بصورت JSON:
{
  "question": "سؤال اینجا",
  "hint": "نکته مفید",
  "type": "open_ended",
  "expected_concepts": ["مفهوم1", "مفهوم2"],
  "reasoning_level": "analysis"
}
`;

  const message = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const questionData = JSON.parse(jsonMatch?.[0] || '{}');

  return {
    nodeId: nextNode.id,
    questionText: questionData.question,
    hint: questionData.hint,
    type: questionData.type,
    difficulty: nextNode.difficulty,
    expectedConcepts: questionData.expected_concepts,
  };
}

function selectNextNode(
  userKnowledge: any[],
  availableNodes: any[],
  sessionHistory: any[]
): any {
  // Algorithm: Bayesian adaptive selection
  // Select node that maximizes information gain about user's knowledge

  const scores = availableNodes.map(node => {
    const userNode = userKnowledge.find(uk => uk.node_id === node.id);
    const masteryScore = userNode?.mastery_score || 0;
    const assessmentCount = userNode?.assessment_count || 0;

    // Prefer nodes with medium mastery (40-60%)
    // because they provide most information
    const informationValue = Math.abs(50 - masteryScore);
    
    // Also consider recent assessment history
    const recentlyAssessed = sessionHistory.some(
      h => h.node_id === node.id && h.timestamp > Date.now() - 3600000
    );

    return {
      nodeId: node.id,
      score: informationValue * (recentlyAssessed ? 0.5 : 1),
      node,
    };
  });

  return scores.sort((a, b) => b.score - a.score)[0].node;
}
```

### 2.2 Answer Analyzer Service

```typescript
// src/services/ai/answer-analyzer.ts

import Anthropic from '@anthropic-ai/sdk';

interface AnalyzeAnswerParams {
  question: string;
  answer: string;
  correctAnswer: string;
}

export async function analyzeAnswer(params: AnalyzeAnswerParams) {
  const client = new Anthropic();

  const prompt = `
تو یک متخصص فلسفه و معلم بسیار باهوش هستی.

سؤال: ${params.question}

پاسخ دانشجو: ${params.answer}

پاسخ صحیح: ${params.correctAnswer}

لطفا تحلیل کنید:
1. آیا پاسخ صحیح است؟ (درصد صحت)
2. کیفیت استدلال چطور است؟ (0-100)
3. آیا اشتباهات مفهومی دارد؟
4. بازخورد مختصر (فارسی، 2-3 جمله)
5. توضیح تفصیلی (فارسی)
6. قدم‌های بعدی برای یادگیری

خروجی JSON:
{
  "correctness_score": 85,
  "reasoning_score": 90,
  "misconceptions": [
    {
      "type": "concept_confusion",
      "description": "دانشجو A را با B اشتباه گرفته"
    }
  ],
  "feedback": "بازخورد کوتاه",
  "explanation": "توضیح تفصیلی",
  "next_steps": ["تمرین 1", "مطالعه 2"]
}
`;

  const message = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const analysis = JSON.parse(jsonMatch?.[0] || '{}');

  return {
    correctness: analysis.correctness_score,
    reasoning: analysis.reasoning_score,
    misconceptions: analysis.misconceptions,
    feedback: analysis.feedback,
    explanation: analysis.explanation,
    nextSteps: analysis.next_steps,
    raw: analysis,
  };
}
```

### 2.3 Recommendation Service

```typescript
// src/services/recommendations/recommender.ts

import { createClient } from '@supabase/supabase-js';

interface GetRecommendationsParams {
  userId: string;
  limit?: number;
}

export async function getRecommendations(params: GetRecommendationsParams) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { userId, limit = 10 } = params;

  // Get user's knowledge gaps
  const { data: userKnowledge } = await supabase
    .from('user_knowledge_nodes')
    .select('*')
    .eq('user_id', userId)
    .lt('mastery_score', 60)
    .order('mastery_score', { ascending: true })
    .limit(5);

  if (!userKnowledge || userKnowledge.length === 0) {
    return [];
  }

  // Get relevant resources
  const { data: resources } = await supabase
    .from('learning_resources')
    .select('*')
    .in(
      'relevant_nodes',
      userKnowledge.map(uk => uk.node_id)
    );

  if (!resources) return [];

  // Score each resource based on relevance
  const scored = resources.map(resource => {
    const relevantNodes = resource.relevant_nodes;
    const overlap = relevantNodes.filter(
      (n: string) => userKnowledge.some(uk => uk.node_id === n)
    ).length;

    const relevance = overlap / relevantNodes.length;
    const qualityScore = resource.quality_rating / 5;
    const freenessBias = resource.is_free ? 1.1 : 1.0;

    const finalScore = relevance * qualityScore * freenessBias;

    return {
      ...resource,
      score: finalScore,
    };
  });

  // Get top recommendations
  const recommendations = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(resource => ({
      id: resource.id,
      resource,
      recommendation_reason_fa: generateRecommendationReason(
        resource,
        userKnowledge
      ),
      match_percentage: Math.round(resource.score * 100),
    }));

  return recommendations;
}

function generateRecommendationReason(resource: any, userKnowledge: any[]): string {
  const relevantGaps = userKnowledge
    .filter(uk => resource.relevant_nodes.includes(uk.node_id))
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 2);

  if (relevantGaps.length === 0) return 'منبع مرتبط با اهداف یادگیری شما';

  return `شما در ${relevantGaps.map(gap => `"${gap.node_id}"`).join(' و ')} ضعیف هستید. این منبع این شکاف‌ها را پوشش می‌دهد.`;
}
```

---

## 3. Middleware & Authentication

```typescript
// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(token, secret);
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add user ID to headers for API routes
  const response = NextResponse.next();
  if (token) {
    try {
      const verified = await jwtVerify(token, secret);
      response.headers.set('x-user-id', verified.payload.sub as string);
    } catch (error) {
      // Invalid token, continue without user
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
  ],
};
```

---

## نسخه بعدی: Deployment & DevOps Guide
