import { useEffect, useState } from 'react';
import type { User, Profile, Goal } from './types';
import { ApiService } from './services/api';
import { getOrInitSupabaseClient, signOutFromSupabase, consumeGoogleIdTokenFromHash } from './services/supabase';
import { Navbar } from './components/Navbar';
import { ProfileHero } from './components/ProfileHero';
import { VerifiedDeployments } from './components/VerifiedDeployments';
import { ResumeTimeline } from './components/ResumeTimeline';
import { GoalsSection } from './components/GoalsSection';
import { AiSkillExtractorTab } from './components/AiSkillExtractorTab';
import { GeospatialMapTab } from './components/GeospatialMapTab';
import { FeatureTabs } from './components/FeatureTabs';
import { LoginModal } from './components/LoginModal';
import { MicroTour } from './components/MicroTour';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { GithubIcon, LinkedinIcon } from './components/Icons';
import { Terminal } from 'lucide-react';

const isExternalOAuthUser = (u: User | null): boolean => {
  if (!u || u.role !== 'admin') return false;
  return !ApiService.isPortfolioOwner(u);
};

export function App() {
  const [user, setUser] = useState<User | null>(ApiService.getUser());
  const [profile, setProfile] = useState<Profile | null>(null);
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [personalGoals, setPersonalGoals] = useState<Goal[]>(() => ApiService.getPersonalGoals());
  const [activeTab, setActiveTab] = useState<'experience' | 'dashboard' | 'ai' | 'map'>('experience');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(() => {
    const p = window.location.pathname.toLowerCase();
    if (p === '/privacy' || p === '/privacy/') return 'privacy';
    if (p === '/terms' || p === '/terms/' || p === '/tos') return 'terms';
    return null;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('cap_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cap_theme', theme);
  }, [theme]);

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
      document.title = 'John Bendfeldt | Senior Software Developer — .NET 10, React & Cloud Architecture';
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

  // Load profile and goals
  const loadData = async () => {
    const [profData, goalsData] = await Promise.all([
      ApiService.getProfile(),
      ApiService.getGoals(),
    ]);
    setProfile(profData);
    setGoals(goalsData);
    setPersonalGoals(ApiService.getPersonalGoals());
  };

  // Supabase Auth listener
  useEffect(() => {
    const client = getOrInitSupabaseClient();
    if (!client) return;

    consumeGoogleIdTokenFromHash().finally(() => {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'Authenticated User',
            email: session.user.email || 'user@supabase.io',
            role: 'admin',
            avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
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
        const u: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'Authenticated User',
          email: session.user.email || 'user@supabase.io',
          role: 'admin',
          avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
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
        if (navEl) {
          navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Optional On-Demand Sign-In Modal (Never blocks initial page load!) */}
      {showLoginModal && (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
          onOpenLegal={(tab) => {
            setShowLoginModal(false);
            handleOpenLegal(tab);
          }}
        />
      )}

      {/* Privacy Policy & Terms of Service Modal (/privacy & /terms) */}
      {legalTab && (
        <LegalModal
          initialTab={legalTab}
          onClose={handleCloseLegal}
          onSwitchTab={handleOpenLegal}
        />
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
      />

      {/* Main App Container */}
      <main style={{
        maxWidth: '1280px',
        width: 'calc(100% - 32px)',
        margin: '0 auto',
        flex: 1
      }}>
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
        />

        {/* Feature Tab & Dropdown Navigation */}
        <FeatureTabs
          activeTab={activeTab}
          onChangeTab={handleTabSwitch}
          goalsCount={workspaceMode === 'personal' ? personalGoals.length : goals.length}
          workspaceMode={workspaceMode}
        />

        {/* Tab Content Panes */}
        {activeTab === 'experience' && (
          <ResumeTimeline
            workspaceMode={workspaceMode}
            userName={activeDisplayName}
          />
        )}

        {activeTab === 'dashboard' && (
          <GoalsSection
            goals={workspaceMode === 'personal' ? personalGoals : goals}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'ai' && (
          <AiSkillExtractorTab
            workspaceMode={workspaceMode}
            userName={activeDisplayName}
            onGoalCreated={loadData}
          />
        )}

        {activeTab === 'map' && (
          <GeospatialMapTab
            workspaceMode={workspaceMode}
            userName={activeDisplayName}
          />
        )}
      </main>

      {/* Interactive Micro-Tour Walkthrough */}
      {tourStep !== null && (
        <MicroTour
          step={tourStep}
          onNext={handleTourNext}
          onClose={handleTourClose}
          onSelectTab={(tab) => handleTabSwitch(tab, true)}
        />
      )}

      {/* Application Footer */}
      <footer style={{
        marginTop: '60px',
        borderTop: '1px solid var(--border-subtle)',
        padding: '32px 24px',
        background: 'var(--bg-card)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Terminal size={18} color="var(--accent-crimson)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Career Architecture Platform by John Bendfeldt (CAP / BJB)
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              C# .NET 10 Minimal APIs • YARP Gateway • React 19 • Garmin FIT Engine
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <a
              href="https://github.com/johnbendfeldt"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
            >
              <GithubIcon size={15} />
              <span>GitHub</span>
            </a>
            <a
              href="https://linkedin.com/in/johnbendfeldt"
              target="_blank"
              rel="noopener noreferrer"
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
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: '4px'
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
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: '4px'
              }}
            >
              Terms of Service
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              © 2026 John Bendfeldt
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
