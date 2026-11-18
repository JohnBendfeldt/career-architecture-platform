-- ==============================================================================
-- Career Architecture Platform - Supabase PostgreSQL Schema & Seed Script
-- Project URL: https://xudbpjhloclfrirzexhu.supabase.co
-- ==============================================================================

-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    headline TEXT NOT NULL CHECK (char_length(headline) BETWEEN 1 AND 200),
    bio TEXT NOT NULL CHECK (char_length(bio) <= 4000),
    location TEXT NOT NULL CHECK (char_length(location) <= 120),
    email TEXT NOT NULL CHECK (char_length(email) <= 254),
    avatar_url TEXT NOT NULL CHECK (char_length(avatar_url) <= 2000),
    github_url TEXT NOT NULL CHECK (char_length(github_url) <= 2000),
    linkedin_url TEXT NOT NULL CHECK (char_length(linkedin_url) <= 2000),
    website_url TEXT NOT NULL DEFAULT 'https://johnbendfeldt.com' CHECK (char_length(website_url) <= 2000),
    live_project_url TEXT NOT NULL DEFAULT 'https://basiclanguage.school' CHECK (char_length(live_project_url) <= 2000),
    skills JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(skills) = 'array' AND jsonb_array_length(skills) <= 100),
    experience_years INTEGER NOT NULL DEFAULT 9 CHECK (experience_years BETWEEN 0 AND 80),
    annual_goal_hours NUMERIC(5,2) NOT NULL DEFAULT 55.00 CHECK (annual_goal_hours BETWEEN 1 AND 2000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS annual_goal_hours NUMERIC(5,2) NOT NULL DEFAULT 55.00;

-- 2. GOALS & MILESTONES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT NOT NULL CHECK (char_length(description) <= 2000),
    category TEXT NOT NULL CHECK (category IN ('Technical', 'Personal')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    target_hours NUMERIC(6,2) NULL CHECK (target_hours IS NULL OR (target_hours > 0 AND target_hours <= 9999)),
    target_date TEXT NOT NULL CHECK (char_length(target_date) <= 60),
    status TEXT NOT NULL CHECK (status IN ('InProgress', 'Completed', 'Upcoming')),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array' AND jsonb_array_length(tags) <= 20 AND pg_column_size(tags) <= 4096),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

ALTER TABLE public.goals
    ADD COLUMN IF NOT EXISTS target_hours NUMERIC(6,2) NULL;

-- 2B. CAREER ADVANCEMENT CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- 2C. CAREER DEVELOPMENT ENTRIES TABLE (Tandem with Goals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_entries (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT NULL CHECK (description IS NULL OR char_length(description) <= 2000),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours NUMERIC(6,2) NOT NULL CHECK (hours > 0 AND hours <= 1000),
    category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
    goal_id INTEGER REFERENCES public.goals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_career_entries_dates CHECK (start_date <= end_date)
);

ALTER TABLE public.career_entries
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_career_entries_user_id ON public.career_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_career_entries_goal_id ON public.career_entries(goal_id);

-- 3. USER ROLES & PERMISSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'recruiter', 'guest')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRIVILEGE HARDENING & ROW LEVEL SECURITY (RLS)
-- Unauthenticated (anon) requests have read-only access strictly to public portfolio rows;
-- authenticated users can strictly ONLY insert, update, and delete their OWN goal rows.
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.goals FROM anon, authenticated;
REVOKE ALL ON public.categories FROM anon, authenticated;
REVOKE ALL ON public.career_entries FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.goals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.goals_id_seq TO authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.career_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.career_entries TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.career_entries_id_seq TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
-- Profiles: Public read access for portfolio visitors (read-only; writes restricted to service_role)
DROP POLICY IF EXISTS "Allow public read access to profile" ON public.profiles;
CREATE POLICY "Allow public read access to profile"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (true);

-- Goals: Public read access only to seeded portfolio rows (user_id IS NULL);
-- authenticated users also see their own personal rows (auth.uid() = user_id)
DROP POLICY IF EXISTS "Allow public read access to goals" ON public.goals;
CREATE POLICY "Allow public read access to goals"
    ON public.goals FOR SELECT
    TO anon, authenticated
    USING (user_id IS NULL OR auth.uid() = user_id);

-- Goals: Only authenticated users can insert, and strictly for their own user_id
DROP POLICY IF EXISTS "Allow authenticated insert to goals" ON public.goals;
CREATE POLICY "Allow authenticated insert to goals"
    ON public.goals FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Goals: Authenticated users can update only their own personal goals
DROP POLICY IF EXISTS "Allow authenticated update own goals" ON public.goals;
CREATE POLICY "Allow authenticated update own goals"
    ON public.goals FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Goals: Authenticated users can delete only their own personal goals
DROP POLICY IF EXISTS "Allow authenticated delete own goals" ON public.goals;
CREATE POLICY "Allow authenticated delete own goals"
    ON public.goals FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Categories: Public read access only (writes restricted to service_role)
DROP POLICY IF EXISTS "Allow authenticated write to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (true);

-- Career Entries: Public read access only to seeded portfolio rows (user_id IS NULL);
-- authenticated users can strictly manage only their own entries (auth.uid() = user_id)
DROP POLICY IF EXISTS "Allow public read access to career_entries" ON public.career_entries;
CREATE POLICY "Allow public read access to career_entries"
    ON public.career_entries FOR SELECT
    TO anon, authenticated
    USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated insert to career_entries" ON public.career_entries;
CREATE POLICY "Allow authenticated insert to career_entries"
    ON public.career_entries FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
        AND (
            goal_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.goals g
                WHERE g.id = goal_id AND (g.user_id IS NULL OR g.user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Allow authenticated update to career_entries" ON public.career_entries;
DROP POLICY IF EXISTS "Allow authenticated update own career_entries" ON public.career_entries;
CREATE POLICY "Allow authenticated update own career_entries"
    ON public.career_entries FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND (
            goal_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.goals g
                WHERE g.id = goal_id AND (g.user_id IS NULL OR g.user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Allow authenticated delete to career_entries" ON public.career_entries;
DROP POLICY IF EXISTS "Allow authenticated delete own career_entries" ON public.career_entries;
CREATE POLICY "Allow authenticated delete own career_entries"
    ON public.career_entries FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- User Roles: Authenticated users can inspect only their own role
DROP POLICY IF EXISTS "Allow users to view own role" ON public.user_roles;
CREATE POLICY "Allow users to view own role"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. AUTOMATIC USER REGISTRATION TRIGGER (Handles GitHub / Google / Azure sign-ins)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'recruiter')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. SEED DATA (Clean UPSERT)
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (
    id, name, headline, bio, location, email, avatar_url, github_url, linkedin_url, website_url, live_project_url, skills, experience_years, annual_goal_hours, updated_at
) VALUES (
    1,
    'John F. Bendfeldt',
    'Senior Software Developer',
    'Software Engineer with a track record of building out features and maintaining large scale SaaS applications. Adept at working with diverse cross-functional teams to drive projects from architecture to deployment. Brings 9 years of expertise in full-stack web development, CI/CD pipelines, and modernizing legacy codebases into scalable .NET and React environments.',
    'Austin, TX',
    'jfbendfeldt@gmail.com',
    '/john-bendfeldt.jpg',
    'https://github.com/JohnBendfeldt',
    'https://linkedin.com/in/johnbendfeldt',
    'https://johnbendfeldt.com',
    'https://basiclanguage.school',
    '["C#", "JavaScript (Vanilla/ES6+)", "TypeScript", "HTML/CSS", "SQL", "PostgreSQL", ".NET (Core, 6, 10)", "React", "Node.js", "Vite", "Git", "Docker", "Azure DevOps", "SQL Server", "CI/CD pipelines", "GitHub Copilot", "Claude Code & Gemini CLI", "Agile/Scrum", "Test-Driven Development (TDD)", "Unit & Integration Testing"]'::jsonb,
    9,
    55.00,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    skills = EXCLUDED.skills,
    annual_goal_hours = EXCLUDED.annual_goal_hours,
    updated_at = NOW();

INSERT INTO public.goals (
    id, title, description, category, progress, target_hours, target_date, status, tags, created_at
) VALUES 
(
    1,
    'Enterprise Accounting & Membership Platform (C# / .NET)',
    'Engineering core web features for non-profit organizations to manage memberships, commerce, fundraising, and donations. Focused on C# and .NET development for checkout and subscription accounting, improving invoice handling efficiency, and optimizing client financial workflows.',
    'Technical',
    95,
    20.00,
    'Present',
    'InProgress',
    '["C#", ".NET", "SaaS", "Accounting", "Financial Workflows", "Azure DevOps"]'::jsonb,
    NOW()
),
(
    2,
    'Training Hour Tracking Application (trainingtracker.advsol.com)',
    'Architected and built an internal Training Hour Tracking application using .NET 10, Vite, and vanilla JavaScript, leveraging AI-assisted development workflows to accelerate delivery and automate manual HR tracking.',
    'Technical',
    100,
    NULL,
    'Deployed',
    'Completed',
    '["trainingtracker.advsol.com", ".NET 10", "Vite", "JavaScript", "AI Workflows", "HR Tech"]'::jsonb,
    NOW()
),
(
    3,
    'Basic Language School (basiclanguage.school)',
    'Built a high-performance PWA supporting 210 bidirectional language pairs across 15 languages, featuring 14,400+ neural audio assets, offline caching, interactive active-recall quizzes with custom virtual keyboards, and Supabase cloud sync.',
    'Personal',
    100,
    NULL,
    'Live in Production',
    'Completed',
    '["basiclanguage.school", "PWA", "Language Learning", "Supabase", "Vitest", "Playwright"]'::jsonb,
    NOW()
),
(
    4,
    'International Address & Province Data (country-province-data)',
    'Published and maintained zero-dependency npm package powering international checkout flows, downloaded hundreds of times a week and thousands of times a year with 0 bugs over 8 years.',
    'Technical',
    100,
    NULL,
    'Published (8 yrs active)',
    'Completed',
    '["npm", "Open Source", "E-Commerce", "JavaScript"]'::jsonb,
    NOW()
),
(
    5,
    'Cloud Architecture & Microservices (.NET & YARP)',
    'Architecting resilient microservice gateways with YARP, asynchronous message processing, and containerized cloud services in Azure to ensure sub-millisecond routing and high availability.',
    'Technical',
    95,
    20.00,
    'Active',
    'InProgress',
    '["YARP", "Microservices", ".NET 10", "Cloud Architecture", "Azure"]'::jsonb,
    NOW()
),
(
    6,
    'Geospatial Binary Data Pipelines (Garmin FIT)',
    'Parsing Garmin FIT binary telemetry into streamable GPS coordinate arrays, elevation profiles, and responsive Leaflet map visualizations.',
    'Personal',
    75,
    16.00,
    'Active',
    'InProgress',
    '["Garmin FIT", "Geospatial", "Leaflet", "C#", "Cycling"]'::jsonb,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    progress = EXCLUDED.progress,
    target_hours = EXCLUDED.target_hours,
    tags = EXCLUDED.tags;

INSERT INTO public.categories (id, name, description, is_active, display_order) VALUES
(1, 'Development', 'Software development and programming skills', true, 1),
(2, 'Quality Assurance', 'Testing, quality control, and assurance practices', true, 2),
(3, 'Leadership', 'Professional growth and leadership skills', true, 3),
(4, 'Cloud Computing', 'Cloud platforms and services', true, 4),
(5, 'Data Science', 'Data analysis, machine learning, and AI', true, 5),
(6, 'Security', 'Cybersecurity and information security', true, 6),
(7, 'Project Management', 'Project planning and execution methodologies', true, 7),
(8, 'Communication', 'Interpersonal and presentation skills', true, 8),
(9, 'Design', 'UI/UX and graphic design skills', true, 9)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order;

INSERT INTO public.career_entries (
    id, title, description, start_date, end_date, hours, category_id, goal_id, created_at
) VALUES
(
    1,
    'Subscription Ledger & Checkout Accounting Architecture',
    'Deep-dive on idempotent invoice pipelines, double-entry journal reconciliation, and EF Core query optimization.',
    '2026-02-10',
    '2026-02-12',
    11.00,
    1,
    1,
    '2026-02-12T18:00:00Z'
),
(
    2,
    '.NET 10 Financial Workflow Optimization & Unit Testing',
    'Refactored legacy billing handlers with deterministic xUnit regression suites and covering SQL indexes.',
    '2026-04-18',
    '2026-04-19',
    8.00,
    1,
    1,
    '2026-04-19T18:00:00Z'
),
(
    3,
    'YARP Reverse Proxy & Distributed Gateway Patterns',
    'Implemented cluster routing, health checks, and sub-millisecond gateway proxying in .NET 10.',
    '2026-06-05',
    '2026-06-07',
    12.50,
    4,
    5,
    '2026-06-07T18:00:00Z'
),
(
    4,
    'Containerized Azure Microservices & JWT Hardening',
    'Multi-stage Dockerfiles, strict CORS/rate-limiting policies, and claim-based read-only demo enforcement.',
    '2026-08-22',
    '2026-08-23',
    6.50,
    6,
    5,
    '2026-08-23T18:00:00Z'
),
(
    5,
    'Garmin FIT Binary Decoding & Geospatial Telemetry Pipelines',
    'Decoded 32-bit semicircle coordinates, elevation splits, and interactive Leaflet vector layers.',
    '2026-10-12',
    '2026-10-14',
    12.00,
    5,
    6,
    '2026-10-14T18:00:00Z'
),
(
    6,
    'Docker & Container Orchestration Deep Dive',
    'Multi-stage container builds, Docker Compose networking, and healthchecks for .NET 10 services.',
    '2025-09-18',
    '2025-09-19',
    12.00,
    4,
    NULL,
    '2025-09-19T18:00:00Z'
),
(
    7,
    'Automated E2E Testing with Playwright & Vitest',
    'Deterministic browser verification, network mocking, and CI pipeline integration.',
    '2025-11-14',
    '2025-11-14',
    8.00,
    2,
    NULL,
    '2025-11-14T18:00:00Z'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    hours = EXCLUDED.hours,
    category_id = EXCLUDED.category_id,
    goal_id = EXCLUDED.goal_id;

-- Reset sequence to prevent ID collisions on manual insert
SELECT setval('profiles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.profiles));
SELECT setval('goals_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.goals));
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.categories));
SELECT setval('career_entries_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.career_entries));
