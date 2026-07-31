# Deployment & DevOps Guide
## راه‌اندازی Production

---

## 1. Pre-Deployment Checklist

- [ ] تمام environment variables تنظیم شده
- [ ] Database migrations اجرا شده
- [ ] API tests پاس کرده
- [ ] Frontend build بدون error
- [ ] Security audit انجام شده
- [ ] Performance testing کامل شده
- [ ] Database backup تهیه شده
- [ ] Monitoring و logging تنظیم شده

---

## 2. Environment Setup

### 2.1 Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Login
supabase login

# Create project in Supabase Dashboard (https://supabase.com)
# Or use CLI:
supabase projects create --name knowledge-mapper

# Copy connection strings
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
# SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 2.2 Database Migration

```bash
# Copy schema to Supabase
supabase db push

# Or manually:
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Create new query
# 4. Paste content of 03_DATABASE_SCHEMA.sql
# 5. Run

# Run migrations
supabase migration list
supabase migration up
```

### 2.3 Seed Initial Data

```bash
# Create seed script
cat > src/scripts/seed.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log('Seeding database...');

  // Add domains
  const domains = [
    {
      code: 'philosophy',
      name_fa: 'فلسفه',
      name_en: 'Philosophy',
      icon: '🧠',
      color_hex: '#5E7CE2',
    },
  ];

  for (const domain of domains) {
    await supabase.from('domains').insert([domain]);
  }

  // Add knowledge nodes
  const nodes = [
    {
      domain_id: 'philosophy-id',
      code: 'ancient-philosophy',
      name_fa: 'فلسفه باستان',
      name_en: 'Ancient Philosophy',
      description_fa: 'فلسفه دوران باستان یونان و روم',
      difficulty: 2,
      level: 0,
    },
    // ... more nodes
  ];

  for (const node of nodes) {
    await supabase.from('knowledge_nodes').insert([node]);
  }

  console.log('✅ Database seeded successfully');
}

seed().catch(console.error);
EOF

# Run seed
npx tsx src/scripts/seed.ts
```

---

## 3. Vercel Deployment

### 3.1 Setup Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or connect GitHub:
# 1. Push code to GitHub
# 2. Go to vercel.com
# 3. Import GitHub repository
# 4. Set environment variables
# 5. Deploy
```

### 3.2 Environment Variables in Vercel

```bash
NEXT_PUBLIC_APP_URL=https://knowledge-mapper.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
NEXTAUTH_URL=https://knowledge-mapper.vercel.app
NEXTAUTH_SECRET=<generate-random-secret>
ANTHROPIC_API_KEY=sk-xxxxx
```

### 3.3 vercel.json Configuration

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Type check
      run: npm run type-check
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Vercel
      uses: vercel/action@master
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        production: true
```

### 4.2 Database Migration Script

```yaml
# .github/workflows/db-migration.yml

name: Database Migration

on:
  workflow_dispatch:

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Supabase migration
      run: |
        npm install -g supabase
        supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        supabase db push
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 5. Monitoring & Logging

### 5.1 Sentry Setup

```typescript
// src/lib/sentry.ts

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    if (event.request?.url?.includes("/health")) {
      return null;
    }
    return event;
  },
});

export default Sentry;
```

### 5.2 Custom Logging

```typescript
// src/lib/logger.ts

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level = process.env.NODE_ENV === 'production' 
    ? LogLevel.INFO 
    : LogLevel.DEBUG;

  log(level: LogLevel, message: string, data?: any) {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${LogLevel[level]}]`;

    if (process.env.NODE_ENV === 'production') {
      // Send to external service
      fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ level, message, data, timestamp }),
      }).catch(() => {});
    } else {
      console.log(`${prefix} ${message}`, data || '');
    }
  }

  debug(message: string, data?: any) { this.log(LogLevel.DEBUG, message, data); }
  info(message: string, data?: any) { this.log(LogLevel.INFO, message, data); }
  warn(message: string, data?: any) { this.log(LogLevel.WARN, message, data); }
  error(message: string, data?: any) { this.log(LogLevel.ERROR, message, data); }
}

export const logger = new Logger();
```

### 5.3 Analytics

```typescript
// src/lib/analytics.ts

import { usePostHog } from 'posthog-js/react';

export function useAnalytics() {
  const posthog = usePostHog();

  return {
    trackEvent: (event: string, properties?: Record<string, any>) => {
      posthog?.capture(event, properties);
    },
    
    trackPageView: (page: string) => {
      posthog?.capture('$pageview', { page });
    },
    
    trackAssessment: (sessionId: string, score: number, questionsAnswered: number) => {
      posthog?.capture('assessment_completed', {
        session_id: sessionId,
        score,
        questions_answered: questionsAnswered,
      });
    },
  };
}
```

---

## 6. Performance Optimization

### 6.1 Image Optimization

```typescript
// next.config.js

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
};
```

### 6.2 Caching Strategy

```typescript
// src/lib/cache.ts

import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 500,
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 1000 * 60 * 5, // 5 minutes
});

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T, ttl?: number) {
  cache.set(key, value, { ttl });
}

export function invalidateCache(pattern: RegExp) {
  for (const [key] of cache.entries()) {
    if (pattern.test(key)) {
      cache.delete(key);
    }
  }
}
```

### 6.3 Database Query Optimization

```typescript
// src/lib/db-optimize.ts

// Use database indexes
const indexes = `
CREATE INDEX idx_user_knowledge_user_mastery 
ON user_knowledge_nodes(user_id, mastery_score DESC);

CREATE INDEX idx_assessment_sessions_user_date 
ON assessment_sessions(user_id, created_at DESC);

CREATE INDEX idx_user_misconceptions_uncorrected 
ON user_misconceptions(user_id, is_corrected) 
WHERE is_corrected = false;
`;

// Use materialized views for complex queries
const views = `
CREATE MATERIALIZED VIEW user_knowledge_summary AS
SELECT 
  u.id,
  COUNT(DISTINCT kn.id) as total_nodes,
  AVG(ukn.mastery_score) as avg_mastery,
  COUNT(DISTINCT CASE WHEN ukn.mastery_score >= 80 THEN ukn.node_id END) as mastered_nodes
FROM users u
LEFT JOIN knowledge_nodes kn ON 1=1
LEFT JOIN user_knowledge_nodes ukn ON u.id = ukn.user_id AND kn.id = ukn.node_id
GROUP BY u.id;

CREATE INDEX idx_user_knowledge_summary_user ON user_knowledge_summary(id);
`;
```

---

## 7. Security Checklist

- [ ] Enable HTTPS only
- [ ] Set security headers (CSP, HSTS, X-Frame-Options)
- [ ] Implement rate limiting
- [ ] Use CSRF protection
- [ ] Sanitize user inputs
- [ ] Validate API requests
- [ ] Use environment variables for secrets
- [ ] Enable Row Level Security in Supabase
- [ ] Regular security audits
- [ ] Keep dependencies updated

```typescript
// src/middleware.ts - Security Headers

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  );

  return response;
}
```

---

## 8. Backup & Recovery

```bash
# Backup Supabase database
pg_dump postgresql://[user]:[password]@[host]:[port]/[database] > backup.sql

# Restore from backup
psql postgresql://[user]:[password]@[host]:[port]/[database] < backup.sql

# Automated backups (setup in Supabase Dashboard)
# Enable automatic backups with daily frequency
```

---

## 9. Scaling Strategy

### Phase 1: MVP (< 1000 users)
- Single Vercel deployment
- Supabase with default scaling
- No caching layer needed

### Phase 2: Growth (1000-10000 users)
- Vercel auto-scaling
- Redis for caching
- Database read replicas
- CDN for static assets

### Phase 3: Enterprise (> 10000 users)
- Multiple region deployment
- Database sharding
- Message queue (Bull/RabbitMQ)
- Microservices architecture
- Load balancing

---

## 10. Post-Deployment Monitoring

```bash
# Monitor application
# 1. Check Vercel dashboard
# 2. Monitor Sentry errors
# 3. Track analytics in PostHog
# 4. Monitor database performance

# Daily checklist:
- Check error rates
- Monitor API response times
- Verify database query performance
- Check user engagement metrics
- Review security logs

# Weekly:
- Analyze user behavior
- Review feature adoption
- Check infrastructure costs
- Review and merge code

# Monthly:
- Performance optimization review
- Security audit
- Capacity planning
- Roadmap planning
```

---

## 11. Launch Checklist

**1 Week Before:**
- [ ] All tests passing
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Runbook created

**24 Hours Before:**
- [ ] Final security audit
- [ ] Performance test
- [ ] Staging deployment test

**Launch Day:**
- [ ] Deploy to production
- [ ] Verify all services running
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Stand by for issues

**Post-Launch:**
- [ ] Monitor 24/7 for 48 hours
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan improvements

---

## 12. Quick Start Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Database
supabase db push
npx tsx src/scripts/seed.ts

# Testing
npm test
npm run test:e2e

# Deployment
vercel deploy
vercel deploy --prod

# Monitoring
# Check Sentry: sentry.io
# Check PostHog: posthog.com
# Check Vercel: vercel.com/dashboard
```

---

## نتیجه‌گیری

تبریک! پروژه شامل:

✅ **مشخصات کامل محصول** (فارسی)
✅ **معماری سیستم** (مفصل)
✅ **Schema پایگاه‌داده** (SQL آماده)
✅ **طراحی UI/UX** (Figma-ready)
✅ **Frontend** (Next.js + React)
✅ **Backend API** (Routes + Services)
✅ **Deployment** (Vercel + Supabase)
✅ **DevOps** (CI/CD + Monitoring)

### فاز‌های توسعه:

**Quarter 1:** MVP با فلسفه
**Quarter 2:** 5 حوزه دیگر + بهتری
**Quarter 3:** Enterprise features + محلی‌سازی
**Quarter 4:** Scaling + ML improvements
