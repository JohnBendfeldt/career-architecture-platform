import { Briefcase, Award, GraduationCap, MapPin, CheckCircle2, ExternalLink } from 'lucide-react';
import { LinkedinIcon } from './Icons';

export const ResumeTimeline: React.FC = () => {
  const experiences = [
    {
      company: 'Advanced Solutions International',
      location: 'Austin, TX',
      role: 'Senior Software Developer II',
      period: 'June 2023 – Present',
      highlight: 'Recruited back to lead codebase modernization and internal tooling initiatives',
      badges: ['.NET 10', 'C#', 'React', 'Vanilla JS', 'Vite', 'Azure DevOps', 'Financial Workflows'],
      bullets: [
        'Architected and built an internal Training Hour Tracking application (trainingtracker.advsol.com) to streamline HR processes, engineered with .NET 10, vanilla JavaScript, HTML, and Vite.',
        'Spearheaded codebase modernization initiatives to transition legacy enterprise systems to current .NET and web standards.',
        'Developed web features for non-profit organizations to manage memberships, commerce, fundraising, and donations.',
        'Focused on C# and .NET development for mission-critical accounting features, including checkout handling and automated subscription management.',
        'Improved invoice handling efficiency and optimized financial workflows for high-volume client accounts.'
      ]
    },
    {
      company: 'HealthTrust Purchasing Group (via Vaco)',
      location: 'Nashville, TN (Remote)',
      role: 'Full Stack Software Engineer III (Contract)',
      period: 'November 2022 – May 2023',
      highlight: 'High-priority feature implementation and vertical slice engineering',
      badges: ['.NET 6', 'TypeScript', 'React', 'SQL Server', 'Azure DevOps', 'Docker'],
      bullets: [
        'Contracted to deliver high-priority feature implementation and software maintenance across enterprise health purchasing platforms.',
        'Engineered features in end-to-end vertical slices from SQL database structuring to responsive React client rendering.',
        'Added administrative features and role management for enterprise clients utilizing .NET 6 and TypeScript.',
        'Managed CI/CD code deployments and environment reliability using Azure DevOps and Docker containers.',
        'Engineered a seamless cross-platform transition for developers moving from Mac to Windows by authoring extensive documentation for Linux virtualization (WSL) in Windows.'
      ]
    },
    {
      company: 'Advanced Solutions International',
      location: 'Austin, TX',
      role: 'Software Developer II',
      period: 'May 2019 – November 2022',
      highlight: 'International payment processing, API development, and software delivery',
      badges: ['.NET Core', 'JavaScript', 'REST APIs', 'Ezidebit', 'Azure DevOps', 'CI/CD'],
      bullets: [
        'Added international payment processing support for enterprise clients in Australia and New Zealand with Ezidebit using JavaScript and .NET Core.',
        'Facilitated technical delivery, release coordination, and sprint execution across high-impact enterprise SaaS products.',
        'Improved and expanded automated refund support services for client ecommerce operations.',
        'Collaborated closely with Cloud Services and Technical Support teams to triage bugs, perform root cause analysis, and improve production site reliability.'
      ]
    },
    {
      company: 'Volusion, LLC',
      location: 'Austin, TX',
      role: 'Software Engineer I',
      period: 'September 2017 – May 2019',
      highlight: 'Next-gen ecommerce checkout, address autocomplete, and Android fraud detection',
      badges: ['React', 'MobX', 'JavaScript', 'Java / Android', 'Google APIs', 'E-Commerce'],
      bullets: [
        'Worked with a focused engineering team within 2-week agile sprints to deliver features and checkout solutions for ecommerce merchants.',
        'Developed next-generation platform features for V2 using React with MobX to replace legacy Angular 1.7 architectures.',
        'Implemented a redesigned checkout flow with Google AutoComplete for addresses based on country location for international shipping (laying the foundation for the country-province-data npm package).',
        'Built a merchant fraud scoring interface in the Android application using Java and deployed it to the Google Play Store, adopted by 500+ merchants in week one.',
        'Authored developer API and Android application architecture documentation in Confluence and Notion.'
      ]
    }
  ];

  const certifications = [
    {
      title: 'Full Stack Web Development Certification',
      issuer: 'University of Texas at Austin',
      license: 'Center for Professional Education',
      date: 'Certified Graduate'
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
      license: '1,300+ Weekly Downloads • Zero Open Issues',
      date: '8+ Years Maintained'
    }
  ];

  const skills = [
    { category: 'Languages', items: ['C#', 'TypeScript', 'JavaScript (ES6+)', 'SQL', 'HTML5/CSS3', 'Java'] },
    { category: 'Frameworks & Web', items: ['.NET 10', '.NET 6 / Core', 'React', 'Vite', 'Node.js', 'MobX'] },
    { category: 'DevOps & Cloud', items: ['Docker', 'Azure DevOps', 'CI/CD Pipelines', 'SQL Server', 'Git / VSTS', 'YARP Gateway'] },
    { category: 'Architecture & Engineering', items: ['System Architecture', 'REST & Minimal APIs', 'Microservices', 'Test-Driven Development (TDD)', 'Unit & Integration Testing', 'Codebase Modernization'] }
  ];

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Header with Quick Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={22} color="var(--accent-indigo)" />
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
              Professional Experience & Credentials
            </h2>
            <span className="badge badge-indigo" style={{ fontSize: '0.75rem' }}>
              9+ Years Experience
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Proven record of architecting distributed systems, modernizing enterprise codebases, and shipping full-stack SaaS features.
          </p>
        </div>

        <a
          href="https://linkedin.com/in/johnbendfeldt"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <LinkedinIcon size={16} />
          <span>Message on LinkedIn</span>
          <ExternalLink size={13} style={{ opacity: 0.8 }} />
        </a>
      </div>

      {/* Skills Matrix Pill Grid */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="var(--accent-cyan)" />
          <span>Technical Skills & Methodologies</span>
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}>
          {skills.map((group) => (
            <div key={group.category} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--accent-indigo)',
                fontWeight: 700,
                marginBottom: '10px'
              }}>
                {group.category}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {group.items.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#e0e7ff',
                      fontWeight: 500
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

      {/* Experience Timeline */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={20} color="var(--accent-indigo)" />
          <span>Career History</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {experiences.map((exp, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '24px 28px',
                borderLeft: '4px solid var(--accent-indigo)',
                position: 'relative'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '6px'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>
                    {exp.role}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {exp.company}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} />
                      {exp.location}
                    </span>
                  </div>
                </div>

                <span className="badge badge-indigo" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                  {exp.period}
                </span>
              </div>

              {/* Sub-highlight */}
              <div style={{
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: '#a5b4fc',
                marginBottom: '14px'
              }}>
                {exp.highlight}
              </div>

              {/* Bullets */}
              <ul style={{
                paddingLeft: '20px',
                margin: '0 0 16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {exp.badges.map((b) => (
                  <span
                    key={b}
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
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

      {/* Certifications & Education */}
      <div>
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={20} color="var(--accent-emerald)" />
          <span>Certifications & Education</span>
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {certifications.map((cert, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                borderLeft: '3px solid #10b981'
              }}
            >
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={18} />
              </div>

              <div>
                <h5 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, marginBottom: '2px' }}>
                  {cert.title}
                </h5>
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  {cert.issuer}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {cert.license}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '4px' }}>
                  {cert.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
