import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { User, Profile, Goal, CareerEntry } from './types';
import { ApiService } from './services/api';
import { getOrInitSupabaseClient, signOutFromSupabase, consumeGoogleIdTokenFromHash } from './services/supabase';
import { isSafeImageUrl } from './utils/security';
import { Navbar } from './components/Navbar';
import { ProfileHero } from './components/ProfileHero';
import { VerifiedDeployments } from './components/VerifiedDeployments';
import { ResumeTimeline, exportPrintableResume } from './components/ResumeTimeline';
import { FeatureTabs } from './components/FeatureTabs';
import type { LegalTab } from './components/LegalModal';
import { GithubIcon, LinkedinIcon } from './components/Icons';
import { ToastContainer, type ToastMessage } from './components/ui/ToastContainer';

const GoalsSection = lazy(() =>
  import('./components/GoalsSection').then((m) => ({ default: m.GoalsSection }))
);
const AiSkillExtractorTab = lazy(() =>
  import('./components/AiSkillExtractorTab').then((m) => ({ default: m.AiSkillExtractorTab }))
);
const GeospatialMapTab = lazy(() =>
  import('./components/GeospatialMapTab').then((m) => ({ default: m.GeospatialMapTab }))
);
const LoginModal = lazy(() =>
  import('./components/LoginModal').then((m) => ({ default: m.LoginModal }))
);
const MicroTour = lazy(() =>
  import('./components/MicroTour').then((m) => ({ default: m.MicroTour }))
);
const LegalModal = lazy(() =>
  import('./components/LegalModal').then((m) => ({ default: m.LegalModal }))
);
const CommandPalette = lazy(() =>
  import('./components/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);
const ArchitectureExplorerModal = lazy(() =>
  import('./components/ArchitectureExplorerModal').then((m) => ({ default: m.ArchitectureExplorerModal }))
);

const isExternalOAuthUser = (u: User | null): boolean => {
  if (!u || u.role !== 'admin') return false;
  return !ApiService.isPortfolioOwner(u);
};

export function App() {
  const [user, setUser] = useState<User | null>(ApiService.getUser());
  const [profile, setProfile] = useState<Profile | null>(() => ApiService.getDefaultPortfolioProfile());
  const [customProfile, setCustomProfile] = useState<Profile | null>(() => {
    const initialUser = ApiService.getUser();
    const pathMatch = window.location.pathname.match(/^\/profile\/([^/]+)/i);
    if (pathMatch && pathMatch[1]) {
      const bySlug = ApiService.getProfileBySlug(decodeURIComponent(pathMatch[1]));
      if (bySlug) return bySlug;
    }
    return initialUser && initialUser.role === 'admin' ? ApiService.getCustomProfile(initialUser) : null;
  });
  const [workspaceMode, setWorkspaceMode] = useState<'portfolio' | 'personal'>(() => {
    const pathMatch = window.location.pathname.match(/^\/profile\/([^/]+)/i);
    if (pathMatch && pathMatch[1]) {
      const slug = decodeURIComponent(pathMatch[1]).toLowerCase();
      if (slug === 'john-bendfeldt' || slug === 'john-f-bendfeldt' || slug === 'jfbendfeldt') {
        return 'portfolio';
      }
      return 'personal';
    }
    const initialUser = ApiService.getUser();
    if (ApiService.isPortfolioOwner(initialUser)) {
      return 'portfolio';
    }
    const storedMode = localStorage.getItem('cap_workspace_mode') as 'portfolio' | 'personal' | null;
    if (storedMode === 'personal' || storedMode === 'portfolio') {
      return storedMode;
    }
    return isExternalOAuthUser(initialUser) ? 'personal' : 'portfolio';
  });
  const [goals, setGoals] = useState<Goal[]>(() => ApiService.getDefaultPortfolioGoals());
  const [personalGoals, setPersonalGoals] = useState<Goal[]>(() => ApiService.getPersonalGoals());
  const [careerEntries, setCareerEntries] = useState<CareerEntry[]>(() => ApiService.getDefaultPortfolioEntries());
  const [personalEntries, setPersonalEntries] = useState<CareerEntry[]>(() => ApiService.getPersonalEntries());
  const [activeTab, setActiveTab] = useState<'experience' | 'dashboard' | 'ai' | 'map'>('experience');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);
  const [highlightedSkills, setHighlightedSkills] = useState<string[]>([]);
  const [studyTimerSignal, setStudyTimerSignal] = useState(0);
  const [recruiterPresetSignal, setRecruiterPresetSignal] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(() => {
    const p = window.location.pathname.toLowerCase();
    if (p === '/privacy' || p === '/privacy/') return 'privacy';
    if (p === '/terms' || p === '/terms/' || p === '/tos') return 'terms';
    return null;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('cap_theme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  const pushToast = useCallback((message: string, tone: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cap_theme', theme);
  }, [theme]);

  // Global Cmd/Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Subtle editorial reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const ratio = Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100));
      setScrollProgress(ratio);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleToggleWorkspaceMode = (mode: 'portfolio' | 'personal') => {
    setWorkspaceMode(mode);
    localStorage.setItem('cap_workspace_mode', mode);
    if (mode === 'personal' && customProfile) {
      const slug = customProfile.vanitySlug || ApiService.toVanitySlug(customProfile.name);
      window.history.pushState({}, '', `/profile/${slug}`);
    } else if (mode === 'portfolio') {
      window.history.pushState({}, '', '/');
    }
  };

  // Keep browser URL and document.title synced with active profile & workspace mode
  useEffect(() => {
    if (legalTab === 'privacy') {
      document.title = 'Privacy Policy — Career Architecture Platform (CAP / BJB)';
      return;
    }
    if (legalTab === 'terms') {
      document.title = 'Terms of Service — Career Architecture Platform (CAP / BJB)';
      return;
    }

    if (workspaceMode === 'personal' && customProfile) {
      document.title = `${customProfile.name} | ${customProfile.headline} — Career Architecture`;
    } else {
      document.title = 'John Bendfeldt | Senior Software Engineer — .NET 10, React & Cloud Architecture';
    }

    if (!user) return;
    if (workspaceMode === 'personal' && customProfile) {
      const slug = customProfile.vanitySlug || ApiService.toVanitySlug(customProfile.name);
      const targetPath = `/profile/${slug}`;
      if (
        window.location.pathname !== targetPath &&
        !window.location.hash.includes('access_token') &&
        !window.location.hash.includes('id_token')
      ) {
        window.history.replaceState({}, '', targetPath);
      }
    } else if (workspaceMode === 'portfolio' && window.location.pathname.startsWith('/profile/')) {
      window.history.replaceState({}, '', '/');
    }
  }, [workspaceMode, customProfile, user, legalTab]);

  const handleOpenLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    window.history.pushState({}, '', `/${tab}`);
  };

  const handleCloseLegal = () => {
    setLegalTab(null);
    if (workspaceMode === 'personal' && customProfile) {
      const slug = customProfile.vanitySlug || ApiService.toVanitySlug(customProfile.name);
      window.history.replaceState({}, '', `/profile/${slug}`);
    } else {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Load profile, goals, and career entries
  const loadData = async () => {
    const [profData, goalsData, entriesData] = await Promise.all([
      ApiService.getProfile(),
      ApiService.getGoals(),
      ApiService.getCareerEntries(),
    ]);
    setProfile(profData);
    setGoals(goalsData);
    setPersonalGoals(ApiService.getPersonalGoals());
    setCareerEntries(entriesData);
    setPersonalEntries(ApiService.getPersonalEntries());
  };

  const handleAnnualGoalHoursChange = async (hours: number) => {
    const res = await ApiService.updateAnnualGoalHours(hours);
    if (res.success && typeof res.annualGoalHours === 'number') {
      if (workspaceMode === 'personal' && customProfile) {
        const updated = { ...customProfile, annualGoalHours: res.annualGoalHours };
        setCustomProfile(updated);
      } else if (profile) {
        setProfile({ ...profile, annualGoalHours: res.annualGoalHours });
      }
      await loadData();
    }
  };

  // Supabase Auth listener
  useEffect(() => {
    const client = getOrInitSupabaseClient();
    if (!client) return;

    consumeGoogleIdTokenFromHash().finally(() => {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const rawAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'Authenticated User',
            email: session.user.email || 'user@supabase.io',
            role: 'admin',
            avatarUrl: isSafeImageUrl(rawAvatar) ? rawAvatar : ''
          };
          setUser(u);
          const cp = ApiService.getCustomProfile(u);
          setCustomProfile(cp);
          ApiService.setSession(session.access_token, u);
          if (ApiService.isPortfolioOwner(u)) {
            setWorkspaceMode('portfolio');
            localStorage.setItem('cap_workspace_mode', 'portfolio');
          } else if (isExternalOAuthUser(u) && localStorage.getItem('cap_workspace_mode') !== 'portfolio') {
            setWorkspaceMode('personal');
            localStorage.setItem('cap_workspace_mode', 'personal');
          }
        }
      });
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const rawAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';
        const u: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'Authenticated User',
          email: session.user.email || 'user@supabase.io',
          role: 'admin',
          avatarUrl: isSafeImageUrl(rawAvatar) ? rawAvatar : ''
        };
        setUser(u);
        const cp = ApiService.getCustomProfile(u);
        setCustomProfile(cp);
        ApiService.setSession(session.access_token, u);
        if (ApiService.isPortfolioOwner(u)) {
          setWorkspaceMode('portfolio');
          localStorage.setItem('cap_workspace_mode', 'portfolio');
        } else if (isExternalOAuthUser(u) && localStorage.getItem('cap_workspace_mode') !== 'portfolio') {
          setWorkspaceMode('personal');
          localStorage.setItem('cap_workspace_mode', 'personal');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadData();
    if (user && user.role === 'admin') {
      setCustomProfile(ApiService.getCustomProfile(user));
    }
  }, [user]);

  const handleSaveCustomProfile = (updated: Profile) => {
    if (!user) return;
    const saved = ApiService.saveCustomProfile(user.id, updated);
    setCustomProfile(saved);
    if (ApiService.isPortfolioOwner(user)) {
      setProfile(saved);
    } else if (workspaceMode === 'personal' && saved.vanitySlug) {
      window.history.replaceState({}, '', `/profile/${saved.vanitySlug}`);
    }
  };

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    setShowLoginModal(false);
    if (newUser.role === 'guest') {
      setWorkspaceMode('portfolio');
      localStorage.removeItem('cap_workspace_mode');
      window.history.replaceState({}, '', '/');
    } else if (newUser.role === 'admin') {
      const cp = ApiService.getCustomProfile(newUser);
      setCustomProfile(cp);
      if (ApiService.isPortfolioOwner(newUser)) {
        setWorkspaceMode('portfolio');
        localStorage.setItem('cap_workspace_mode', 'portfolio');
        window.history.replaceState({}, '', '/');
      } else if (isExternalOAuthUser(newUser)) {
        setWorkspaceMode('personal');
        localStorage.setItem('cap_workspace_mode', 'personal');
      }
    }
    loadData();
    const hasSeenTour = localStorage.getItem('cap_seen_tour');
    if (!hasSeenTour) {
      setTourStep(0);
    }
  };

  const handleLogout = () => {
    ApiService.clearSession();
    localStorage.removeItem('cap_workspace_mode');
    setWorkspaceMode('portfolio');
    window.history.replaceState({}, '', '/');
    signOutFromSupabase();
    setUser(null);
  };

  const handleTourNext = () => {
    if (tourStep !== null) {
      if (tourStep < 2) {
        setTourStep(tourStep + 1);
      } else {
        handleTourClose();
      }
    }
  };

  const handleTourClose = () => {
    setTourStep(null);
    localStorage.setItem('cap_seen_tour', 'true');
  };

  const handleTabSwitch = (tab: 'experience' | 'dashboard' | 'ai' | 'map', smoothScroll = true) => {
    setActiveTab(tab);
    if (smoothScroll) {
      setTimeout(() => {
        const navEl = document.getElementById('feature-tabs-navigation');
        if (navEl && typeof navEl.scrollIntoView === 'function') {
          const prefersReduced =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          navEl.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const handleStartTour = () => {
    handleTabSwitch('dashboard', true);
    setTourStep(0);
  };

  const activeDisplayName = workspaceMode === 'personal' && customProfile
    ? customProfile.name
    : (user?.name || 'My');

  const externalSwitchToPersonal =
    workspaceMode === 'portfolio' && isExternalOAuthUser(user)
      ? () => handleToggleWorkspaceMode('personal')
      : undefined;

  const tabPanelNames: Record<'experience' | 'dashboard' | 'ai' | 'map', string> = {
    experience: 'Experience & Resume',
    dashboard: 'Goals & Milestones',
    ai: 'AI Skill Pipeline',
    map: 'Garmin Geospatial',
  };

  const canSwitchWorkspace = Boolean(isExternalOAuthUser(user) && customProfile);

  const handleHighlightOnResume = (matchedSkills: string[]) => {
    setHighlightedSkills(matchedSkills);
    handleTabSwitch('experience', true);
    pushToast(
      `Highlighted ${matchedSkills.length} matched JD ${matchedSkills.length === 1 ? 'skill' : 'skills'} on Experience & Resume.`,
      'success'
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        aria-hidden="true"
        className="reading-progress-bar"
        style={{ width: `${scrollProgress}%` }}
      />

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Quick Command Palette (Cmd/Ctrl+K) */}
      {showCommandPalette && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            theme={theme}
            workspaceMode={workspaceMode}
            canSwitchWorkspace={canSwitchWorkspace}
            isAuthenticated={Boolean(user && user.role === 'admin')}
            onSelectTab={(tab) => handleTabSwitch(tab, true)}
            onToggleTheme={handleToggleTheme}
            onOpenArchitecture={() => setShowArchitectureModal(true)}
            onExportResume={() =>
              exportPrintableResume({
                workspaceMode,
                profile: (workspaceMode === 'personal' && customProfile ? customProfile : profile) || undefined,
              })
            }
            onStartTour={handleStartTour}
            onOpenFocusTimer={() => {
              setStudyTimerSignal((n) => n + 1);
              handleTabSwitch('dashboard', true);
            }}
            onRunRecruiterMatch={() => {
              setRecruiterPresetSignal((n) => n + 1);
              handleTabSwitch('ai', true);
              pushToast('Loaded Senior .NET / React Job Match preset in AI Skill Pipeline.', 'info');
            }}
            onToggleWorkspaceMode={() =>
              handleToggleWorkspaceMode(workspaceMode === 'portfolio' ? 'personal' : 'portfolio')
            }
            onOpenLogin={() => setShowLoginModal(true)}
          />
        </Suspense>
      )}

      {/* Live Multi-Service Architecture Explorer */}
      {showArchitectureModal && (
        <Suspense fallback={null}>
          <ArchitectureExplorerModal
            isOpen={showArchitectureModal}
            onClose={() => setShowArchitectureModal(false)}
            onJumpToTab={(tab) => handleTabSwitch(tab, true)}
          />
        </Suspense>
      )}

      {/* Optional On-Demand Sign-In Modal (Never blocks initial page load!) */}
      {showLoginModal && (
        <Suspense fallback={null}>
          <LoginModal
            onLoginSuccess={handleLoginSuccess}
            onClose={() => setShowLoginModal(false)}
            onOpenLegal={(tab) => {
              setShowLoginModal(false);
              handleOpenLegal(tab);
            }}
          />
        </Suspense>
      )}

      {/* Privacy Policy & Terms of Service Modal (/privacy & /terms) */}
      {legalTab && (
        <Suspense fallback={null}>
          <LegalModal
            initialTab={legalTab}
            onClose={handleCloseLegal}
            onSwitchTab={handleOpenLegal}
          />
        </Suspense>
      )}

      {/* Sticky Navigation Bar */}
      <Navbar
        user={user}
        workspaceMode={workspaceMode}
        activeProfile={workspaceMode === 'personal' && customProfile ? customProfile : profile}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        onStartTour={handleStartTour}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      {/* Main App Container */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          maxWidth: '1240px',
          width: 'calc(100% - 32px)',
          margin: '0 auto',
          flex: 1
        }}
      >
        {/* Profile Hero Card with Pre-Seeded State & Outbound Links */}
        {profile && (
          <ProfileHero
            profile={workspaceMode === 'personal' && customProfile ? customProfile : profile}
            user={user}
            workspaceMode={workspaceMode}
            onToggleWorkspaceMode={handleToggleWorkspaceMode}
            onSaveCustomProfile={handleSaveCustomProfile}
            onOpenLogin={() => setShowLoginModal(true)}
            activeTab={activeTab}
            onExploreResume={() => handleTabSwitch('experience')}
            onExploreTech={() => handleTabSwitch('dashboard')}
            onExploreMap={() => handleTabSwitch('map')}
            onExploreAi={() => handleTabSwitch('ai')}
          />
        )}

        {/* Verified Production Deployments & Live Ships (or Personal Projects in My Profile mode) */}
        <VerifiedDeployments
          workspaceMode={workspaceMode}
          userName={activeDisplayName}
          onOpenArchitecture={() => setShowArchitectureModal(true)}
        />

        {/* Feature Tab & Dropdown Navigation */}
        <FeatureTabs
          activeTab={activeTab}
          onChangeTab={handleTabSwitch}
          goalsCount={workspaceMode === 'personal' ? personalGoals.length : goals.length}
          workspaceMode={workspaceMode}
        />

        {/* Accessible Tab Content Pane */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-label={tabPanelNames[activeTab]}
        >
          <Suspense
            fallback={
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Loading section...
              </div>
            }
          >
            {activeTab === 'experience' && (
              <ResumeTimeline
                workspaceMode={workspaceMode}
                userName={activeDisplayName}
                profile={workspaceMode === 'personal' && customProfile ? customProfile : profile}
                highlightedSkills={highlightedSkills}
                onClearHighlightedSkills={() => setHighlightedSkills([])}
              />
            )}

            {activeTab === 'dashboard' && (
              <GoalsSection
                goals={workspaceMode === 'personal' ? personalGoals : goals}
                entries={workspaceMode === 'personal' ? personalEntries : careerEntries}
                workspaceMode={workspaceMode}
                profileName={
                  workspaceMode === 'personal'
                    ? (customProfile?.name || activeDisplayName)
                    : (profile?.name || 'John F. Bendfeldt')
                }
                annualGoalHours={
                  workspaceMode === 'personal'
                    ? (customProfile?.annualGoalHours ?? 45)
                    : (profile?.annualGoalHours ?? 55)
                }
                onAnnualGoalHoursChange={handleAnnualGoalHoursChange}
                onRefresh={loadData}
                onOpenLogin={() => setShowLoginModal(true)}
                onSwitchToPersonal={externalSwitchToPersonal}
                openStudyTimerSignal={studyTimerSignal}
                onNotify={pushToast}
              />
            )}

            {activeTab === 'ai' && (
              <AiSkillExtractorTab
                workspaceMode={workspaceMode}
                userName={activeDisplayName}
                goals={workspaceMode === 'personal' ? personalGoals : goals}
                entries={workspaceMode === 'personal' ? personalEntries : careerEntries}
                onGoalCreated={loadData}
                onEntryLogged={loadData}
                onNavigateToGoals={() => handleTabSwitch('dashboard')}
                onOpenLogin={() => setShowLoginModal(true)}
                onSwitchToPersonal={externalSwitchToPersonal}
                onHighlightOnResume={handleHighlightOnResume}
                recruiterPresetSignal={recruiterPresetSignal}
                onNotify={pushToast}
              />
            )}

            {activeTab === 'map' && (
              <GeospatialMapTab
                workspaceMode={workspaceMode}
                userName={activeDisplayName}
                theme={theme}
                onNotify={pushToast}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* Accessible Editorial Toast Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Interactive Micro-Tour Walkthrough */}
      {tourStep !== null && (
        <Suspense fallback={null}>
          <MicroTour
            step={tourStep}
            onNext={handleTourNext}
            onClose={handleTourClose}
            onSelectTab={(tab) => handleTabSwitch(tab, true)}
          />
        </Suspense>
      )}

      {/* Application Footer */}
      <footer style={{
        marginTop: '64px',
        borderTop: '1px solid var(--border-subtle)',
        padding: '32px 24px',
        background: 'var(--bg-surface)'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
              Career Architecture Platform by John Bendfeldt (CAP / BJB)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              C# .NET 10 Minimal APIs • YARP Gateway • React 19 • Garmin FIT Engine
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="https://github.com/JohnBendfeldt"
              target="_blank"
              rel="noopener noreferrer me"
              className="social-link"
            >
              <GithubIcon size={15} />
              <span>GitHub</span>
            </a>
            <a
              href="https://linkedin.com/in/johnbendfeldt"
              target="_blank"
              rel="noopener noreferrer me"
              className="social-link"
            >
              <LinkedinIcon size={15} />
              <span>LinkedIn</span>
            </a>
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: '6px 8px',
                minHeight: '32px'
              }}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('terms')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: '6px 8px',
                minHeight: '32px'
              }}
            >
              Terms of Service
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              © 2026 John Bendfeldt
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
