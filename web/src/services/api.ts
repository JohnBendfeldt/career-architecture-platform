import type { Profile, Goal, AuthResponse, RouteData, RideSummary, User, LearningResource, ExtractSkillsResponse, LearningResourcesResponse } from '../types';

const API_BASE = ''; // proxied by Vite in dev to Gateway

export class ApiService {
  private static TOKEN_KEY = 'cap_auth_token';
  private static USER_KEY = 'cap_auth_user';

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

  static async loginAsGuest(): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data: AuthResponse = await res.json();
        this.setSession(data.token, data.user);
        return data;
      }
    } catch (e) {
      console.warn('Backend unavailable, using cached fallback session', e);
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
    try {
      const res = await fetch(`${API_BASE}/api/profile`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error fetching profile from backend, using fallback', e);
    }

    return {
      id: 1,
      name: 'John F. Bendfeldt',
      headline: 'Senior Full-Stack Software Engineer',
      bio: 'Senior Full-Stack Engineer with 9+ years of expertise architecting, building, and maintaining high-performance SaaS applications and distributed systems. Specializes in scalable C#/.NET enterprise backends, modern React and TypeScript frontends, and automated CI/CD pipelines. Proven track record leading major codebase modernizations, designing robust REST/Minimal APIs, and shipping mission-critical e-commerce and financial workflows.',
      location: 'Hutto, TX',
      email: 'jfbendfeldt@gmail.com',
      avatarUrl: '/john-bendfeldt.jpg',
      githubUrl: 'https://github.com/johnbendfeldt',
      linkedinUrl: 'https://linkedin.com/in/johnbendfeldt',
      skills: [
        'C#',
        '.NET (Core, 6, 10)',
        'React',
        'TypeScript',
        'JavaScript (ES6+)',
        'Azure DevOps',
        'Docker',
        'SQL Server',
        'CI/CD Pipelines',
        'Vite',
        'System Architecture',
        'REST & Minimal APIs',
        'TDD & Integration Testing',
        'YARP Reverse Proxy',
      ],
      experienceYears: 9,
      updatedAt: new Date().toISOString(),
    };
  }

  static async getGoals(): Promise<Goal[]> {
    try {
      const res = await fetch(`${API_BASE}/api/goals`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error fetching goals from backend, using fallback', e);
    }

    return [
      {
        id: 1,
        title: 'Enterprise Codebase Modernization (.NET 10)',
        description: 'Spearheading codebase modernization initiatives to transition legacy enterprise systems to current .NET and modern web standards, optimizing accounting and membership workflows.',
        category: 'Technical',
        progress: 90,
        targetDate: 'Present',
        status: 'InProgress',
        tags: ['.NET 10', 'C#', 'Modernization', 'Azure DevOps'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Training Hour Tracking Application (trainingtracker.advsol.com)',
        description: 'Architected and built an internal Training Hour Tracking application to streamline HR processes, engineered with .NET 10, vanilla JavaScript, HTML, and Vite.',
        category: 'Technical',
        progress: 100,
        targetDate: 'Deployed',
        status: 'Completed',
        tags: ['trainingtracker.advsol.com', '.NET 10', 'Vite', 'JavaScript', 'HR Tech'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        title: 'Russian Language Learning Platform (basicrussian.org)',
        description: 'Architected and shipped an active production language immersion platform featuring spaced repetition drills, phonetics, grammar mastery, and interactive learning architecture.',
        category: 'Personal',
        progress: 85,
        targetDate: 'Live in Production',
        status: 'Completed',
        tags: ['basicrussian.org', 'Russian', 'Language Learning', 'React', 'Full-Stack'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        title: 'International Address & Province Data (country-province-data)',
        description: 'Published and maintained zero-dependency npm package powering international checkout flows with 1,300+ weekly downloads and 0 bugs over 8 years.',
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
  }

  static async createGoal(goal: Partial<Goal>): Promise<{ success: boolean; message: string; status?: number }> {
    const token = this.getToken();
    try {
      const res = await fetch(`${API_BASE}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(goal),
      });

      if (res.status === 403) {
        return {
          success: false,
          status: 403,
          message: 'Guest accounts have read-only demo access. Writes are protected by ASP.NET Core authorization policies.',
        };
      }

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          message: `Request failed with status ${res.status}`,
        };
      }

      return { success: true, message: 'Goal successfully created!' };
    } catch {
      return {
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access. Writes are protected by ASP.NET Core authorization policies.',
      };
    }
  }

  static async getRides(): Promise<RideSummary[]> {
    try {
      const res = await fetch(`${API_BASE}/geo/rides`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error fetching rides list from Geo service, using fallback', e);
    }

    return [
      { id: 'country-roads-with-friends', title: 'Country Roads with Friends', distanceKm: 83.9, elevationGainM: 723, durationMinutes: 274, date: 'Aug 30, 2026' },
      { id: 'sunday-sunrise-with-friends', title: 'Sunday Sunrise with Friends', distanceKm: 84.7, elevationGainM: 481, durationMinutes: 255, date: 'Aug 09, 2026' },
      { id: 'wandering-in-pastures', title: 'Wandering in Pastures', distanceKm: 82.2, elevationGainM: 569, durationMinutes: 255, date: 'Oct 03, 2026' },
      { id: 'early-bird-sundaze', title: 'Early Bird Sundaze', distanceKm: 80.9, elevationGainM: 527, durationMinutes: 209, date: 'Sep 06, 2026' },
      { id: 'salado-sunday-with-friends', title: 'Salado Sunday with Friends', distanceKm: 73.3, elevationGainM: 510, durationMinutes: 199, date: 'Aug 16, 2026' }
    ];
  }

  static async getRideById(id: string): Promise<RouteData> {
    try {
      const res = await fetch(`${API_BASE}/geo/rides/${encodeURIComponent(id)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`Error fetching ride ${id} from Geo service`, e);
    }
    return this.getSampleRoute();
  }

  static async uploadFitFile(file: File): Promise<RouteData> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/geo/activities`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to parse .FIT file' }));
      throw new Error(err.error || 'Failed to parse .FIT file');
    }

    return await res.json();
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

  static async extractSkills(text: string): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/api/skills/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data: ExtractSkillsResponse = await res.json();
        if (data.skills && data.skills.length > 0) {
          return data.skills;
        }
      }
    } catch (e) {
      console.warn('Backend extract error, using client-side fallback', e);
    }

    // Fallback if backend is offline
    const terms: string[] = [];
    const lower = text.toLowerCase();
    if (lower.includes('.net') || lower.includes('c#')) terms.push('C# .NET 10 Minimal APIs');
    if (lower.includes('yarp') || lower.includes('proxy')) terms.push('YARP Reverse Proxy');
    if (lower.includes('react') || lower.includes('typescript')) terms.push('React 19 & TypeScript');
    if (lower.includes('docker') || lower.includes('container')) terms.push('Docker & Containerization');
    if (lower.includes('garmin') || lower.includes('fit') || lower.includes('geo')) terms.push('Geospatial Garmin FIT Telemetry');
    if (lower.includes('ai') || lower.includes('llm') || lower.includes('agent')) terms.push('AI Agent & LLM Pipelines');
    return terms.length > 0 ? terms : ['C# .NET 10 Minimal APIs', 'Distributed Systems', 'Cloud Architecture'];
  }

  static async getLearningResources(skill: string): Promise<LearningResource[]> {
    try {
      const res = await fetch(`${API_BASE}/api/resources?skill=${encodeURIComponent(skill)}`);
      if (res.ok) {
        const data: LearningResourcesResponse = await res.json();
        if (data.resources && data.resources.length > 0) {
          return data.resources;
        }
      }
    } catch (e) {
      console.warn('Backend resources error, using client-side fallback', e);
    }

    return [
      {
        title: `Deep Dive: ${skill} Architecture & Native AOT Compilation`,
        provider: 'YouTube',
        author: 'Nick Chapsas',
        duration: '28 mins',
        url: 'https://youtube.com',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80',
        badge: 'Top Architecture',
      },
      {
        title: `Enterprise Microservices with ${skill} & Clean Architecture`,
        provider: 'Udemy',
        author: 'Milan Jovanović',
        duration: '14.5 hours',
        url: 'https://udemy.com',
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80',
        badge: 'Best Seller',
      },
      {
        title: `Building Resilient High-Throughput Services with ${skill}`,
        provider: 'YouTube',
        author: 'dotnet',
        duration: '42 mins',
        url: 'https://youtube.com',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516116211227-bbc80e9275b6?w=400&q=80',
        badge: 'Official Microsoft',
      },
    ];
  }
}

