import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import {
  analyzeRouteTelemetry,
  classifyGrade,
  formatDistance,
  formatElevation,
  formatSpeed,
} from '../components/geo/telemetryAnalytics';
import {
  computeCategoryBreakdown,
  computeMonthlyBreakdown,
  computeWeeklyPaceInsight,
} from '../utils/advancementReportExport';
import { CommandPalette } from '../components/CommandPalette';
import { ArchitectureExplorerModal } from '../components/ArchitectureExplorerModal';
import { FocusStudyTimer, formatClockDuration, secondsToRoundedHours } from '../components/goals/FocusStudyTimer';
import { AdvancementInsightsPanel } from '../components/goals/AdvancementInsightsPanel';
import { RecruiterScorecard, buildRecruiterMatchBrief } from '../components/ai/RecruiterScorecard';
import { ResumeTimeline } from '../components/ResumeTimeline';
import { ToastContainer } from '../components/ui/ToastContainer';
import { GeospatialMapTab } from '../components/GeospatialMapTab';
import { VerifiedDeployments } from '../components/VerifiedDeployments';
import { ApiService } from '../services/api';
import type { AnnualProgress, CareerEntry, Goal } from '../types';

async function expectZeroAxe(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  const formatted = results.violations.map(
    (v) => `[${v.id}] (${v.impact}) ${v.help}: ${v.nodes.map((n) => n.html).slice(0, 2).join(' | ')}`
  );
  expect(formatted).toEqual([]);
}

const SAMPLE_ENTRIES: CareerEntry[] = [
  {
    id: 1,
    title: '.NET 10 YARP Gateway Architecture',
    description: 'Deep dive into reverse proxy caching and security headers',
    startDate: '2026-02-14',
    endDate: '2026-02-14',
    hours: 12,
    categoryId: 1,
    category: 'Development',
    goalId: 1,
    goalTitle: 'Master .NET 10',
    createdAt: '2026-02-14T00:00:00Z',
  },
  {
    id: 2,
    title: 'Zero-Trust Cloud Security Audit',
    description: 'CSP, HSTS, OIDC nonce verification',
    startDate: '2026-05-09',
    endDate: '2026-05-10',
    hours: 8,
    categoryId: 6,
    category: 'Security',
    goalId: null,
    goalTitle: null,
    createdAt: '2026-05-10T00:00:00Z',
  },
];

const SAMPLE_GOALS: Goal[] = [
  {
    id: 1,
    title: 'Master .NET 10',
    description: 'Native AOT & YARP microservices',
    category: 'Technical',
    progress: 60,
    targetHours: 20,
    loggedHours: 12,
    entryCount: 1,
    targetDate: 'Q4 2026',
    status: 'InProgress',
    tags: ['.NET 10', 'YARP'],
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const SAMPLE_PROGRESS: AnnualProgress = {
  annualGoalHours: 40,
  completedHours: 20,
  percentComplete: 50,
  totalEntries: 2,
  year: 2026,
  isOnTrack: true,
  expectedProgressPercent: 25,
  quarterLabel: 'Q2 • 25% Checkpoint',
};

describe('Standout Features — Telemetry, Command Palette, Architecture Explorer, Analytics & Recruiter Bridge', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('computes telemetry distance, grade %, speed, splits, and metric/imperial conversions', () => {
    const points = [
      { lat: 30.25, lon: -97.75, elevation: 150, timestamp: '2026-01-01T10:00:00Z' },
      { lat: 30.28, lon: -97.75, elevation: 220, timestamp: '2026-01-01T10:15:00Z' },
      { lat: 30.31, lon: -97.75, elevation: 310, timestamp: '2026-01-01T10:30:00Z' },
      { lat: 30.34, lon: -97.75, elevation: 260, timestamp: '2026-01-01T10:45:00Z' },
      { lat: 30.37, lon: -97.75, elevation: 190, timestamp: '2026-01-01T11:00:00Z' },
    ];

    const summary = analyzeRouteTelemetry(points, 24, 60);
    expect(summary.points).toHaveLength(5);
    expect(summary.avgSpeedKmh).toBe(24);
    expect(summary.minElevationM).toBe(150);
    expect(summary.maxElevationM).toBe(310);
    expect(summary.splits.length).toBeGreaterThanOrEqual(2);
    expect(classifyGrade(6.5)).toBe('steep');
    expect(classifyGrade(3.0)).toBe('moderate');
    expect(classifyGrade(-4.0)).toBe('descent');
    expect(classifyGrade(0.5)).toBe('flat');
    expect(formatDistance(10, 'metric')).toBe('10.0 km');
    expect(formatDistance(10, 'imperial')).toBe('6.2 mi');
    expect(formatElevation(100, 'imperial')).toContain('ft');
    expect(formatSpeed(25, 'imperial')).toContain('mph');
  });

  it('computes monthly cadence, category distribution, and weekly pace insights', () => {
    const monthly = computeMonthlyBreakdown(SAMPLE_ENTRIES, 2026);
    expect(monthly).toHaveLength(12);
    expect(monthly[1].hours).toBe(12); // Feb
    expect(monthly[4].hours).toBe(8); // May

    const categories = computeCategoryBreakdown(SAMPLE_ENTRIES, 2026);
    expect(categories[0].name).toBe('Development');
    expect(categories[0].sharePercent).toBe(60);
    expect(categories[1].name).toBe('Security');
    expect(categories[1].sharePercent).toBe(40);

    const pace = computeWeeklyPaceInsight(SAMPLE_PROGRESS, new Date(2026, 5, 1));
    expect(pace.remainingHours).toBe(20);
    expect(pace.hoursPerWeekNeeded).toBeGreaterThan(0);
    expect(pace.statusSummary).toContain('hrs/wk');
  });

  it('filters CommandPalette with search, executes on Enter, and passes axe-core', async () => {
    const onOpenArchitecture = vi.fn();
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        theme="light"
        workspaceMode="portfolio"
        canSwitchWorkspace={false}
        isAuthenticated={false}
        onSelectTab={vi.fn()}
        onToggleTheme={vi.fn()}
        onOpenArchitecture={onOpenArchitecture}
        onExportResume={vi.fn()}
        onStartTour={vi.fn()}
        onOpenFocusTimer={vi.fn()}
        onRunRecruiterMatch={vi.fn()}
        onToggleWorkspaceMode={vi.fn()}
        onOpenLogin={vi.fn()}
      />
    );

    await expectZeroAxe(document.body);

    const input = screen.getByPlaceholderText(/Jump to a section/i);
    fireEvent.change(input, { target: { value: 'architecture' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenArchitecture).toHaveBeenCalledTimes(1);
  });

  it('inspects nodes, simulates request flow, jumps to tabs, and passes axe-core in ArchitectureExplorerModal', async () => {
    const onJumpToTab = vi.fn();
    const onClose = vi.fn();

    render(
      <ArchitectureExplorerModal
        isOpen
        onClose={onClose}
        onJumpToTab={onJumpToTab}
      />
    );

    await expectZeroAxe(document.body);

    fireEvent.click(screen.getByRole('button', { name: /CareerPlatform\.Geo/i }));
    expect(screen.getByText(/Official Garmin\.FIT\.Sdk/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Simulate Request Flow/i }));
    await waitFor(() => {
      expect(screen.getByText(/01 \/ SPA/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /CareerPlatform\.Geo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Launch Garmin Map Visualizer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onJumpToTab).toHaveBeenCalledWith('map');
  });

  it('runs FocusStudyTimer presets, logs a pre-filled session, and passes axe-core', async () => {
    expect(formatClockDuration(3661)).toBe('01:01:01');
    expect(secondsToRoundedHours(1800)).toBe(0.5);

    const onLogSession = vi.fn();
    const { container } = render(
      <main>
        <FocusStudyTimer onLogSession={onLogSession} />
      </main>
    );

    await expectZeroAxe(container);

    fireEvent.click(screen.getByRole('button', { name: /25m Sprint/i }));
    expect(screen.getByText('00:25:00')).toBeDefined();

    const topicInput = screen.getByLabelText(/Study session topic/i);
    fireEvent.change(topicInput, { target: { value: 'YARP Caching Labs' } });

    fireEvent.click(screen.getByRole('button', { name: /Log Session/i }));
    expect(onLogSession).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'YARP Caching Labs',
      })
    );
  });

  it('renders AdvancementInsightsPanel, filters by category click, and passes axe-core', async () => {
    const onSelectCategoryFilter = vi.fn();
    const { container } = render(
      <main>
        <AdvancementInsightsPanel
          entries={SAMPLE_ENTRIES}
          goals={SAMPLE_GOALS}
          progress={SAMPLE_PROGRESS}
          selectedYear={2026}
          profileName="John F. Bendfeldt"
          onSelectCategoryFilter={onSelectCategoryFilter}
        />
      </main>
    );

    await expectZeroAxe(container);

    fireEvent.click(screen.getByRole('button', { name: /Development/i }));
    expect(onSelectCategoryFilter).toHaveBeenCalledWith(1);
  });

  it('generates Recruiter Match Brief, triggers Highlight on Resume, and highlights matching ResumeTimeline chips', async () => {
    const brief = buildRecruiterMatchBrief(['C# & .NET 10', 'Rust']);
    expect(brief).toContain('50%');
    expect(brief).toContain('C# & .NET 10');
    expect(brief).toContain('Rust');

    const onHighlightOnResume = vi.fn();
    const onNotify = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const { unmount } = render(
      <main>
        <RecruiterScorecard
          extractedSkills={['C# & .NET 10', 'React & TypeScript']}
          onHighlightOnResume={onHighlightOnResume}
          onNotify={onNotify}
        />
      </main>
    );

    fireEvent.click(screen.getByRole('button', { name: /Copy Recruiter Brief/i }));
    await waitFor(() => {
      expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('Recruiter Match Brief'), 'success');
    });

    fireEvent.click(screen.getByRole('button', { name: /Highlight on Resume/i }));
    expect(onHighlightOnResume).toHaveBeenCalledWith(['C# & .NET 10', 'React & TypeScript']);
    unmount();

    const onClear = vi.fn();
    const { container } = render(
      <main>
        <ResumeTimeline
          workspaceMode="portfolio"
          highlightedSkills={['C# & .NET 10', 'React']}
          onClearHighlightedSkills={onClear}
        />
      </main>
    );

    expect(screen.getByText(/JD Skill Lens Active/i)).toBeDefined();
    expect(container.querySelectorAll('.tag-chip-matched').length).toBeGreaterThan(2);
    await expectZeroAxe(container);

    fireEvent.click(screen.getByRole('button', { name: /Clear Highlight/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders accessible ToastContainer notifications and dismisses cleanly', async () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <ToastContainer
        toasts={[
          { id: 't1', message: 'Saved session!', tone: 'success' },
          { id: 't2', message: 'Upload error', tone: 'error' },
        ]}
        onDismiss={onDismiss}
      />
    );

    await expectZeroAxe(container);
    const dismissButtons = screen.getAllByRole('button', { name: /Dismiss notification/i });
    fireEvent.click(dismissButtons[0]);
    expect(onDismiss).toHaveBeenCalledWith('t1');
  });

  it('toggles metric/imperial units, opens segment splits, starts route replay, and replaces alert() on invalid upload in GeospatialMapTab', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline test mode'));
    const onNotify = vi.fn();

    render(
      <main>
        <GeospatialMapTab workspaceMode="personal" userName="Alex" theme="dark" onNotify={onNotify} />
      </main>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Replay Route/i })).toBeDefined();
    });

    // Switch to Imperial (mi / ft)
    fireEvent.click(screen.getByRole('button', { name: 'mi / ft' }));
    expect(screen.getAllByText(/mi\b/i).length).toBeGreaterThan(0);

    // Open segment splits table
    fireEvent.click(screen.getByRole('button', { name: /Inspect Segment Splits/i }));
    expect(screen.getByText('S1')).toBeDefined();

    // Start & pause route replay
    fireEvent.click(screen.getByRole('button', { name: /Replay Route/i }));
    expect(screen.getByRole('button', { name: /Pause Replay/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Pause Replay/i }));

    // Upload invalid file triggers accessible alert banner + toast (no window.alert)
    const fileInput = document.getElementById('fit-gpx-upload-input') as HTMLInputElement;
    const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    expect(screen.getByRole('alert').textContent).toContain('valid Garmin binary .fit or .gpx');
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('valid Garmin binary'), 'error');
  });

  it('showcases Just Believe Fitness (jbfit.studio) in the 5-card editorial grid and hydrates default profile/goals synchronously', async () => {
    const onOpenArchitecture = vi.fn();
    const { container } = render(
      <main>
        <VerifiedDeployments workspaceMode="portfolio" onOpenArchitecture={onOpenArchitecture} />
      </main>
    );

    await expectZeroAxe(container);

    expect(container.querySelector('.deployments-editorial-grid')).not.toBeNull();
    expect(screen.getByText('Just Believe Fitness')).toBeDefined();
    const jbfitLink = screen.getByRole('link', { name: /Visit jbfit\.studio/i }) as HTMLAnchorElement;
    expect(jbfitLink.href).toBe('https://jbfit.studio/');
    expect(jbfitLink.getAttribute('rel')).toContain('noopener');

    fireEvent.click(screen.getByRole('button', { name: /Inspect Live Architecture/i }));
    expect(onOpenArchitecture).toHaveBeenCalledTimes(1);

    // Zero-CLS synchronous default portfolio state
    const defaultProfile = ApiService.getDefaultPortfolioProfile();
    const defaultGoals = ApiService.getDefaultPortfolioGoals();
    expect(defaultProfile.name).toContain('Bendfeldt');
    expect(defaultGoals.length).toBeGreaterThanOrEqual(6);
  });
});

