import React, { useState, useEffect } from 'react';
import { Briefcase, Award, GraduationCap, MapPin, CheckCircle2, ExternalLink, Code2, Globe, Plus, Trash2, Download } from 'lucide-react';
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
    date: 'Production Mastery'
  },
  {
    title: 'Modern React & Frontend Systems',
    issuer: 'Modern Web Architecture',
    license: 'TypeScript, Vite, SPA Performance & State Design',
    date: 'Production Mastery'
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
      {/* Header with Quick Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Briefcase size={24} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', fontWeight: 800 }}>
              {workspaceMode === 'personal'
                ? `${userName}'s Experience & Career Builder`
                : 'Professional Experience & Credentials'}
            </h2>
            <span className="badge badge-indigo" style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
              {workspaceMode === 'personal' ? `${activeExperiences.length} Roles` : '9 Years Experience'}
            </span>
          </div>
          <p style={{ fontSize: '0.98rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {workspaceMode === 'personal'
              ? 'Build out your own work history and technical achievements below, or switch back to "John\'s Portfolio" at the top.'
              : 'Track record of building large-scale SaaS applications, shipping full-stack features, and engineering non-profit accounting and membership platforms.'}
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
            style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} color={workspaceMode === 'personal' ? 'var(--accent-crimson)' : undefined} />
            <span>Download / Print PDF Resume</span>
          </button>

          {workspaceMode === 'personal' && (
            <button
              type="button"
              onClick={() => setIsAddRoleOpen(true)}
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={17} />
              <span>Add Role / Experience</span>
            </button>
          )}
        </div>
      </div>

      {/* Skills Matrix Pill Grid (John's Portfolio Mode) */}
      {workspaceMode !== 'personal' && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="var(--accent-cyan)" />
            <span>Technical Skills & Methodologies</span>
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}>
            {PORTFOLIO_SKILLS.map((group) => (
              <div key={group.category} style={{
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--accent-blue)',
                  fontWeight: 700,
                  marginBottom: '12px'
                }}>
                  {group.category}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {group.items.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontSize: '0.85rem',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontWeight: 600
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Timeline */}
      <div style={{ marginBottom: '36px' }}>
        <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Briefcase size={22} color="var(--accent-blue)" />
          <span>Career History</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {activeExperiences.map((exp, idx) => (
            <div key={exp.id || idx} className="glass-panel timeline-card">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    {exp.role}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ fontSize: '1.08rem', color: 'var(--accent-crimson)', fontWeight: 700 }}>
                      {exp.company}
                    </span>
                    <span style={{ color: 'var(--border-subtle)' }}>•</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                      <MapPin size={15} color="var(--text-muted)" />
                      {exp.location}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-indigo" style={{ fontSize: '0.82rem', padding: '6px 14px', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {exp.period}
                  </span>
                  {workspaceMode === 'personal' && exp.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(exp.id)}
                      title="Delete role"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'var(--bg-primary)',
                borderLeft: '3px solid var(--accent-crimson)',
                marginBottom: '18px',
                display: 'inline-block',
                fontWeight: 600
              }}>
                {exp.highlight}
              </div>

              <ul style={{
                paddingLeft: '0',
                listStyle: 'none',
                margin: '0 0 20px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} style={{
                    fontSize: '0.98rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <span style={{
                      color: 'var(--accent-blue)',
                      fontSize: '1.25rem',
                      lineHeight: '1.2rem',
                      marginTop: '3px',
                      flexShrink: 0
                    }}>
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                {exp.badges.map((b) => (
                  <span
                    key={b}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects & Education (John's Portfolio Mode) */}
      {workspaceMode !== 'personal' && (
        <>
          <div style={{ marginBottom: '36px' }}>
            <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Code2 size={22} color="var(--accent-cyan)" />
              <span>Projects</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {PORTFOLIO_PROJECTS.map((proj, idx) => (
                <div key={idx} className="glass-panel timeline-card">
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span>{proj.title}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>•</span>
                        <span style={{ fontSize: '1.05rem', color: 'var(--accent-crimson)', fontWeight: 600 }}>{proj.role}</span>
                      </h4>
                    </div>

                    <a
                      href={sanitizeExternalUrl(proj.url, 'https://basiclanguage.school')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <Globe size={15} />
                      <span>{proj.domain}</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  <ul style={{
                    paddingLeft: '0',
                    listStyle: 'none',
                    margin: '0 0 20px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {proj.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} style={{
                        fontSize: '0.98rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.65,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <span style={{
                          color: 'var(--accent-crimson)',
                          fontSize: '1.25rem',
                          lineHeight: '1.2rem',
                          marginTop: '3px',
                          flexShrink: 0
                        }}>
                          •
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                    {proj.badges.map((b) => (
                      <span
                        key={b}
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '4px 12px',
                          borderRadius: '6px',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={22} color="var(--accent-emerald)" />
              <span>Education & Credentials</span>
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px'
            }}>
              {PORTFOLIO_CERTIFICATIONS.map((cert, idx) => (
                <div
                  key={idx}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    borderLeft: '4px solid var(--accent-crimson)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--accent-crimson)',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={20} />
                  </div>

                  <div>
                    <h5 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '4px' }}>
                      {cert.title}
                    </h5>
                    <div style={{ fontSize: '0.88rem', color: 'var(--accent-crimson)', marginBottom: '6px', fontWeight: 600 }}>
                      {cert.issuer}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {cert.license}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>
                      {cert.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
