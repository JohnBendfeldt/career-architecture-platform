import { useEffect, useState } from 'react';
import type { User, Profile, Goal } from './types';
import { ApiService } from './services/api';
import { Navbar } from './components/Navbar';
import { ProfileHero } from './components/ProfileHero';
import { VerifiedDeployments } from './components/VerifiedDeployments';
import { ResumeTimeline } from './components/ResumeTimeline';
import { GoalsSection } from './components/GoalsSection';
import { AiSkillExtractorTab } from './components/AiSkillExtractorTab';
import { GeospatialMapTab } from './components/GeospatialMapTab';
import { LoginModal } from './components/LoginModal';
import { MicroTour } from './components/MicroTour';
import { GithubIcon, LinkedinIcon } from './components/Icons';
import { Layers, Sparkles, Activity, Terminal, Briefcase } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(ApiService.getUser());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTab, setActiveTab] = useState<'experience' | 'dashboard' | 'ai' | 'map'>('experience');
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Load profile and goals
  const loadData = async () => {
    const [profData, goalsData] = await Promise.all([
      ApiService.getProfile(),
      ApiService.getGoals(),
    ]);
    setProfile(profData);
    setGoals(goalsData);
  };

  useEffect(() => {
    loadData();
    // Check if user has seen micro-tour
    const hasSeenTour = localStorage.getItem('cap_seen_tour');
    if (!hasSeenTour && user) {
      setTourStep(0);
    }
  }, [user]);

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser);
    loadData();
    const hasSeenTour = localStorage.getItem('cap_seen_tour');
    if (!hasSeenTour) {
      setTourStep(0);
    }
  };

  const handleLogout = () => {
    ApiService.clearSession();
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

  if (!user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Navigation Bar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onStartTour={handleStartTour}
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
            profile={profile}
            activeTab={activeTab}
            onExploreResume={() => handleTabSwitch('experience')}
            onExploreTech={() => handleTabSwitch('dashboard')}
            onExploreMap={() => handleTabSwitch('map')}
            onExploreAi={() => handleTabSwitch('ai')}
          />
        )}

        {/* Verified Production Deployments & Live Ships */}
        <VerifiedDeployments />

        {/* Feature Tab Navigation */}
        <div
          id="feature-tabs-navigation"
          style={{
            scrollMarginTop: '90px',
            display: 'flex',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '28px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}
        >
          <button
            onClick={() => setActiveTab('experience')}
            id="tab-experience"
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'experience' ? '2.5px solid var(--accent-emerald)' : '2.5px solid transparent',
              color: activeTab === 'experience' ? '#ffffff' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'experience' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Briefcase size={18} color={activeTab === 'experience' ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
            <span>Professional Experience & Resume</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
              4 Roles • 4 Certs
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab-dashboard"
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'dashboard' ? '2.5px solid var(--accent-indigo)' : '2.5px solid transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'dashboard' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Layers size={18} color={activeTab === 'dashboard' ? 'var(--accent-indigo)' : 'var(--text-muted)'} />
            <span>Engineering Goals & Milestones</span>
            <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
              {goals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            id="tab-ai"
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ai' ? '2.5px solid var(--accent-violet)' : '2.5px solid transparent',
              color: activeTab === 'ai' ? '#ffffff' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'ai' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={18} color={activeTab === 'ai' ? 'var(--accent-violet)' : 'var(--text-muted)'} />
            <span>AI Skill Extraction Pipeline</span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
              Gemini AI
            </span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            id="tab-map"
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'map' ? '2.5px solid var(--accent-cyan)' : '2.5px solid transparent',
              color: activeTab === 'map' ? '#ffffff' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'map' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <Activity size={18} color={activeTab === 'map' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
            <span>Garmin Geospatial Visualizer</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
              Leaflet & FIT
            </span>
          </button>
        </div>

        {/* Tab Content Panes */}
        {activeTab === 'experience' && (
          <ResumeTimeline />
        )}

        {activeTab === 'dashboard' && (
          <GoalsSection goals={goals} onRefresh={loadData} />
        )}

        {activeTab === 'ai' && (
          <AiSkillExtractorTab />
        )}

        {activeTab === 'map' && (
          <GeospatialMapTab />
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
        background: 'rgba(7, 9, 14, 0.9)'
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
              <Terminal size={18} color="var(--accent-indigo)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                Career & Skill Architecture Platform
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              C# .NET 10 Minimal APIs • YARP Gateway • React 19 • Garmin FIT Engine
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
