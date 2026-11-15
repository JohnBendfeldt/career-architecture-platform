import React, { useState, useEffect } from 'react';
import { MapPin, ExternalLink, Globe, Plus, Trash2, Download } from 'lucide-react';
import type { Profile } from '../types';
import {
  PORTFOLIO_EXPERIENCES,
  STARTER_PERSONAL_EXPERIENCES,
  exportPrintableResume,
  isValidExperienceItem,
  type ExperienceItem
} from './resume/resumePdfExport';
import { AddRoleModal } from './resume/AddRoleModal';
import { safeParseStorageArray, sanitizeExternalUrl } from '../utils/security';

export { exportPrintableResume, PORTFOLIO_EXPERIENCES, type ExperienceItem };

interface ResumeTimelineProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
  profile?: Profile | null;
}

const PORTFOLIO_PROJECTS = [
  {
    title: 'Basic Language School',
    domain: 'basiclanguage.school',
    url: 'https://basiclanguage.school',
    role: 'Creator & Full-Stack Engineer',
    description: 'Built a high-performance PWA supporting 210 bidirectional language pairs across 15 languages, featuring 14,400+ neural audio assets, offline caching, and Supabase cloud sync.',
    bullets: [
      'Built a high-performance PWA supporting 210 bidirectional language pairs across 15 languages, featuring 14,400+ neural audio assets, offline caching, and Supabase cloud sync.',
      'Engineered interactive active-recall quizzes with custom virtual keyboards (Cyrillic, Arabic, Indic), phonetic matching, and 1,000+ automated Vitest/Playwright integration tests.'
    ],
    badges: ['PWA', '210 Language Pairs', '14,400+ Audio Assets', 'Supabase Cloud Sync', 'Vitest & Playwright (1,000+ Tests)', 'Custom Keyboards']
  }
];

const PORTFOLIO_CERTIFICATIONS = [
  {
    title: 'Coding Boot Camp',
    issuer: 'University of Texas at Austin',
    license: 'Full Stack Web Development & Computer Science Foundations',
    date: 'April 2017 – September 2017'
  },
  {
    title: 'Enterprise .NET & Cloud Architecture',
    issuer: 'Microsoft Developer Ecosystem',
    license: 'C#, .NET 10, Minimal APIs & Azure Cloud Services',
    date: 'Production Focus'
  },
  {
    title: 'Modern React & Frontend Systems',
    issuer: 'Modern Web Architecture',
    license: 'TypeScript, Vite, SPA Performance & State Design',
    date: 'Production Focus'
  },
  {
    title: 'Open Source Software Engineering',
    issuer: 'npm Registry (country-province-data)',
    license: 'Hundreds of Weekly Downloads • Thousands Annually • Zero Open Issues',
    date: '8+ Years Maintained'
  }
];

const PORTFOLIO_SKILLS = [
  {
    category: 'Languages',
    items: ['C#', 'JavaScript (Vanilla/ES6+)', 'TypeScript', 'HTML/CSS', 'SQL', 'PostgreSQL']
  },
  {
    category: 'Frameworks & Libraries',
    items: ['.NET (Core, 6, 10)', 'React', 'Node.js', 'Vite']
  },
  {
    category: 'Tools & DevOps',
    items: ['Git', 'Docker', 'Azure DevOps', 'SQL Server', 'CI/CD pipelines', 'GitHub Copilot', 'AI-Assisted Development (Claude Code & Gemini CLI)']
  },
  {
    category: 'Methodologies',
    items: ['Agile/Scrum', 'Test-Driven Development (TDD)', 'Unit & Integration Testing']
  }
];

export const ResumeTimeline: React.FC<ResumeTimelineProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My',
  profile
}) => {
  const [personalExperiences, setPersonalExperiences] = useState<ExperienceItem[]>(() => {
    const parsed = safeParseStorageArray<ExperienceItem>(
      localStorage.getItem('cap_personal_experiences'),
      isValidExperienceItem
    );
    return parsed || STARTER_PERSONAL_EXPERIENCES;
  });

  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cap_personal_experiences', JSON.stringify(personalExperiences));
  }, [personalExperiences]);

  const handleAddRole = (created: ExperienceItem) => {
    setPersonalExperiences(prev => [created, ...prev]);
  };

  const handleDeleteRole = (id?: string) => {
    if (!id) return;
    setPersonalExperiences(prev => prev.filter(item => item.id !== id));
  };

  const activeExperiences = workspaceMode === 'personal' ? personalExperiences : PORTFOLIO_EXPERIENCES;

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Editorial Section Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {workspaceMode === 'personal'
              ? `${userName}'s Experience & Career Builder`
              : 'Professional Experience & Credentials'}
          </h2>
          <p className="section-subtitle">
            {workspaceMode === 'personal'
              ? 'Build out your own work history and technical achievements below, or switch back to "John\'s Portfolio" at the top.'
              : 'Nine years building enterprise SaaS applications, full-stack features, and high-reliability accounting and membership platforms.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() =>
              exportPrintableResume({
                workspaceMode,
                profile: profile || undefined,
                experiences: activeExperiences
              })
            }
            className={workspaceMode === 'personal' ? 'btn-secondary' : 'btn-primary'}
            style={{ padding: '9px 18px', fontSize: '0.86rem' }}
          >
            <Download size={15} aria-hidden="true" />
            <span>Download / Print PDF Resume</span>
          </button>

          {workspaceMode === 'personal' && (
            <button
              type="button"
              onClick={() => setIsAddRoleOpen(true)}
              className="btn-primary"
              style={{ padding: '9px 18px', fontSize: '0.86rem' }}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Add Role / Experience</span>
            </button>
          )}
        </div>
      </div>

      {/* Skills Matrix (John's Portfolio Mode) */}
      {workspaceMode !== 'personal' && (
        <section className="glass-panel" style={{ padding: '26px 28px', marginBottom: '32px' }} aria-labelledby="skills-matrix-heading">
          <h3 id="skills-matrix-heading" style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '18px' }}>
            Technical Skills & Methodologies
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '22px'
          }}>
            {PORTFOLIO_SKILLS.map((group) => (
              <div
                key={group.category}
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px'
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  marginBottom: '10px'
                }}>
                  {group.category}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {group.items.map((skill) => (
                    <span key={skill} className="tag-chip" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience Timeline */}
      <section style={{ marginBottom: '36px' }} aria-labelledby="career-history-heading">
        <h3 id="career-history-heading" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '18px' }}>
          Career History
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeExperiences.map((exp, idx) => (
            <article key={exp.id || idx} className="glass-panel timeline-card">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 750, letterSpacing: '-0.02em' }}>
                    {exp.role}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '1rem', color: 'var(--accent-crimson)', fontWeight: 700 }}>
                      {exp.company}
                    </span>
                    <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} aria-hidden="true" />
                      <span>{exp.location}</span>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    padding: '4px 11px',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {exp.period}
                  </span>
                  {workspaceMode === 'personal' && exp.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(exp.id)}
                      className="icon-btn"
                      title="Delete role"
                      aria-label={`Delete ${exp.role}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                paddingLeft: '12px',
                borderLeft: '2px solid var(--accent-crimson)',
                marginBottom: '16px',
                fontWeight: 600
              }}>
                {exp.highlight}
              </p>

              <ul style={{
                paddingLeft: '18px',
                margin: '0 0 18px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} style={{
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65
                  }}>
                    {bullet}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                {exp.badges.map((b) => (
                  <span key={b} className="tag-chip">
                    {b}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Projects & Education (John's Portfolio Mode) */}
      {workspaceMode !== 'personal' && (
        <>
          <section style={{ marginBottom: '36px' }} aria-labelledby="selected-projects-heading">
            <h3 id="selected-projects-heading" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '18px' }}>
              Selected Engineering Projects
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {PORTFOLIO_PROJECTS.map((proj, idx) => (
                <article key={idx} className="glass-panel timeline-card">
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span>{proj.title}</span>
                        <span aria-hidden="true" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>•</span>
                        <span style={{ fontSize: '1rem', color: 'var(--accent-crimson)', fontWeight: 600 }}>{proj.role}</span>
                      </h4>
                    </div>

                    <a
                      href={sanitizeExternalUrl(proj.url, 'https://basiclanguage.school')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      style={{ padding: '7px 14px', fontSize: '0.84rem' }}
                    >
                      <Globe size={14} aria-hidden="true" />
                      <span>{proj.domain}</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </div>

                  <ul style={{
                    paddingLeft: '18px',
                    margin: '0 0 18px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {proj.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} style={{
                        fontSize: '0.95rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.65
                      }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                    {proj.badges.map((b) => (
                      <span key={b} className="tag-chip">
                        {b}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="education-credentials-heading">
            <h3 id="education-credentials-heading" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '18px' }}>
              Education & Credentials
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px'
            }}>
              {PORTFOLIO_CERTIFICATIONS.map((cert, idx) => (
                <article
                  key={idx}
                  className="glass-panel"
                  style={{
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '6px'
                    }}>
                      {cert.date}
                    </div>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '4px' }}>
                      {cert.title}
                    </h4>
                    <div style={{ fontSize: '0.88rem', color: 'var(--accent-crimson)', marginBottom: '6px', fontWeight: 600 }}>
                      {cert.issuer}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {cert.license}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <AddRoleModal
        isOpen={isAddRoleOpen}
        onClose={() => setIsAddRoleOpen(false)}
        onAddRole={handleAddRole}
      />
    </div>
  );
};
