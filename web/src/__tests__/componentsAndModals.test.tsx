import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Navbar } from '../components/Navbar';
import { ProfileHero } from '../components/ProfileHero';
import { GoalsSection } from '../components/GoalsSection';
import { VerifiedDeployments } from '../components/VerifiedDeployments';
import { ResumeTimeline } from '../components/ResumeTimeline';
import { LegalModal } from '../components/LegalModal';
import { LoginModal } from '../components/LoginModal';
import { MicroTour } from '../components/MicroTour';
import { RecruiterScorecard, evaluatePortfolioSkillMatch } from '../components/ai/RecruiterScorecard';
import { LearningResourceList } from '../components/ai/LearningResourceList';
import { ElevationProfileChart } from '../components/geo/ElevationProfileChart';
import { ApiService } from '../services/api';
import * as SupabaseService from '../services/supabase';
import type { Goal, Profile, User } from '../types';

const sampleProfile: Profile = {
  id: 1,
  name: 'Alex Architect',
  vanitySlug: 'alex-architect',
  headline: 'Principal Distributed Systems Engineer',
  bio: 'Designing resilient .NET 10 and React 19 cloud platforms.',
  location: 'Austin, TX',
  email: 'alex@example.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
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
  avatarUrl: 'javascript:alert(1)', // intentionally unsafe to verify fallback to initials
};

describe('UI Components, Modals & Sanitization Boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Navbar', () => {
    it('renders public sign-in trigger, toggles theme, and starts micro-tour', () => {
      const onOpenLogin = vi.fn();
      const onStartTour = vi.fn();
      const onToggleTheme = vi.fn();

      render(
        <Navbar
          user={null}
          onLogout={vi.fn()}
          onOpenLogin={onOpenLogin}
          onStartTour={onStartTour}
          theme="light"
          onToggleTheme={onToggleTheme}
        />
      );

      fireEvent.click(screen.getByText('Sign In / Build Your Own'));
      expect(onOpenLogin).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText('Toggle visual theme'));
      expect(onToggleTheme).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Guide'));
      expect(onStartTour).toHaveBeenCalledTimes(1);
    });

    it('sanitizes personal profile outbound links and falls back to initials for unsafe avatar URLs', () => {
      const onLogout = vi.fn();
      const unsafeProfile: Profile = {
        ...sampleProfile,
        githubUrl: 'javascript:alert(1)',
        linkedinUrl: 'data:text/html,<script>alert(1)</script>',
      };

      render(
        <Navbar
          user={adminUser}
          workspaceMode="personal"
          activeProfile={unsafeProfile}
          onLogout={onLogout}
          onStartTour={vi.fn()}
        />
      );

      // Initials "AA" rendered instead of unsafe javascript: avatar
      expect(screen.getByLabelText('Alex Architect').textContent).toBe('AA');
      expect(screen.getByText('BY JOHN BENDFELDT // ALEX ARCHITECT')).toBeDefined();

      const ghLink = document.getElementById('btn-nav-github') as HTMLAnchorElement;
      const liLink = document.getElementById('btn-nav-linkedin') as HTMLAnchorElement;
      expect(ghLink.href).toBe('https://github.com/');
      expect(liLink.href).toBe('https://linkedin.com/');

      fireEvent.click(screen.getByText('Sign Out'));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('ProfileHero & ProfileEditModal', () => {
    it('triggers jump navigation and sanitizes vanity slug, avatar URL, and years in ProfileEditModal', () => {
      const onExploreResume = vi.fn();
      const onExploreTech = vi.fn();
      const onExploreAi = vi.fn();
      const onExploreMap = vi.fn();
      const onSaveCustomProfile = vi.fn();

      render(
        <ProfileHero
          profile={sampleProfile}
          user={adminUser}
          workspaceMode="personal"
          onToggleWorkspaceMode={vi.fn()}
          onSaveCustomProfile={onSaveCustomProfile}
          onExploreResume={onExploreResume}
          onExploreTech={onExploreTech}
          onExploreAi={onExploreAi}
          onExploreMap={onExploreMap}
        />
      );

      fireEvent.click(screen.getByLabelText('Jump to Professional Experience and Resume section'));
      expect(onExploreResume).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByLabelText('Jump to AI Skill Extraction Pipeline section'));
      expect(onExploreAi).toHaveBeenCalledTimes(1);

      // Open Customize Profile modal
      fireEvent.click(screen.getByText('Edit Profile'));
      expect(screen.getByText('Customize My Profile')).toBeDefined();

      const slugInput = screen.getByPlaceholderText('basic-english');
      fireEvent.change(slugInput, { target: { value: '../evil<script>slug!' } });

      const avatarInput = screen.getByPlaceholderText('https://... or leave blank');
      fireEvent.change(avatarInput, { target: { value: 'javascript:alert(1)' } });

      const ghInput = screen.getByPlaceholderText('https://github.com/yourname');
      fireEvent.change(ghInput, { target: { value: 'javascript:evil()' } });

      fireEvent.click(screen.getByText('Save My Profile'));
      expect(onSaveCustomProfile).toHaveBeenCalledTimes(1);

      const saved = onSaveCustomProfile.mock.calls[0][0] as Profile;
      expect(saved.vanitySlug).toBe('evilscriptslug');
      expect(saved.avatarUrl).toBe('');
      expect(saved.githubUrl).toBe('https://github.com/alexarchitect');
    });
  });

  describe('GoalsSection', () => {
    const mockGoals: Goal[] = [
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
        id: 201,
        title: '100km Gran Fondo',
        description: 'Endurance cycling benchmark',
        category: 'Personal',
        progress: 50,
        targetDate: 'Q4 2026',
        status: 'InProgress',
        tags: ['Cycling'],
        createdAt: '2026-01-02',
      },
    ];

    it('filters goals by category and surfaces 403 write-lock banner for guest users', async () => {
      const onRefresh = vi.fn();
      vi.spyOn(ApiService, 'createGoal').mockResolvedValueOnce({
        success: false,
        status: 403,
        message: 'Guest accounts have read-only demo access.',
      });

      render(<GoalsSection goals={mockGoals} onRefresh={onRefresh} />);

      expect(screen.getByText('.NET 10 Native AOT')).toBeDefined();
      expect(screen.getByText('100km Gran Fondo')).toBeDefined();

      fireEvent.click(screen.getByText(/Technical \(1\)/));
      expect(screen.getByText('.NET 10 Native AOT')).toBeDefined();
      expect(screen.queryByText('100km Gran Fondo')).toBeNull();

      fireEvent.click(screen.getByText(/Personal \(1\)/));
      expect(screen.getByText('100km Gran Fondo')).toBeDefined();

      fireEvent.click(screen.getByText('Add Goal'));
      fireEvent.change(screen.getByPlaceholderText(/Distributed Consensus/i), {
        target: { value: 'Unauthorized Guest Goal' },
      });
      fireEvent.click(screen.getByText(/Submit to API/i));

      await waitFor(() => {
        expect(screen.getByText('ASP.NET Core 403 Forbidden Policy')).toBeDefined();
      });
    });

    it('allows authenticated admin users to increment and delete custom goals', () => {
      ApiService.setSession('admin-token', adminUser);
      const updateSpy = vi.spyOn(ApiService, 'updateGoalProgress');
      const deleteSpy = vi.spyOn(ApiService, 'deleteCustomGoal');
      const onRefresh = vi.fn();

      render(<GoalsSection goals={mockGoals} onRefresh={onRefresh} />);

      fireEvent.click(screen.getByTitle('Advance goal progress (+25%)'));
      expect(updateSpy).toHaveBeenCalledWith(201, 75);
      expect(onRefresh).toHaveBeenCalled();

      fireEvent.click(screen.getByTitle('Remove custom goal'));
      expect(deleteSpy).toHaveBeenCalledWith(201);
    });
  });

  describe('VerifiedDeployments & ResumeTimeline', () => {
    it('adds and deletes personal projects while neutralizing unsafe URLs', () => {
      render(<VerifiedDeployments workspaceMode="personal" userName="Alex" />);

      fireEvent.click(screen.getByText('Add My Project'));
      fireEvent.change(screen.getByPlaceholderText('e.g. Distributed Order Engine'), {
        target: { value: 'Safe Edge Gateway' },
      });
      fireEvent.change(screen.getByPlaceholderText('https://...'), {
        target: { value: 'javascript:alert(1)' },
      });
      fireEvent.click(screen.getByText('Save Project'));

      expect(screen.getByText('Safe Edge Gateway')).toBeDefined();
      expect(screen.getByText('custom-project.local')).toBeDefined();

      const removeButtons = screen.getAllByTitle('Remove project card');
      fireEvent.click(removeButtons[0]);
      expect(screen.queryByText('Safe Edge Gateway')).toBeNull();
    });

    it('renders portfolio timeline and allows adding/removing roles in personal mode', () => {
      const { rerender } = render(<ResumeTimeline workspaceMode="portfolio" />);
      expect(screen.getByText('Professional Experience & Credentials')).toBeDefined();
      expect(screen.getByText('Technical Skills & Methodologies')).toBeDefined();

      rerender(<ResumeTimeline workspaceMode="personal" userName="Alex" profile={sampleProfile} />);
      fireEvent.click(screen.getByText('Add Role / Experience'));

      fireEvent.change(screen.getByPlaceholderText('e.g. Senior Full-Stack Engineer'), {
        target: { value: 'Staff Cloud Architect' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g. Acme Systems'), {
        target: { value: 'Nebula Corp' },
      });
      fireEvent.click(screen.getByText('Save Role'));

      expect(screen.getByText('Staff Cloud Architect')).toBeDefined();
      expect(screen.getByText('Nebula Corp')).toBeDefined();

      const deleteButtons = screen.getAllByTitle('Delete role');
      fireEvent.click(deleteButtons[0]);
      expect(screen.queryByText('Staff Cloud Architect')).toBeNull();
    });
  });

  describe('LegalModal, LoginModal & MicroTour', () => {
    it('switches between Privacy Policy and Terms of Service in LegalModal', () => {
      const onClose = vi.fn();
      const onSwitchTab = vi.fn();

      const { rerender } = render(
        <LegalModal initialTab="privacy" onClose={onClose} onSwitchTab={onSwitchTab} />
      );
      expect(screen.getByText(/400-meter residential privacy geofence/i)).toBeDefined();

      fireEvent.click(screen.getByText('Terms of Service'));
      expect(onSwitchTab).toHaveBeenCalledWith('terms');

      rerender(<LegalModal initialTab="terms" onClose={onClose} onSwitchTab={onSwitchTab} />);
      expect(screen.getByText(/Acceptable Use & User Content/i)).toBeDefined();

      fireEvent.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('completes 1-click guest login and displays OAuth diagnostic when Supabase key is absent', async () => {
      vi.spyOn(SupabaseService, 'getOrInitSupabaseClient').mockReturnValue(null);
      const onLoginSuccess = vi.fn();
      const onClose = vi.fn();

      render(<LoginModal onLoginSuccess={onLoginSuccess} onClose={onClose} />);

      fireEvent.click(screen.getByText('GitHub'));
      await waitFor(() => {
        expect(screen.getByText(/Live OAuth requires your Supabase Anon/i)).toBeDefined();
      });

      fireEvent.click(screen.getByText('Continue Browsing in Public / Guest Mode'));
      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('advances through MicroTour steps and closes on completion', () => {
      const onNext = vi.fn();
      const onClose = vi.fn();
      const onSelectTab = vi.fn();

      const { rerender } = render(
        <MicroTour step={0} onNext={onNext} onClose={onClose} onSelectTab={onSelectTab} />
      );
      expect(screen.getByText(/Feature Walkthrough \(1 of 3\)/)).toBeDefined();

      fireEvent.click(screen.getByText('Next: Explore AI Skill Extraction'));
      expect(onSelectTab).toHaveBeenCalledWith('ai');
      expect(onNext).toHaveBeenCalledTimes(1);

      rerender(<MicroTour step={2} onNext={onNext} onClose={onClose} onSelectTab={onSelectTab} />);
      fireEvent.click(screen.getByText('Finish Tour & Start Exploring'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('RecruiterScorecard, LearningResourceList & ElevationProfileChart', () => {
    it('evaluates portfolio skill match accuracy and renders RecruiterScorecard', () => {
      expect(evaluatePortfolioSkillMatch('C# .NET 10').matched).toBe(true);
      expect(evaluatePortfolioSkillMatch('Rust Embedded Kernel').matched).toBe(false);

      render(<RecruiterScorecard extractedSkills={['C# .NET 10', 'React 19', 'Rust Kernel']} />);
      expect(screen.getByText(/67% Stack Match \(2\/3 Verified\)/)).toBeDefined();
    });

    it('sanitizes learning resource URLs and triggers Track as Goal', () => {
      const onSaveSkillAsGoal = vi.fn();
      render(
        <LearningResourceList
          workspaceMode="portfolio"
          activeSkill="C# .NET 10"
          loadingResources={false}
          savedNotice="Tracked in Goals!"
          onSaveSkillAsGoal={onSaveSkillAsGoal}
          resources={[
            {
              title: 'Malicious Link Test',
              provider: 'YouTube',
              author: 'Channel',
              duration: '20m',
              url: 'javascript:alert(1)',
              thumbnailUrl: '',
              badge: 'Verified',
            },
          ]}
        />
      );

      expect(screen.getByText('Tracked in Goals!')).toBeDefined();
      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toBe('https://www.youtube.com/');

      fireEvent.click(screen.getByText('Track as Goal'));
      expect(onSaveSkillAsGoal).toHaveBeenCalledTimes(1);
    });

    it('renders SVG elevation profile and inspects split elevation on hover', () => {
      const points = Array.from({ length: 10 }, (_, idx) => ({
        lat: 30.3 + idx * 0.01,
        lon: -97.7 - idx * 0.01,
        elevation: 150 + idx * 12,
        timestamp: `2026-01-01T10:0${idx}:00Z`,
      }));

      render(<ElevationProfileChart points={points} distanceKm={45} />);
      const svg = screen.getByLabelText('Route elevation profile chart');
      expect(svg).toBeDefined();

      vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 150,
        right: 800,
        bottom: 150,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      fireEvent.mouseMove(svg, { clientX: 400 });
      expect(screen.getByText(/@ .* km/)).toBeDefined();

      fireEvent.mouseLeave(svg);
      expect(screen.getByText('Hover chart to inspect split elevation')).toBeDefined();
    });
  });
});
