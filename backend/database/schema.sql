-- ==============================================================================
-- Reality bRand Check AI - Supabase PostgreSQL Database Schema
-- Multi-tenant workspace architecture with Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (Linked with Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('ADMIN', 'EDITOR', 'REVIEWER')),
    workspace_id VARCHAR(100) NOT NULL DEFAULT 'default-workspace',
    avatar_url VARCHAR(500),
    hashed_password VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace ON profiles(workspace_id);

-- ------------------------------------------------------------------------------
-- 2. Brands Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    website VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_workspace ON brands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- ------------------------------------------------------------------------------
-- 3. Guidelines Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    brand_personality JSONB,
    tone_of_voice JSONB,
    messaging_rules JSONB,
    additional_guidelines TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guidelines_brand ON guidelines(brand_id);

-- ------------------------------------------------------------------------------
-- 4. Terminology Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS terminology (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    term_type VARCHAR(50) NOT NULL CHECK (term_type IN ('APPROVED', 'PROHIBITED', 'PREFERRED')),
    preferred_replacement VARCHAR(255),
    description TEXT,
    is_case_sensitive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terminology_brand ON terminology(brand_id);
CREATE INDEX IF NOT EXISTS idx_terminology_term ON terminology(term);

-- ------------------------------------------------------------------------------
-- 5. Approved Facts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approved_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    claim TEXT NOT NULL,
    evidence TEXT NOT NULL,
    source VARCHAR(500),
    approval_status VARCHAR(50) NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('APPROVED', 'PENDING_REVIEW', 'DEPRECATED')),
    tags JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approved_facts_brand ON approved_facts(brand_id);

-- ------------------------------------------------------------------------------
-- 6. Submissions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    workspace_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'ANALYZING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED')),
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    compliance_score REAL,
    overall_status VARCHAR(50) CHECK (overall_status IN ('COMPLIANT', 'FLAGGED', 'NON_COMPLIANT')),
    summary TEXT,
    corrected_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_workspace ON submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_submissions_brand ON submissions(brand_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ------------------------------------------------------------------------------
-- 7. Findings Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    ai_finding_id VARCHAR(100),
    category VARCHAR(50) NOT NULL CHECK (category IN ('TONE', 'TERMINOLOGY', 'CLAIM_VERIFICATION', 'BRAND_CONSISTENCY', 'GRAMMAR')),
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    original_text TEXT NOT NULL,
    matched_text TEXT,
    explanation TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    violated_guideline VARCHAR(255),
    rule_reference VARCHAR(255),
    evidence TEXT,
    confidence REAL,
    finding_status VARCHAR(50),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_findings_submission ON findings(submission_id);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);

-- ------------------------------------------------------------------------------
-- 8. Revisions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    changes_summary TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revisions_submission ON revisions(submission_id);

-- ------------------------------------------------------------------------------
-- 9. Approvals Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_submission ON approvals(submission_id);
CREATE INDEX IF NOT EXISTS idx_approvals_reviewer ON approvals(reviewer_id);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies (Supabase)
-- ------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read profiles within their workspace
CREATE POLICY "Profiles workspace select policy" ON profiles
    FOR SELECT TO authenticated
    USING (
        workspace_id = COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
            'default-workspace'
        ) OR id = auth.uid()
    );

CREATE POLICY "Profiles update own policy" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Brands: Users can only view and manage brands in their workspace
CREATE POLICY "Brands workspace access policy" ON brands
    FOR ALL TO authenticated
    USING (
        workspace_id = COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
            'default-workspace'
        )
    )
    WITH CHECK (
        workspace_id = COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
            'default-workspace'
        )
    );

-- Guidelines: Accessible if parent brand is in user workspace
CREATE POLICY "Guidelines workspace access policy" ON guidelines
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = guidelines.brand_id 
              AND brands.workspace_id = COALESCE(
                  NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
                  'default-workspace'
              )
        )
    );

-- Terminology: Accessible if parent brand is in user workspace
CREATE POLICY "Terminology workspace access policy" ON terminology
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = terminology.brand_id 
              AND brands.workspace_id = COALESCE(
                  NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
                  'default-workspace'
              )
        )
    );

-- Approved Facts: Accessible if parent brand is in user workspace
CREATE POLICY "Approved facts workspace access policy" ON approved_facts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = approved_facts.brand_id 
              AND brands.workspace_id = COALESCE(
                  NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
                  'default-workspace'
              )
        )
    );

-- Submissions: Workspace scoped
CREATE POLICY "Submissions workspace access policy" ON submissions
    FOR ALL TO authenticated
    USING (
        workspace_id = COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
            'default-workspace'
        )
    )
    WITH CHECK (
        workspace_id = COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
            'default-workspace'
        )
    );

-- Findings: Accessible via submission
CREATE POLICY "Findings workspace access policy" ON findings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = findings.submission_id 
              AND submissions.workspace_id = COALESCE(
                  NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
                  'default-workspace'
              )
        )
    );

-- Revisions: Accessible via submission
CREATE POLICY "Revisions workspace access policy" ON revisions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = revisions.submission_id 
              AND submissions.workspace_id = COALESCE(
                  NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
                  'default-workspace'
              )
        )
    );

-- Approvals: Accessible via submission
CREATE POLICY "Approvals workspace access policy" ON approvals
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM submissions 
            WHERE submissions.id = approvals.submission_id 
              AND submissions.workspace_id = COALESCE(
                  NULLIF(current_setting('request.jwt.claims', true)::json->>'workspace_id', ''),
                  'default-workspace'
              )
        )
    );

-- ------------------------------------------------------------------------------
-- Safe Non-Destructive Migrations (Schema Evolution)
-- ------------------------------------------------------------------------------
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS overall_status VARCHAR(50);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS corrected_content TEXT;

ALTER TABLE findings ADD COLUMN IF NOT EXISTS ai_finding_id VARCHAR(100);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS original_text TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS violated_guideline VARCHAR(255);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS confidence REAL;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS finding_status VARCHAR(50);



