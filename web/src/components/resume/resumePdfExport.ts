import { ApiService } from '../../services/api';
import type { Profile } from '../../types';

export interface ExperienceItem {
  id?: string;
  company: string;
  location: string;
  role: string;
  period: string;
  highlight: string;
  badges: string[];
  bullets: string[];
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const PORTFOLIO_EXPERIENCES: ExperienceItem[] = [
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

export const STARTER_PERSONAL_EXPERIENCES: ExperienceItem[] = [
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

export function exportPrintableResume(options?: {
  workspaceMode?: 'portfolio' | 'personal';
  profile?: Profile;
  experiences?: ExperienceItem[];
}): void {
  const mode = options?.workspaceMode || 'portfolio';
  const prof = options?.profile || ApiService.getDefaultPortfolioProfile();

  let exps = options?.experiences;
  if (!exps) {
    if (mode === 'personal') {
      try {
        const raw = localStorage.getItem('cap_personal_experiences');
        exps = raw ? JSON.parse(raw) : [];
      } catch {
        exps = [];
      }
    } else {
      exps = PORTFOLIO_EXPERIENCES;
    }
  }

  const win = window.open('', '_blank', 'width=920,height=1080');
  if (!win) {
    window.print();
    return;
  }

  const experienceHtml = (exps || [])
    .map(
      (exp) => `
      <div class="job">
        <div class="job-header">
          <div>
            <span class="job-role">${escapeHtml(exp.role)}</span>
            <span class="job-company"> — ${escapeHtml(exp.company)}</span>
          </div>
          <div class="job-meta">${escapeHtml(exp.location)} | ${escapeHtml(exp.period)}</div>
        </div>
        <ul>
          ${(exp.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(prof.name)} — Resume</title>
  <style>
    @page { margin: 0.45in 0.5in; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111111;
      background: #ffffff;
      line-height: 1.42;
      font-size: 10pt;
      margin: 0;
      padding: 24px 36px;
      max-width: 850px;
      margin-left: auto;
      margin-right: auto;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      margin-bottom: 20px;
      background: #f5f5f3;
      border: 1px solid #d4d4d0;
      border-radius: 6px;
      font-size: 9pt;
    }
    .toolbar button {
      background: #e60012;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      font-size: 9pt;
    }
    header {
      border-bottom: 2px solid #111111;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 20pt;
      font-weight: 800;
      margin: 0 0 2px 0;
      letter-spacing: -0.02em;
    }
    .headline {
      font-size: 11pt;
      font-weight: 700;
      color: #e60012;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .contact {
      font-size: 9pt;
      color: #333333;
    }
    section {
      margin-bottom: 12px;
    }
    h2 {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #cccccc;
      padding-bottom: 3px;
      margin: 0 0 8px 0;
      color: #111111;
    }
    p.summary {
      margin: 0;
      color: #222222;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 3px;
      font-size: 9.5pt;
    }
    .job {
      margin-bottom: 10px;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 2px;
    }
    .job-role {
      font-weight: 700;
      font-size: 10.2pt;
    }
    .job-company {
      font-weight: 600;
      color: #333333;
    }
    .job-meta {
      font-size: 9pt;
      color: #444444;
      font-weight: 600;
    }
    ul {
      margin: 3px 0 0 0;
      padding-left: 18px;
    }
    li {
      margin-bottom: 2px;
    }
    @media print {
      body { padding: 0; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span><strong>ATS-Ready Printable Resume</strong> • Choose "Save as PDF" in your print dialog</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>

  <header>
    <h1>${escapeHtml(prof.name)}</h1>
    <div class="headline">${escapeHtml(prof.headline)}</div>
    <div class="contact">
      ${escapeHtml(prof.location)}
      ${prof.email ? ` • ${escapeHtml(prof.email)}` : ''}
      ${mode === 'portfolio' ? ' • johnbendfeldt.com' : ''}
      ${prof.githubUrl ? ` • ${escapeHtml(prof.githubUrl.replace(/^https?:\/\/(www\.)?/, ''))}` : ''}
      ${prof.linkedinUrl ? ` • ${escapeHtml(prof.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''))}` : ''}
    </div>
  </header>

  <section>
    <h2>Professional Summary</h2>
    <p class="summary">${escapeHtml(prof.bio)}</p>
  </section>

  <section>
    <h2>Technical Skills</h2>
    ${
      mode === 'portfolio'
        ? `<div class="skills-grid">
            <div><strong>Languages &amp; Databases:</strong> C#, JavaScript (Vanilla/ES6+), TypeScript, HTML/CSS, SQL, PostgreSQL, SQL Server</div>
            <div><strong>Frameworks &amp; Libraries:</strong> .NET (Core, 6, 10), React, Node.js, Vite, YARP Microservice Gateways</div>
            <div><strong>Cloud, DevOps &amp; AI Tooling:</strong> Git, Docker, Azure DevOps, CI/CD Pipelines, GitHub Copilot, Claude Code &amp; Gemini CLI</div>
            <div><strong>Methodologies &amp; Testing:</strong> Agile/Scrum, Test-Driven Development (TDD), xUnit, Vitest, Playwright</div>
          </div>`
        : `<div class="skills-grid"><div>${escapeHtml((prof.skills || []).join(' • '))}</div></div>`
    }
  </section>

  <section>
    <h2>Professional Experience</h2>
    ${experienceHtml}
  </section>

  ${
    mode === 'portfolio'
      ? `<section>
          <h2>Production Projects &amp; Open Source</h2>
          <div class="job">
            <div class="job-header">
              <div><span class="job-role">Basic Language School (basiclanguage.school)</span><span class="job-company"> — Creator &amp; Full-Stack Engineer</span></div>
              <div class="job-meta">Live Production PWA</div>
            </div>
            <ul>
              <li>Built a high-performance PWA supporting 210 bidirectional language pairs across 15 languages with 14,400+ neural audio assets, offline caching, and Supabase cloud sync.</li>
              <li>Engineered interactive active-recall quizzes with custom virtual keyboards (Cyrillic, Arabic, Indic) and 1,000+ automated Vitest/Playwright tests.</li>
            </ul>
          </div>
          <div class="job">
            <div class="job-header">
              <div><span class="job-role">country-province-data (npm Registry)</span><span class="job-company"> — Open Source Author &amp; Maintainer</span></div>
              <div class="job-meta">8+ Years Active</div>
            </div>
            <ul>
              <li>Published zero-dependency international address &amp; province package powering global e-commerce checkout flows (hundreds of weekly downloads, zero open bugs over 8 years).</li>
            </ul>
          </div>
        </section>
        <section>
          <h2>Education &amp; Credentials</h2>
          <div><strong>The University of Texas at Austin</strong> — Coding Boot Camp (Full Stack Web Development &amp; Computer Science Foundations)</div>
        </section>`
      : ''
  }

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
