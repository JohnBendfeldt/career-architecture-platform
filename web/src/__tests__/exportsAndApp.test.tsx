import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { exportRouteToGpx } from '../components/geo/gpxExport';
import { exportPrintableResume, isValidExperienceItem } from '../components/resume/resumePdfExport';
import * as SupabaseService from '../services/supabase';
import { App } from '../App';
import type { RouteData } from '../types';

describe('GPX/PDF Exporters & Full App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  describe('exportRouteToGpx XML Injection Protection', () => {
    it('escapes XML special characters in activityName and timestamps before generating GPX blob', async () => {
      let capturedBlob: Blob | null = null;
      const createObjectUrlSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockImplementation((obj: Blob | MediaSource) => {
          capturedBlob = obj as Blob;
          return 'blob:http://localhost/test-gpx';
        });
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const maliciousRoute: RouteData = {
        activityName: 'Ride </name><script>alert("xss")</script> & More',
        recordedDevice: 'Garmin Forerunner 255 Music',
        distanceKm: 42.5,
        elevationGainM: 310,
        durationMinutes: 95,
        points: [
          {
            lat: 30.51,
            lon: -97.57,
            elevation: 215.4,
            timestamp: '2026-05-01T12:00:00Z</time><evil attr="1"/>',
          },
        ],
        annotations: [],
      };

      exportRouteToGpx(maliciousRoute);

      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/test-gpx');
      expect(capturedBlob).not.toBeNull();

      const xml = await capturedBlob!.text();
      expect(xml).not.toContain('<script>');
      expect(xml).not.toContain('<evil');
      expect(xml).toContain('&lt;/name&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; More');
      expect(xml).toContain('&lt;/time&gt;&lt;evil attr=&quot;1&quot;/&gt;');
    });
  });

  describe('exportPrintableResume XSS & Tabnabbing Protection', () => {
    it('validates experience items and escapes HTML payloads in printable resume popup', () => {
      expect(isValidExperienceItem(null)).toBe(false);
      expect(isValidExperienceItem({ company: 'Acme', role: 'Dev' })).toBe(false);
      expect(
        isValidExperienceItem({
          company: 'Acme',
          role: 'Dev',
          badges: ['C#'],
          bullets: ['Shipped v1'],
        })
      ).toBe(true);

      let writtenHtml = '';
      const mockPopup = {
        opener: window as unknown,
        document: {
          open: vi.fn(),
          write: vi.fn((html: string) => {
            writtenHtml += html;
          }),
          close: vi.fn(),
          getElementById: vi.fn(() => null),
        },
        print: vi.fn(),
      };

      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

      exportPrintableResume({
        workspaceMode: 'personal',
        profile: {
          id: 99,
          name: '<img src=x onerror=alert(1)>',
          headline: '<b>Injected Headline</b>',
          bio: '<script>evil()</script>',
          location: 'Austin & "TX"',
          email: 'test@example.com',
          avatarUrl: '',
          githubUrl: 'https://github.com/example',
          linkedinUrl: 'https://linkedin.com/in/example',
          skills: ['C# <script>'],
          experienceYears: 5,
          updatedAt: '2026-01-01',
        },
        experiences: [
          {
            company: '<svg onload=alert(2)>',
            role: 'Engineer',
            location: 'Remote',
            period: '2025',
            highlight: 'Highlight',
            badges: ['TS'],
            bullets: ['Bullet <script>alert(3)</script>'],
          },
        ],
      });

      expect(mockPopup.opener).toBeNull();
      expect(writtenHtml).not.toContain('<script>evil()</script>');
      expect(writtenHtml).not.toContain('<img src=x onerror=alert(1)>');
      expect(writtenHtml).not.toContain('<svg onload=alert(2)>');
      expect(writtenHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(writtenHtml).toContain('&lt;svg onload=alert(2)&gt;');
      expect(writtenHtml).toContain('C# &lt;script&gt;');
    });

    it('falls back to window.print() if popup window is blocked', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      exportPrintableResume();
      expect(printSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('App Integration', () => {
    it('mounts portfolio view, toggles theme, opens Privacy Policy modal, and navigates tabs', async () => {
      vi.spyOn(SupabaseService, 'getOrInitSupabaseClient').mockReturnValue(null);
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline test mode'));
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /John.*Bendfeldt/i })).toBeDefined();
      });

      // Toggle dark mode
      fireEvent.click(screen.getByLabelText('Toggle visual theme'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.getItem('cap_theme')).toBe('dark');

      // Switch to Goals & Milestones tab
      fireEvent.click(screen.getAllByText(/Goals & Milestones/i)[0]);
      await waitFor(() => {
        expect(screen.getByText('Architecture & Life Goals')).toBeDefined();
      });

      // Open Privacy Policy from footer
      fireEvent.click(screen.getByRole('button', { name: 'Privacy Policy' }));
      await waitFor(() => {
        expect(
          screen.getByText(/Privacy Policy — Career Architecture Platform/i)
        ).toBeDefined();
      });
    });
  });
});
