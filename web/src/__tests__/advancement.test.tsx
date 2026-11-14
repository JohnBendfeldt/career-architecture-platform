import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  calculatePercentComplete,
  computeAnnualProgress,
  enrichGoalsWithEntries,
  getQuarterlyCheckpoint,
  validateCareerEntry,
} from '../utils/advancementUtils';
import { ApiService } from '../services/api';
import { GoalsSection } from '../components/GoalsSection';
import { ProfileEditModal } from '../components/profile/ProfileEditModal';
import type { CareerEntry, Goal, Profile } from '../types';

vi.mock('../services/supabase', () => ({
  getOrInitSupabaseClient: () => null,
  signOutFromSupabase: vi.fn(),
  consumeGoogleIdTokenFromHash: vi.fn().mockResolvedValue(undefined),
}));

describe('Career Advancement Integration & Tandem Goals', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('advancementUtils calculations and validation', () => {
    it('computes quarterly checkpoints accurately across Q1-Q4 and historical years', () => {
      expect(getQuarterlyCheckpoint(new Date(2026, 1, 15), 2026).expectedPercent).toBe(0);
      expect(getQuarterlyCheckpoint(new Date(2026, 4, 15), 2026).expectedPercent).toBe(25);
      expect(getQuarterlyCheckpoint(new Date(2026, 7, 15), 2026).expectedPercent).toBe(50);
      expect(getQuarterlyCheckpoint(new Date(2026, 10, 15), 2026).expectedPercent).toBe(75);
      expect(getQuarterlyCheckpoint(new Date(2026, 1, 15), 2025).expectedPercent).toBe(100);
    });

    it('computes annual progress and quarterly on-track status', () => {
      const entries = ApiService.getDefaultPortfolioEntries();
      const q3Progress = computeAnnualProgress(entries, 55, 2026, new Date(2026, 8, 1));

      expect(q3Progress.completedHours).toBe(50);
      expect(q3Progress.annualGoalHours).toBe(55);
      expect(q3Progress.percentComplete).toBe(calculatePercentComplete(50, 55));
      expect(q3Progress.totalEntries).toBe(5);
      expect(q3Progress.expectedProgressPercent).toBe(50);
      expect(q3Progress.isOnTrack).toBe(true);

      const q4HighGoal = computeAnnualProgress(entries, 100, 2026, new Date(2026, 10, 14));
      expect(q4HighGoal.expectedProgressPercent).toBe(75);
      expect(q4HighGoal.isOnTrack).toBe(false);
    });

    it('validates entry dates, inverted ranges, future dates, and hours bounds', () => {
      const now = new Date(2026, 10, 14, 12, 0, 0);

      expect(
        validateCareerEntry(
          {
            title: '',
            startDate: '2026-11-10',
            endDate: '2026-11-10',
            hours: 2,
          },
          now
        )
      ).toContain('Title');

      expect(
        validateCareerEntry(
          {
            title: 'Inverted Range',
            startDate: '2026-11-12',
            endDate: '2026-11-10',
            hours: 2,
          },
          now
        )
      ).toContain('Start date cannot be after end date');

      expect(
        validateCareerEntry(
          {
            title: 'Future Date',
            startDate: '2026-11-14',
            endDate: '2026-11-20',
            hours: 2,
          },
          now
        )
      ).toContain('future');

      expect(
        validateCareerEntry(
          {
            title: 'Zero Hours',
            startDate: '2026-11-10',
            endDate: '2026-11-10',
            hours: 0,
          },
          now
        )
      ).toContain('0.01');

      expect(
        validateCareerEntry(
          {
            title: 'Valid Spike',
            startDate: '2026-11-10',
            endDate: '2026-11-14',
            hours: 4.5,
          },
          now
        )
      ).toBeNull();
    });

    it('enriches goals with logged hours and auto-completes targetHours milestones', () => {
      const goals: Goal[] = [
        {
          id: 1,
          title: 'Target Hours Goal',
          description: 'Driven by hours',
          category: 'Technical',
          progress: 0,
          targetHours: 10,
          targetDate: '2026',
          status: 'InProgress',
          tags: ['Test'],
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Manual Goal',
          description: 'Driven manually',
          category: 'Personal',
          progress: 50,
          targetHours: null,
          targetDate: '2026',
          status: 'InProgress',
          tags: ['Manual'],
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];

      const entries: CareerEntry[] = [
        {
          id: 10,
          title: 'Part 1',
          description: '',
          startDate: '2026-02-01',
          endDate: '2026-02-01',
          hours: 4,
          categoryId: 1,
          category: 'Development',
          goalId: 1,
          goalTitle: 'Target Hours Goal',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: null,
        },
        {
          id: 11,
          title: 'Part 2',
          description: '',
          startDate: '2026-02-05',
          endDate: '2026-02-05',
          hours: 6,
          categoryId: 1,
          category: 'Development',
          goalId: 1,
          goalTitle: 'Target Hours Goal',
          createdAt: '2026-02-05T00:00:00Z',
          updatedAt: null,
        },
      ];

      const enriched = enrichGoalsWithEntries(goals, entries);
      expect(enriched[0].loggedHours).toBe(10);
      expect(enriched[0].entryCount).toBe(2);
      expect(enriched[0].progress).toBe(100);
      expect(enriched[0].status).toBe('Completed');

      expect(enriched[1].progress).toBe(50);
      expect(enriched[1].status).toBe('InProgress');
    });
  });

  describe('ApiService tandem Goals and CareerEntries workflows', () => {
    it('blocks career entry writes and annual goal updates for guest sessions with 403', async () => {
      await ApiService.loginAsGuest();

      const createRes = await ApiService.createCareerEntry({
        title: 'Blocked Entry',
        startDate: '2026-05-01',
        endDate: '2026-05-01',
        hours: 2,
        categoryId: 1,
        goalId: 1,
      });
      expect(createRes.success).toBe(false);
      expect(createRes.status).toBe(403);

      const updateHoursRes = await ApiService.updateAnnualGoalHours(60);
      expect(updateHoursRes.success).toBe(false);
      expect(updateHoursRes.status).toBe(403);

      const deleteRes = await ApiService.deleteCareerEntry(1);
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.status).toBe(403);
    });

    it('creates a goal with targetHours, logs linked entries, auto-completes, and recalculates on delete', async () => {
      ApiService.setSession('oauth_test_token', {
        id: 'user-oauth-1',
        name: 'Taylor Engineer',
        email: 'taylor@example.com',
        role: 'admin',
        avatarUrl: '',
      });

      const goalRes = await ApiService.createGoal({
        title: 'Distributed Systems Certification',
        description: 'Complete distributed architecture track.',
        category: 'Technical',
        targetHours: 10,
      });

      expect(goalRes.success).toBe(true);
      const goalId = goalRes.goal!.id;
      expect(goalRes.goal?.progress).toBe(0);

      const firstLog = await ApiService.createCareerEntry({
        title: 'Module 1: Consensus Protocols',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        hours: 4,
        categoryId: 4,
        goalId,
      });
      expect(firstLog.success).toBe(true);

      let updatedGoal = ApiService.getPersonalGoals().find((g) => g.id === goalId)!;
      expect(updatedGoal.loggedHours).toBe(4);
      expect(updatedGoal.progress).toBe(40);
      expect(updatedGoal.status).toBe('InProgress');

      const secondLog = await ApiService.createCareerEntry({
        title: 'Module 2: Partition Tolerance Lab',
        startDate: '2026-06-10',
        endDate: '2026-06-11',
        hours: 6,
        categoryId: 4,
        goalId,
      });
      expect(secondLog.success).toBe(true);

      updatedGoal = ApiService.getPersonalGoals().find((g) => g.id === goalId)!;
      expect(updatedGoal.loggedHours).toBe(10);
      expect(updatedGoal.progress).toBe(100);
      expect(updatedGoal.status).toBe('Completed');

      const deleteRes = await ApiService.deleteCareerEntry(firstLog.entry!.id);
      expect(deleteRes.success).toBe(true);

      updatedGoal = ApiService.getPersonalGoals().find((g) => g.id === goalId)!;
      expect(updatedGoal.loggedHours).toBe(6);
      expect(updatedGoal.progress).toBe(60);
      expect(updatedGoal.status).toBe('InProgress');

      const hoursRes = await ApiService.updateAnnualGoalHours(75);
      expect(hoursRes.success).toBe(true);
      expect(hoursRes.annualGoalHours).toBe(75);
    });
  });

  describe('GoalsSection and ProfileEditModal UI components', () => {
    it('renders Annual Career Advancement banner, toggles Board <-> Activity Log, and pre-selects goal on + Log Hours', async () => {
      const goals = await ApiService.getGoals();
      const entries = ApiService.getDefaultPortfolioEntries();

      render(
        <GoalsSection
          goals={goals}
          entries={entries}
          workspaceMode="portfolio"
          annualGoalHours={55}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText('Annual Career Advancement')).toBeDefined();
      expect(screen.getByText(/\/ 55 hrs annual goal/i)).toBeDefined();
      expect(screen.getAllByText('19 / 20 hrs • 2 entries').length).toBe(2);
      expect(screen.getByText('12 / 16 hrs • 1 entry')).toBeDefined();

      // Switch to Activity Log
      fireEvent.click(screen.getByRole('button', { name: /Activity Log \(5\)/i }));
      expect(screen.getByLabelText('Filter by Category')).toBeDefined();
      expect(screen.getByLabelText('Filter by Goal')).toBeDefined();
      expect(screen.getByText('Subscription Ledger & Checkout Accounting Architecture')).toBeDefined();

      // Switch back to Goals Board
      fireEvent.click(screen.getByRole('button', { name: /Goals Board \(6\)/i }));

      // Click "+ Log Hours" on the first Goal card
      const logButtons = screen.getAllByRole('button', { name: /\+ Log Hours/i });
      fireEvent.click(logButtons[0]);

      expect(screen.getByText('Log Career Development Hours')).toBeDefined();
      const goalSelect = screen.getByLabelText(/Linked Goal \(Auto-Rollup\)/i) as HTMLSelectElement;
      expect(goalSelect.value).toBe('1');
    });

    it('edits annualGoalHours inside ProfileEditModal and passes it to onSave', () => {
      const sampleProfile: Profile = {
        id: 1,
        name: 'Jordan Lee',
        vanitySlug: 'jordan-lee',
        headline: 'Staff Engineer',
        bio: 'Architecting distributed systems.',
        location: 'Austin, TX',
        email: 'jordan@example.com',
        avatarUrl: '',
        githubUrl: 'https://github.com/jordan',
        linkedinUrl: 'https://linkedin.com/in/jordan',
        skills: ['TypeScript'],
        experienceYears: 8,
        annualGoalHours: 45,
        updatedAt: new Date().toISOString(),
      };

      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <ProfileEditModal
          isOpen={true}
          profile={sampleProfile}
          currentSlug="jordan-lee"
          onClose={onClose}
          onSave={onSave}
        />
      );

      const annualGoalInput = screen.getByLabelText(/Annual Goal \(hrs\)/i) as HTMLInputElement;
      expect(annualGoalInput.value).toBe('45');

      fireEvent.change(annualGoalInput, { target: { value: '62' } });
      fireEvent.click(screen.getByRole('button', { name: /Save My Profile/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          annualGoalHours: 62,
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
