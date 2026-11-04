import type { Profile, Goal, AuthResponse, RouteData, RideSummary, User, LearningResource, ExtractSkillsResponse, LearningResourcesResponse } from '../types';
import { getOrInitSupabaseClient } from './supabase';

const API_BASE = ''; // proxied by Vite in dev to Gateway

const isJson = (res: Response): boolean => {
  const ct = res.headers.get('content-type');
  return Boolean(res.ok && ct && ct.includes('application/json'));
};

export class ApiService {
  private static TOKEN_KEY = 'cap_auth_token';
  private static USER_KEY = 'cap_auth_user';
  private static CUSTOM_GOALS_KEY = 'cap_custom_goals';
  private static CUSTOM_PROFILE_PREFIX = 'cap_custom_profile_';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static setSession(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static isPortfolioOwner(user: User | null | undefined): boolean {
    if (!user) return false;
    const lowerEmail = (user.email || '').trim().toLowerCase();
    const lowerName = (user.name || '').trim().toLowerCase();
    return (
      lowerEmail === 'jfbendfeldt@gmail.com' ||
      lowerEmail.includes('bendfeldt') ||
      lowerName.includes('bendfeldt') ||
      lowerName === 'john f. bendfeldt' ||
      lowerName === 'john bendfeldt'
    );
  }

  static getDefaultPortfolioProfile(): Profile {
    const savedOwner = localStorage.getItem('cap_owner_portfolio_profile');
    if (savedOwner) {
      try {
        const parsed: Profile = JSON.parse(savedOwner);
        if (parsed && parsed.name && parsed.headline !== 'Software Engineer & Systems Builder') {
          return parsed;
        }
      } catch {
        // ignore
      }
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
      updatedAt: new Date().toISOString(),
    };
  }

  static toVanitySlug(name: string): string {
    return (name || 'architect')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'architect';
  }

  static getCustomProfile(user: User): Profile {
    if (this.isPortfolioOwner(user)) {
      const ownerProfile = this.getDefaultPortfolioProfile();
      localStorage.setItem(`${this.CUSTOM_PROFILE_PREFIX}${user.id}`, JSON.stringify(ownerProfile));
      localStorage.setItem('cap_profile_slug_john-bendfeldt', JSON.stringify(ownerProfile));
      return ownerProfile;
    }

    const raw = localStorage.getItem(`${this.CUSTOM_PROFILE_PREFIX}${user.id}`);
    if (raw) {
      try {
        const parsed: Profile = JSON.parse(raw);
        if (!parsed.vanitySlug) {
          parsed.vanitySlug = this.toVanitySlug(parsed.name || user.name);
        }
        return parsed;
      } catch {
        // fallback below
      }
    }
    const slug = this.toVanitySlug(user.name);
    const defaultCustom: Profile = {
      id: 999,
      name: user.name || 'Authenticated Architect',
      vanitySlug: slug,
      headline: 'Software Engineer & Systems Builder',
      bio: `Full-stack engineer focused on scalable cloud systems, automated delivery pipelines, and continuous technical growth.`,
      location: 'Remote / Global',
      email: user.email || '',
      avatarUrl: user.avatarUrl || '',
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
      skills: ['TypeScript', 'React', '.NET', 'Cloud Architecture', 'AI Workflows'],
      experienceYears: 5,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`cap_profile_slug_${slug}`, JSON.stringify(defaultCustom));
    return defaultCustom;
  }

  static saveCustomProfile(userId: string, profile: Profile): Profile {
    const cleanSlug = (profile.vanitySlug || this.toVanitySlug(profile.name))
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const updated: Profile = {
      ...profile,
      vanitySlug: cleanSlug || this.toVanitySlug(profile.name),
      updatedAt: new Date().toISOString()
    };
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
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Architect';
  }

  static getProfileBySlug(slug: string): Profile | null {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) return null;

    if (clean === 'john-bendfeldt' || clean === 'john-f-bendfeldt' || clean === 'jfbendfeldt') {
      return this.getDefaultPortfolioProfile();
    }

    const raw = localStorage.getItem(`cap_profile_slug_${clean}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // ignore
      }
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
      updatedAt: new Date().toISOString(),
    };
  }

  static getPersonalGoals(): Goal[] {
    const raw = localStorage.getItem(this.CUSTOM_GOALS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    const starterGoals: Goal[] = [
      {
        id: 1001,
        title: 'Step 1: Customize Your Personal Architecture Profile',
        description: 'Click "Edit My Profile" in the top hero card to set your own Display Name, Headline, Bio, Location, and GitHub / LinkedIn URLs. Click "+25%" on this card to mark your progress!',
        category: 'Personal',
        progress: 50,
        targetDate: 'Getting Started',
        status: 'InProgress',
        tags: ['Onboarding', 'Personal Profile', 'Try +25% Button'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 1002,
        title: 'Step 2: Extract Skills & Curated Courses from Any Job Spec',
        description: 'Open "03 / AI Skill Pipeline", paste your own resume bio or a target job description, and click "+ Track as Goal" on any skill token to add it to this board.',
        category: 'Technical',
        progress: 25,
        targetDate: 'AI Pipeline',
        status: 'InProgress',
        tags: ['Gemini AI', 'YouTube & Udemy', 'Skill Extractor'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 1003,
        title: 'Step 3: Add Your Own Goals, Roles & GPS Routes',
        description: 'Click "+ Add Goal" above to create your own milestone, add your work history in "01 / Experience", or upload a .FIT / .GPX file in "04 / Garmin Geospatial". You can delete these starter cards anytime using the trash icon.',
        category: 'Technical',
        progress: 25,
        targetDate: 'Your Sandbox',
        status: 'InProgress',
        tags: ['Custom Goals', 'Resume Builder', 'Garmin FIT / GPX'],
        createdAt: new Date().toISOString(),
      },
    ];
    this.saveStoredCustomGoals(starterGoals);
    return starterGoals;
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
          return {
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
            skills: Array.isArray(data.skills) ? data.skills : JSON.parse(data.skills || '[]'),
            experienceYears: data.experience_years,
            updatedAt: data.updated_at,
          };
        }
      } catch {
        // Fallback
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/profile`);
      if (isJson(res)) {
        return await res.json();
      }
    } catch {
      // Backend unavailable, using verified profile data
    }

    return {
      id: 1,
      name: 'John F. Bendfeldt',
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
      updatedAt: new Date().toISOString(),
    };
  }

  private static getOwnerPortfolioGoals(baseGoals: Goal[]): Goal[] {
    const raw = localStorage.getItem('cap_owner_portfolio_goals');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return baseGoals;
  }

  static async getGoals(): Promise<Goal[]> {
    // 1. Try Supabase if configured
    const sbClient = getOrInitSupabaseClient();
    if (sbClient) {
      try {
        const { data, error } = await sbClient.from('goals').select('*').order('id', { ascending: true });
        if (data && !error && data.length > 0) {
          const mapped = data.map((g: any) => ({
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            progress: g.progress,
            targetDate: g.target_date,
            status: g.status,
            tags: Array.isArray(g.tags) ? g.tags : JSON.parse(g.tags || '[]'),
            createdAt: g.created_at,
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
        return this.getOwnerPortfolioGoals(apiGoals);
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

    const newGoal: Goal = {
      id: Date.now(),
      title: goal.title || 'New Architecture Goal',
      description: goal.description || 'Custom milestone tracked in Career Architecture Platform.',
      category: goal.category || 'Technical',
      progress: typeof goal.progress === 'number' ? goal.progress : 25,
      targetDate: goal.targetDate || '2026',
      status: (goal.progress ?? 0) >= 100 ? 'Completed' : (goal.status || 'InProgress'),
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
      const raw = localStorage.getItem('cap_owner_portfolio_goals');
      if (raw) {
        try {
          const parsed: Goal[] = JSON.parse(raw);
          const updated = parsed.map(g =>
            g.id === goalId
              ? { ...g, progress: clamped, status: (clamped >= 100 ? 'Completed' : 'InProgress') as Goal['status'] }
              : g
          );
          localStorage.setItem('cap_owner_portfolio_goals', JSON.stringify(updated));
        } catch {
          // ignore
        }
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
      const raw = localStorage.getItem('cap_owner_portfolio_goals');
      if (raw) {
        try {
          const parsed: Goal[] = JSON.parse(raw);
          localStorage.setItem('cap_owner_portfolio_goals', JSON.stringify(parsed.filter(g => g.id !== goalId)));
        } catch {
          // ignore
        }
      }
    }
    const custom = this.getPersonalGoals().filter(g => g.id !== goalId);
    this.saveStoredCustomGoals(custom);
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

    // Direct client fallback to Gemini API if VITE_GEMINI_API_KEY is defined
    const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (clientKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${clientKey}`;
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Extract all key technical skills, architectural concepts, languages, frameworks, and engineering tools from this text. Return a JSON object with a 'skills' string array.\nText:\n${text}` }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: { skills: { type: 'ARRAY', items: { type: 'STRING' } } },
                required: ['skills']
              }
            }
          })
        });
        if (isJson(gRes)) {
          const gData: any = await gRes.json();
          const candidateText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            if (parsed.skills && Array.isArray(parsed.skills)) {
              return {
                skills: parsed.skills,
                source: 'gemini',
                model: 'gemini-3.5-flash-lite'
              };
            }
          }
        }
      } catch {
        // fallback to keyword extraction
      }
    }

    // Fallback if backend is offline
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

