import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ArrowUpRight } from 'lucide-react';

export interface SkillMatchResult {
  matched: boolean;
  evidence: string;
}

export function evaluatePortfolioSkillMatch(skill: string): SkillMatchResult {
  const s = skill.toLowerCase();

  if (s.includes('c#') || s.includes('.net') || s.includes('asp.net') || s.includes('entity framework') || s.includes('yarp') || s.includes('minimal api')) {
    return {
      matched: true,
      evidence: 'Verified in Production (9+ yrs): Enterprise C#/.NET SaaS at Advanced Solutions International (ASI), .NET 10 Training Hour Tracker (trainingtracker.advsol.com), and YARP microservice gateways.'
    };
  }
  if (s.includes('react') || s.includes('typescript') || s.includes('javascript') || s.includes('vite') || s.includes('html') || s.includes('css') || s.includes('frontend') || s.includes('node')) {
    return {
      matched: true,
      evidence: 'Verified in Production (9+ yrs): React 19, TypeScript, Vite & ES6+ across enterprise SaaS, Basic Language School PWA (basiclanguage.school), and the country-province-data npm package.'
    };
  }
  if (s.includes('sql') || s.includes('postgres') || s.includes('database') || s.includes('supabase') || s.includes('sqlite')) {
    return {
      matched: true,
      evidence: 'Verified in Production (9+ yrs): SQL Server, PostgreSQL & Supabase schema architecture, Row-Level Security (RLS), and high-volume financial/membership query optimization.'
    };
  }
  if (s.includes('ci/cd') || s.includes('devops') || s.includes('azure') || s.includes('docker') || s.includes('git') || s.includes('pipeline') || s.includes('cloud')) {
    return {
      matched: true,
      evidence: 'Verified in Production: Multi-stage Docker builds, Azure DevOps & GitHub Actions CI/CD pipelines, and cloud microservice deployments.'
    };
  }
  if (s.includes('legacy') || s.includes('moderniz') || s.includes('saas') || s.includes('architect') || s.includes('agile') || s.includes('scrum') || s.includes('test') || s.includes('tdd')) {
    return {
      matched: true,
      evidence: 'Verified in Production (9+ yrs): Modernizing large-scale legacy SaaS codebases with 1,000+ automated Vitest, Playwright, and xUnit integration tests.'
    };
  }
  if (s.includes('ai') || s.includes('llm') || s.includes('gemini') || s.includes('claude') || s.includes('copilot') || s.includes('agent')) {
    return {
      matched: true,
      evidence: 'Verified in Production: Built Gemini AI structured extraction pipelines and leveraged Claude Code, Gemini CLI & GitHub Copilot to accelerate production delivery.'
    };
  }

  return {
    matched: false,
    evidence: 'Growth / Upskill Pathway: Not a primary focus in John\'s core C#/.NET & React/TypeScript stack — explore the curated study searches below.'
  };
}

export function buildRecruiterMatchBrief(extractedSkills: string[]): string {
  const evaluated = extractedSkills.map((skill) => ({
    skill,
    ...evaluatePortfolioSkillMatch(skill),
  }));
  const matched = evaluated.filter((item) => item.matched);
  const growth = evaluated.filter((item) => !item.matched);
  const pct = extractedSkills.length > 0 ? Math.round((matched.length / extractedSkills.length) * 100) : 0;

  const lines = [
    `# Candidate Technical Match Brief — John Bendfeldt`,
    `Stack Alignment: ${pct}% (${matched.length}/${extractedSkills.length} verified in production)`,
    `Portfolio: https://johnbendfeldt.com | LinkedIn: https://linkedin.com/in/johnbendfeldt | GitHub: https://github.com/johnbendfeldt`,
    '',
    '## Verified Production Evidence',
    ...(matched.length > 0
      ? matched.map((m) => `- **${m.skill}**: ${m.evidence}`)
      : ['- No direct production overlap detected for the pasted tokens.']),
  ];

  if (growth.length > 0) {
    lines.push(
      '',
      '## Growth / Ramp Areas',
      ...growth.map((g) => `- **${g.skill}**: Ramp-ready with curated study pathway attached in Career Architecture Platform.`)
    );
  }

  return lines.join('\n');
}

interface RecruiterScorecardProps {
  extractedSkills: string[];
  onHighlightOnResume?: (matchedSkills: string[]) => void;
  onNotify?: (message: string, tone?: 'success' | 'info' | 'error') => void;
}

export const RecruiterScorecard: React.FC<RecruiterScorecardProps> = ({
  extractedSkills,
  onHighlightOnResume,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  if (extractedSkills.length === 0) return null;

  const matchedSkills = extractedSkills.filter(
    (s) => evaluatePortfolioSkillMatch(s).matched
  );
  const matchedCount = matchedSkills.length;
  const growthCount = extractedSkills.length - matchedCount;
  const matchPercentage = Math.round((matchedCount / extractedSkills.length) * 100);

  const handleCopyBrief = async () => {
    const brief = buildRecruiterMatchBrief(extractedSkills);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(brief);
      }
      setCopied(true);
      onNotify?.('Copied Recruiter Match Brief to clipboard.', 'success');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      onNotify?.('Clipboard unavailable — select and copy directly from your browser.', 'error');
    }
  };

  return (
    <div
      style={{
        padding: '14px 16px',
        marginBottom: '18px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-inset)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <ShieldCheck size={16} aria-hidden="true" style={{ color: 'var(--status-success)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recruiter Job-Match Score
          </span>
        </div>
        <span className={`badge ${matchPercentage >= 70 ? 'badge-emerald' : 'badge-amber'}`}>
          {matchPercentage}% Stack Match ({matchedCount}/{extractedSkills.length} Verified)
        </span>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={matchPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Recruiter stack match percentage"
      >
        <div
          className="progress-fill"
          style={{
            width: `${matchPercentage}%`,
            background: matchPercentage >= 70 ? 'var(--status-success)' : 'var(--accent-crimson)',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--status-success)' }}>{matchedCount} verified</strong>
          {growthCount > 0 && (
            <>
              {' '}• <strong style={{ color: 'var(--text-primary)' }}>{growthCount} upskill</strong>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyBrief}
            className="btn-secondary"
            id="btn-copy-recruiter-brief"
            style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.76rem' }}
            title="Copy structured Markdown hiring brief with production proof points"
          >
            {copied ? (
              <>
                <Check size={13} aria-hidden="true" style={{ color: 'var(--status-success)' }} />
                <span>Copied Brief</span>
              </>
            ) : (
              <>
                <Copy size={13} aria-hidden="true" />
                <span>Copy Recruiter Brief</span>
              </>
            )}
          </button>

          {onHighlightOnResume && matchedCount > 0 && (
            <button
              type="button"
              onClick={() => onHighlightOnResume(matchedSkills)}
              className="btn-secondary"
              id="btn-highlight-resume-matches"
              style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.76rem' }}
              title="Jump to Experience & Resume with matched skills highlighted"
            >
              <span>Highlight on Resume</span>
              <ArrowUpRight size={13} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
