import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Plus, Trash2, X, Layers, ArrowUpRight } from 'lucide-react';
import { GithubIcon } from './Icons';
import { ModalDialog } from './ui/ModalDialog';
import { isSafeHttpsUrl, safeParseStorageArray, sanitizeExternalUrl } from '../utils/security';

interface VerifiedDeploymentsProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
  onOpenArchitecture?: () => void;
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

function isValidDeploymentItem(item: unknown): item is DeploymentItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.url === 'string' &&
    Boolean(candidate.verificationDetails && typeof candidate.verificationDetails === 'object')
  );
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
  userName = 'My',
  onOpenArchitecture
}) => {
  const [personalProjects, setPersonalProjects] = useState<DeploymentItem[]>(() => {
    const parsed = safeParseStorageArray<DeploymentItem>(
      localStorage.getItem('cap_personal_projects'),
      isValidDeploymentItem
    );
    if (parsed) {
      return parsed.map((proj) => ({
        ...proj,
        url: proj.url === '#' ? '#' : sanitizeExternalUrl(proj.url, '#'),
        githubUrl: proj.githubUrl ? sanitizeExternalUrl(proj.githubUrl, '') || undefined : undefined,
        tags: Array.isArray(proj.tags) ? proj.tags.filter((t): t is string => typeof t === 'string') : [],
      }));
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
    const cleanUrl = sanitizeExternalUrl(newUrl, '#');
    const domain = cleanUrl !== '#' ? cleanUrl.replace(/^https?:\/\/(www\.)?/, '') : 'custom-project.local';

    const created: DeploymentItem = {
      id: `proj-${Date.now()}`,
      category: newCategory.trim().slice(0, 80) || 'Personal Project',
      title: newTitle.trim().slice(0, 150) || 'My Custom Project',
      domain,
      url: cleanUrl,
      organization: `${userName}'s Workspace`,
      badgeColor: 'badge-cyan',
      verificationBadge: 'Custom Workspace Project',
      description: newDesc.trim().slice(0, 1000) || 'Custom architecture project added in personal workspace.',
      verificationDetails: {
        metaTag: `Stack: ${(newStack || 'Full-Stack').slice(0, 200)}`,
        consoleLog: 'Verified Personal Project'
      },
      tags: newStack.split(',').map(s => s.trim()).filter(Boolean).slice(0, 15),
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
      note: 'Protected by ASI staff login. Public landing page includes author metadata and console signature.',
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
      tags: ['PWA', 'TypeScript', 'Vite', 'Supabase', 'Vitest & Playwright'],
      note: 'Live production SaaS supporting 15 languages with offline Service Worker caching and 1,000+ automated tests.',
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
      tags: ['npm', 'Open Source', 'Zero-Dependency', 'MIT'],
      note: 'Published 8 years ago. Still embedded in production checkout forms and address validators worldwide.',
      linkText: 'View on npm Registry'
    },
    {
      id: 'career-platform',
      category: 'Distributed Systems',
      title: 'Career & Skill Architecture',
      domain: 'johnbendfeldt.com',
      url: '#',
      organization: 'Live Portfolio Architecture',
      badgeColor: 'badge-indigo',
      verificationBadge: 'YARP Reverse Proxy & .NET 10',
      description: 'Multi-service containerized microservices platform with high-frequency Garmin FIT telemetry parsing and AI curriculum extraction.',
      verificationDetails: {
        metaTag: 'Architecture: YARP Reverse Proxy + .NET Minimal APIs',
        consoleLog: 'Native AOT readiness, Leaflet polylines, OAuth workspace isolation'
      },
      tags: ['.NET 10', 'YARP Gateway', 'Garmin FIT', 'Leaflet', 'Azure'],
      note: 'Multi-service C# and React 19 architecture powering this live site.',
      linkText: 'Current Live Deployment'
    }
  ];

  const activeDeployments = workspaceMode === 'personal' ? personalProjects : portfolioDeployments;

  return (
    <section aria-labelledby="deployments-heading" style={{ marginBottom: '40px' }}>
      <div className="section-header">
        <div>
          <h2 id="deployments-heading" className="section-title">
            {workspaceMode === 'personal'
              ? `${userName}'s Projects & Live Deployments`
              : 'Verified Production Deployments & Live Ships'}
          </h2>
          <p className="section-subtitle">
            {workspaceMode === 'personal'
              ? 'Production web applications, open-source packages, and active repositories.'
              : 'Software running in production across corporate and public domains with verifiable authorship.'}
          </p>
        </div>

        {workspaceMode === 'personal' && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.84rem' }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Add My Project</span>
          </button>
        )}
      </div>

      <div className="responsive-card-grid">
        {activeDeployments.map((item) => (
          <article
            key={item.id}
            className="glass-panel interactive-card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              {/* Category Eyebrow & Optional Delete Control */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)'
                }}>
                  {item.category}
                </span>
                {workspaceMode === 'personal' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(item.id)}
                    className="icon-btn"
                    title="Remove project card"
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Title & Domain */}
              <h3 style={{ fontSize: '1.22rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {item.title}
              </h3>
              <div style={{ fontSize: '0.8125rem', color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: '12px' }}>
                {item.domain}
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                {item.description}
              </p>

              {item.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {item.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <div style={{
                fontSize: '0.76rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                overflowWrap: 'break-word'
              }}>
                {item.verificationDetails.metaTag}
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
                {item.note}
              </p>

              {/* Outbound Link Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isSafeHttpsUrl(item.url) ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '9px 16px',
                      textDecoration: 'none',
                      fontSize: '0.84rem'
                    }}
                  >
                    <Globe size={15} aria-hidden="true" />
                    <span>{item.linkText}</span>
                    <ExternalLink size={13} aria-hidden="true" style={{ opacity: 0.8 }} />
                  </a>
                ) : item.id === 'career-platform' && onOpenArchitecture ? (
                  <button
                    type="button"
                    id="btn-inspect-architecture"
                    onClick={onOpenArchitecture}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '9px 16px',
                      fontSize: '0.84rem'
                    }}
                  >
                    <Layers size={15} aria-hidden="true" />
                    <span>Inspect Live Architecture</span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      padding: '9px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-inset)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {workspaceMode === 'personal' ? item.linkText : 'Current live deployment — johnbendfeldt.com'}
                  </div>
                )}

                {item.githubUrl && isSafeHttpsUrl(item.githubUrl) && (
                  <a
                    href={item.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      fontSize: '0.84rem'
                    }}
                  >
                    <GithubIcon size={15} />
                    <span>View Repository on GitHub</span>
                    <ExternalLink size={12} aria-hidden="true" style={{ opacity: 0.8 }} />
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Add Personal Project Modal */}
      <ModalDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        labelledBy="add-project-modal-title"
        maxWidth="520px"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 id="add-project-modal-title" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            Add Project to My Workspace
          </h3>
          <button
            type="button"
            onClick={() => setIsAddOpen(false)}
            className="icon-btn"
            aria-label="Close add project modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleAddProject}>
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="proj-title-input" className="form-label">Project Title</label>
            <input
              id="proj-title-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Order Engine"
              className="form-input"
              required
            />
          </div>

          <div className="modal-two-col-grid">
            <div>
              <label htmlFor="proj-category-input" className="form-label">Category</label>
              <input
                id="proj-category-input"
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Production SaaS"
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="proj-url-input" className="form-label">Live URL or Repo</label>
              <input
                id="proj-url-input"
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="form-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="proj-stack-input" className="form-label">Tech Stack (comma-separated)</label>
            <input
              id="proj-stack-input"
              type="text"
              value={newStack}
              onChange={(e) => setNewStack(e.target.value)}
              placeholder="React, TypeScript, .NET 10, PostgreSQL"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="proj-desc-input" className="form-label">Description</label>
            <textarea
              id="proj-desc-input"
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe what you built and its impact..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Project</button>
          </div>
        </form>
      </ModalDialog>
    </section>
  );
};
