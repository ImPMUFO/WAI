# معماری سیستم
## پلتفرم نگاشت دانش دیجیتالی شخصی

---

## 1. معماری کلی (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Frontend)                     │
│  Next.js (App Router) + React + TypeScript + TailwindCSS        │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard │ Knowledge Map │ Assessment │ Roadmap │ Recommendations
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST/SSE
┌──────────────────────────▼──────────────────────────────────────┐
│               API GATEWAY & ROUTING LAYER                       │
│  Next.js API Routes + Server Actions                            │
├──────────────────────────┬──────────────────────────────────────┤
│ Auth │ User Mgmt │ Assessment │ Graph │ ML │ Recommendations   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼───────┐ ┌───────▼────────┐
│ AI ENGINE      │ │  KNOWLEDGE   │ │    DATABASE    │
│  SERVICES      │ │   GRAPH      │ │    LAYER       │
├────────────────┤ │   ENGINE     │ │                │
│ Q Generator    │ │              │ │ Supabase       │
│ Answer         │ │ Neo4j/       │ │ PostgreSQL     │
│ Analyzer       │ │ Custom Graph │ │ Vector DB      │
│ Scorer         │ │              │ │                │
│ Digital Twin   │ └──────────────┘ │                │
│ Misconception  │                  └────────────────┘
│ Detector       │
│ Learning Path  │
│ Generator      │
│ Recommender    │
└────────────────┘
```

---

## 2. لایه‌های معماری

### Layer 1: Presentation Layer
**فناوری:** Next.js 14 (App Router)  
**زبان:** TypeScript + React  
**Styling:** Tailwind CSS + Framer Motion

**صفحات:**
```
/dashboard        → داشبورد شخصی
/knowledge-map    → نقشه تعاملی دانش
/assessment       → ارزیابی تطابقی
/roadmap          → نقشه راه یادگیری
/recommendations  → توصیه‌های شخصی
/profile          → پروفایل کاربر
/settings         → تنظیمات
/reports          → گزارشات جلسات
```

### Layer 2: API Layer
**فناوری:** Next.js API Routes + Server Actions  
**الگوریتم:** REST + WebSocket (برای Real-time)

### Layer 3: Business Logic Layer
**مسؤولیت:**
- Orchestration
- Validation
- Authorization
- Business Rules

### Layer 4: AI/ML Layer
**Microservices:**
- Question Generator Service
- Answer Analyzer Service
- Knowledge Scorer Service
- Digital Twin Engine
- Misconception Detector
- Learning Path Generator
- Recommendation Engine

### Layer 5: Data Layer
**Databases:**
- PostgreSQL (Supabase) → Relational
- Vector Database → Semantic Search
- Cache (Redis) → Real-time

### Layer 6: External Services
- Claude API (Anthropic)
- Book APIs
- Course APIs
- Media Hosting

---

## 3. Data Flow

### جریان ارزیابی

```
1. User accesses /assessment
   │
2. Frontend calls GET /api/assessment/start
   │
3. Backend queries:
   ├── SELECT user_profile
   ├── SELECT knowledge_graph
   ├── SELECT assessment_history
   └── SELECT misconceptions
   │
4. Adaptive Question Generator:
   ├── Analyze user's current position
   ├── Identify weakest areas
   ├── Generate next best question
   └── Return with context
   │
5. Frontend renders question to user
   │
6. User provides answer
   │
7. Frontend POST /api/assessment/answer
   │
8. Answer Analyzer:
   ├── Parse answer
   ├── Compare with correct understanding
   ├── Extract reasoning process
   ├── Detect misconceptions
   └── Generate feedback
   │
9. Knowledge Scorer:
   ├── Calculate mastery score
   ├── Update confidence
   ├── Identify missing prerequisites
   └── Assess reasoning quality
   │
10. Digital Twin Update:
    ├── Update user_knowledge_nodes
    ├── Update misconceptions_log
    ├── Recalculate learning velocity
    └── Predict retention probability
    │
11. Decision Point:
    ├── IF more assessment needed → GO TO 4
    ├── IF assessment complete → GO TO 12
    │
12. Generate Session Report:
    ├── Summary
    ├── Progress
    ├── Misconceptions Found
    ├── Next Objectives
    └── Save to history
    │
13. Return report to Frontend
    │
14. Update Dashboard visualization
```

### جریان توصیه‌ها

```
1. User views /recommendations
   │
2. Backend analyzes:
   ├── Knowledge gaps (from Digital Twin)
   ├── Learning goals (from user_profiles)
   ├── Preferred styles (from history)
   └── Time available (from settings)
   │
3. Recommendation Engine:
   ├── Query resource_database
   ├── Score each resource by relevance
   ├── Rank by personalization score
   ├── Generate explanations
   └── Return top 10 with WHY
   │
4. Frontend renders with:
   ├── Resource thumbnail
   ├── Title and description
   ├── Match percentage
   ├── Time to complete
   ├── Why recommended
   └── User feedback buttons
   │
5. User clicks on resource
   │
6. Log engagement:
   ├── recommendation_id
   ├── user_id
   ├── timestamp
   ├── action (click/complete/abandon)
   └── rating
```

---

## 4. API Endpoints

### Authentication
```
POST   /api/auth/register           → ثبت‌نام
POST   /api/auth/login              → ورود
POST   /api/auth/logout             → خروج
POST   /api/auth/refresh            → بازخوانی توکن
POST   /api/auth/reset-password     → تغییر رمز
```

### User Profile
```
GET    /api/user/profile            → دریافت پروفایل
PUT    /api/user/profile            → بروزرسانی پروفایل
GET    /api/user/learning-goals     → اهداف یادگیری
PUT    /api/user/learning-goals     → تنظیم اهداف
GET    /api/user/preferences        → ترجیحات
PUT    /api/user/preferences        → تنظیم ترجیحات
```

### Knowledge Graph
```
GET    /api/knowledge-graph          → دریافت نمودار
GET    /api/knowledge-graph/:domain  → نمودار برای حوزه
GET    /api/knowledge-node/:id       → جزئیات گره
GET    /api/knowledge-path/:from/:to → مسیر بین گره‌ها
```

### Assessment
```
POST   /api/assessment/start         → شروع ارزیابی
GET    /api/assessment/next-question → سؤال بعدی
POST   /api/assessment/answer        → ثبت پاسخ
POST   /api/assessment/end           → پایان ارزیابی
GET    /api/assessment/session/:id   → جزئیات جلسه
```

### Reports & Analytics
```
GET    /api/reports/session/:id      → گزارش جلسه
GET    /api/reports/progress         → گزارش پیشرفت
GET    /api/reports/misconceptions   → اشتباهات مفهومی
GET    /api/reports/learning-curve   → منحنی یادگیری
```

### Digital Twin
```
GET    /api/digital-twin/overview    → نمای کلی
GET    /api/digital-twin/node/:id    → جزئیات گره
GET    /api/digital-twin/snapshot    → عکس‌فعلی
```

### Recommendations
```
GET    /api/recommendations          → توصیه‌های شخصی
GET    /api/recommendations/:type    → توصیه برای نوع خاص
POST   /api/recommendations/feedback → بازخورد کاربر
```

### Learning Roadmap
```
GET    /api/roadmap/current          → نقشه راه فعلی
GET    /api/roadmap/milestones       → نقاط کلیدی
POST   /api/roadmap/update-goal      → بروزرسانی هدف
```

---

## 5. Database Schema (خلاصه)

### Core Tables

```sql
-- کاربران
users
├── id (UUID)
├── email
├── password_hash
├── full_name
├── avatar_url
├── created_at
└── updated_at

-- پروفایل کاربر
user_profiles
├── user_id (FK)
├── preferred_language
├── learning_style
├── time_available
├── goals
└── metadata

-- حوزه‌های دانش
domains
├── id
├── name_fa
├── name_en
├── description_fa
├── icon
└── difficulty_range

-- گره‌های دانش
knowledge_nodes
├── id
├── domain_id
├── name_fa
├── description_fa
├── prerequisites (JSON)
├── difficulty
├── parent_id
└── resources (JSON)

-- دانش کاربر (Digital Twin)
user_knowledge_nodes
├── user_id
├── node_id
├── mastery_score (0-100)
├── confidence_score (0-100)
├── last_assessed
├── learning_velocity
├── retention_probability
└── assessment_count

-- اشتباهات مفهومی
user_misconceptions
├── user_id
├── node_id
├── misconception_type
├── description_fa
├── evidence (JSON)
├── corrected (boolean)
└── created_at

-- سیشن‌های ارزیابی
assessment_sessions
├── id
├── user_id
├── domain_id
├── start_time
├── end_time
├── question_count
├── correct_answers
├── metadata
└── report_json

-- سؤال‌ها
questions
├── id
├── session_id
├── node_id
├── question_text_fa
├── question_type
├── difficulty
├── generation_method
└── created_at

-- پاسخ‌ها
answers
├── id
├── question_id
├── user_id
├── answer_text_fa
├── score
├── feedback_fa
├── misconceptions (JSON)
├── reasoning_quality
└── created_at

-- توصیه‌ها
recommendations
├── id
├── user_id
├── resource_id
├── recommendation_reason_fa
├── match_percentage
├── created_at
├── expires_at
└── status

-- منابع یادگیری
learning_resources
├── id
├── title_fa
├── description_fa
├── resource_type (book/video/course/paper)
├── url
├── duration_minutes
├── difficulty
├── relevant_nodes (JSON)
└── metadata

-- نقشه‌راه‌های یادگیری
learning_roadmaps
├── id
├── user_id
├── domain_id
├── milestones (JSON)
├── current_milestone_index
├── created_at
└── updated_at
```

---

## 6. AI Services Architecture

### 6.1 Adaptive Question Generator Service

```
Input:
├── user_knowledge_nodes
├── assessment_history
├── current_focus_area
└── difficulty_preference

Process:
├── 1. Analyze knowledge gaps
├── 2. Identify misconceptions
├── 3. Determine optimal next topic
├── 4. Select question type
├── 5. Generate question using Claude API
├── 6. Validate question quality
└── 7. Return with metadata

Output:
├── question_text
├── question_type
├── difficulty
├── expected_reasoning
├── correct_answer
├── common_misconceptions
└── reasoning_level_required
```

### 6.2 Answer Analyzer Service

```
Input:
├── question_id
├── user_answer
├── correct_answer
└── question_context

Process:
├── 1. Parse answer using Claude
├── 2. Extract reasoning
├── 3. Identify misconceptions
├── 4. Compare with benchmark
├── 5. Score correctness (0-100)
├── 6. Score reasoning quality (0-100)
├── 7. Generate detailed feedback
└── 8. Store evidence

Output:
├── correctness_score
├── reasoning_score
├── misconceptions_found []
├── feedback_fa
├── explanation_fa
├── next_steps []
└── confidence_level
```

### 6.3 Knowledge Scorer Service

```
Input:
├── answer_analysis
├── user_history
├── node_difficulty
└── recent_performance

Process:
├── 1. Calculate base score
├── 2. Adjust for difficulty
├── 3. Consider reasoning quality
├── 4. Account for misconceptions
├── 5. Factor in learning velocity
├── 6. Update mastery_score
├── 7. Update confidence_score
└── 8. Predict retention

Output:
├── mastery_delta (change)
├── confidence_delta
├── retention_probability
├── time_to_relearn
└── recommendation_urgency
```

### 6.4 Digital Twin Engine

```
Update Process (after each answer):

1. Receive scoring data
2. For each affected node:
   ├── Update mastery_score
   ├── Update confidence_score
   ├── Update learning_velocity
   ├── Update retention_probability
   └── Record timestamp

3. Propagate to related nodes:
   ├── Update prerequisites
   ├── Update dependent concepts
   └── Recalculate readiness

4. Generate new insights:
   ├── Identify gaps
   ├── Detect patterns
   ├── Flag misconceptions
   └── Suggest next steps

5. Store in database
6. Cache for fast access
```

### 6.5 Misconception Detector Service

```
Pattern Detection:

├── Type 1: Concept Confusion
│   └── User confuses A with B
│       Logic: "وضوح در پاسخ ندارد"
│
├── Type 2: False Assumptions
│   └── User assumes P implies Q (incorrectly)
│       Logic: "فروض نادرست"
│
├── Type 3: Missing Prerequisites
│   └── User doesn't know X (needed for Y)
│       Logic: "نیازمندی گمشده"
│
├── Type 4: Memorization Without Understanding
│   └── User recites definition but can't apply
│       Logic: "حفظ بدون فهم"
│
├── Type 5: Logical Fallacies
│   └── User uses invalid reasoning
│       Logic: "خطای منطقی"
│
└── Type 6: Partial Understanding
    └── User understands 60% correctly
        Logic: "فهم ناقص"

Storage:
├── misconception_type
├── description
├── evidence (answer text)
├── severity (1-5)
├── correction_status
└── remediation_plan
```

### 6.6 Learning Path Generator Service

```
Input:
├── user_current_position
├── user_goals
├── user_learning_velocity
├── available_time
└── knowledge_graph

Process:
├── 1. Calculate knowledge distance
├── 2. Identify optimal path
├── 3. Factor in prerequisites
├── 4. Account for learning velocity
├── 5. Generate milestones
├── 6. Estimate timeline
└── 7. Create detailed roadmap

Output:
├── milestones []
│   ├── target_node
│   ├── estimated_days
│   └── success_criteria
├── total_duration_days
├── difficulty_progression
└── checkpoint_nodes
```

### 6.7 Recommendation Engine Service

```
Input:
├── user_knowledge_gaps
├── user_goals
├── learning_style_preferences
├── available_time
└── performance_history

Scoring Algorithm:

For each resource:
  score = (
    (relevance_to_gap × 0.4) +
    (match_learning_style × 0.25) +
    (quality_rating × 0.2) +
    (user_feedback_history × 0.15)
  ) × personalization_factor

Recommendations:
├── Books (duration: weeks)
├── Articles (duration: hours)
├── Courses (duration: weeks)
├── Videos (duration: 1-2 hours)
├── Exercises (duration: 30 min - 2 hours)
├── Papers (duration: 2-4 hours)
└── Projects (duration: weeks)

Output:
├── recommendations []
│   ├── resource_id
│   ├── title_fa
│   ├── description_fa
│   ├── match_percentage
│   ├── why_recommended_fa
│   ├── time_required
│   └── difficulty
└── ordering_by_relevance
```

---

## 7. Technology Stack (تفصیلی)

### Frontend Stack
```
Framework:        Next.js 14 (App Router)
Language:         TypeScript 5+
UI Library:       React 18+
Styling:          Tailwind CSS 3 + CSS-in-JS
Animation:        Framer Motion
State Mgmt:       Zustand + React Query
Graph Vis:        React Flow + D3.js
Charts:           Recharts
Icons:            Lucide Icons
Forms:            React Hook Form + Zod
Date/Time:        date-fns (Persian support)
API Client:       fetch API + SWR
```

### Backend Stack
```
Runtime:          Node.js 20+
Framework:        Next.js API Routes + Server Actions
Language:         TypeScript
Database (SQL):   Supabase PostgreSQL
Cache:            Redis
Vector DB:        Pinecone / Weaviate
Authentication:   NextAuth.js v5
Authorization:    Row Level Security (RLS)
API Docs:         OpenAPI / Swagger
```

### AI Stack
```
LLM Provider:     Anthropic Claude API
Embedding:        OpenAI / Local
Vector Search:    Pinecone / Weaviate
NLP:              spaCy (optional)
ML Framework:     scikit-learn (Python microservice)
```

### DevOps Stack
```
Hosting:          Vercel (Next.js) + AWS/GCP (ML services)
Database:         Supabase (managed PostgreSQL)
Storage:          S3 / Cloud Storage
Monitoring:       Sentry + LogRocket
Analytics:        Posthog / Mixpanel
CI/CD:            GitHub Actions
Container:        Docker (for ML services)
```

---

## 8. Authentication & Security

### Authentication Flow
```
1. User registers/logs in
2. NextAuth.js creates session
3. JWT token generated
4. Token stored in secure HTTP-only cookie
5. Subsequent requests include token
6. Middleware validates on every request
```

### Authorization (RLS - Row Level Security)
```
Supabase RLS Policies:

users table:
├── Users can only read their own profile
├── Users can only update their own profile
└── Admins can read/update all

user_knowledge_nodes table:
├── Users can only read/write their own nodes
└── Strict user_id isolation

assessment_sessions table:
├── Users can only access their sessions
└── No cross-user data access
```

---

## 9. Performance & Scalability

### Caching Strategy
```
Browser Cache:
├── Static assets (images, fonts) → 30 days
└── API responses → Strategy-specific

Server Cache:
├── Redis for:
│   ├── User sessions
│   ├── Knowledge graph (frequently accessed)
│   ├── User profiles
│   └── Recent assessments
├── TTL: 1 hour (configurable)
└── Invalidate on updates

Database Optimization:
├── Indexed columns:
│   ├── user_id
│   ├── node_id
│   ├── created_at
│   └── mastery_score
├── Materialized views for:
│   ├── User progress summaries
│   ├── Popular learning paths
│   └── Recommendation rankings
└── Archiving old sessions
```

### Scalability Considerations
```
Database:
├── Supabase auto-scaling
├── Read replicas for analytics
└── Sharding user_knowledge_nodes if needed

API:
├── Vercel auto-scaling
├── Edge middleware for routing
└── Rate limiting per user

AI Services:
├── Queue system for async jobs
├── Multiple Claude API keys for load
├── Fallback mechanisms
└── Batch processing for reports

Frontend:
├── Code splitting
├── Image optimization
├── Lazy loading
└── PWA for offline support
```

---

## 10. Development Environment

### Local Setup
```bash
# Clone repo
git clone <repo>
cd knowledge-mapper

# Install dependencies
npm install

# Environment variables
cp .env.example .env.local

# Start dev server
npm run dev

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### Environment Variables
```
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random>

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# AI
ANTHROPIC_API_KEY=sk-...

# Redis
REDIS_URL=redis://...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
```

---

## 11. API Documentation Example

### POST /api/assessment/answer

```
Request:
{
  "question_id": "q-001",
  "answer_text": "یک پاسخ جامع...",
  "submission_time": 120
}

Response:
{
  "success": true,
  "analysis": {
    "correctness_score": 85,
    "reasoning_score": 90,
    "misconceptions_found": [
      {
        "type": "concept_confusion",
        "description": "شما ایده‌آل‌گرایی را ذهنی‌گرایی فکر کردید",
        "severity": 3
      }
    ],
    "feedback_fa": "پاسخ خوبی بود اما...",
    "explanation_fa": "توضیح دقیق...",
    "next_steps": ["تمطالعهٔ ارسطو", "تمرین منطق محمولات"]
  },
  "mastery_update": {
    "previous_score": 65,
    "new_score": 72,
    "delta": +7
  },
  "next_question_available": true
}
```

---

## 12. Data Security & Privacy

### Data Encryption
```
├── At Rest:
│   ├── Supabase automatic encryption
│   ├── Sensitive fields encrypted with NaCL
│   └── Passwords hashed with bcrypt
│
└── In Transit:
    ├── HTTPS/TLS 1.3
    ├── API requests encrypted
    └── WebSocket connections secured
```

### GDPR Compliance
```
├── User data download (right to be forgotten)
├── Data export functionality
├── Privacy policy clear and transparent
├── Consent management
└── Data retention policies
```

---

## نسخه بعدی:

**03_DATABASE_SCHEMA.sql** — طراحی کامل پایگاه‌داده با تمام جداول و روابط
