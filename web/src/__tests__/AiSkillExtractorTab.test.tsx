import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AiSkillExtractorTab } from '../components/AiSkillExtractorTab';
import { ApiService } from '../services/api';
import { DEFAULT_CATEGORIES } from '../utils/advancementUtils';
import {
  buildResourceEntryPrefill,
  findMatchingGoalForSkill,
  inferSkillCategoryId,
  parseResourceDurationHours,
} from '../utils/aiCurriculumBridge';
import type { Goal } from '../types';

vi.mock('../services/supabase', () => ({
  getOrInitSupabaseClient: () => null,
  signOutFromSupabase: vi.fn(),
  consumeGoogleIdTokenFromHash: vi.fn().mockResolvedValue(undefined),
}));

describe('AiSkillExtractorTab & Phase 3 AI Curriculum Bridge', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the extraction interface and textarea', async () => {
    await act(async () => {
      render(<AiSkillExtractorTab />);
    });

    expect(screen.getByText(/AI Skill Extraction & Automated Curriculum/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Extract Skills via AI/i })).toBeDefined();
    expect(screen.getByText(/Extracted Skill Tokens/i)).toBeDefined();
  });

  it('renders initial skill tokens and allows switching the active skill', async () => {
    await act(async () => {
      render(<AiSkillExtractorTab />);
    });

    const reactToken = screen.getByRole('button', { name: /React & TypeScript/i });
    expect(reactToken).toBeDefined();

    await act(async () => {
      fireEvent.click(reactToken);
    });

    const heading = screen.getByRole('heading', { level: 3, name: /React & TypeScript/i });
    expect(heading).toBeDefined();
  });

  describe('aiCurriculumBridge pure helpers', () => {
    it('parses tutorial/course durations and provider fallbacks into logged hours', () => {
      expect(parseResourceDurationHours('28 mins', 'YouTube')).toBe(0.5);
      expect(parseResourceDurationHours('42 mins', 'YouTube')).toBe(0.75);
      expect(parseResourceDurationHours('90 mins', 'YouTube')).toBe(1.5);
      expect(parseResourceDurationHours('14.5 hours', 'Udemy')).toBe(14.5);
      expect(parseResourceDurationHours('2h 30m', 'Udemy')).toBe(2.5);
      expect(parseResourceDurationHours('Targeted Video Search', 'YouTube')).toBe(1);
      expect(parseResourceDurationHours('Course Catalog Search', 'Udemy')).toBe(2);
    });

    it('infers Career Advancement category IDs from skill keywords', () => {
      expect(inferSkillCategoryId('Docker & Kubernetes', DEFAULT_CATEGORIES)).toBe(4); // Cloud Computing
      expect(inferSkillCategoryId('Playwright & Vitest Testing', DEFAULT_CATEGORIES)).toBe(2); // Quality Assurance
      expect(inferSkillCategoryId('AI Agents & LLM Pipelines', DEFAULT_CATEGORIES)).toBe(5); // Data Science
      expect(inferSkillCategoryId('OAuth & JWT Security', DEFAULT_CATEGORIES)).toBe(6); // Security
      expect(inferSkillCategoryId('C# & .NET 10', DEFAULT_CATEGORIES)).toBe(1); // Development
    });

    it('matches active skills to Tandem Goals by title, tags, or tokens and builds entry prefill', async () => {
      const portfolioGoals = await ApiService.getGoals();
      const customGoals: Goal[] = [
        {
          id: 500,
          title: 'Master Docker & Kubernetes',
          description: 'Container orchestration study plan',
          category: 'Technical',
          progress: 0,
          targetHours: 12,
          targetDate: 'Q4 2026',
          status: 'InProgress',
          tags: ['Docker & Kubernetes', 'AI Curriculum'],
          createdAt: '2026-01-01T00:00:00Z',
        },
        ...portfolioGoals,
      ];

      expect(findMatchingGoalForSkill('Docker & Kubernetes', customGoals)?.id).toBe(500);
      expect(findMatchingGoalForSkill('C# & .NET 10', customGoals)?.id).toBe(1);
      expect(findMatchingGoalForSkill('Rust Systems Programming', customGoals)).toBeNull();

      const prefill = buildResourceEntryPrefill(
        'Docker & Kubernetes',
        {
          title: 'Kubernetes Architecture & Best Practices',
          provider: 'Udemy',
          author: 'Bret Fisher',
          duration: '6.5 hours',
          url: 'https://www.udemy.com/courses/search/?q=kubernetes',
          thumbnailUrl: '',
          badge: 'Hands-On',
        },
        DEFAULT_CATEGORIES,
        customGoals
      );

      expect(prefill.title).toBe('Kubernetes Architecture & Best Practices');
      expect(prefill.hours).toBe(6.5);
      expect(prefill.categoryId).toBe(4);
      expect(prefill.goalId).toBe(500);
      expect(prefill.description).toContain('Studied Docker & Kubernetes via Udemy (Bret Fisher)');
    });
  });

  it('creates a Tandem Goal with custom targetHours, pre-fills Log Hours from a curated resource, and rolls up goal completion', async () => {
    ApiService.setSession('oauth-token', {
      id: 'personal-1',
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      role: 'admin',
      avatarUrl: '',
    });

    const onGoalCreated = vi.fn();
    const onEntryLogged = vi.fn();
    const onNavigateToGoals = vi.fn();

    render(
      <AiSkillExtractorTab
        workspaceMode="personal"
        userName="Jordan Lee"
        onGoalCreated={onGoalCreated}
        onEntryLogged={onEntryLogged}
        onNavigateToGoals={onNavigateToGoals}
      />
    );

    const dockerSkillBtn = screen.getByRole('button', { name: /Docker & Kubernetes/i });
    fireEvent.click(dockerSkillBtn);

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /Log hours for/i }).length
      ).toBeGreaterThan(0);
    });

    const targetHoursInput = screen.getByLabelText('Target hours for skill goal') as HTMLInputElement;
    fireEvent.change(targetHoursInput, { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /Track as Goal/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tracked "Master Docker & Kubernetes" \(10h target\)/i)).toBeDefined();
    });

    const savedGoals = ApiService.getPersonalGoals();
    const createdGoal = savedGoals.find((g) => g.title === 'Master Docker & Kubernetes');
    expect(createdGoal).toBeDefined();
    expect(createdGoal?.targetHours).toBe(10);
    expect(createdGoal?.progress).toBe(0);
    expect(onGoalCreated).toHaveBeenCalledTimes(1);

    // Clicking Track as Goal again prevents duplicates cleanly
    fireEvent.click(screen.getByRole('button', { name: /Track as Goal/i }));
    await waitFor(() => {
      expect(screen.getByText(/"Master Docker & Kubernetes" is already tracked/i)).toBeDefined();
    });
    expect(
      ApiService.getPersonalGoals().filter((g) => g.title === 'Master Docker & Kubernetes').length
    ).toBe(1);

    // One-click Log Hours from the first curated resource card
    const logHourButtons = screen.getAllByRole('button', { name: /Log hours for/i });
    fireEvent.click(logHourButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Prefilled from AI Curriculum/i)).toBeDefined();
    });

    const titleInput = screen.getByLabelText(/Activity Title \*/i) as HTMLInputElement;
    const categorySelect = screen.getByLabelText(/^Category$/i) as HTMLSelectElement;
    const goalSelect = screen.getByLabelText(/Linked Goal/i) as HTMLSelectElement;
    const hoursInput = screen.getByLabelText(/Hours \*/i) as HTMLInputElement;

    expect(titleInput.value).toContain('Docker & Kubernetes');
    expect(categorySelect.value).toBe('4'); // Cloud Computing
    expect(goalSelect.value).toBe(String(createdGoal?.id));

    fireEvent.change(hoursInput, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save Entry$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Logged study hours for Docker & Kubernetes!/i)).toBeDefined();
    });

    const personalEntries = ApiService.getPersonalEntries();
    const loggedEntry = personalEntries.find(
      (e) => e.goalId === createdGoal?.id && e.hours === 10
    );
    expect(loggedEntry).toBeDefined();

    const updatedGoal = ApiService.getPersonalGoals().find((g) => g.id === createdGoal?.id);
    expect(updatedGoal?.loggedHours).toBe(10);
    expect(updatedGoal?.progress).toBe(100);
    expect(updatedGoal?.status).toBe('Completed');
    expect(onEntryLogged).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Open Goals & Log/i }));
    expect(onNavigateToGoals).toHaveBeenCalledTimes(1);
  });

  it('surfaces 403 read-only demo protection for guests on Track as Goal and Log Hours', async () => {
    await ApiService.loginAsGuest();
    const onOpenLogin = vi.fn();

    render(<AiSkillExtractorTab workspaceMode="portfolio" onOpenLogin={onOpenLogin} />);

    expect(
      screen.getByText(/Viewing John Bendfeldt's Portfolio — Read-Only Preview/i)
    ).toBeDefined();

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /Log hours for/i }).length
      ).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Track as Goal/i }));
    await waitFor(() => {
      expect(screen.getByText(/Guest accounts have read-only demo access/i)).toBeDefined();
    });

    const beforeEntriesCount = ApiService.getDefaultPortfolioEntries().length;
    const logButtons = screen.getAllByRole('button', { name: /Log hours for/i });
    fireEvent.click(logButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/Activity Title \*/i)).toBeDefined();
    });
    expect(
      screen.getByText(/Feel free to test-drive this form in preview mode/i)
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /^Save Entry$/i }));
    await waitFor(() => {
      expect(screen.getByText(/ASP\.NET Core 403 Forbidden — Read-Only Demo Lock/i)).toBeDefined();
    });

    expect(localStorage.getItem('cap_owner_portfolio_entries')).toBeNull();
    expect(ApiService.getDefaultPortfolioEntries().length).toBe(beforeEntriesCount);

    const signInButtons = screen.getAllByRole('button', { name: /Sign In \/ Build Your Own/i });
    fireEvent.click(signInButtons[signInButtons.length - 1]);
    expect(onOpenLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/Activity Title \*/i)).toBeNull();
  });
});
