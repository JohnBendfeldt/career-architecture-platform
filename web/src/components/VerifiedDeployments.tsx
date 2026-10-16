import React from 'react';
import { ExternalLink, ShieldCheck, Terminal, Globe, Building2, Code2 } from 'lucide-react';
import { GithubIcon } from './Icons';

export const VerifiedDeployments: React.FC = () => {
  const deployments = [
    {
      id: 'asi-tracker',
      category: 'Enterprise Production',
      title: 'Training Hour Tracker',
      domain: 'trainingtracker.advsol.com',
      url: 'https://trainingtracker.advsol.com',
      organization: 'Advanced Solutions International (ASI)',
      badgeColor: 'badge-emerald',
      verificationBadge: 'Verified Author Signature in DOM & Console',
      description: 'Enterprise staff development and professional hour tracking system deployed on the corporate advsol.com domain.',
      verificationDetails: {
        metaTag: '<meta name="author" content="John Bendfeldt" />',
        consoleLog: 'Designed and built by John Bendfeldt with Claude Sonnet (Anthropic).'
      },
      tags: ['Enterprise B2B', 'Corporate Auth', 'Session Management', 'SPA'],
      note: 'Protected by ASI staff login. Public landing page includes author metadata & DevTools console signature.',
      linkText: 'Inspect Live on advsol.com'
    },
    {
      id: 'basic-russian',
      category: 'Production Language SaaS',
      title: 'BasicRussian.org',
      domain: 'basicrussian.org',
      url: 'https://basicrussian.org',
      githubUrl: 'https://github.com/JohnBendfeldt/russian-learning-app',
      organization: 'Production Language Learning Platform',
      badgeColor: 'badge-cyan',
      verificationBadge: 'Live Production Platform & Open Source',
      description: 'Interactive Russian language immersion app with native audio pronunciation, adaptive quiz engine with Levenshtein fuzzy matching, and an on-screen Cyrillic keyboard with phonetic transliteration.',
      verificationDetails: {
        metaTag: 'GitHub Repo: github.com/JohnBendfeldt/russian-learning-app',
        consoleLog: 'PWA Ready (Workbox) • React 18 & Vite 6 • Levenshtein Fuzzy Matching'
      },
      tags: ['React 18', 'TypeScript', 'Vite 6', 'PWA / Offline', 'Vitest', 'Netlify CI/CD', 'Fuzzy Matching'],
      note: 'Live production SaaS deployed on Netlify. Features offline audio caching via Service Workers, adaptive Cyrillic drills, and serverless PostgreSQL progress sync roadmap.',
      linkText: 'Launch basicrussian.org'
    },
    {
      id: 'country-province-data',
      category: 'Open Source Infrastructure',
      title: 'country-province-data',
      domain: 'npmjs.com/package/country-province-data',
      url: 'https://www.npmjs.com/package/country-province-data',
      organization: 'Published npm Package • 8 Years Active',
      badgeColor: 'badge-amber',
      verificationBadge: '1,300+ Downloads/Week • 0 Bugs',
      description: 'Battle-tested international address and province data package downloaded over 1,300+ times every week with zero issues or maintenance overhead.',
      verificationDetails: {
        metaTag: 'npm install country-province-data (v1.0.0)',
        consoleLog: '8 Years in Production • 15,000+ Annual Downloads • 0 Open Issues'
      },
      tags: ['npm', 'Open Source', 'Zero-Dependency', '1,300+ dls/wk', 'MIT'],
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

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={24} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            Verified Production Deployments & Live Ships
          </h2>
          <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
            Live Proof of Work
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Real software running in production on corporate and public domains with verifiable authorship.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {deployments.map((item) => (
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
                <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <ShieldCheck size={14} />
                  <span>Verified</span>
                </span>
              </div>

              {/* Title & Organization */}
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '4px' }}>
                {item.title}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
                {item.domain}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                {item.description}
              </p>

              {/* DOM / Authorship Proof Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  <Code2 size={12} color="var(--accent-indigo)" />
                  <span>Proof of Authorship</span>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#a5b4fc',
                  lineHeight: 1.4,
                  wordBreak: 'break-all'
                }}>
                  {item.verificationDetails.metaTag}
                </div>
                {item.id === 'asi-tracker' && (
                  <div style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#34d399',
                    marginTop: '4px',
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
                    className="social-link"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '10px 16px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      borderColor: 'rgba(99, 102, 241, 0.35)',
                      color: '#ffffff'
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
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#a5b4fc',
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
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    ⚡ Active App (Hosting Target: johnbendfeldt.com)
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
