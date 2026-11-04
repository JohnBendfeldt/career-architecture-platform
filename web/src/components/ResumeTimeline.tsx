import React, { useState, useEffect } from 'react';
import { Briefcase, Award, GraduationCap, MapPin, CheckCircle2, ExternalLink, Code2, Globe, Plus, Trash2, X } from 'lucide-react';
import { LinkedinIcon } from './Icons';

interface ResumeTimelineProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
}

interface ExperienceItem {
  id?: string;
  company: string;
  location: string;
  role: string;
  period: string;
  highlight: string;
  badges: string[];
  bullets: string[];
}

const STARTER_PERSONAL_EXPERIENCES: ExperienceItem[] = [
  {
    id: 'starter-exp-1',
    company: 'Your Personal Career Sandbox',
    location: 'Remote / Global',
    role: 'Welcome! Build Your Own Experience Timeline',
    period: 'Onboarding Guide',
    highlight: 'Click "+ Add Role" in the top right to add your own work history, or delete this sample card anytime',
    badges: ['Step 1: Add Work History', 'Step 2: Track Goals', 'Step 3: Extract Skills', 'Step 4: Upload GPS'],
    bullets: [
      'You are viewing your own profile ("My Profile"). Instead of showing John\'s resume here, this space is yours to customize!',
      'Click "+ Add Role / Experience" in the top-right corner of this section to add your own roles, companies, achievements, and tech stack badges.',
      'Switch to "02 / Goals & Milestones" to create your own technical or personal goals and advance them with the "+25%" progress button.',
      'Open "03 / AI Skill Pipeline" to paste your own resume or a target job description and generate curated YouTube & Udemy courses.',
      'Switch back to "John\'s Portfolio" at the top of the page anytime to inspect John Bendfeldt\'s verified work history and credentials.'
    ]
  }
];

export const ResumeTimeline: React.FC<ResumeTimelineProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My'
}) => {
  const [personalExperiences, setPersonalExperiences] = useState<ExperienceItem[]>(() => {
    const raw = localStorage.getItem('cap_personal_experiences');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return STARTER_PERSONAL_EXPERIENCES;
  });

  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleLocation, setRoleLocation] = useState('Remote');
  const [rolePeriod, setRolePeriod] = useState('2024 – Present');
  const [roleHighlight, setRoleHighlight] = useState('');
  const [roleBullets, setRoleBullets] = useState('');
  const [roleBadges, setRoleBadges] = useState('TypeScript, React, .NET, Cloud');

  useEffect(() => {
    localStorage.setItem('cap_personal_experiences', JSON.stringify(personalExperiences));
  }, [personalExperiences]);

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const bulletsList = roleBullets
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);
    const created: ExperienceItem = {
      id: `exp-${Date.now()}`,
      role: roleTitle.trim() || 'Software Engineer',
      company: companyName.trim() || 'Technology Company',
      location: roleLocation.trim() || 'Remote',
      period: rolePeriod.trim() || 'Present',
      highlight: roleHighlight.trim() || 'Full-stack architecture & product delivery',
      bullets: bulletsList.length > 0 ? bulletsList : ['Architected and delivered scalable production features.'],
      badges: roleBadges.split(',').map(b => b.trim()).filter(Boolean)
    };
    setPersonalExperiences(prev => [created, ...prev]);
    setRoleTitle('');
    setCompanyName('');
    setRoleHighlight('');
    setRoleBullets('');
    setIsAddRoleOpen(false);
  };

  const handleDeleteRole = (id?: string) => {
    if (!id) return;
    setPersonalExperiences(prev => prev.filter(item => item.id !== id));
  };

  const portfolioExperiences: ExperienceItem[] = [
    {
      company: 'Advanced Solutions International',
      location: 'Austin, TX',
      role: 'Senior Software Developer II',
      period: 'June 2023 – Present',
      highlight: 'Non-profit SaaS features, .NET 10 internal tooling & AI-assisted HR automation',
      badges: ['.NET 10', 'C#', 'Vite', 'Vanilla JS', 'AI Workflows', 'Azure DevOps', 'Financial Workflows', 'HR Tech'],
      bullets: [
        'Developed web features for non-profit companies to manage memberships, commerce, fundraising and donations.',
        'Architected and built an internal Training Hour Tracking application (trainingtracker.advsol.com) using .NET 10, Vite, and vanilla JavaScript, leveraging AI-assisted development workflows to accelerate delivery and automate manual HR tracking.',
        'Focused on C# and .NET development for accounting features for checking out and managing customer memberships and subscriptions.',
        'Improved invoice handling efficiency and optimized financial workflows for client accounts.'
      ]
    },
    {
      company: 'HealthTrust Purchasing Group (via Vaco)',
      location: 'Nashville, TN',
      role: 'Full Stack Software Engineer III (Contract)',
      period: 'November 2022 – May 2023',
      highlight: 'Contracted high-priority feature delivery, vertical slice development & Linux containerization',
      badges: ['.NET 6', 'TypeScript', 'React', 'SQL', 'Azure DevOps', 'Docker', 'Linux / WSL'],
      bullets: [
        'Contracted to focus on high-priority feature implementation and software maintenance.',
        'Developed features in vertical slices from SQL database structuring to React rendering.',
        'Added Administrator features for clients utilizing .NET 6 and Typescript.',
        'Managed code deployments using Azure DevOps and Docker containers.',
        'Engineered a seamless transition for developers moving from Mac to Windows by creating extensive documentation for setting up a Linux environment in Windows.'
      ]
    },
    {
      company: 'Advanced Solutions International',
      location: 'Austin, TX',
      role: 'Software Developer II',
      period: 'May 2019 – November 2022',
      highlight: 'International payment processing, Scrum Master leadership & platform reliability',
      badges: ['.NET Core', 'JavaScript', 'Ezidebit', 'Agile/Scrum', 'Teams & VSTS', 'Cloud Services'],
      bullets: [
        'Added payment processing support for clients in Australia and New Zealand with Ezidebit using JavaScript and .NET Core.',
        'Served as Scrum Master to oversee sprint planning and direction to maintain project velocity using Microsoft Teams and VSTS.',
        'Improved and expanded refund support services for clients.',
        'Worked closely with Cloud Services and Tech Support to identify bugs and improve site reliability.'
      ]
    },
    {
      company: 'Volusion, LLC',
      location: 'Austin, TX',
      role: 'Software Engineer I',
      period: 'September 2017 – May 2019',
      highlight: 'E-commerce platform modernization, address autocomplete & Android fraud scoring',
      badges: ['React', 'MobX', 'JavaScript', 'Java', 'Android', 'Google AutoComplete', 'Confluence / Notion'],
      bullets: [
        'Worked with a small team within 2-week sprints to create features and solutions for e-commerce merchants.',
        'Developed platform features for V2, the newest platform, using React with MobX to replace Angular 1.7.',
        'Implemented a new design and flow for the checkout experience using Google AutoComplete for addresses based on country location for international shipping.',
        'Added a fraud score interface for merchants in the Android app using Java and deployed it to the Google Play Store. This feature drove immediate impact, being adopted by 500+ merchants in the first week.',
        'Created Mobile API and Android App documentation in Confluence and Notion.'
      ]
    }
  ];

  const projects = [
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

  const certifications = [
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

  const skills = [
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

  const activeExperiences = workspaceMode === 'personal' ? personalExperiences : portfolioExperiences;

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

        {workspaceMode === 'personal' ? (
          <button
            type="button"
            onClick={() => setIsAddRoleOpen(true)}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={17} />
            <span>Add Role / Experience</span>
          </button>
        ) : (
          <a
            href="https://linkedin.com/in/johnbendfeldt"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <LinkedinIcon size={17} />
            <span>Message on LinkedIn</span>
            <ExternalLink size={14} style={{ opacity: 0.85 }} />
          </a>
        )}
      </div>

      {/* Skills Matrix Pill Grid (John's Portfolio Mode) */}
      {workspaceMode !== 'personal' && (
        <div className="glass-panel" style={{
          padding: '28px',
          marginBottom: '32px'
        }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="var(--accent-cyan)" />
            <span>Technical Skills & Methodologies</span>
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}>
            {skills.map((group) => (
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
            <div
              key={exp.id || idx}
              className="glass-panel timeline-card"
            >
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

              {/* Sub-highlight callout */}
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

              {/* Bullets with high contrast and readable line-height */}
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

              {/* Badges */}
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
              {projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="glass-panel timeline-card"
                >
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
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      style={{
                        padding: '8px 18px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <Globe size={15} />
                      <span>{proj.domain}</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {/* Project Bullets */}
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

                  {/* Badges */}
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
              {certifications.map((cert, idx) => (
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

      {/* Add Personal Role Modal */}
      {isAddRoleOpen && (
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
            maxWidth: '540px',
            width: '100%',
            background: 'var(--bg-card)',
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={20} color="var(--accent-crimson)" />
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Add Role to My Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoleOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRole}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role / Title</label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Company / Org</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Systems"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</label>
                  <input
                    type="text"
                    value={roleLocation}
                    onChange={(e) => setRoleLocation(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dates / Period</label>
                  <input
                    type="text"
                    value={rolePeriod}
                    onChange={(e) => setRolePeriod(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Key Highlight Summary</label>
                <input
                  type="text"
                  value={roleHighlight}
                  onChange={(e) => setRoleHighlight(e.target.value)}
                  placeholder="e.g. Cloud microservices, CI/CD automation & frontend modernization"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Bullet Points (One per line)</label>
                <textarea
                  rows={3}
                  value={roleBullets}
                  onChange={(e) => setRoleBullets(e.target.value)}
                  placeholder={'Built scalable APIs serving 50k+ daily users.\nReduced CI/CD deployment times by 40%.'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tech Badges (comma-separated)</label>
                <input
                  type="text"
                  value={roleBadges}
                  onChange={(e) => setRoleBadges(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.84rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsAddRoleOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Role</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
