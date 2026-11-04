import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiService } from '../services/api';

describe('ApiService Client Store & Telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Guest Authentication & Session Management', () => {
    it('initializes a valid guest session and stores token in localStorage', async () => {
      const session = await ApiService.loginAsGuest();
      expect(session).toBeDefined();
      expect(session.user.role).toBe('guest');
      expect(ApiService.getToken()).toBe(session.token);
      expect(ApiService.getUser()?.email).toBe('guest@demo.local');
    });

    it('clears session tokens on logout', () => {
      ApiService.setSession('test_token', { id: '1', name: 'Test', email: 'test@local', role: 'guest', avatarUrl: 'https://example.com/avatar.jpg' });
      expect(ApiService.getToken()).toBe('test_token');
      ApiService.clearSession();
      expect(ApiService.getToken()).toBeNull();
      expect(ApiService.getUser()).toBeNull();
    });
  });

  describe('Geospatial Garmin Telemetry', () => {
    it('returns all 7 curated Central Texas cycling routes', async () => {
      const rides = await ApiService.getRides();
      expect(rides.length).toBe(7);
      const firstCentury = rides.find(r => r.id.includes('first-century'));
      expect(firstCentury).toBeDefined();
      expect(firstCentury?.title).toBe('First Century / 186 km');
      expect(firstCentury?.distanceKm).toBeGreaterThan(180);
      expect(firstCentury?.elevationGainM).toBeGreaterThan(1000);
    });

    it('fetches sanitized route details with points and elevation gain', async () => {
      const sample = await ApiService.getSampleRoute();
      expect(sample).toBeDefined();
      expect(sample.activityName).toBeDefined();
      expect(sample.points.length).toBeGreaterThanOrEqual(9);

      // Verify privacy geofence: all points must be outside 400m radius of residence (30.5401, -97.5583)
      const homeLat = 30.540118;
      const homeLon = -97.558348;
      for (const p of sample.points) {
        const dLat = (p.lat - homeLat) * (Math.PI / 180);
        const dLon = (p.lon - homeLon) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(homeLat * (Math.PI / 180)) * Math.cos(p.lat * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = 6371000 * c;
        expect(distanceMeters).toBeGreaterThanOrEqual(390); // 400m geofence with rounding tolerance
      }
    });
  });

  describe('Curated Learning Resources & Search URLs', () => {
    it('generates direct Udemy course search URLs matching the active skill', async () => {
      const resources = await ApiService.getLearningResources('Software Architecture');
      expect(resources.length).toBe(3);

      const udemyCourse = resources.find(r => r.provider === 'Udemy');
      expect(udemyCourse).toBeDefined();
      expect(udemyCourse?.url).toContain('https://www.udemy.com/courses/search/');
      expect(udemyCourse?.url).toContain('Software%20Architecture');
    });

    it('generates direct YouTube tutorial search URLs for skill and author', async () => {
      const resources = await ApiService.getLearningResources('React');
      const youtubeResource = resources.find(r => r.provider === 'YouTube');
      expect(youtubeResource).toBeDefined();
      expect(youtubeResource?.url).toContain('https://www.youtube.com/results?search_query=');
      expect(youtubeResource?.url).toContain('React');
    });
  });

  describe('Skill Extraction Pipeline', () => {
    it('correctly extracts technical skill tags via Gemini or fallback taxonomy', async () => {
      const result = await ApiService.extractSkills('Experienced with C#, React, and Docker in enterprise SaaS.');
      expect(result.skills.length).toBeGreaterThan(0);
      const hasCSharp = result.skills.some(s => s.toLowerCase().includes('c#'));
      const hasReact = result.skills.some(s => s.toLowerCase().includes('react'));
      const hasDocker = result.skills.some(s => s.toLowerCase().includes('docker'));
      expect(hasCSharp).toBe(true);
      expect(hasReact).toBe(true);
      expect(hasDocker).toBe(true);
    });
  });
});
