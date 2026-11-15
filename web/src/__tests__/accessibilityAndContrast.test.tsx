import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { App } from '../App';
import { ProfileHero } from '../components/ProfileHero';
import { VerifiedDeployments } from '../components/VerifiedDeployments';
import { ResumeTimeline } from '../components/ResumeTimeline';
import { GoalsSection } from '../components/GoalsSection';
import { AiSkillExtractorTab } from '../components/AiSkillExtractorTab';
import { GeospatialMapTab } from '../components/GeospatialMapTab';
import { LoginModal } from '../components/LoginModal';
import { LegalModal } from '../components/LegalModal';
import { MicroTour } from '../components/MicroTour';
import { ElevationProfileChart } from '../components/geo/ElevationProfileChart';
import { ApiService } from '../services/api';
import * as SupabaseService from '../services/supabase';
import type { Goal, Profile, User } from '../types';

async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not compute layout/canvas pixel colors; exact WCAG 2.1 contrast ratios
      // are verified deterministically across every theme token pair in web/tests/wcagContrastAndCssTokens.test.ts.
      'color-contrast': { enabled: false },
    },
  });
  const formatted = results.violations.map(
    (v) =>
      `[${v.id}] (${v.impact}) ${v.help}: ${v.nodes
        .map((n) => n.html)
        .slice(0, 3)
        .join(' | ')}`
  );
  expect(formatted).toEqual([]);
}

const sampleProfile: Profile = {
  id: 1,
  name: 'Alex Architect',
  vanitySlug: 'alex-architect',
  headline: 'Principal Distributed Systems Engineer',
  bio: 'Designing resilient .NET 10 and React 19 cloud platforms.',
  location: 'Austin, TX',
  email: 'alex@example.com',
  avatarUrl: '',
  githubUrl: 'https://github.com/alexarchitect',
  linkedinUrl: 'https://linkedin.com/in/alexarchitect',
  skills: ['C#', '.NET 10', 'React 19'],
  experienceYears: 10,
  updatedAt: '2026-01-01T00:00:00Z',
};

const adminUser: User = {
  id: 'admin-user-1',
  name: 'Alex Architect',
  email: 'alex@example.com',
  role: 'admin',
  avatarUrl: '',
};

const sampleGoals: Goal[] = [
  {
    id: 1,
    title: '.NET 10 Native AOT',
    description: 'Zero-JIT microservice optimization',
    category: 'Technical',
    progress: 75,
    targetDate: 'Q3 2026',
    status: 'InProgress',
    tags: ['.NET 10', 'AOT'],
    createdAt: '2026-01-01',
  },
  {
    id: 2,
    title: '100km Gran Fondo',
    description: 'Endurance cycling benchmark',
    category: 'Personal',
    progress: 100,
    targetDate: 'Q4 2026',
    status: 'Completed',
    tags: ['Cycling'],
    createdAt: '2026-01-02',
  },
];

describe('Automated axe-core Semantic, Landmark, Form & Modal Accessibility Gate', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('passes axe-core on full App portfolio shell (skip-link, landmarks, tablist/tabpanel, headings)', async () => {
    vi.spyOn(SupabaseService, 'getOrInitSupabaseClient').mockReturnValue(null);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline test mode'));

    const { container } = render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /John.*Bendfeldt/i })).toBeDefined();
    });

    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    expect(document.getElementById('main-content')).not.toBeNull();

    await expectNoAxeViolations(container);
  });

  it('passes axe-core on ProfileHero & open ProfileEditModal and closes on Escape', async () => {
    const { container } = render(
      <ProfileHero
        profile={sampleProfile}
        user={adminUser}
        workspaceMode="personal"
        onToggleWorkspaceMode={vi.fn()}
        onSaveCustomProfile={vi.fn()}
        onExploreTech={vi.fn()}
        onExploreMap={vi.fn()}
        onExploreAi={vi.fn()}
        onExploreResume={vi.fn()}
      />
    );

    await expectNoAxeViolations(container);

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    expect(screen.getByRole('dialog', { name: /Customize My Profile/i })).toBeDefined();
    await expectNoAxeViolations(document.body);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Customize My Profile/i })).toBeNull();
  });

  it('passes axe-core on VerifiedDeployments & Add Project modal and ResumeTimeline & AddRoleModal', async () => {
    const { unmount } = render(
      <main>
        <VerifiedDeployments workspaceMode="personal" userName="Alex" />
      </main>
    );
    fireEvent.click(screen.getByRole('button', { name: /Add My Project/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    await expectNoAxeViolations(document.body);
    unmount();

    render(
      <main>
        <ResumeTimeline workspaceMode="personal" userName="Alex" />
      </main>
    );
    fireEvent.click(screen.getByRole('button', { name: /Add Role/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    await expectNoAxeViolations(document.body);
  });

  it('passes axe-core across GoalsSection board, activity log, Add Goal, Log Career Hours, and Bulk Import modals', async () => {
    ApiService.setSession('admin-token', adminUser);
    const { container } = render(
      <main>
        <GoalsSection
          goals={sampleGoals}
          onRefresh={vi.fn()}
          workspaceMode="personal"
        />
      </main>
    );

    await expectNoAxeViolations(container);

    // Open Add Goal modal
    fireEvent.click(screen.getByRole('button', { name: /Add Goal/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    await expectNoAxeViolations(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });

    // Switch to Activity Log & open Log Career Hours modal + Import CSV/JSON modal
    fireEvent.click(screen.getByRole('button', { name: /Activity Log/i }));
    await expectNoAxeViolations(container);

    fireEvent.click(screen.getByRole('button', { name: /Log Career Hours/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    await expectNoAxeViolations(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getAllByRole('button', { name: /Import/i })[0]);
    expect(screen.getByRole('dialog')).toBeDefined();
    await expectNoAxeViolations(document.body);
  });

  it('passes axe-core on AiSkillExtractorTab and GeospatialMapTab views', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline test mode'));
    const { container, unmount } = render(
      <main>
        <AiSkillExtractorTab workspaceMode="portfolio" />
      </main>
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/Job Description or Resume Bio/i)).toBeDefined();
    });
    await expectNoAxeViolations(container);
    unmount();

    const { container: mapContainer } = render(
      <main>
        <GeospatialMapTab workspaceMode="personal" userName="Alex" />
      </main>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Alex's GPS Telemetry Visualizer/i })).toBeDefined();
    });
    await expectNoAxeViolations(mapContainer);
  });

  it('passes axe-core on LoginModal (with OAuth diagnostic form), LegalModal, MicroTour, and keyboard ElevationProfileChart', async () => {
    vi.spyOn(SupabaseService, 'getOrInitSupabaseClient').mockReturnValue(null);
    const onCloseLogin = vi.fn();
    const { unmount: unmountLogin } = render(
      <LoginModal onLoginSuccess={vi.fn()} onClose={onCloseLogin} />
    );

    // Trigger OAuth diagnostic key input box to audit its form controls too
    fireEvent.click(screen.getByRole('button', { name: /GitHub/i }));
    expect(await screen.findByRole('alert')).toBeDefined();
    await expectNoAxeViolations(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseLogin).toHaveBeenCalledTimes(1);
    unmountLogin();

    const onCloseLegal = vi.fn();
    const { unmount: unmountLegal } = render(
      <LegalModal initialTab="privacy" onClose={onCloseLegal} onSwitchTab={vi.fn()} />
    );
    await expectNoAxeViolations(document.body);
    unmountLegal();

    const { container: tourContainer, unmount: unmountTour } = render(
      <MicroTour step={0} onNext={vi.fn()} onClose={vi.fn()} onSelectTab={vi.fn()} />
    );
    await expectNoAxeViolations(tourContainer);
    unmountTour();

    // Verify keyboard scrubbing on ElevationProfileChart
    const { container: chartContainer } = render(
      <main>
        <ElevationProfileChart
          distanceKm={40}
          points={[
            { lat: 30.1, lon: -97.7, elevation: 180, timestamp: '2026-01-01T10:00:00Z' },
            { lat: 30.2, lon: -97.6, elevation: 245, timestamp: '2026-01-01T10:30:00Z' },
            { lat: 30.3, lon: -97.5, elevation: 310, timestamp: '2026-01-01T11:00:00Z' },
          ]}
        />
      </main>
    );
    await expectNoAxeViolations(chartContainer);
    const svg = screen.getByRole('img', { name: /Route elevation profile chart/i });
    fireEvent.keyDown(svg, { key: 'End' });
    expect(screen.getByText(/310\.0 m/)).toBeDefined();
    expect(screen.getByText(/@ 40\.0 km/)).toBeDefined();
    fireEvent.keyDown(svg, { key: 'Escape' });
    expect(screen.getByText('Hover chart to inspect split elevation')).toBeDefined();
  });
});
