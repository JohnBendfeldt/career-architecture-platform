import React, { useState, useEffect } from 'react';
import { ExternalLink, ShieldCheck, Terminal, Globe, Building2, Code2, Plus, Trash2, X } from 'lucide-react';
import { GithubIcon } from './Icons';

interface VerifiedDeploymentsProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
}

interface DeploymentItem {
  id: string;
  category: string;
  title: string;
  domain: string;
  url: string;
  githubUrl?: string;
  organization: string;
  badgeColor: string;
  verificationBadge: string;
  description: string;
  verificationDetails: {
    metaTag: string;
    consoleLog: string;
  };
  tags: string[];
  note: string;
  linkText: string;
}

const STARTER_PERSONAL_PROJECTS: DeploymentItem[] = [
  {
    id: 'starter-project-1',
    category: 'Starter Guide // Step 1',
    title: 'Showcase Your Own Live Ships',
    domain: 'your-project.domain.com',
    url: '#',
    organization: 'Personal Architecture Sandbox',
    badgeColor: 'badge-emerald',
    verificationBadge: 'Sample Onboarding Card',
    description: 'This is your personal project showcase! Click "+ Add My Project" in the top right to add your own production web apps, open-source packages, or GitHub repositories.',
    verificationDetails: {
      metaTag: 'Tip: Click the trash icon to remove sample cards anytime',
      consoleLog: 'Stored locally in your personal workspace'
    },
    tags: ['Your Portfolio', 'Live Apps', 'Open Source'],
    note: 'Sample onboarding card — add your own projects or switch back to "John\'s Portfolio" at the top of the page.',
    linkText: 'Sample Starter Card (Click + Add My Project)'
  },
  {
    id: 'starter-project-2',
    category: 'Starter Guide // Step 2',
    title: 'Explore Your 4 Interactive Tools Below',
    domain: 'workspace.tools.local',
    url: '#',
    organization: 'Interactive Career & Skill Builder',
    badgeColor: 'badge-cyan',
    verificationBadge: 'Full Write Access Unlocked',
    description: 'Use the 4 tabs below to build out your own Experience timeline (Tab 01), track your own Goals with +25% progress buttons (Tab 02), extract skills from any job spec (Tab 03), or plot your own .FIT/.GPX routes (Tab 04).',
    verificationDetails: {
      metaTag: '01 Experience • 02 Goals • 03 AI Skills • 04 GPS Map',
      consoleLog: 'Verified OAuth Session Active'
    },
    tags: ['01 Resume Builder', '02 Goal Tracker', '03 AI Skill Pipeline', '04 GPS Visualizer'],
    note: 'Everything you add in "My Profile" mode is saved to your personal workspace.',
    linkText: 'Use the 4 Tabs Below to Get Started'
  }
];

export const VerifiedDeployments: React.FC<VerifiedDeploymentsProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My'
}) => {
  const [personalProjects, setPersonalProjects] = useState<DeploymentItem[]>(() => {
    const raw = localStorage.getItem('cap_personal_projects');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return STARTER_PERSONAL_PROJECTS;
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Production Web App');
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStack, setNewStack] = useState('React, TypeScript, .NET');

  useEffect(() => {
    localStorage.setItem('cap_personal_projects', JSON.stringify(personalProjects));
  }, [personalProjects]);

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newUrl.trim()
      ? (newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`)
      : '#';
    const domain = cleanUrl !== '#' ? cleanUrl.replace(/^https?:\/\/(www\.)?/, '') : 'custom-project.local';

    const created: DeploymentItem = {
      id: `proj-${Date.now()}`,
      category: newCategory.trim() || 'Personal Project',
      title: newTitle.trim() || 'My Custom Project',
      domain,
      url: cleanUrl,
      organization: `${userName}'s Workspace`,
      badgeColor: 'badge-cyan',
      verificationBadge: 'Custom Workspace Project',
      description: newDesc.trim() || 'Custom architecture project added in personal workspace.',
      verificationDetails: {
        metaTag: `Stack: ${newStack || 'Full-Stack'}`,
        consoleLog: 'Verified Personal Project'
      },
      tags: newStack.split(',').map(s => s.trim()).filter(Boolean),
      note: `Added by ${userName} in Personal Workspace mode.`,
      linkText: cleanUrl !== '#' ? `Launch ${domain}` : 'Active Workspace Project'
    };

    setPersonalProjects(prev => [created, ...prev]);
    setNewTitle('');
    setNewUrl('');
    setNewDesc('');
    setIsAddOpen(false);
  };

  const handleDeleteProject = (id: string) => {
    setPersonalProjects(prev => prev.filter(p => p.id !== id));
  };

  const portfolioDeployments: DeploymentItem[] = [
    {
      id: 'asi-tracker',
      category: 'Enterprise Production',
      title: 'Training Hour Tracker',
      domain: 'trainingtracker.advsol.com',
      url: 'https://trainingtracker.advsol.com',
      organization: 'Advanced Solutions International (ASI)',
      badgeColor: 'badge-emerald',
      verificationBadge: 'Verified Author Signature in DOM & Console',
      description: 'Enterprise staff development and professional hour tracking application deployed at trainingtracker.advsol.com.',
      verificationDetails: {
        metaTag: '<meta name="author" content="John Bendfeldt" />',
        consoleLog: 'Designed and built by John Bendfeldt with Claude Sonnet (Anthropic).'
      },
      tags: ['Enterprise B2B', 'Corporate Auth', 'Session Management', 'SPA'],
      note: 'Protected by ASI staff login. Public landing page includes author metadata & DevTools console signature.',
      linkText: 'Inspect trainingtracker.advsol.com'
    },
    {
      id: 'basic-language-school',
      category: 'Production Language SaaS',
      title: 'Basic Language School',
      domain: 'basiclanguage.school',
      url: 'https://basiclanguage.school',
      organization: 'Production Language Learning Platform',
      badgeColor: 'badge-cyan',
      verificationBadge: 'Live Production Platform & PWA',
      description: 'High-performance PWA supporting 210 bidirectional language pairs across 15 languages, featuring 14,400+ neural audio assets, offline caching, interactive active-recall quizzes with custom virtual keyboards (Cyrillic, Arabic, Indic), and Supabase cloud sync.',
      verificationDetails: {
        metaTag: 'Creator: John Bendfeldt • PWA Architecture',
        consoleLog: 'PWA Ready (Workbox) • 210 Language Pairs • 1,000+ Automated Tests'
      },
      tags: ['PWA', 'TypeScript', 'Vite', 'Supabase', '14,400+ Audio Assets', 'Vitest & Playwright', 'Custom Keyboards'],
      note: 'Live production SaaS supporting 15 languages. Features offline audio caching via Service Workers, custom active-recall keyboards, and 1,000+ Vitest/Playwright integration tests.',
      linkText: 'Launch basiclanguage.school'
    },
    {
      id: 'country-province-data',
      category: 'Open Source Infrastructure',
      title: 'country-province-data',
      domain: 'npmjs.com/package/country-province-data',
      url: 'https://www.npmjs.com/package/country-province-data',
      organization: 'Published npm Package • 8 Years Active',
      badgeColor: 'badge-amber',
      verificationBadge: 'Hundreds of Downloads/Week • 0 Bugs',
      description: 'Battle-tested international address and province data package downloaded hundreds of times every week and thousands of times a year with zero issues or maintenance overhead.',
      verificationDetails: {
        metaTag: 'npm install country-province-data (v1.0.0)',
        consoleLog: '8 Years in Production • Thousands of Annual Downloads • 0 Open Issues'
      },
      tags: ['npm', 'Open Source', 'Zero-Dependency', 'Hundreds of dls/wk', 'MIT'],
      note: 'Published 8 years ago. Still embedded in production checkout forms and address validators worldwide.',
      linkText: 'View on npm Registry'
    },
    {
      id: 'career-platform',
      category: 'Distributed Systems',
      title: 'Career & Skill Architecture',
      domain: 'johnbendfeldt.com',
      url: '#',
      organization: 'Future Home of johnbendfeldt.com',
      badgeColor: 'badge-indigo',
      verificationBadge: 'YARP Reverse Proxy & .NET 10',
      description: 'Multi-service containerized microservices platform with high-frequency Garmin FIT telemetry parsing and AI curriculum extraction.',
      verificationDetails: {
        metaTag: 'Architecture: YARP Reverse Proxy + .NET Minimal APIs',
        consoleLog: 'Native AOT readiness, Leaflet polylines, 1-Click Guest JWT'
      },
      tags: ['.NET 10', 'YARP Gateway', 'Garmin FIT', 'Leaflet', 'Azure'],
      note: 'You are currently experiencing this platform live in Guest Recruiter mode.',
      linkText: 'Currently Exploring'
    }
  ];

  const activeDeployments = workspaceMode === 'personal' ? personalProjects : portfolioDeployments;

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Building2 size={24} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {workspaceMode === 'personal'
                ? `${userName}'s Projects & Live Deployments`
                : 'Verified Production Deployments & Live Ships'}
            </h2>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              {workspaceMode === 'personal' ? 'Personal Sandbox' : 'Live Proof of Work'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {workspaceMode === 'personal'
              ? 'Production web applications, open-source packages, and active repositories.'
              : 'Real software running in production on corporate and public domains with verifiable authorship.'}
          </p>
        </div>

        {workspaceMode === 'personal' && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.84rem' }}
          >
            <Plus size={16} />
            <span>Add My Project</span>
          </button>
        )}
      </div>

      <div className="responsive-card-grid">
        {activeDeployments.map((item) => (
          <div
            key={item.id}
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              {/* Category & Verified Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className={`badge ${item.badgeColor}`} style={{ fontSize: '0.7rem' }}>
                  {item.category}
                </span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <ShieldCheck size={14} color="var(--accent-crimson)" />
                  <span>{workspaceMode === 'personal' ? 'WORKSPACE' : 'VERIFIED'}</span>
                  {workspaceMode === 'personal' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(item.id)}
                      title="Remove project card"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </div>

              {/* Title & Organization */}
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {item.title}
              </h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: '12px' }}>
                {item.domain}
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                {item.description}
              </p>

              {/* DOM / Authorship Proof Box */}
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  <Code2 size={12} color="var(--text-primary)" />
                  <span>Proof of Authorship</span>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  overflowWrap: 'break-word'
                }}>
                  {item.verificationDetails.metaTag}
                </div>
                {item.id === 'asi-tracker' && (
                  <div style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-emerald)',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Terminal size={12} />
                    <span>DevTools Console Signature Verified</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              {/* Note for recruiters */}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                ℹ️ {item.note}
              </p>

              {/* Outbound Link Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {item.url !== '#' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '10px 16px',
                      textDecoration: 'none',
                      fontSize: '0.84rem'
                    }}
                  >
                    <Globe size={15} />
                    <span>{item.linkText}</span>
                    <ExternalLink size={13} style={{ opacity: 0.8 }} />
                  </a>
                )}

                {item.githubUrl && (
                  <a
                    href={item.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <GithubIcon size={15} />
                    <span>View Repository on GitHub</span>
                    <ExternalLink size={12} style={{ opacity: 0.8 }} />
                  </a>
                )}

                {item.url === '#' && (
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      padding: '9px 16px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {workspaceMode === 'personal' ? `✨ ${item.linkText}` : '⚡ Active App (Hosting Target: johnbendfeldt.com)'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Personal Project Modal */}
      {isAddOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-card)',
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={20} color="var(--accent-crimson)" />
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Add Project to My Workspace</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProject}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Order Engine"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Production SaaS"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Live URL or Repo</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  value={newStack}
                  onChange={(e) => setNewStack(e.target.value)}
                  placeholder="React, TypeScript, .NET 10, PostgreSQL"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe what you built and its impact..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
