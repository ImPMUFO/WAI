# Frontend Implementation
## ساختار پروژه Next.js + React

---

## 1. Project Structure

```
knowledge-mapper/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── .env.local (gitignored)
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
│
├── public/
│   ├── fonts/
│   │   └── inter-var.ttf
│   ├── icons/
│   ├── images/
│   └── favicons/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── knowledge-map/
│   │   │   │   └── page.tsx
│   │   │   ├── assessment/
│   │   │   │   └── page.tsx
│   │   │   ├── roadmap/
│   │   │   │   └── page.tsx
│   │   │   ├── recommendations/
│   │   │   │   └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── assessment/
│   │   │   ├── knowledge-graph/
│   │   │   ├── recommendations/
│   │   │   └── reports/
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx (Landing)
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   └── Spinner.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardOverview.tsx
│   │   │   ├── ProgressCard.tsx
│   │   │   ├── GoalsSection.tsx
│   │   │   ├── RecentActivityChart.tsx
│   │   │   ├── RecommendationsWidget.tsx
│   │   │   └── StartSessionCard.tsx
│   │   │
│   │   ├── knowledge-map/
│   │   │   ├── KnowledgeGraphViewer.tsx
│   │   │   ├── NodeDetailPanel.tsx
│   │   │   ├── DomainFilter.tsx
│   │   │   ├── GraphControls.tsx
│   │   │   └── LegendPanel.tsx
│   │   │
│   │   ├── assessment/
│   │   │   ├── QuestionDisplay.tsx
│   │   │   ├── AnswerInput.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   ├── FeedbackPanel.tsx
│   │   │   └── MisconceptionAlert.tsx
│   │   │
│   │   ├── roadmap/
│   │   │   ├── RoadmapViewer.tsx
│   │   │   ├── MilestoneCard.tsx
│   │   │   ├── TimelineView.tsx
│   │   │   └── ProgressTracker.tsx
│   │   │
│   │   ├── recommendations/
│   │   │   ├── RecommendationCard.tsx
│   │   │   ├── RecommendationList.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── RecommendationDetail.tsx
│   │   │
│   │   └── reports/
│   │       ├── ReportHeader.tsx
│   │       ├── ScoresSection.tsx
│   │       ├── ProgressChart.tsx
│   │       ├── MisconceptionsSection.tsx
│   │       └── AchievementsSection.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useKnowledgeMap.ts
│   │   ├── useAssessment.ts
│   │   ├── useRecommendations.ts
│   │   ├── useLocalStorage.ts
│   │   └── useDebounce.ts
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── validators.ts
│   │   └── persian.ts (RTL, Persian numbers, etc.)
│   │
│   ├── store/
│   │   ├── authStore.ts (Zustand)
│   │   ├── knowledgeStore.ts
│   │   ├── assessmentStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── domain.ts
│   │   ├── knowledge.ts
│   │   ├── assessment.ts
│   │   └── user.ts
│   │
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── assessment.service.ts
│   │   ├── knowledge.service.ts
│   │   ├── recommendations.service.ts
│   │   └── analytics.service.ts
│   │
│   └── styles/
│       ├── globals.css
│       ├── animations.css
│       ├── rtl.css
│       └── dark-mode.css
│
└── README.md
```

---

## 2. package.json

```json
{
  "name": "knowledge-mapper",
  "version": "1.0.0",
  "description": "AI Personal Knowledge Mapping Platform",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*\"",
    "db:migrate": "supabase migration up",
    "db:seed": "tsx src/scripts/seed.ts",
    "test": "jest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "zustand": "^4.4.0",
    "react-query": "^3.39.0",
    "axios": "^1.6.0",
    "framer-motion": "^10.16.0",
    "react-flow-renderer": "^11.10.0",
    "d3": "^7.8.0",
    "recharts": "^2.10.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "next-auth": "^4.24.0",
    "supabase": "^1.157.0",
    "@supabase/auth-helpers-nextjs": "^0.7.0",
    "tailwindcss": "^3.3.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0",
    "lucide-react": "^0.292.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0",
    "jalaali-js": "^1.1.2",
    "lru-cache": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "playwright": "^1.40.0"
  }
}
```

---

## 3. Key Components Implementation

### 3.1 Dashboard Page

```tsx
// src/app/(dashboard)/dashboard/page.tsx

import React from 'react';
import { Metadata } from 'next';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import ProgressCard from '@/components/dashboard/ProgressCard';
import GoalsSection from '@/components/dashboard/GoalsSection';
import RecentActivityChart from '@/components/dashboard/RecentActivityChart';
import RecommendationsWidget from '@/components/dashboard/RecommendationsWidget';

export const metadata: Metadata = {
  title: 'داشبورد | نقشه‌کش دانش',
  description: 'نمای کلی پیشرفت یادگیری شما'
};

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-8 rtl">
      <DashboardOverview />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GoalsSection />
        </div>
        <div>
          <ProgressCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityChart />
        <RecommendationsWidget />
      </div>
    </div>
  );
}
```

### 3.2 Knowledge Map Viewer Component

```tsx
// src/components/knowledge-map/KnowledgeGraphViewer.tsx

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useKnowledgeMap } from '@/hooks/useKnowledgeMap';
import NodeDetailPanel from './NodeDetailPanel';

interface KnowledgeGraphViewerProps {
  domainId: string;
  userMastery: Record<string, number>;
}

export default function KnowledgeGraphViewer({
  domainId,
  userMastery
}: KnowledgeGraphViewerProps) {
  const { nodes: graphNodes, edges, loading } = useKnowledgeMap(domainId);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [viewType, setViewType] = useState<'network' | 'hierarchical'>('network');

  useEffect(() => {
    // تبدیل گره‌های دانش به React Flow nodes
    const flowNodes = graphNodes.map((node) => {
      const masteryScore = userMastery[node.id] || 0;
      const getNodeColor = (score: number) => {
        if (score >= 80) return '#10B981'; // green
        if (score >= 50) return '#FBBF24'; // yellow
        if (score >= 20) return '#FB923C'; // orange
        if (score > 0) return '#EF4444'; // red
        return '#6B7280'; // gray
      };

      return {
        id: node.id,
        data: {
          label: node.name_fa,
          score: masteryScore,
          description: node.description_fa,
        },
        position: calculateNodePosition(node.id),
        style: {
          background: getNodeColor(masteryScore),
          border: selectedNode === node.id ? '3px solid white' : 'none',
          borderRadius: '8px',
          padding: '10px',
          color: 'white',
          fontSize: '12px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        },
      };
    });

    setNodes(flowNodes);
  }, [graphNodes, userMastery, selectedNode]);

  const handleNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  if (loading) {
    return <div className="text-center py-12">در حال بارگذاری نمودار...</div>;
  }

  return (
    <div className="flex gap-4 h-screen bg-gray-900">
      {/* React Flow Viewer */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Detail Panel */}
      {selectedNode && (
        <NodeDetailPanel
          nodeId={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

function calculateNodePosition(nodeId: string, index: number = 0) {
  // استفاده از الگوریتم Force-Directed برای موقعیت‌گیری
  return {
    x: Math.random() * 500,
    y: Math.random() * 500,
  };
}
```

### 3.3 Assessment Question Component

```tsx
// src/components/assessment/QuestionDisplay.tsx

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { Question } from '@/types/assessment';

interface QuestionDisplayProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onSubmitAnswer: (answer: string) => void;
  onSkip?: () => void;
}

export default function QuestionDisplay({
  question,
  currentIndex,
  totalQuestions,
  onSubmitAnswer,
  onSkip
}: QuestionDisplayProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(answer);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = ((currentIndex) / totalQuestions) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-8 rtl"
    >
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>سؤال {currentIndex + 1} از {totalQuestions}</span>
          <span>سطح دشواری: {"⭐".repeat(question.difficulty)}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        className="glassmorphism rounded-2xl p-8 mb-8 border border-white/10"
        whileHover={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
      >
        <h2 className="text-2xl font-bold mb-4 text-white">
          {question.question_text_fa}
        </h2>
        {question.hint && (
          <p className="text-cyan-400 text-sm mb-4">
            💡 نکته: {question.hint}
          </p>
        )}
      </motion.div>

      {/* Answer Input */}
      <div className="mb-6">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="پاسخ خود را اینجا بنویسید..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none min-h-[200px]"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={!answer.trim() || isSubmitting}
          loading={isSubmitting}
          className="flex-1"
        >
          پایان پاسخ و ادامه →
        </Button>
        {onSkip && (
          <Button
            onClick={onSkip}
            variant="secondary"
            className="flex-1"
          >
            پرش این سؤال
          </Button>
        )}
      </div>

      {/* Timer */}
      <div className="text-center mt-6 text-gray-400 text-sm">
        ⏱️ زمان: <Timer />
      </div>
    </motion.div>
  );
}

function Timer() {
  const [time, setTime] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>;
}
```

### 3.4 Recommendation Card Component

```tsx
// src/components/recommendations/RecommendationCard.tsx

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ExternalLink, BookOpen, Play, FileText } from 'lucide-react';
import Button from '@/components/common/Button';
import { LearningResource } from '@/types';

interface RecommendationCardProps {
  recommendation: {
    id: string;
    resource: LearningResource;
    reason_fa: string;
    match_percentage: number;
  };
  onStart: (id: string) => void;
  onSave: (id: string) => void;
}

export default function RecommendationCard({
  recommendation,
  onStart,
  onSave
}: RecommendationCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const { resource, reason_fa, match_percentage } = recommendation;

  const getResourceIcon = () => {
    switch (resource.resource_type) {
      case 'book':
        return <BookOpen className="w-5 h-5" />;
      case 'video':
        return <Play className="w-5 h-5" />;
      case 'article':
        return <FileText className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glassmorphism border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getResourceIcon()}</div>
          <div>
            <h3 className="font-semibold text-white">{resource.title_fa}</h3>
            <p className="text-xs text-gray-400">
              {resource.resource_type} • {resource.language}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsSaved(!isSaved);
            onSave(recommendation.id);
          }}
          className={`transition-colors ${isSaved ? 'text-red-500' : 'text-gray-400'}`}
        >
          <Heart className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Match Percentage */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">درجة تطابق</span>
          <span className="text-cyan-400 font-semibold">{match_percentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${match_percentage}%` }}
            transition={{ delay: 0.2 }}
          />
        </div>
      </div>

      {/* Reason */}
      <p className="text-sm text-gray-300 mb-4 leading-relaxed">
        <span className="text-cyan-400">⟹ چرا:</span> {reason_fa}
      </p>

      {/* Details */}
      <div className="text-xs text-gray-400 space-y-1 mb-4">
        {resource.duration_minutes && (
          <p>⏱️ مدت: {Math.ceil(resource.duration_minutes / 60)} ساعت</p>
        )}
        <p>⭐ {resource.quality_rating.toFixed(1)}/5 ({resource.user_rating_count} نظر)</p>
        {resource.is_free && <p className="text-green-400">رایگان</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => onStart(recommendation.id)}
          className="flex-1"
          size="sm"
        >
          شروع
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          size="sm"
          onClick={() => window.open(resource.url, '_blank')}
        >
          جزئیات
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
```

---

## 4. Key Hooks

### 4.1 useAuth Hook

```tsx
// src/hooks/useAuth.ts

'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const router = useRouter();
  const { user, session, setUser, setSession, logout: storeLogout } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    setUser(data.user);
    setSession(data.session);
    router.push('/dashboard');
  }, [setUser, setSession, router]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    storeLogout();
    router.push('/login');
  }, [storeLogout, router]);

  return {
    user,
    session,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
```

### 4.2 useKnowledgeMap Hook

```tsx
// src/hooks/useKnowledgeMap.ts

'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

export function useKnowledgeMap(domainId: string) {
  const { data, isLoading, error } = useQuery(
    ['knowledge-map', domainId],
    () => fetch(`/api/knowledge-graph/${domainId}`).then(r => r.json()),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return {
    nodes: data?.nodes || [],
    edges: data?.edges || [],
    loading: isLoading,
    error,
  };
}
```

---

## 5. Store Management (Zustand)

### authStore

```tsx
// src/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  session: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      logout: () => set({ user: null, session: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

---

## 6. Environment Configuration

```env
# .env.example

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxx

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# AI/ML
ANTHROPIC_API_KEY=sk-xxx

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=xxx
```

---

## نسخه بعدی: Backend API Implementation
