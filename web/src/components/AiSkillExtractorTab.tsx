import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, BookOpen, ExternalLink, RefreshCw, CheckCircle, Zap, Check, Plus, ShieldCheck, Mic, MicOff } from 'lucide-react';
import { YoutubeIcon } from './Icons';
import { ApiService } from '../services/api';
import type { LearningResource } from '../types';

interface AiSkillExtractorTabProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
  onGoalCreated?: () => void;
}

const PORTFOLIO_BIO = `Software Engineer with a track record of building out features and maintaining large scale SaaS applications. Adept at working with diverse cross-functional teams to drive projects from architecture to deployment. Brings 9 years of expertise in full-stack web development, CI/CD pipelines, and modernizing legacy codebases into scalable .NET and React environments.`;

const SAMPLE_DOTNET_REACT_JOB = `Seeking a Senior Full-Stack Software Engineer to architect and deliver enterprise SaaS features using C#, .NET Core / .NET 10, React, TypeScript, and SQL Server / PostgreSQL. Candidates should have strong experience with CI/CD pipelines in Azure DevOps, Docker containerization, legacy codebase modernization, and automated unit/integration testing.`;

const PERSONAL_SAMPLE_BIO = `We are looking for a Cloud & AI Systems Engineer to design distributed microservices using TypeScript, Node.js, Python, and FastAPI. Ideal candidates have experience with Docker, Kubernetes, PostgreSQL, AWS Cloud Architecture, and building AI Agent & LLM pipelines.`;

const PORTFOLIO_SKILLS = [
  'C# & .NET 10',
  'React & TypeScript',
  'CI/CD Pipelines & Azure DevOps',
  'Legacy Codebase Modernization',
  'AI-Assisted Development'
];

const PERSONAL_SAMPLE_SKILLS = [
  'TypeScript & Node.js',
  'Python & FastAPI',
  'Docker & Kubernetes',
  'AWS Cloud Architecture',
  'AI Agents & LLM Pipelines'
];

interface SkillMatchResult {
  matched: boolean;
  evidence: string;
}

function evaluatePortfolioSkillMatch(skill: string): SkillMatchResult {
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

export const AiSkillExtractorTab: React.FC<AiSkillExtractorTabProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My',
  onGoalCreated
}) => {
  const [inputText, setInputText] = useState(
    workspaceMode === 'personal' ? PERSONAL_SAMPLE_BIO : PORTFOLIO_BIO
  );

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>(
    workspaceMode === 'personal' ? PERSONAL_SAMPLE_SKILLS : PORTFOLIO_SKILLS
  );

  const [activeSkill, setActiveSkill] = useState<string>(
    workspaceMode === 'personal' ? PERSONAL_SAMPLE_SKILLS[0] : PORTFOLIO_SKILLS[0]
  );
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [extractionMeta, setExtractionMeta] = useState<{ source?: string; model?: string } | null>(null);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isListeningBio, setIsListeningBio] = useState(false);
  const [isListeningSkill, setIsListeningSkill] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleVoiceBio = () => {
    setVoiceError(null);
    if (isListeningBio && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningBio(false);
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError('Browser Speech Recognition is unavailable in this browser (use Chrome, Edge, or Safari, or press Fn twice on macOS).');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let baseText = '';
    recognition.onstart = () => {
      setIsListeningBio(true);
      setIsListeningSkill(false);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputText(baseText ? `${baseText} ${transcript}`.trim() : transcript.trim());
    };

    recognition.onerror = () => {
      setIsListeningBio(false);
    };

    recognition.onend = () => {
      setIsListeningBio(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleVoiceSkill = () => {
    setVoiceError(null);
    if (isListeningSkill && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningSkill(false);
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError('Browser Speech Recognition is unavailable in this browser (use Chrome, Edge, or Safari, or press Fn twice on macOS).');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningSkill(true);
      setIsListeningBio(false);
    };

    recognition.onresult = (event: any) => {
      const raw = event.results?.[0]?.[0]?.transcript?.trim() || '';
      const cleaned = raw.replace(/[.?!]+$/, '').trim();
      if (cleaned) {
        setCustomSkillInput(cleaned);
        setExtractedSkills((prev) => (prev.includes(cleaned) ? prev : [cleaned, ...prev]));
        setActiveSkill(cleaned);
      }
    };

    recognition.onerror = () => {
      setIsListeningSkill(false);
    };

    recognition.onend = () => {
      setIsListeningSkill(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Switch sample text and skills when workspaceMode changes
  useEffect(() => {
    if (workspaceMode === 'personal') {
      setInputText(PERSONAL_SAMPLE_BIO);
      setExtractedSkills(PERSONAL_SAMPLE_SKILLS);
      setActiveSkill(PERSONAL_SAMPLE_SKILLS[0]);
    } else {
      setInputText(PORTFOLIO_BIO);
      setExtractedSkills(PORTFOLIO_SKILLS);
      setActiveSkill(PORTFOLIO_SKILLS[0]);
    }
  }, [workspaceMode]);

  // Load resources when active skill changes
  useEffect(() => {
    let mounted = true;
    setLoadingResources(true);
    setSavedNotice(null);
    ApiService.getLearningResources(activeSkill).then((data) => {
      if (mounted) {
        setResources(data);
        setLoadingResources(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeSkill]);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const res = await ApiService.extractSkills(inputText);
      if (res.skills && res.skills.length > 0) {
        setExtractedSkills(res.skills);
        setActiveSkill(res.skills[0]);
        setExtractionMeta({ source: res.source, model: res.model });
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!extractedSkills.includes(trimmed)) {
      setExtractedSkills(prev => [trimmed, ...prev]);
    }
    setActiveSkill(trimmed);
    setCustomSkillInput('');
  };

  const handleSaveSkillAsGoal = async () => {
    const res = await ApiService.createGoal({
      title: `Master ${activeSkill}`,
      description: `Curated learning pathway for ${activeSkill} via YouTube architecture deep-dives and Udemy enterprise courses.`,
      category: 'Technical',
      progress: 15,
      targetDate: 'Q4 2026',
      status: 'InProgress',
      tags: [activeSkill, 'AI Curriculum', 'Skill Pipeline']
    });
    setSavedNotice(res.message);
    if (res.success && onGoalCreated) {
      onGoalCreated();
    }
  };

  const matchedCount = extractedSkills.filter(
    (s) => evaluatePortfolioSkillMatch(s).matched
  ).length;
  const matchPercentage = extractedSkills.length > 0
    ? Math.round((matchedCount / extractedSkills.length) * 100)
    : 0;
  const activeSkillMatch = evaluatePortfolioSkillMatch(activeSkill);

  const handleLoadPreset = (presetText: string, presetSkills: string[]) => {
    setInputText(presetText);
    setExtractedSkills(presetSkills);
    setActiveSkill(presetSkills[0]);
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Sparkles size={24} color="var(--accent-violet)" />
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            {workspaceMode === 'personal'
              ? `${userName}'s AI Skill Extractor & Study Planner`
              : 'AI Skill Extraction & Automated Curriculum'}
          </h2>
          <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
            JOB MATCH &amp; STUDY PLANNER
          </span>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Paste any job description or resume to evaluate stack overlap, inspect production proof, or launch curated study searches.
        </p>
      </div>

      <div className="ai-extractor-grid">
        {/* Left Column: Text Input & Skill Chips */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              1. Job Description or Resume Bio
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleLoadPreset(SAMPLE_DOTNET_REACT_JOB, [
                  'C# & .NET 10',
                  'React & TypeScript',
                  'SQL Server & PostgreSQL',
                  'CI/CD & Azure DevOps',
                  'Docker & Automated Testing'
                ])}
                className="btn-secondary"
                style={{ padding: '3px 9px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
              >
                Sample: .NET / React Job
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset(PERSONAL_SAMPLE_BIO, PERSONAL_SAMPLE_SKILLS)}
                className="btn-secondary"
                style={{ padding: '3px 9px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
              >
                Sample: Cloud / AI Job
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset(PORTFOLIO_BIO, PORTFOLIO_SKILLS)}
                className="btn-secondary"
                style={{ padding: '3px 9px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
              >
                John&apos;s Bio
              </button>
              <button
                type="button"
                onClick={toggleVoiceBio}
                className={isListeningBio ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '3px 10px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  background: isListeningBio ? 'var(--accent-crimson)' : undefined,
                  color: isListeningBio ? '#ffffff' : undefined
                }}
                title="Speak a job description or bio using live browser speech recognition"
              >
                {isListeningBio ? <MicOff size={12} /> : <Mic size={12} color="var(--accent-crimson)" />}
                <span>{isListeningBio ? 'Listening... (Stop)' : 'Voice Input'}</span>
              </button>
            </div>
          </div>

          {voiceError && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--accent-crimson)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              {voiceError}
            </div>
          )}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              resize: 'vertical',
              marginBottom: '16px'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Identifies languages, frameworks, cloud tools &amp; architecture patterns
            </span>
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="btn-primary"
              id="btn-ai-extract"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              {isExtracting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Extracting Skills...</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Extract Skills via AI</span>
                </>
              )}
            </button>
          </div>

          {/* Recruiter Job-Match Scorecard */}
          {workspaceMode === 'portfolio' && extractedSkills.length > 0 && (
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
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Extracted Skill Tokens ({extractedSkills.length}) • Click a skill to inspect
              </div>
              {extractionMeta?.source === 'gemini' && (
                <span className="badge badge-emerald" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={11} /> Live Gemini AI ({extractionMeta.model || 'gemini-3.5-flash-lite'})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {extractedSkills.map((skill, sIdx) => {
                const isActive = activeSkill === skill;
                const matchInfo = evaluatePortfolioSkillMatch(skill);
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setActiveSkill(skill)}
                    title={workspaceMode === 'portfolio' ? matchInfo.evidence : undefined}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isActive ? 'var(--accent-crimson)' : 'var(--border-subtle)'}`,
                      background: isActive ? 'var(--bg-primary)' : 'var(--bg-card)',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      width: '14px',
                      height: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isActive ? (
                        <CheckCircle size={13} color="var(--accent-crimson)" />
                      ) : workspaceMode === 'portfolio' && matchInfo.matched ? (
                        <CheckCircle size={13} color="#16a34a" />
                      ) : (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                      )}
                    </span>
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Custom Skill Builder */}
            <form onSubmit={handleAddCustomSkill} style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                placeholder="Add or speak any skill (e.g. Kubernetes, Rust)..."
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem'
                }}
              />
              <button
                type="button"
                onClick={toggleVoiceSkill}
                className={isListeningSkill ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  background: isListeningSkill ? 'var(--accent-crimson)' : undefined,
                  color: isListeningSkill ? '#ffffff' : undefined
                }}
                title="Speak a skill name to add it hands-free"
              >
                {isListeningSkill ? <MicOff size={14} /> : <Mic size={14} color="var(--accent-crimson)" />}
                <span>{isListeningSkill ? 'Listening...' : 'Speak'}</span>
              </button>
              <button type="submit" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <Plus size={14} />
                <span>Add Skill</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Curated Learning Pathways */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                  2. SKILL EVIDENCE &amp; CURATED STUDY SEARCHES
                </span>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {activeSkill}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSaveSkillAsGoal}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  title="Save this skill pathway as a tracked milestone in Goals & Milestones"
                >
                  <Plus size={13} color="var(--accent-crimson)" />
                  <span>Track as Goal</span>
                </button>
              </div>
            </div>

            {workspaceMode === 'portfolio' && (
              <div style={{
                padding: '12px 14px',
                marginBottom: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                borderLeft: `3px solid ${activeSkillMatch.matched ? '#16a34a' : 'var(--accent-crimson)'}`,
                borderTop: '1px solid var(--border-subtle)',
                borderRight: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                {activeSkillMatch.evidence}
              </div>
            )}

            {savedNotice && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent-crimson)',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {savedNotice}
              </div>
            )}

            <div style={{ position: 'relative', minHeight: '270px' }}>
              {loadingResources && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-surface)',
                  backdropFilter: 'blur(2px)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 2,
                  gap: '8px',
                  color: 'var(--text-muted)'
                }}>
                  <RefreshCw size={22} className="animate-spin" color="var(--accent-crimson)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Building study search links...</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                opacity: loadingResources ? 0.35 : 1,
                transition: 'opacity 0.2s ease',
                pointerEvents: loadingResources ? 'none' : 'auto'
              }}>
                {resources.map((res, rIdx) => {
                  const isSearchUrl = res.url.includes('results?search_query=') || res.url.includes('/courses/search/');
                  return (
                    <a
                      key={rIdx}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: res.provider === 'YouTube' ? 'rgba(230, 0, 18, 0.1)' : 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {res.provider === 'YouTube' ? (
                            <YoutubeIcon size={20} color="#E60012" />
                          ) : (
                            <BookOpen size={20} color="var(--text-primary)" />
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                            {res.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '4px',
                              background: res.provider === 'YouTube' ? 'rgba(230, 0, 18, 0.1)' : 'var(--bg-card)',
                              color: res.provider === 'YouTube' ? '#E60012' : 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)'
                            }}>
                              {res.provider}
                            </span>
                            <span>{res.author}</span>
                            <span>•</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                              {res.badge}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                        <span>{isSearchUrl ? `Search ${res.provider}` : `Open ${res.provider}`}</span>
                        <ExternalLink size={14} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              Each card launches a targeted {activeSkill} search paired with vetted engineering instructors so links never go stale for custom skills.
            </span>
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              Live Links <Check size={13} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
