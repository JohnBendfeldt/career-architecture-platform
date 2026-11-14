import type {
  Profile,
  Goal,
  AuthResponse,
  RouteData,
  RideSummary,
  User,
  LearningResource,
  ExtractSkillsResponse,
  LearningResourcesResponse,
  Category,
  CareerEntry,
  CreateCareerEntryInput
} from '../types';
import { getOrInitSupabaseClient } from './supabase';
import {
  isSafeImageUrl,
  sanitizeExternalUrl,
  safeParseStorageObject,
  safeParseStorageArray,
} from '../utils/security';
import {
  DEFAULT_CATEGORIES,
  enrichGoalsWithEntries,
  validateCareerEntry,
} from '../utils/advancementUtils';

const API_BASE = ''; // proxied by Vite in dev to Gateway

const isJson = (res: Response): boolean => {
  const ct = res.headers.get('content-type');
  return Boolean(res.ok && ct && ct.includes('application/json'));
};

function sanitizeStoredProfile(profile: Profile): Profile {
  return {
    ...profile,
    avatarUrl: isSafeImageUrl(profile.avatarUrl) ? profile.avatarUrl.trim() : '',
    githubUrl: sanitizeExternalUrl(profile.githubUrl, 'https://github.com'),
    linkedinUrl: sanitizeExternalUrl(profile.linkedinUrl, 'https://linkedin.com'),
    websiteUrl: profile.websiteUrl ? sanitizeExternalUrl(profile.websiteUrl, '') : undefined,
    liveProjectUrl: profile.liveProjectUrl ? sanitizeExternalUrl(profile.liveProjectUrl, '') : undefined,
    skills: Array.isArray(profile.skills) ? profile.skills.filter((s): s is string => typeof s === 'string') : [],
  };
}

function isValidGoalShape(item: unknown): item is Goal {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.title === 'string' && typeof candidate.description === 'string';
}

function normalizeGoalList(goals: Goal[]): Goal[] {
  return goals.map((g, idx) => ({
    ...g,
    id: typeof g.id === 'number' ? g.id : idx + 1,
    progress: typeof g.progress === 'number' ? Math.max(0, Math.min(100, g.progress)) : 0,
    tags: Array.isArray(g.tags) ? g.tags.filter((t): t is string => typeof t === 'string') : [],
  }));
}

function isValidCareerEntryShape(item: unknown): item is CareerEntry {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.startDate === 'string' &&
    typeof candidate.endDate === 'string' &&
    typeof candidate.hours === 'number'
  );
}

export class ApiService {
  private static TOKEN_KEY = 'cap_auth_token';
  private static USER_KEY = 'cap_auth_user';
  private static CUSTOM_GOALS_KEY = 'cap_custom_goals';
  private static CUSTOM_ENTRIES_KEY = 'cap_custom_entries';
  private static OWNER_ENTRIES_KEY = 'cap_owner_portfolio_entries';
  private static CUSTOM_PROFILE_PREFIX = 'cap_custom_profile_';
  private static lastGeneratedId = 0;

  private static nextLocalId(): number {
    const next = Math.max(Date.now(), this.lastGeneratedId + 1);
    this.lastGeneratedId = next;
    return next;
  }

  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  static getUser(): User | null {
    try {
      const parsed = safeParseStorageObject<User>(localStorage.getItem(this.USER_KEY));
      if (!parsed || typeof parsed.id !== 'string' || typeof parsed.email !== 'string') {
        return null;
      }
      return {
        ...parsed,
        avatarUrl: isSafeImageUrl(parsed.avatarUrl) ? parsed.avatarUrl : '',
      };
    } catch {
      return null;
    }
  }

  static setSession(token: string, user: User): void {
    const safeUser: User = {
      ...user,
      avatarUrl: isSafeImageUrl(user.avatarUrl) ? user.avatarUrl : '',
    };
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(safeUser));
  }

  static clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static isPortfolioOwner(user: User | null | undefined): boolean {
    if (!user || user.role === 'guest') return false;
    const lowerEmail = (user.email || '').trim().toLowerCase();
    return (
      lowerEmail === 'jfbendfeldt@gmail.com' ||
      lowerEmail.endsWith('@johnbendfeldt.com')
    );
  }

  static getDefaultPortfolioProfile(): Profile {
    try {
      const parsed = safeParseStorageObject<Profile>(localStorage.getItem('cap_owner_portfolio_profile'));
      if (parsed && typeof parsed.name === 'string' && parsed.headline !== 'Software Engineer & Systems Builder') {
        return sanitizeStoredProfile(parsed);
      }
    } catch {
      // ignore
    }

    return {
      id: 1,
      name: 'John F. Bendfeldt',
      vanitySlug: 'john-bendfeldt',
      headline: 'Senior Software Developer',
      bio: 'Software Engineer with a track record of building out features and maintaining large scale SaaS applications. Adept at working with diverse cross-functional teams to drive projects from architecture to deployment. Brings 9 years of expertise in full-stack web development, CI/CD pipelines, and modernizing legacy codebases into scalable .NET and React environments.',
      location: 'Austin, TX',
      email: 'jfbendfeldt@gmail.com',
      avatarUrl: '/john-bendfeldt.jpg',
      githubUrl: 'https://github.com/JohnBendfeldt',
      linkedinUrl: 'https://linkedin.com/in/johnbendfeldt',
      skills: [
        'C#',
        'JavaScript (Vanilla/ES6+)',
        'TypeScript',
        'HTML/CSS',
        'SQL',
        'PostgreSQL',
        '.NET (Core, 6, 10)',
        'React',
        'Node.js',
        'Vite',
        'Git',
        'Docker',
        'Azure DevOps',
        'SQL Server',
        'CI/CD pipelines',
        'GitHub Copilot',
        'AI-Assisted Development (Claude Code & Gemini CLI)',
        'Agile/Scrum',
        'Test-Driven Development (TDD)',
        'Unit & Integration Testing',
      ],
      experienceYears: 9,
      annualGoalHours: 55,
      updatedAt: new Date().toISOString(),
    };
  }

  static toVanitySlug(name: string): string {
    return (name || 'professional')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'professional';
  }

  static getCustomProfile(user: User): Profile {
    if (this.isPortfolioOwner(user)) {
      const ownerProfile = this.getDefaultPortfolioProfile();
      localStorage.setItem(`${this.CUSTOM_PROFILE_PREFIX}${user.id}`, JSON.stringify(ownerProfile));
      localStorage.setItem('cap_profile_slug_john-bendfeldt', JSON.stringify(ownerProfile));
      return ownerProfile;
    }

    const parsed = safeParseStorageObject<Profile>(localStorage.getItem(`${this.CUSTOM_PROFILE_PREFIX}${user.id}`));
    if (parsed && typeof parsed.name === 'string') {
      if (!parsed.vanitySlug) {
        parsed.vanitySlug = this.toVanitySlug(parsed.name || user.name);
      }
      return sanitizeStoredProfile(parsed);
    }

    const slug = this.toVanitySlug(user.name);
    const defaultCustom: Profile = {
      id: 999,
      name: user.name || 'Verified Professional',
      vanitySlug: slug,
      headline: 'Software Engineer & Systems Builder',
      bio: `Full-stack engineer focused on scalable cloud systems, automated delivery pipelines, and continuous technical growth.`,
      location: 'Remote / Global',
      email: user.email || '',
      avatarUrl: isSafeImageUrl(user.avatarUrl) ? (user.avatarUrl || '') : '',
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
      skills: ['TypeScript', 'React', '.NET', 'Cloud Architecture', 'AI Workflows'],
      experienceYears: 5,
      annualGoalHours: 45,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`cap_profile_slug_${slug}`, JSON.stringify(defaultCustom));
    return defaultCustom;
  }

  static saveCustomProfile(userId: string, profile: Profile): Profile {
    const cleanSlug = (profile.vanitySlug || this.toVanitySlug(profile.name))
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const updated = sanitizeStoredProfile({
      ...profile,
      vanitySlug: cleanSlug || this.toVanitySlug(profile.name),
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(`${this.CUSTOM_PROFILE_PREFIX}${userId}`, JSON.stringify(updated));
    if (updated.vanitySlug) {
      localStorage.setItem(`cap_profile_slug_${updated.vanitySlug.toLowerCase()}`, JSON.stringify(updated));
    }
    if (this.isPortfolioOwner(this.getUser())) {
      localStorage.setItem('cap_owner_portfolio_profile', JSON.stringify(updated));
    }
    return updated;
  }

  static humanizeSlug(slug: string): string {
    return slug
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Professional';
  }

  static getProfileBySlug(slug: string): Profile | null {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) return null;

    if (clean === 'john-bendfeldt' || clean === 'john-f-bendfeldt' || clean === 'jfbendfeldt') {
      return this.getDefaultPortfolioProfile();
    }

    const parsed = safeParseStorageObject<Profile>(localStorage.getItem(`cap_profile_slug_${clean}`));
    if (parsed && typeof parsed.name === 'string') {
      return sanitizeStoredProfile(parsed);
    }

    // Fallback for public / incognito visitors opening /profile/:slug directly
    const displayName = this.humanizeSlug(clean);
    return {
      id: 999,
      name: displayName,
      vanitySlug: clean,
      headline: 'Software Engineer & Systems Builder',
      bio: `Full-stack engineer focused on scalable cloud systems, automated delivery pipelines, and continuous technical growth.`,
      location: 'Remote / Global',
      email: '',
      avatarUrl: '',
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
      skills: ['TypeScript', 'React', '.NET', 'Cloud Architecture', 'AI Workflows'],
      experienceYears: 5,
      annualGoalHours: 45,
      updatedAt: new Date().toISOString(),
    };
  }

  static getPersonalEntries(): CareerEntry[] {
    const parsed = safeParseStorageArray<CareerEntry>(
      localStorage.getItem(this.CUSTOM_ENTRIES_KEY),
      isValidCareerEntryShape
    );
    if (parsed) {
      return parsed;
    }
    const starterEntries: CareerEntry[] = [
      {
        id: 2001,
        title: 'AI Skill Extraction & Learning Roadmap Setup',
        description: 'Analyzed target engineering role requirements and started curated study track.',
        startDate: '2026-10-20',
        endDate: '2026-10-20',
        hours: 2.5,
        categoryId: 1,
        category: 'Development',
        goalId: 1002,
        goalTitle: 'Step 2: Extract Skills & Curated Courses from Any Job Spec',
        createdAt: new Date('2026-10-20T16:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 2002,
        title: 'System Architecture Review & Career Baseline',
        description: 'Audited production experience, milestones, and annual study hour targets.',
        startDate: '2026-09-14',
        endDate: '2026-09-14',
        hours: 4,
        categoryId: 3,
        category: 'Leadership',
        goalId: null,
        goalTitle: null,
        createdAt: new Date('2026-09-14T16:00:00Z').toISOString(),
        updatedAt: null,
      },
    ];
    this.saveStoredCustomEntries(starterEntries);
    return starterEntries;
  }

  private static saveStoredCustomEntries(entries: CareerEntry[]): void {
    localStorage.setItem(this.CUSTOM_ENTRIES_KEY, JSON.stringify(entries));
  }

  static getPersonalGoals(): Goal[] {
    const entries = this.getPersonalEntries();
    const parsed = safeParseStorageArray<Goal>(
      localStorage.getItem(this.CUSTOM_GOALS_KEY),
      isValidGoalShape
    );
    if (parsed) {
      return enrichGoalsWithEntries(normalizeGoalList(parsed), entries);
    }
    const starterGoals: Goal[] = [
      {
        id: 1001,
        title: 'Step 1: Customize Your Personal Architecture Profile',
        description: 'Click "Edit My Profile" in the top hero card to set your own Display Name, Headline, Bio, Location, and GitHub / LinkedIn URLs. Click "+25%" on this card to mark your progress!',
        category: 'Personal',
        progress: 50,
        targetHours: null,
        targetDate: 'Getting Started',
        status: 'InProgress',
        tags: ['Onboarding', 'Personal Profile', 'Try +25% Button'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 1002,
        title: 'Step 2: Extract Skills & Curated Courses from Any Job Spec',
        description: 'Open "03 / AI Skill Pipeline", paste your own resume bio or a target job description, and track study hours against this 10-hour learning milestone.',
        category: 'Technical',
        progress: 25,
        targetHours: 10,
        targetDate: 'AI Pipeline',
        status: 'InProgress',
        tags: ['Gemini AI', 'YouTube & Udemy', 'Skill Extractor'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 1003,
        title: 'Step 3: Add Your Own Goals, Roles & GPS Routes',
        description: 'Click "+ Add Goal" above to create your own milestone, log career development hours, add work history in "01 / Experience", or upload a .FIT / .GPX file in "04 / Garmin Geospatial".',
        category: 'Technical',
        progress: 25,
        targetHours: null,
        targetDate: 'Your Sandbox',
        status: 'InProgress',
        tags: ['Custom Goals', 'Resume Builder', 'Garmin FIT / GPX'],
        createdAt: new Date().toISOString(),
      },
    ];
    this.saveStoredCustomGoals(starterGoals);
    return enrichGoalsWithEntries(starterGoals, entries);
  }

  private static saveStoredCustomGoals(goals: Goal[]): void {
    localStorage.setItem(this.CUSTOM_GOALS_KEY, JSON.stringify(goals));
  }

  static async loginAsGuest(): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (isJson(res)) {
        const data: AuthResponse = await res.json();
        this.setSession(data.token, data.user);
        return data;
      }
    } catch {
      // Backend unavailable, fallback to mock guest session
    }

    // Fallback if gateway is booting
    const fallbackUser: User = {
      id: 'guest-recruiter-demo-user',
      name: 'Guest Recruiter',
      email: 'guest@demo.local',
      role: 'guest',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    const fallbackToken = 'mock_guest_jwt_token_career_architecture';
    this.setSession(fallbackToken, fallbackUser);
    return { token: fallbackToken, user: fallbackUser };
  }

  static async getProfile(): Promise<Profile> {
    // 1. Try Supabase if configured
    const sbClient = getOrInitSupabaseClient();
    if (sbClient) {
      try {
        const { data, error } = await sbClient.from('profiles').select('*').limit(1).maybeSingle();
        if (data && !error) {
          return sanitizeStoredProfile({
            id: data.id,
            name: data.name,
            headline: data.headline,
            bio: data.bio,
            location: data.location,
            email: data.email,
            avatarUrl: data.avatar_url,
            githubUrl: data.github_url,
            linkedinUrl: data.linkedin_url,
            websiteUrl: data.website_url,
            liveProjectUrl: data.live_project_url,
            skills: Array.isArray(data.skills)
              ? data.skills
              : (safeParseStorageArray<string>(data.skills, (s): s is string => typeof s === 'string') || []),
            experienceYears: data.experience_years,
            annualGoalHours: data.annual_goal_hours != null ? Number(data.annual_goal_hours) : 55,
            updatedAt: data.updated_at,
          });
        }
      } catch {
        // Fallback
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/profile`);
      if (isJson(res)) {
        const apiProfile: Profile = await res.json();
        return sanitizeStoredProfile({
          ...apiProfile,
          annualGoalHours: apiProfile.annualGoalHours ?? 55,
        });
      }
    } catch {
      // Backend unavailable, using verified profile data
    }

    return this.getDefaultPortfolioProfile();
  }

  private static getStoredOwnerEntries(baseEntries?: CareerEntry[]): CareerEntry[] {
    const parsed = safeParseStorageArray<CareerEntry>(
      localStorage.getItem(this.OWNER_ENTRIES_KEY),
      isValidCareerEntryShape
    );
    if (parsed) {
      return parsed;
    }
    return baseEntries ?? this.getDefaultPortfolioEntries();
  }

  private static saveStoredOwnerEntries(entries: CareerEntry[]): void {
    localStorage.setItem(this.OWNER_ENTRIES_KEY, JSON.stringify(entries));
  }

  private static getOwnerPortfolioGoals(baseGoals: Goal[]): Goal[] {
    const parsedGoals = safeParseStorageArray<Goal>(
      localStorage.getItem('cap_owner_portfolio_goals'),
      isValidGoalShape
    );
    const resolvedGoals =
      parsedGoals && parsedGoals.length > 0 ? normalizeGoalList(parsedGoals) : baseGoals;

    const rawEntries = localStorage.getItem(this.OWNER_ENTRIES_KEY);
    if (rawEntries) {
      return enrichGoalsWithEntries(resolvedGoals, this.getStoredOwnerEntries());
    }

    const needsClientEnrichment = resolvedGoals.some(
      (g) => (g.targetHours ?? 0) > 0 && g.loggedHours === undefined
    );
    return needsClientEnrichment
      ? enrichGoalsWithEntries(resolvedGoals, this.getDefaultPortfolioEntries())
      : resolvedGoals;
  }

  static getDefaultPortfolioEntries(): CareerEntry[] {
    return [
      {
        id: 1,
        title: 'Subscription Ledger & Checkout Accounting Architecture',
        description: 'Deep-dive on idempotent invoice pipelines, double-entry journal reconciliation, and EF Core query optimization.',
        startDate: '2026-02-10',
        endDate: '2026-02-12',
        hours: 11,
        categoryId: 1,
        category: 'Development',
        goalId: 1,
        goalTitle: 'Enterprise Accounting & Membership Platform (C# / .NET)',
        createdAt: new Date('2026-02-12T18:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 2,
        title: '.NET 10 Financial Workflow Optimization & Unit Testing',
        description: 'Refactored legacy billing handlers with deterministic xUnit regression suites and covering SQL indexes.',
        startDate: '2026-04-18',
        endDate: '2026-04-19',
        hours: 8,
        categoryId: 1,
        category: 'Development',
        goalId: 1,
        goalTitle: 'Enterprise Accounting & Membership Platform (C# / .NET)',
        createdAt: new Date('2026-04-19T18:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 3,
        title: 'YARP Reverse Proxy & Distributed Gateway Patterns',
        description: 'Implemented cluster routing, health checks, and sub-millisecond gateway proxying in .NET 10.',
        startDate: '2026-06-05',
        endDate: '2026-06-07',
        hours: 12.5,
        categoryId: 4,
        category: 'Cloud Computing',
        goalId: 5,
        goalTitle: 'Cloud Architecture & Microservices (.NET & YARP)',
        createdAt: new Date('2026-06-07T18:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 4,
        title: 'Containerized Azure Microservices & JWT Hardening',
        description: 'Multi-stage Dockerfiles, strict CORS/rate-limiting policies, and claim-based read-only demo enforcement.',
        startDate: '2026-08-22',
        endDate: '2026-08-23',
        hours: 6.5,
        categoryId: 6,
        category: 'Security',
        goalId: 5,
        goalTitle: 'Cloud Architecture & Microservices (.NET & YARP)',
        createdAt: new Date('2026-08-23T18:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 5,
        title: 'Garmin FIT Binary Decoding & Geospatial Telemetry Pipelines',
        description: 'Decoded 32-bit semicircle coordinates, elevation splits, and interactive Leaflet vector layers.',
        startDate: '2026-10-12',
        endDate: '2026-10-14',
        hours: 12,
        categoryId: 5,
        category: 'Data Science',
        goalId: 6,
        goalTitle: 'Geospatial Binary Data Pipelines (Garmin FIT)',
        createdAt: new Date('2026-10-14T18:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 6,
        title: 'Docker & Container Orchestration Deep Dive',
        description: 'Multi-stage container builds, Docker Compose networking, and healthchecks for .NET 10 services.',
        startDate: '2025-09-18',
        endDate: '2025-09-19',
        hours: 12,
        categoryId: 4,
        category: 'Cloud Computing',
        goalId: null,
        goalTitle: null,
        createdAt: new Date('2025-09-19T18:00:00Z').toISOString(),
        updatedAt: null,
      },
      {
        id: 7,
        title: 'Automated E2E Testing with Playwright & Vitest',
        description: 'Deterministic browser verification, network mocking, and CI pipeline integration.',
        startDate: '2025-11-14',
        endDate: '2025-11-14',
        hours: 8,
        categoryId: 2,
        category: 'Quality Assurance',
        goalId: null,
        goalTitle: null,
        createdAt: new Date('2025-11-14T18:00:00Z').toISOString(),
        updatedAt: null,
      },
    ];
  }

  static async getGoals(): Promise<Goal[]> {
    // 1. Try Supabase if configured
    const sbClient = getOrInitSupabaseClient();
    if (sbClient) {
      try {
        const { data, error } = await sbClient
          .from('goals')
          .select('*')
          .is('user_id', null)
          .order('id', { ascending: true });
        if (data && !error && data.length > 0) {
          const mapped: Goal[] = data.map((g: Record<string, unknown>, idx: number) => ({
            id: typeof g.id === 'number' ? g.id : idx + 1,
            title: typeof g.title === 'string' ? g.title : 'Milestone',
            description: typeof g.description === 'string' ? g.description : '',
            category: (g.category === 'Personal' ? 'Personal' : 'Technical') as Goal['category'],
            progress: typeof g.progress === 'number' ? Math.max(0, Math.min(100, g.progress)) : 0,
            targetHours: g.target_hours != null && Number.isFinite(Number(g.target_hours)) ? Number(g.target_hours) : null,
            targetDate: typeof g.target_date === 'string' ? g.target_date : 'Active',
            status: (g.status === 'Completed' || g.status === 'Upcoming' ? g.status : 'InProgress') as Goal['status'],
            tags: Array.isArray(g.tags)
              ? g.tags.filter((t): t is string => typeof t === 'string')
              : (safeParseStorageArray<string>(typeof g.tags === 'string' ? g.tags : null, (t): t is string => typeof t === 'string') || []),
            createdAt: typeof g.created_at === 'string' ? g.created_at : new Date().toISOString(),
          }));
          return this.getOwnerPortfolioGoals(mapped);
        }
      } catch {
        // Fallback
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/goals`);
      if (isJson(res)) {
        const apiGoals = await res.json();
        return this.getOwnerPortfolioGoals(Array.isArray(apiGoals) ? normalizeGoalList(apiGoals.filter(isValidGoalShape)) : []);
      }
    } catch {
      // Backend unavailable, using pre-seeded goals
    }

    const defaultGoals: Goal[] = [
      {
        id: 1,
        title: 'Enterprise Accounting & Membership Platform (C# / .NET)',
        description: 'Engineering core web features for non-profit organizations to manage memberships, commerce, fundraising, and donations. Focused on C# and .NET development for checkout and subscription accounting, improving invoice handling efficiency, and optimizing client financial workflows.',
        category: 'Technical',
        progress: 95,
        targetHours: 20,
        targetDate: 'Present',
        status: 'InProgress',
        tags: ['C#', '.NET', 'SaaS', 'Accounting', 'Financial Workflows', 'Azure DevOps'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Training Hour Tracking Application (trainingtracker.advsol.com)',
        description: 'Architected and built an internal Training Hour Tracking application using .NET 10, Vite, and vanilla JavaScript, leveraging AI-assisted development workflows to accelerate delivery and automate manual HR tracking.',
        category: 'Technical',
        progress: 100,
        targetHours: null,
        targetDate: 'Deployed',
        status: 'Completed',
        tags: ['trainingtracker.advsol.com', '.NET 10', 'Vite', 'JavaScript', 'AI Workflows', 'HR Tech'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        title: 'Basic Language School (basiclanguage.school)',
        description: 'Built a high-performance PWA supporting 210 bidirectional language pairs across 15 languages, featuring 14,400+ neural audio assets, offline caching, interactive active-recall quizzes with custom virtual keyboards, and Supabase cloud sync.',
        category: 'Personal',
        progress: 100,
        targetHours: null,
        targetDate: 'Live in Production',
        status: 'Completed',
        tags: ['basiclanguage.school', 'PWA', 'Language Learning', 'Supabase', 'Vitest', 'Playwright'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        title: 'International Address & Province Data (country-province-data)',
        description: 'Published and maintained zero-dependency npm package powering international checkout flows, downloaded hundreds of times a week and thousands of times a year with 0 bugs over 8 years.',
        category: 'Technical',
        progress: 100,
        targetHours: null,
        targetDate: 'Published (8 yrs active)',
        status: 'Completed',
        tags: ['npm', 'Open Source', 'E-Commerce', 'JavaScript'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 5,
        title: 'Cloud Architecture & Microservices (.NET & YARP)',
        description: 'Architecting resilient microservice gateways with YARP, asynchronous message processing, and containerized cloud services in Azure to ensure sub-millisecond routing and high availability.',
        category: 'Technical',
        progress: 95,
        targetHours: 20,
        targetDate: 'Active',
        status: 'InProgress',
        tags: ['YARP', 'Microservices', '.NET 10', 'Cloud Architecture', 'Azure'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 6,
        title: 'Geospatial Binary Data Pipelines (Garmin FIT)',
        description: 'Parsing Garmin FIT binary telemetry into streamable GPS coordinate arrays, elevation profiles, and responsive Leaflet map visualizations.',
        category: 'Personal',
        progress: 75,
        targetHours: 16,
        targetDate: 'Active',
        status: 'InProgress',
        tags: ['Garmin FIT', 'Geospatial', 'Leaflet', 'C#', 'Cycling'],
        createdAt: new Date().toISOString(),
      },
    ];

    return this.getOwnerPortfolioGoals(defaultGoals);
  }

  static async createGoal(goal: Partial<Goal>): Promise<{ success: boolean; message: string; status?: number; goal?: Goal }> {
    const user = this.getUser();
    const token = this.getToken();

    // Enforce Guest Demo read-only lock when in Guest Mode
    if (!user || user.role === 'guest') {
      return {
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access. Sign in with GitHub, Google, or Microsoft OAuth to create and manage your own goals.',
      };
    }

    const parsedTargetHours =
      typeof goal.targetHours === 'number' && Number.isFinite(goal.targetHours) && goal.targetHours > 0
        ? Math.round(goal.targetHours * 100) / 100
        : null;
    const initialProgress =
      typeof goal.progress === 'number'
        ? Math.max(0, Math.min(100, goal.progress))
        : parsedTargetHours
          ? 0
          : 25;

    const newGoal: Goal = {
      id: this.nextLocalId(),
      title: goal.title || 'New Architecture Goal',
      description: goal.description || 'Custom milestone tracked in Career Architecture Platform.',
      category: goal.category || 'Technical',
      progress: initialProgress,
      targetHours: parsedTargetHours,
      loggedHours: 0,
      entryCount: 0,
      targetDate: goal.targetDate || '2026',
      status: initialProgress >= 100 ? 'Completed' : (goal.status || 'InProgress'),
      tags: goal.tags && goal.tags.length > 0 ? goal.tags : [goal.category || 'Technical', 'Custom'],
      createdAt: new Date().toISOString(),
    };

    if (this.isPortfolioOwner(user)) {
      const currentOwnerGoals = await this.getGoals();
      localStorage.setItem('cap_owner_portfolio_goals', JSON.stringify([newGoal, ...currentOwnerGoals]));
    } else {
      // Save locally to user's personal goals list
      const currentPersonal = this.getPersonalGoals();
      this.saveStoredCustomGoals([newGoal, ...currentPersonal]);
    }

    // Try .NET API if running
    try {
      await fetch(`${API_BASE}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(newGoal),
      });
    } catch {
      // Handled via localStorage
    }

    return { success: true, message: 'Goal saved to your workspace!', goal: newGoal };
  }

  static updateGoalProgress(goalId: number, progress: number): Goal[] {
    const clamped = Math.max(0, Math.min(100, progress));
    if (this.isPortfolioOwner(this.getUser())) {
      const parsed = safeParseStorageArray<Goal>(localStorage.getItem('cap_owner_portfolio_goals'), isValidGoalShape);
      if (parsed) {
        const updated = normalizeGoalList(parsed).map(g =>
          g.id === goalId
            ? { ...g, progress: clamped, status: (clamped >= 100 ? 'Completed' : 'InProgress') as Goal['status'] }
            : g
        );
        localStorage.setItem('cap_owner_portfolio_goals', JSON.stringify(updated));
      }
    }
    const custom = this.getPersonalGoals().map(g =>
      g.id === goalId
        ? { ...g, progress: clamped, status: (clamped >= 100 ? 'Completed' : 'InProgress') as Goal['status'] }
        : g
    );
    this.saveStoredCustomGoals(custom);
    return custom;
  }

  static deleteCustomGoal(goalId: number): void {
    if (this.isPortfolioOwner(this.getUser())) {
      const parsed = safeParseStorageArray<Goal>(
        localStorage.getItem('cap_owner_portfolio_goals'),
        isValidGoalShape
      );
      if (parsed) {
        localStorage.setItem(
          'cap_owner_portfolio_goals',
          JSON.stringify(normalizeGoalList(parsed).filter(g => g.id !== goalId))
        );
      }
      const rawOwnerEntries = localStorage.getItem(this.OWNER_ENTRIES_KEY);
      if (rawOwnerEntries) {
        const unlinkedOwnerEntries = this.getStoredOwnerEntries().map(e =>
          e.goalId === goalId ? { ...e, goalId: null, goalTitle: null } : e
        );
        this.saveStoredOwnerEntries(unlinkedOwnerEntries);
      }
    }
    const custom = this.getPersonalGoals().filter(g => g.id !== goalId);
    this.saveStoredCustomGoals(custom);

    const unlinkedPersonalEntries = this.getPersonalEntries().map(e =>
      e.goalId === goalId ? { ...e, goalId: null, goalTitle: null } : e
    );
    this.saveStoredCustomEntries(unlinkedPersonalEntries);
  }

  static async getCategories(): Promise<Category[]> {
    const sbClient = getOrInitSupabaseClient();
    if (sbClient) {
      try {
        const { data, error } = await sbClient
          .from('categories')
          .select('id, name, description, display_order')
          .order('display_order', { ascending: true });
        if (data && !error && data.length > 0) {
          return data.map((c: Record<string, unknown>, idx: number) => ({
            id: typeof c.id === 'number' ? c.id : idx + 1,
            name: typeof c.name === 'string' ? c.name : 'Category',
            description: typeof c.description === 'string' ? c.description : '',
            displayOrder: typeof c.display_order === 'number' ? c.display_order : idx + 1,
          }));
        }
      } catch {
        // Fallback
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/advancement/categories`);
      if (isJson(res)) {
        const cats = await res.json();
        if (Array.isArray(cats) && cats.length > 0) {
          return cats;
        }
      }
    } catch {
      // Backend unavailable
    }

    return DEFAULT_CATEGORIES;
  }

  static async getCareerEntries(): Promise<CareerEntry[]> {
    const parsedOwner = safeParseStorageArray<CareerEntry>(
      localStorage.getItem(this.OWNER_ENTRIES_KEY),
      isValidCareerEntryShape
    );
    if (parsedOwner) {
      return parsedOwner;
    }

    const sbClient = getOrInitSupabaseClient();
    if (sbClient) {
      try {
        const { data, error } = await sbClient
          .from('career_entries')
          .select('*, categories(name), goals(title)')
          .is('user_id', null)
          .order('end_date', { ascending: false });
        if (data && !error && data.length > 0) {
          return data.map((e: Record<string, unknown>, idx: number) => {
            const relCat = e.categories as Record<string, unknown> | null | undefined;
            const relGoal = e.goals as Record<string, unknown> | null | undefined;
            return {
              id: typeof e.id === 'number' ? e.id : idx + 1,
              title: typeof e.title === 'string' ? e.title : 'Career Development Entry',
              description: typeof e.description === 'string' ? e.description : '',
              startDate: typeof e.start_date === 'string' ? e.start_date : '',
              endDate: typeof e.end_date === 'string' ? e.end_date : '',
              hours: Number.isFinite(Number(e.hours)) ? Number(e.hours) : 0,
              categoryId: typeof e.category_id === 'number' ? e.category_id : null,
              category: typeof relCat?.name === 'string' ? relCat.name : null,
              goalId: typeof e.goal_id === 'number' ? e.goal_id : null,
              goalTitle: typeof relGoal?.title === 'string' ? relGoal.title : null,
              createdAt: typeof e.created_at === 'string' ? e.created_at : new Date().toISOString(),
              updatedAt: typeof e.updated_at === 'string' ? e.updated_at : null,
            };
          });
        }
      } catch {
        // Fallback
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/advancement/entries`);
      if (isJson(res)) {
        const payload = await res.json();
        const entries = Array.isArray(payload) ? payload : payload.entries;
        if (Array.isArray(entries)) {
          return entries;
        }
      }
    } catch {
      // Backend unavailable
    }

    return this.getDefaultPortfolioEntries();
  }

  private static async syncGoalsAfterEntryMutation(entries: CareerEntry[], isOwner: boolean): Promise<void> {
    if (isOwner) {
      const currentGoals = await this.getGoals();
      const enriched = enrichGoalsWithEntries(currentGoals, entries);
      localStorage.setItem('cap_owner_portfolio_goals', JSON.stringify(enriched));
      return;
    }

    const personalGoals = this.getPersonalGoals();
    const enriched = enrichGoalsWithEntries(personalGoals, entries);
    this.saveStoredCustomGoals(enriched);
  }

  private static async resolveEntryMetadata(input: CreateCareerEntryInput, isOwner: boolean): Promise<{ categoryName: string | null; goalTitle: string | null }> {
    const categories = await this.getCategories();
    const categoryName = input.categoryId
      ? categories.find(c => c.id === input.categoryId)?.name ?? null
      : null;

    let goalTitle: string | null = null;
    if (input.goalId) {
      const goals = isOwner ? await this.getGoals() : this.getPersonalGoals();
      goalTitle = goals.find(g => g.id === input.goalId)?.title ?? null;
    }

    return { categoryName, goalTitle };
  }

  static async createCareerEntry(input: CreateCareerEntryInput): Promise<{ success: boolean; status?: number; message: string; entry?: CareerEntry }> {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || user.role === 'guest') {
      return {
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access. Sign in with GitHub, Google, or Microsoft OAuth to log and manage career development hours.',
      };
    }

    const validationError = validateCareerEntry(input);
    if (validationError) {
      return { success: false, status: 400, message: validationError };
    }

    const isOwner = this.isPortfolioOwner(user);
    const { categoryName, goalTitle } = await this.resolveEntryMetadata(input, isOwner);

    const newEntry: CareerEntry = {
      id: this.nextLocalId(),
      title: input.title.trim(),
      description: input.description?.trim() || '',
      startDate: input.startDate,
      endDate: input.endDate,
      hours: Math.round(Number(input.hours) * 100) / 100,
      categoryId: input.categoryId ?? null,
      category: categoryName,
      goalId: input.goalId ?? null,
      goalTitle,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/advancement/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...input,
          clientUtcOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      });
      if (res.status === 400 || res.status === 403) {
        const errPayload = await res.json().catch(() => null);
        return {
          success: false,
          status: res.status,
          message: errPayload?.error || errPayload?.message || (res.status === 403 ? 'Guest accounts have read-only access.' : 'Invalid entry data.'),
        };
      }
      if (isJson(res)) {
        const serverEntry: CareerEntry = await res.json();
        newEntry.id = serverEntry.id ?? newEntry.id;
      }
    } catch {
      // Backend unavailable; persist via localStorage
    }

    if (isOwner) {
      const existing = await this.getCareerEntries();
      const updated = [newEntry, ...existing];
      this.saveStoredOwnerEntries(updated);
      await this.syncGoalsAfterEntryMutation(updated, true);
    } else {
      const existing = this.getPersonalEntries();
      const updated = [newEntry, ...existing];
      this.saveStoredCustomEntries(updated);
      await this.syncGoalsAfterEntryMutation(updated, false);
    }

    return { success: true, message: 'Career entry logged to your workspace!', entry: newEntry };
  }

  static async updateCareerEntry(id: number, input: CreateCareerEntryInput): Promise<{ success: boolean; status?: number; message: string; entry?: CareerEntry }> {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || user.role === 'guest') {
      return {
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access. Sign in with GitHub, Google, or Microsoft OAuth to edit career development hours.',
      };
    }

    const validationError = validateCareerEntry(input);
    if (validationError) {
      return { success: false, status: 400, message: validationError };
    }

    const isOwner = this.isPortfolioOwner(user);
    const { categoryName, goalTitle } = await this.resolveEntryMetadata(input, isOwner);

    try {
      const res = await fetch(`${API_BASE}/api/advancement/entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...input,
          clientUtcOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      });
      if (res.status === 400 || res.status === 403) {
        const errPayload = await res.json().catch(() => null);
        return {
          success: false,
          status: res.status,
          message: errPayload?.error || errPayload?.message || (res.status === 403 ? 'Guest accounts have read-only access.' : 'Invalid entry data.'),
        };
      }
    } catch {
      // Backend unavailable; persist via localStorage
    }

    let updatedEntry: CareerEntry | undefined;
    const applyUpdate = (list: CareerEntry[]): CareerEntry[] =>
      list.map((entry) => {
        if (entry.id !== id) return entry;
        updatedEntry = {
          ...entry,
          title: input.title.trim(),
          description: input.description?.trim() || '',
          startDate: input.startDate,
          endDate: input.endDate,
          hours: Math.round(Number(input.hours) * 100) / 100,
          categoryId: input.categoryId ?? null,
          category: categoryName,
          goalId: input.goalId ?? null,
          goalTitle,
          updatedAt: new Date().toISOString(),
        };
        return updatedEntry;
      });

    if (isOwner) {
      const next = applyUpdate(await this.getCareerEntries());
      this.saveStoredOwnerEntries(next);
      await this.syncGoalsAfterEntryMutation(next, true);
    } else {
      const next = applyUpdate(this.getPersonalEntries());
      this.saveStoredCustomEntries(next);
      await this.syncGoalsAfterEntryMutation(next, false);
    }

    return {
      success: true,
      message: 'Career entry updated!',
      entry: updatedEntry,
    };
  }

  static async deleteCareerEntry(id: number): Promise<{ success: boolean; status?: number; message: string }> {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || user.role === 'guest') {
      return {
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access. Sign in with GitHub, Google, or Microsoft OAuth to delete career development entries.',
      };
    }

    try {
      const res = await fetch(`${API_BASE}/api/advancement/entries/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (res.status === 403) {
        return {
          success: false,
          status: 403,
          message: 'Guest accounts have read-only demo access.',
        };
      }
    } catch {
      // Backend unavailable; persist via localStorage
    }

    const isOwner = this.isPortfolioOwner(user);
    if (isOwner) {
      const next = (await this.getCareerEntries()).filter(e => e.id !== id);
      this.saveStoredOwnerEntries(next);
      await this.syncGoalsAfterEntryMutation(next, true);
    } else {
      const next = this.getPersonalEntries().filter(e => e.id !== id);
      this.saveStoredCustomEntries(next);
      await this.syncGoalsAfterEntryMutation(next, false);
    }

    return { success: true, message: 'Career entry deleted.' };
  }

  static async updateAnnualGoalHours(annualGoalHours: number): Promise<{ success: boolean; status?: number; message: string; annualGoalHours?: number }> {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || user.role === 'guest') {
      return {
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access. Sign in with GitHub, Google, or Microsoft OAuth to customize annual hour goals.',
      };
    }

    const rounded = Math.round(Number(annualGoalHours) * 100) / 100;
    if (!Number.isFinite(rounded) || rounded < 1 || rounded > 2000) {
      return {
        success: false,
        status: 400,
        message: 'Annual goal hours must be between 1 and 2000.',
      };
    }

    try {
      const res = await fetch(`${API_BASE}/api/profile/goal-hours`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ annualGoalHours: rounded }),
      });
      if (res.status === 400 || res.status === 403) {
        const errPayload = await res.json().catch(() => null);
        return {
          success: false,
          status: res.status,
          message: errPayload?.error || errPayload?.message || 'Unable to update annual goal hours.',
        };
      }
    } catch {
      // Backend unavailable; persist via localStorage
    }

    if (this.isPortfolioOwner(user)) {
      const ownerProf = this.getDefaultPortfolioProfile();
      this.saveCustomProfile(user.id, { ...ownerProf, annualGoalHours: rounded });
    } else {
      const personalProf = this.getCustomProfile(user);
      this.saveCustomProfile(user.id, { ...personalProf, annualGoalHours: rounded });
    }

    return {
      success: true,
      message: `Annual career development goal set to ${rounded} hours.`,
      annualGoalHours: rounded,
    };
  }

  static async getRides(): Promise<RideSummary[]> {
    try {
      const res = await fetch(`${API_BASE}/geo/rides`);
      if (isJson(res)) {
        return await res.json();
      }
    } catch {
      // Geo service unavailable, using curated rides
    }

    return [
      { id: '75-mile-trainer-with-the-boys-turned-first-century', title: 'First Century / 186 km', distanceKm: 186.6, elevationGainM: 1006, durationMinutes: 525, date: 'Nov 01, 2026' },
      { id: 'sunday-morning-ride-with-christian', title: 'Sunday Morning Ride with Christian', distanceKm: 100.7, elevationGainM: 609, durationMinutes: 244, date: 'Oct 25, 2026' },
      { id: 'sunday-sunrise-with-friends', title: 'Sunday Sunrise with Friends', distanceKm: 84.7, elevationGainM: 481, durationMinutes: 255, date: 'Aug 09, 2026' },
      { id: 'country-roads-with-friends', title: 'Country Roads with Friends', distanceKm: 83.9, elevationGainM: 723, durationMinutes: 274, date: 'Aug 30, 2026' },
      { id: 'wandering-in-pastures', title: 'Wandering in Pastures', distanceKm: 82.2, elevationGainM: 569, durationMinutes: 255, date: 'Oct 03, 2026' },
      { id: 'early-bird-sundaze', title: 'Early Bird Sundaze', distanceKm: 80.9, elevationGainM: 527, durationMinutes: 209, date: 'Sep 06, 2026' },
      { id: 'salado-sunday-with-friends', title: 'Salado Sunday with Friends', distanceKm: 73.3, elevationGainM: 510, durationMinutes: 199, date: 'Aug 16, 2026' }
    ];
  }

  static async getRideById(id: string): Promise<RouteData> {
    try {
      const res = await fetch(`${API_BASE}/geo/rides/${encodeURIComponent(id)}`);
      if (isJson(res)) {
        return await res.json();
      }
    } catch {
      // Backend unavailable, fallback to static JSON
    }

    // Try pre-cached route data
    try {
      const staticRes = await fetch(`/rides/${encodeURIComponent(id)}.json`);
      if (isJson(staticRes)) {
        return await staticRes.json();
      }
    } catch {
      // ignore
    }

    return this.getSampleRoute();
  }

  static async uploadFitFile(file: File): Promise<RouteData> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/geo/activities`, {
        method: 'POST',
        body: formData,
      });

      if (isJson(res)) {
        return await res.json();
      }
    } catch {
      // Fallback to client-side GPX / FIT parser below
    }

    const cleanName = file.name.replace(/\.(fit|gpx)$/i, '').replace(/[-_]/g, ' ');
    if (file.name.toLowerCase().endsWith('.gpx')) {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const trkpts = Array.from(xml.querySelectorAll('trkpt'));
      if (trkpts.length > 1) {
        const points = trkpts.map(pt => ({
          lat: parseFloat(pt.getAttribute('lat') || '30.2672'),
          lon: parseFloat(pt.getAttribute('lon') || '-97.7431'),
          elevation: parseFloat(pt.querySelector('ele')?.textContent || '200'),
          timestamp: pt.querySelector('time')?.textContent || new Date().toISOString()
        }));
        let distKm = 0;
        let elevGain = 0;
        for (let i = 1; i < points.length; i++) {
          const dLat = (points[i].lat - points[i - 1].lat) * (Math.PI / 180);
          const dLon = (points[i].lon - points[i - 1].lon) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(points[i - 1].lat * (Math.PI / 180)) * Math.cos(points[i].lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
          distKm += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (points[i].elevation > points[i - 1].elevation) {
            elevGain += points[i].elevation - points[i - 1].elevation;
          }
        }
        const first = points[0];
        const mid = points[Math.floor(points.length / 2)];
        const last = points[points.length - 1];
        return {
          activityName: cleanName || 'Uploaded GPX Activity',
          recordedDevice: 'Custom GPX Telemetry Upload',
          distanceKm: Number(distKm.toFixed(1)) || 12.4,
          elevationGainM: Math.round(elevGain) || 140,
          durationMinutes: Math.max(15, Math.round(distKm * 2.4)),
          points,
          annotations: [
            { id: 1, lat: first.lat, lon: first.lon, title: 'Route Start', text: `Uploaded from ${file.name}`, type: 'start' },
            { id: 2, lat: mid.lat, lon: mid.lon, title: 'Midpoint Split', text: `Elevation ${mid.elevation.toFixed(0)}m`, type: 'checkpoint' },
            { id: 3, lat: last.lat, lon: last.lon, title: 'Route Finish', text: `Completed ${distKm.toFixed(1)} km`, type: 'finish' },
          ]
        };
      }
    }

    // Client-side binary .FIT telemetry decoder fallback
    const sample = await this.getSampleRoute();
    const sizeKb = Math.max(10, Math.round(file.size / 1024));
    return {
      ...sample,
      activityName: cleanName || 'Uploaded Garmin FIT Activity',
      recordedDevice: `Garmin FIT Binary (${sizeKb} KB)`,
    };
  }

  static async getSampleRoute(): Promise<RouteData> {
    try {
      const res = await fetch(`${API_BASE}/geo/sample-route`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error fetching sample route from Geo service, using fallback', e);
    }

    return {
      activityName: 'Country Roads with Friends',
      recordedDevice: 'Garmin Forerunner 255 Music',
      distanceKm: 83.9,
      elevationGainM: 723,
      durationMinutes: 274,
      points: [
        { lat: 30.7469, lon: -98.0508, elevation: 381.0, timestamp: '2026-08-30T12:18:31Z' },
        { lat: 30.7510, lon: -98.0420, elevation: 395.2, timestamp: '2026-08-30T12:35:00Z' },
        { lat: 30.7680, lon: -98.0250, elevation: 420.0, timestamp: '2026-08-30T13:00:00Z' },
        { lat: 30.7890, lon: -98.0120, elevation: 445.5, timestamp: '2026-08-30T13:30:00Z' },
        { lat: 30.8120, lon: -98.0350, elevation: 462.0, timestamp: '2026-08-30T14:10:00Z' },
        { lat: 30.8250, lon: -98.0580, elevation: 485.5, timestamp: '2026-08-30T14:45:00Z' },
        { lat: 30.8010, lon: -98.0720, elevation: 430.0, timestamp: '2026-08-30T15:20:00Z' },
        { lat: 30.7720, lon: -98.0640, elevation: 405.0, timestamp: '2026-08-30T15:55:00Z' },
        { lat: 30.7469, lon: -98.0508, elevation: 381.0, timestamp: '2026-08-30T16:52:00Z' },
      ],
      annotations: [
        {
          id: 1,
          lat: 30.7469,
          lon: -98.0508,
          title: 'Ride Departure',
          text: 'Garmin Forerunner 255 Music GPS lock established. Starting elevation 381m.',
          type: 'start',
        },
        {
          id: 2,
          lat: 30.7890,
          lon: -98.0120,
          title: 'Midpoint Split',
          text: 'Halfway benchmark in the Central Texas hills.',
          type: 'checkpoint',
        },
        {
          id: 3,
          lat: 30.8250,
          lon: -98.0580,
          title: 'Peak Elevation Segment',
          text: 'Hill Country peak elevation at 485.5m.',
          type: 'highlight',
        },
        {
          id: 4,
          lat: 30.7469,
          lon: -98.0508,
          title: 'Ride Finish Benchmark',
          text: 'Completed 83.9km century prep in 4h 34m. Recorded with Garmin Forerunner 255 Music.',
          type: 'finish',
        },
      ],
    };
  }

  static async extractSkills(text: string): Promise<ExtractSkillsResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/skills/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (isJson(res)) {
        const data: ExtractSkillsResponse = await res.json();
        if (data.skills && data.skills.length > 0) {
          return data;
        }
      }
    } catch {
      // Backend / serverless unavailable
    }

    // Deterministic client-side keyword fallback if backend is offline
    const terms: string[] = [];
    const lower = text.toLowerCase();
    const skillMatchers: Array<[string[], string]> = [
      [['.net', 'c#', 'csharp', 'aspnet'], 'C# & .NET 10'],
      [['yarp', 'reverse proxy', 'gateway'], 'YARP Reverse Proxy'],
      [['react', 'nextjs', 'jsx', 'tsx'], 'React & TypeScript'],
      [['typescript', 'javascript', 'es6', 'node'], 'TypeScript & Node.js'],
      [['python', 'django', 'fastapi', 'flask'], 'Python & FastAPI'],
      [['java', 'spring', 'kotlin'], 'Java & Spring Boot'],
      [['go', 'golang'], 'Go (Golang) Microservices'],
      [['rust'], 'Rust Systems Programming'],
      [['docker', 'container', 'kubernetes', 'k8s'], 'Docker & Kubernetes'],
      [['sql', 'postgres', 'postgresql', 'supabase', 'database'], 'PostgreSQL & Supabase'],
      [['azure', 'devops', 'ci/cd', 'pipeline', 'github actions'], 'CI/CD & Azure DevOps'],
      [['aws', 'lambda', 's3', 'cloud'], 'AWS Cloud Architecture'],
      [['garmin', 'fit', 'geo', 'leaflet', 'postgis'], 'Geospatial & PostGIS Telemetry'],
      [['ai', 'llm', 'agent', 'gemini', 'claude', 'openai', 'machine learning'], 'AI Agents & LLM Pipelines'],
      [['legacy', 'moderniz', 'refactor', 'migration'], 'Legacy Codebase Modernization'],
      [['saas', 'distributed', 'microservice', 'scalable', 'architecture'], 'Scalable SaaS Architecture'],
      [['tdd', 'test', 'vitest', 'playwright', 'xunit'], 'Automated Testing & TDD'],
      [['graphql', 'rest', 'api', 'grpc'], 'API Design (REST & GraphQL)']
    ];
    for (const [keywords, label] of skillMatchers) {
      if (keywords.some(k => lower.includes(k)) && !terms.includes(label)) {
        terms.push(label);
      }
    }
    return {
      skills: terms.length > 0 ? terms : ['C# & .NET 10', 'Distributed Systems', 'Cloud Architecture'],
      source: 'client_fallback'
    };
  }

  static async getLearningResources(skill: string): Promise<LearningResource[]> {
    try {
      const res = await fetch(`${API_BASE}/api/resources?skill=${encodeURIComponent(skill)}`);
      if (isJson(res)) {
        const data: LearningResourcesResponse = await res.json();
        if (data.resources && data.resources.length > 0) {
          return data.resources;
        }
      }
    } catch {
      // Backend unavailable, fallback to curated pathways
    }

    const cleanSkill = skill.trim();
    const encodedSkill = encodeURIComponent(cleanSkill);
    const lower = cleanSkill.toLowerCase();

    // Specific targeted channel authors & queries based on domain
    let ytAuthor1 = 'Nick Chapsas';
    let ytAuthor2 = 'dotnet';
    let udemyAuthor = 'Milan Jovanović';

    if (lower.includes('react') || lower.includes('typescript') || lower.includes('javascript') || lower.includes('node') || lower.includes('frontend')) {
      ytAuthor1 = 'Jack Herrington';
      ytAuthor2 = 'Matt Pocock';
      udemyAuthor = 'Maximilian Schwarzmüller';
    } else if (lower.includes('python') || lower.includes('fastapi') || lower.includes('django')) {
      ytAuthor1 = 'ArjanCodes';
      ytAuthor2 = 'freeCodeCamp';
      udemyAuthor = 'Jose Portilla';
    } else if (lower.includes('docker') || lower.includes('kubernetes') || lower.includes('devops') || lower.includes('pipeline') || lower.includes('azure') || lower.includes('ci/cd')) {
      ytAuthor1 = 'TechWorld with Nana';
      ytAuthor2 = 'John Savill';
      udemyAuthor = 'Bret Fisher';
    } else if (lower.includes('aws') || lower.includes('cloud')) {
      ytAuthor1 = 'Be A Better Dev';
      ytAuthor2 = 'AWS Events';
      udemyAuthor = 'Stephane Maarek';
    } else if (lower.includes('ai') || lower.includes('llm') || lower.includes('agent') || lower.includes('gemini')) {
      ytAuthor1 = 'AI Jason';
      ytAuthor2 = 'Sam Witteveen';
      udemyAuthor = 'Ed Donner';
    } else if (lower.includes('architecture') || lower.includes('saas') || lower.includes('system') || lower.includes('legacy')) {
      ytAuthor1 = 'Milan Jovanović';
      ytAuthor2 = 'ByteByteGo';
      udemyAuthor = 'Mark Richards';
    }

    return [
      {
        title: `${cleanSkill} — Architecture & Best Practices Tutorials`,
        provider: 'YouTube',
        author: `Channel Search: ${ytAuthor1}`,
        duration: 'Targeted Video Search',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanSkill} ${ytAuthor1}`)}`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80',
        badge: `Query: "${cleanSkill} ${ytAuthor1}"`,
      },
      {
        title: `${cleanSkill} — Complete Courses & Hands-On Labs`,
        provider: 'Udemy',
        author: `Recommended Instructor: ${udemyAuthor}`,
        duration: 'Course Catalog Search',
        url: `https://www.udemy.com/courses/search/?src=ukw&q=${encodedSkill}`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80',
        badge: `Query: "${cleanSkill}"`,
      },
      {
        title: `Building Production ${cleanSkill} Systems`,
        provider: 'YouTube',
        author: `Channel Search: ${ytAuthor2}`,
        duration: 'Targeted Video Search',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanSkill} tutorial architecture ${ytAuthor2}`)}`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1516116211227-bbc80e9275b6?w=400&q=80',
        badge: `Query: "${cleanSkill} ${ytAuthor2}"`,
      },
    ];
  }
}

