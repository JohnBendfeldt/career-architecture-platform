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
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience_years INTEGER NOT NULL DEFAULT 9 CHECK (experience_years BETWEEN 0 AND 60),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GOALS & MILESTONES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT NOT NULL CHECK (char_length(description) <= 2000),
    category TEXT NOT NULL CHECK (category IN ('Technical', 'Personal')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    target_date TEXT NOT NULL CHECK (char_length(target_date) <= 60),
    status TEXT NOT NULL CHECK (status IN ('InProgress', 'Completed', 'Upcoming')),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

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
REVOKE ALL ON public.user_roles FROM anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.goals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.goals_id_seq TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
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
    id, name, headline, bio, location, email, avatar_url, github_url, linkedin_url, website_url, live_project_url, skills, experience_years, updated_at
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
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    skills = EXCLUDED.skills,
    updated_at = NOW();

INSERT INTO public.goals (
    id, title, description, category, progress, target_date, status, tags, created_at
) VALUES 
(
    1,
    'Enterprise Accounting & Membership Platform (C# / .NET)',
    'Engineering core web features for non-profit organizations to manage memberships, commerce, fundraising, and donations. Focused on C# and .NET development for checkout and subscription accounting, improving invoice handling efficiency, and optimizing client financial workflows.',
    'Technical',
    95,
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
    90,
    'Active',
    'InProgress',
    '["Garmin FIT", "Geospatial", "Leaflet", "C#", "Cycling"]'::jsonb,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    progress = EXCLUDED.progress,
    tags = EXCLUDED.tags;

-- Reset sequence to prevent ID collisions on manual insert
SELECT setval('profiles_id_seq', (SELECT MAX(id) FROM public.profiles));
SELECT setval('goals_id_seq', (SELECT MAX(id) FROM public.goals));
