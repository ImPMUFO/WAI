-- ============================================================================
-- نگاشت دانش دیجیتالی شخصی - Schema پایگاه‌داده
-- PostgreSQL 15+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector"; -- for vector embeddings

-- ============================================================================
-- 1. جداول احراز هویت و مدیریت کاربران
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  language_preference VARCHAR(10) DEFAULT 'fa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- 2. پروفایل‌های کاربری
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- تنظیمات یادگیری
  preferred_language VARCHAR(10) DEFAULT 'fa',
  learning_style VARCHAR(50),  -- visual, auditory, kinesthetic, reading-writing
  time_available_per_week INTEGER DEFAULT 10,  -- hours
  learning_pace VARCHAR(50) DEFAULT 'moderate',  -- slow, moderate, fast
  
  -- اهداف
  primary_goal TEXT,
  secondary_goals JSONB DEFAULT '[]',
  
  -- ترجیحات محتوا
  content_preferences JSONB DEFAULT '{
    "books": true,
    "videos": true,
    "courses": true,
    "articles": true,
    "papers": true,
    "exercises": true
  }',
  
  -- جزئیات شخصی
  bio TEXT,
  interests JSONB DEFAULT '[]',
  background_knowledge VARCHAR(1000),
  
  -- تنظیمات اطلاع‌رسانی
  notification_preferences JSONB DEFAULT '{
    "email_on_recommendation": true,
    "email_on_achievement": true,
    "digest_weekly": true,
    "digest_monthly": true
  }',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 3. حوزه‌های دانش (Domains)
-- ============================================================================

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'philosophy', 'math'
  name_fa VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_fa TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  color_hex VARCHAR(7),
  
  -- مشخصات
  difficulty_min INTEGER DEFAULT 1,
  difficulty_max INTEGER DEFAULT 5,
  estimated_hours_to_master INTEGER DEFAULT 100,
  
  -- ترتیب نمایش
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domains_code ON domains(code);
CREATE INDEX idx_domains_active ON domains(is_active);

-- ============================================================================
-- 4. گره‌های دانش (Knowledge Nodes)
-- ============================================================================

CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  
  -- معرفی
  code VARCHAR(100) UNIQUE NOT NULL,
  name_fa VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_fa TEXT NOT NULL,
  description_en TEXT,
  
  -- ساختار درخت
  parent_id UUID REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
  path_hierarchy TEXT,  -- e.g., "philosophy/ancient/plato"
  level INTEGER DEFAULT 0,  -- عمق در درخت
  
  -- دشواری و پیش‌نیاز
  difficulty INTEGER DEFAULT 2,  -- 1-5 scale
  prerequisites JSONB DEFAULT '[]',  -- ['node-id-1', 'node-id-2']
  
  -- جنبه‌های یادگیری
  learning_objectives JSONB DEFAULT '[]',
  key_concepts JSONB DEFAULT '[]',
  common_misconceptions JSONB DEFAULT '[]',
  
  -- منابع
  learning_resources JSONB DEFAULT '[]',  -- reference to resource IDs
  example_questions JSONB DEFAULT '[]',
  key_references JSONB DEFAULT '[]',
  
  -- metadata
  requires_hands_on BOOLEAN DEFAULT false,
  estimated_hours INTEGER DEFAULT 2,
  importance_score FLOAT DEFAULT 0.5,  -- 0-1
  
  -- Vector embedding برای semantic search
  description_embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_nodes_domain ON knowledge_nodes(domain_id);
CREATE INDEX idx_knowledge_nodes_parent ON knowledge_nodes(parent_id);
CREATE INDEX idx_knowledge_nodes_code ON knowledge_nodes(code);
CREATE INDEX idx_knowledge_nodes_hierarchy ON knowledge_nodes USING GiST (path_hierarchy gist_trgm_ops);
CREATE INDEX idx_knowledge_nodes_embedding ON knowledge_nodes USING ivfflat (description_embedding vector_cosine_ops);

-- ============================================================================
-- 5. روابط بین گره‌های دانش
-- ============================================================================

CREATE TABLE knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  
  relationship_type VARCHAR(50) NOT NULL,  -- prerequisite, related, opposite, example, generalization
  strength FLOAT DEFAULT 0.5,  -- 0-1
  
  description_fa TEXT,
  bidirectional BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT no_self_relationship CHECK (source_node_id != target_node_id),
  CONSTRAINT valid_strength CHECK (strength >= 0 AND strength <= 1)
);

CREATE INDEX idx_relationships_source ON knowledge_relationships(source_node_id);
CREATE INDEX idx_relationships_target ON knowledge_relationships(target_node_id);
CREATE INDEX idx_relationships_type ON knowledge_relationships(relationship_type);

-- ============================================================================
-- 6. Digital Twin کاربر - دانش هر کاربر برای هر گره
-- ============================================================================

CREATE TABLE user_knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  
  -- نمرات
  mastery_score FLOAT DEFAULT 0,  -- 0-100
  confidence_score FLOAT DEFAULT 0,  -- 0-100
  
  -- تاریخچه
  first_assessed_at TIMESTAMP WITH TIME ZONE,
  last_assessed_at TIMESTAMP WITH TIME ZONE,
  assessment_count INTEGER DEFAULT 0,
  
  -- یادگیری
  learning_velocity FLOAT DEFAULT 0,  -- how fast user learns this topic
  retention_probability FLOAT DEFAULT 0,  -- 0-1
  estimated_relearning_time INTEGER,  -- days
  
  -- علاقه و اهداف
  interest_level INTEGER DEFAULT 0,  -- 0-5
  is_goal_node BOOLEAN DEFAULT false,
  goal_target_score INTEGER DEFAULT 80,
  
  -- استراتژی یادگیری
  preferred_learning_style VARCHAR(50),
  suggested_next_action VARCHAR(255),
  
  -- evidence
  evidence_summary JSONB DEFAULT '{}',
  example_answers JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_mastery CHECK (mastery_score >= 0 AND mastery_score <= 100),
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100),
  CONSTRAINT unique_user_node UNIQUE (user_id, node_id)
);

CREATE INDEX idx_user_knowledge_user ON user_knowledge_nodes(user_id);
CREATE INDEX idx_user_knowledge_node ON user_knowledge_nodes(node_id);
CREATE INDEX idx_user_knowledge_mastery ON user_knowledge_nodes(mastery_score);
CREATE INDEX idx_user_knowledge_assessed ON user_knowledge_nodes(last_assessed_at DESC);

-- ============================================================================
-- 7. اشتباهات مفهومی کاربران
-- ============================================================================

CREATE TABLE user_misconceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
  
  -- نوع اشتباه
  misconception_type VARCHAR(50) NOT NULL,  
  -- concept_confusion, false_assumption, missing_prerequisite,
  -- memorization_only, logical_fallacy, weak_reasoning, partial_understanding
  
  description_fa TEXT NOT NULL,
  description_en TEXT,
  
  -- شواهد و جزئیات
  evidence JSONB DEFAULT '{}',  -- answer text, question asked, etc.
  severity_level INTEGER DEFAULT 3,  -- 1-5, 5 = critical
  
  -- وضعیت تصحیح
  is_corrected BOOLEAN DEFAULT false,
  corrected_at TIMESTAMP WITH TIME ZONE,
  correction_evidence JSONB DEFAULT '{}',
  
  -- پیش‌نیاز برای رفع
  remediation_actions JSONB DEFAULT '[]',
  
  -- پیگیری
  reoccurrence_count INTEGER DEFAULT 1,
  last_occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_misconceptions_user ON user_misconceptions(user_id);
CREATE INDEX idx_misconceptions_node ON user_misconceptions(node_id);
CREATE INDEX idx_misconceptions_corrected ON user_misconceptions(is_corrected);

-- ============================================================================
-- 8. جلسات ارزیابی
-- ============================================================================

CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
  
  -- زمان‌بندی
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- اطلاعات جلسه
  initial_node_id UUID REFERENCES knowledge_nodes(id),
  question_count INTEGER DEFAULT 0,
  completed_question_count INTEGER DEFAULT 0,
  
  -- نتایج
  average_correctness_score FLOAT,
  average_reasoning_score FLOAT,
  total_misconceptions_found INTEGER DEFAULT 0,
  
  -- وضعیت
  status VARCHAR(20) DEFAULT 'in_progress',  -- in_progress, completed, abandoned
  
  -- متادیتا
  session_metadata JSONB DEFAULT '{}',
  
  -- خودکار
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON assessment_sessions(user_id);
CREATE INDEX idx_sessions_domain ON assessment_sessions(domain_id);
CREATE INDEX idx_sessions_status ON assessment_sessions(status);
CREATE INDEX idx_sessions_created ON assessment_sessions(created_at DESC);

-- ============================================================================
-- 9. سؤال‌های مطرح‌شده
-- ============================================================================

CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES knowledge_nodes(id),
  
  -- محتوای سؤال
  question_text_fa TEXT NOT NULL,
  question_text_en TEXT,
  
  -- نوع سؤال
  question_type VARCHAR(50) NOT NULL,  
  -- open_ended, multiple_choice, true_false, explain, compare, analyze
  
  -- زمین‌بندی
  difficulty_level INTEGER DEFAULT 2,  -- 1-5
  assessment_level VARCHAR(50),  -- level_1, level_2, level_3, level_4
  
  -- سؤال تولید شده
  generated_by VARCHAR(50),  -- ai_adaptive, ai_random, template, manual
  generation_prompt JSONB,  -- برای ریتریس و بهبود
  
  -- توقع
  expected_concepts JSONB DEFAULT '[]',
  expected_reasoning_level VARCHAR(50),
  correct_answer_summary TEXT,
  common_wrong_answers JSONB DEFAULT '[]',
  
  -- ترتیب
  question_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_session ON assessment_questions(session_id);
CREATE INDEX idx_questions_node ON assessment_questions(node_id);
CREATE INDEX idx_questions_order ON assessment_questions(session_id, question_order);

-- ============================================================================
-- 10. پاسخ‌های کاربران
-- ============================================================================

CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- محتوای پاسخ
  answer_text_fa TEXT NOT NULL,
  answer_choices JSONB DEFAULT '{}',  -- برای multiple choice
  
  -- زمان‌بندی
  time_to_answer_seconds INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- تحلیل
  correctness_score FLOAT,  -- 0-100
  reasoning_quality_score FLOAT,  -- 0-100
  
  -- بازخورد
  feedback_fa TEXT,
  feedback_en TEXT,
  explanation_fa TEXT,
  explanation_en TEXT,
  
  -- اشتباهات
  detected_misconceptions JSONB DEFAULT '[]',
  
  -- پیش‌نهادات بعدی
  next_steps JSONB DEFAULT '[]',
  confidence_in_answer FLOAT,  -- 0-100, what AI thinks about answer quality
  
  -- AI Analysis
  ai_analysis JSONB DEFAULT '{}',  -- تمام جزئیات تحلیل
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answers_question ON user_answers(question_id);
CREATE INDEX idx_answers_user ON user_answers(user_id);
CREATE INDEX idx_answers_submitted ON user_answers(submitted_at);

-- ============================================================================
-- 11. نمرات دانش (برای ردیابی سریع)
-- ============================================================================

CREATE TABLE knowledge_scores_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  
  -- خلاصه نمرات
  overall_mastery FLOAT,
  overall_confidence FLOAT,
  
  -- توزیع
  nodes_mastered INTEGER DEFAULT 0,  -- > 80%
  nodes_proficient INTEGER DEFAULT 0,  -- 60-79%
  nodes_developing INTEGER DEFAULT 0,  -- 40-59%
  nodes_beginning INTEGER DEFAULT 0,  -- 20-39%
  nodes_not_started INTEGER DEFAULT 0,  -- < 20%
  
  -- جزئیات
  total_nodes INTEGER DEFAULT 0,
  total_assessed_nodes INTEGER DEFAULT 0,
  
  -- تکامل
  progress_vs_last_month FLOAT,  -- percentage
  estimated_days_to_mastery INTEGER,
  
  -- متادیتا
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_user_domain ON knowledge_scores_snapshot(user_id, domain_id);
CREATE INDEX idx_scores_date ON knowledge_scores_snapshot(snapshot_date DESC);

-- ============================================================================
-- 12. منابع یادگیری
-- ============================================================================

CREATE TABLE learning_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- معرفی
  title_fa VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  description_fa TEXT NOT NULL,
  description_en TEXT,
  
  -- نوع منبع
  resource_type VARCHAR(50) NOT NULL,  
  -- book, video, course, article, paper, exercise, project, podcast, tutorial
  
  -- اطلاعات
  url TEXT,
  author_name VARCHAR(255),
  publication_date DATE,
  language VARCHAR(10),
  
  -- مشخصات یادگیری
  difficulty_level INTEGER DEFAULT 2,  -- 1-5
  duration_minutes INTEGER,  -- برای ویدیو/کورس
  estimated_hours INTEGER,  -- برای کتاب/مقاله
  
  -- مرتبط با نودها
  relevant_nodes JSONB DEFAULT '[]',  -- node IDs
  covers_concepts JSONB DEFAULT '[]',
  
  -- کیفیت
  quality_rating FLOAT DEFAULT 0,  -- 0-5
  user_rating_count INTEGER DEFAULT 0,
  completion_rate FLOAT DEFAULT 0,  -- average user completion %
  
  -- دسترسی
  is_free BOOLEAN DEFAULT true,
  price_in_usd FLOAT,
  requires_signup BOOLEAN DEFAULT false,
  
  -- متادیتا
  tags JSONB DEFAULT '[]',
  source_platform VARCHAR(100),  -- youtube, udemy, medium, etc.
  
  -- سایز
  content_size_mb INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_type ON learning_resources(resource_type);
CREATE INDEX idx_resources_difficulty ON learning_resources(difficulty_level);
CREATE INDEX idx_resources_nodes ON learning_resources USING GIN (relevant_nodes);

-- ============================================================================
-- 13. توصیه‌های شخصی‌شده
-- ============================================================================

CREATE TABLE personalized_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  
  -- علت توصیه
  recommendation_reason_fa TEXT NOT NULL,
  recommendation_reason_en TEXT,
  
  -- حوزه و نود
  related_node_id UUID REFERENCES knowledge_nodes(id),
  related_domain_id UUID REFERENCES domains(id),
  
  -- نمرات‌دهی
  match_percentage INTEGER,  -- 0-100
  relevance_score FLOAT,  -- 0-1
  
  -- وضعیت
  status VARCHAR(20) DEFAULT 'pending',  -- pending, viewed, started, completed, skipped
  
  -- تعامل کاربر
  first_viewed_at TIMESTAMP WITH TIME ZONE,
  completion_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  user_rating INTEGER,  -- 1-5 stars
  user_feedback_fa TEXT,
  
  -- توقعی
  expected_impact_on_mastery FLOAT,  -- 0-1
  estimated_completion_days INTEGER,
  
  -- هنگام انقضاء
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendations_user ON personalized_recommendations(user_id);
CREATE INDEX idx_recommendations_resource ON personalized_recommendations(resource_id);
CREATE INDEX idx_recommendations_status ON personalized_recommendations(status);
CREATE INDEX idx_recommendations_expires ON personalized_recommendations(expires_at);

-- ============================================================================
-- 14. نقشه‌راه‌های یادگیری
-- ============================================================================

CREATE TABLE learning_roadmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  
  -- معرفی
  title_fa VARCHAR(255),
  
  -- موقعیت و هدف
  start_node_id UUID REFERENCES knowledge_nodes(id),
  goal_node_id UUID REFERENCES knowledge_nodes(id),
  current_node_id UUID REFERENCES knowledge_nodes(id),
  
  -- مراحل
  milestones JSONB NOT NULL,  -- [{node_id, target_date, success_criteria}, ...]
  current_milestone_index INTEGER DEFAULT 0,
  
  -- زمان‌بندی
  estimated_start_date DATE,
  estimated_completion_date DATE,
  
  -- پیشرفت
  completion_percentage FLOAT DEFAULT 0,
  
  -- وضعیت
  status VARCHAR(20) DEFAULT 'active',  -- active, paused, completed, abandoned
  
  -- تنظیمات
  learning_pace VARCHAR(50),  -- slow, moderate, fast
  preferred_learning_style VARCHAR(50),
  
  -- یادداشت‌ها
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roadmaps_user ON learning_roadmaps(user_id);
CREATE INDEX idx_roadmaps_domain ON learning_roadmaps(domain_id);
CREATE INDEX idx_roadmaps_status ON learning_roadmaps(status);

-- ============================================================================
-- 15. گزارش‌های جلسات
-- ============================================================================

CREATE TABLE session_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id),
  
  -- خلاصه
  executive_summary_fa TEXT,
  
  -- نتایج
  results_json JSONB NOT NULL,  -- {
    -- overall_score, improvement, strongest_areas, weakest_areas,
    -- misconceptions_count, confidence_levels, knowledge_gaps, recommendations
  -- }
  
  -- نقشه دانش
  knowledge_map_snapshot JSONB,  -- تصویر موقعیت دانش در این زمان
  
  -- پیشرفت
  progress_since_last_session_fa TEXT,
  
  -- توصیه‌ها
  next_objectives JSONB DEFAULT '[]',
  
  -- تولید
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- دسترسی
  is_published BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_session ON session_reports(session_id);
CREATE INDEX idx_reports_user ON session_reports(user_id);
CREATE INDEX idx_reports_generated ON session_reports(generated_at DESC);

-- ============================================================================
-- 16. تاریخچه تقدم کاربر
-- ============================================================================

CREATE TABLE user_progress_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(id),
  
  -- نقطه زمانی
  record_date DATE DEFAULT CURRENT_DATE,
  
  -- متریک‌های اصلی
  total_mastery_score FLOAT,
  total_confidence_score FLOAT,
  
  -- تفصیلات
  nodes_assessed_count INTEGER,
  sessions_completed_count INTEGER,
  total_study_hours FLOAT,
  
  -- تکامل
  week_over_week_improvement FLOAT,
  month_over_month_improvement FLOAT,
  
  -- متادیتا
  metrics_json JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_progress_user ON user_progress_history(user_id);
CREATE INDEX idx_progress_domain ON user_progress_history(domain_id);
CREATE INDEX idx_progress_date ON user_progress_history(record_date DESC);

-- ============================================================================
-- 17. سوابق فعالیت کاربران
-- ============================================================================

CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- فعالیت
  activity_type VARCHAR(50) NOT NULL,  
  -- started_assessment, completed_assessment, viewed_recommendation, 
  -- completed_resource, updated_goal, etc.
  
  activity_description TEXT,
  
  -- داده مرتبط
  related_session_id UUID REFERENCES assessment_sessions(id),
  related_resource_id UUID REFERENCES learning_resources(id),
  related_node_id UUID REFERENCES knowledge_nodes(id),
  
  -- اطلاعات
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON user_activity_logs(user_id);
CREATE INDEX idx_activity_type ON user_activity_logs(activity_type);
CREATE INDEX idx_activity_created ON user_activity_logs(created_at DESC);

-- ============================================================================
-- 18. تنظیمات و پیکربندی سیستم
-- ============================================================================

CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  
  -- نسخه
  version INTEGER DEFAULT 1,
  
  -- کنترل دسترسی
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_key ON system_config(config_key);

-- ============================================================================
-- 19. موارد کوتاه‌مدت - Cache اطلاعات
-- ============================================================================

CREATE TABLE user_session_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- اطلاعات جلسه
  current_assessment_session_id UUID,
  current_assessment_node_id UUID,
  
  -- کش اطلاعات
  cached_knowledge_map JSONB,
  cached_recommendations JSONB,
  
  -- TTL
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_expires ON user_session_cache(expires_at);

-- ============================================================================
-- 20. تریگرها و Functions
-- ============================================================================

-- تحدیث updated_at خودکار
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- بر روی جداول کلیدی
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_timestamp BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_nodes_timestamp BEFORE UPDATE ON knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_sessions_timestamp BEFORE UPDATE ON assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_resources_timestamp BEFORE UPDATE ON learning_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 21. Views برای جریان‌های رایج
-- ============================================================================

-- Dashboard Overview
CREATE OR REPLACE VIEW user_dashboard_overview AS
SELECT 
  u.id,
  u.full_name,
  COUNT(DISTINCT d.id) as domains_started,
  AVG(ukn.mastery_score) as overall_mastery,
  COUNT(DISTINCT CASE WHEN ukn.mastery_score >= 80 THEN ukn.node_id END) as nodes_mastered,
  COUNT(DISTINCT as_s.id) as total_assessments,
  MAX(as_s.start_time) as last_assessment_date
FROM users u
LEFT JOIN user_knowledge_nodes ukn ON u.id = ukn.user_id
LEFT JOIN knowledge_nodes kn ON ukn.node_id = kn.id
LEFT JOIN domains d ON kn.domain_id = d.id
LEFT JOIN assessment_sessions as_s ON u.id = as_s.user_id
GROUP BY u.id, u.full_name;

-- User Knowledge Map Status
CREATE OR REPLACE VIEW user_knowledge_map_status AS
SELECT 
  u.id as user_id,
  d.id as domain_id,
  d.name_fa,
  COUNT(kn.id) as total_nodes,
  COUNT(DISTINCT ukn.node_id) as assessed_nodes,
  ROUND(AVG(ukn.mastery_score)::numeric, 2) as avg_mastery,
  COUNT(DISTINCT CASE WHEN ukn.mastery_score >= 80 THEN ukn.node_id END) as nodes_mastered,
  COUNT(DISTINCT CASE WHEN um.is_corrected = false THEN um.id END) as uncorrected_misconceptions
FROM users u
CROSS JOIN domains d
LEFT JOIN knowledge_nodes kn ON d.id = kn.domain_id
LEFT JOIN user_knowledge_nodes ukn ON u.id = ukn.user_id AND kn.id = ukn.node_id
LEFT JOIN user_misconceptions um ON u.id = um.user_id AND kn.id = um.node_id
WHERE d.is_active = true
GROUP BY u.id, d.id, d.name_fa;

-- ============================================================================
-- 22. Row Level Security (Supabase)
-- ============================================================================

-- این تنظیمات در Supabase یا PostgreSQL با Role-based Access
-- هنگام راه‌اندازی باید فعال شود

-- IMPORTANT: نیاز به تنظیم Policies توسط DBA/DevOps است
-- مثال:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY users_own_data ON users
--   USING (auth.uid() = id);

-- ============================================================================
-- 23. Indexes برای Performance
-- ============================================================================

-- اضافی برای queries پرتکرار
CREATE INDEX idx_user_knowledge_date_range ON user_knowledge_nodes(user_id, last_assessed_at DESC);
CREATE INDEX idx_assessment_questions_session_order ON assessment_questions(session_id, question_order);
CREATE INDEX idx_learning_resources_nodes_relevance ON learning_resources USING GIN (relevant_nodes);

-- ============================================================================
-- 24. Materialized Views برای Reports
-- ============================================================================

CREATE MATERIALIZED VIEW user_learning_analytics AS
SELECT 
  u.id as user_id,
  u.full_name,
  d.id as domain_id,
  d.name_fa as domain_name,
  COUNT(DISTINCT as_s.id) as total_sessions,
  AVG(as_s.duration_minutes) as avg_session_duration,
  COUNT(aq.id) as total_questions_answered,
  AVG(ua.correctness_score) as avg_correctness,
  COUNT(DISTINCT um.id) as total_misconceptions,
  COUNT(DISTINCT CASE WHEN um.is_corrected = true THEN um.id END) as corrected_misconceptions,
  MAX(as_s.end_time) as last_session_date,
  EXTRACT(DAY FROM NOW() - MAX(as_s.end_time)) as days_since_last_session
FROM users u
LEFT JOIN assessment_sessions as_s ON u.id = as_s.user_id
LEFT JOIN domains d ON as_s.domain_id = d.id
LEFT JOIN assessment_questions aq ON as_s.id = aq.session_id
LEFT JOIN user_answers ua ON aq.id = ua.question_id
LEFT JOIN user_misconceptions um ON u.id = um.user_id AND as_s.domain_id = d.id
GROUP BY u.id, u.full_name, d.id, d.name_fa;

-- Refresh strategy: هر روز ساعت 2 صبح UTC
-- (در Supabase Webhooks یا Cron Jobs)

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
