import React from 'react';
import { ShieldCheck } from 'lucide-react';

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

interface RecruiterScorecardProps {
  extractedSkills: string[];
}

export const RecruiterScorecard: React.FC<RecruiterScorecardProps> = ({ extractedSkills }) => {
  if (extractedSkills.length === 0) return null;

  const matchedCount = extractedSkills.filter(
    (s) => evaluatePortfolioSkillMatch(s).matched
  ).length;
  const matchPercentage = Math.round((matchedCount / extractedSkills.length) * 100);

  return (
    <div style={{
      padding: '14px 16px',
      marginBottom: '18px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-subtle)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recruiter Job-Match Score
          </span>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '4px',
          background: matchPercentage >= 70 ? 'rgba(22, 163, 74, 0.12)' : 'rgba(230, 0, 18, 0.1)',
          color: matchPercentage >= 70 ? '#16a34a' : 'var(--accent-crimson)'
        }}>
          {matchPercentage}% Stack Match ({matchedCount}/{extractedSkills.length} Verified)
        </span>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          width: `${matchPercentage}%`,
          height: '100%',
          background: matchPercentage >= 70 ? '#16a34a' : 'var(--accent-crimson)',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
};
