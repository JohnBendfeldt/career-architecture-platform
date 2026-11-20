import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle, Zap, Plus, Mic, MicOff } from 'lucide-react';
import { ApiService } from '../services/api';
import type { CareerEntry, CareerEntryPrefill, Category, Goal, LearningResource } from '../types';
import { RecruiterScorecard, evaluatePortfolioSkillMatch } from './ai/RecruiterScorecard';
import { useSpeechRecognition } from './ai/useSpeechRecognition';
import { LearningResourceList } from './ai/LearningResourceList';
import { CareerEntryModal } from './goals/CareerEntryModal';
import { DEFAULT_CATEGORIES, enrichGoalsWithEntries } from '../utils/advancementUtils';
import {
  DEFAULT_SKILL_TARGET_HOURS,
  buildResourceEntryPrefill,
  findMatchingGoalForSkill,
} from '../utils/aiCurriculumBridge';

interface AiSkillExtractorTabProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
  goals?: Goal[];
  entries?: CareerEntry[];
  onGoalCreated?: () => Promise<void> | void;
  onEntryLogged?: () => Promise<void> | void;
  onNavigateToGoals?: () => void;
  onOpenLogin?: () => void;
  onSwitchToPersonal?: () => void;
  onHighlightOnResume?: (matchedSkills: string[]) => void;
  recruiterPresetSignal?: number;
  onNotify?: (message: string, tone?: 'success' | 'info' | 'error') => void;
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

export const AiSkillExtractorTab: React.FC<AiSkillExtractorTabProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My',
  goals,
  entries,
  onGoalCreated,
  onEntryLogged,
  onNavigateToGoals,
  onOpenLogin,
  onSwitchToPersonal,
  onHighlightOnResume,
  recruiterPresetSignal,
  onNotify
}) => {
  const currentUser = ApiService.getUser();
  const canEdit = Boolean(
    currentUser?.role === 'admin' &&
      (workspaceMode !== 'portfolio' || ApiService.isPortfolioOwner(currentUser))
  );

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
  const [goalTargetHours, setGoalTargetHours] = useState<number>(DEFAULT_SKILL_TARGET_HOURS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [internalGoals, setInternalGoals] = useState<Goal[]>(() =>
    workspaceMode === 'personal' ? ApiService.getPersonalGoals() : []
  );
  const [internalEntries, setInternalEntries] = useState<CareerEntry[]>(() =>
    workspaceMode === 'personal' ? ApiService.getPersonalEntries() : ApiService.getDefaultPortfolioEntries()
  );
  const [entryPrefill, setEntryPrefill] = useState<CareerEntryPrefill | null>(null);

  const {
    isListeningBio,
    isListeningSkill,
    voiceError,
    toggleVoiceBio,
    toggleVoiceSkill
  } = useSpeechRecognition({
    onBioTranscript: (text) => setInputText(text),
    onSkillTranscript: (cleaned) => {
      setCustomSkillInput(cleaned);
      setExtractedSkills((prev) => (prev.includes(cleaned) ? prev : [cleaned, ...prev]));
      setActiveSkill(cleaned);
    }
  });

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

  useEffect(() => {
    if (recruiterPresetSignal && recruiterPresetSignal > 0) {
      const presetSkills = [
        'C# & .NET 10',
        'React & TypeScript',
        'SQL Server & PostgreSQL',
        'CI/CD & Azure DevOps',
        'Docker & Automated Testing',
      ];
      setInputText(SAMPLE_DOTNET_REACT_JOB);
      setExtractedSkills(presetSkills);
      setActiveSkill(presetSkills[0]);
    }
  }, [recruiterPresetSignal]);

  // Load categories and fallback workspace goals/entries for standalone mounts
  useEffect(() => {
    let active = true;
    ApiService.getCategories().then((cats) => {
      if (active && cats.length > 0) {
        setCategories(cats);
      }
    });
    if (goals === undefined) {
      if (workspaceMode === 'personal') {
        Promise.resolve().then(() => {
          if (active) setInternalGoals(ApiService.getPersonalGoals());
        });
      } else {
        ApiService.getGoals().then((loaded) => {
          if (active) setInternalGoals(loaded);
        });
      }
    }
    if (entries === undefined) {
      if (workspaceMode === 'personal') {
        Promise.resolve().then(() => {
          if (active) setInternalEntries(ApiService.getPersonalEntries());
        });
      } else {
        ApiService.getCareerEntries().then((loaded) => {
          if (active) setInternalEntries(loaded);
        });
      }
    }
    return () => {
      active = false;
    };
  }, [workspaceMode, goals, entries]);

  const effectiveGoals = useMemo(
    () => enrichGoalsWithEntries(goals ?? internalGoals, entries ?? internalEntries),
    [goals, internalGoals, entries, internalEntries]
  );

  const linkedGoal = useMemo(
    () => findMatchingGoalForSkill(activeSkill, effectiveGoals),
    [activeSkill, effectiveGoals]
  );

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
    const cleanSkill = activeSkill.trim();
    const expectedTitle = `master ${cleanSkill.toLowerCase()}`;
    const duplicate = effectiveGoals.find(
      (g) => g.title.trim().toLowerCase() === expectedTitle
    );
    if (duplicate) {
      setSavedNotice(`"${duplicate.title}" is already tracked in Goals & Milestones.`);
      return;
    }

    const clampedHours = Math.max(
      1,
      Math.min(500, Math.round(Number(goalTargetHours) || DEFAULT_SKILL_TARGET_HOURS))
    );

    const res = await ApiService.createGoal({
      title: `Master ${cleanSkill}`,
      description: `Curated learning pathway for ${cleanSkill} via YouTube architecture deep-dives and Udemy enterprise courses.`,
      category: 'Technical',
      progress: 0,
      targetHours: clampedHours,
      targetDate: 'Q4 2026',
      status: 'InProgress',
      tags: [cleanSkill, 'AI Curriculum', 'Skill Pipeline']
    });

    if (!res.success) {
      setSavedNotice(res.message);
      return;
    }

    if (goals === undefined && res.goal) {
      const createdGoal = res.goal;
      setInternalGoals((prev) => [createdGoal, ...prev]);
    }
    await onGoalCreated?.();
    setSavedNotice(
      `Tracked "Master ${cleanSkill}" (${clampedHours}h target) — log study hours below to advance it automatically!`
    );
  };

  const handleLogResourceHours = (resource: LearningResource) => {
    setEntryPrefill(
      buildResourceEntryPrefill(activeSkill, resource, categories, effectiveGoals)
    );
  };

  const handleEntrySaved = async () => {
    if (entries === undefined) {
      if (workspaceMode === 'personal') {
        setInternalEntries(ApiService.getPersonalEntries());
      } else {
        setInternalEntries(await ApiService.getCareerEntries());
      }
    }
    if (goals === undefined) {
      if (workspaceMode === 'personal') {
        setInternalGoals(ApiService.getPersonalGoals());
      } else {
        setInternalGoals(await ApiService.getGoals());
      }
    }
    await onEntryLogged?.();
    if (!onEntryLogged && onGoalCreated) {
      await onGoalCreated();
    }
    setSavedNotice(
      `Logged study hours for ${activeSkill}! Progress rolled up to your Career Advancement & Tandem Goals.`
    );
  };

  const handleLoadPreset = (presetText: string, presetSkills: string[]) => {
    setInputText(presetText);
    setExtractedSkills(presetSkills);
    setActiveSkill(presetSkills[0]);
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {workspaceMode === 'personal'
              ? `${userName}'s AI Skill Extractor & Study Planner`
              : 'AI Skill Extraction & Automated Curriculum'}
          </h2>
          <p className="section-subtitle">
            Paste any job description or resume to evaluate stack overlap, inspect production proof, or launch curated study searches.
          </p>
        </div>
      </div>

      <div className="ai-extractor-grid">
        {/* Left Column: Text Input & Skill Chips */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <label htmlFor="ai-job-bio-input" className="form-label" style={{ marginBottom: 0 }}>
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
                style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              >
                Sample: .NET / React Job
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset(PERSONAL_SAMPLE_BIO, PERSONAL_SAMPLE_SKILLS)}
                className="btn-secondary"
                style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              >
                Sample: Cloud / AI Job
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset(PORTFOLIO_BIO, PORTFOLIO_SKILLS)}
                className="btn-secondary"
                style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              >
                John&apos;s Bio
              </button>
              <button
                type="button"
                onClick={toggleVoiceBio}
                aria-pressed={isListeningBio}
                className={isListeningBio ? 'btn-primary' : 'btn-secondary'}
                style={{
                  minHeight: '30px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  background: isListeningBio ? 'var(--accent-crimson-solid)' : undefined,
                  borderColor: isListeningBio ? 'var(--accent-crimson-solid)' : undefined,
                  color: isListeningBio ? '#ffffff' : undefined
                }}
                title="Speak a job description or bio using live browser speech recognition"
              >
                {isListeningBio ? (
                  <MicOff size={12} aria-hidden="true" />
                ) : (
                  <Mic size={12} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
                )}
                <span>{isListeningBio ? 'Listening... (Stop)' : 'Voice Input'}</span>
              </button>
            </div>
          </div>

          {voiceError && (
            <div
              role="alert"
              className="callout-danger"
              style={{
                padding: '8px 12px',
                marginBottom: '10px',
                fontSize: '0.78rem',
              }}
            >
              {voiceError}
            </div>
          )}
          <textarea
            id="ai-job-bio-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            className="form-textarea"
            style={{
              marginBottom: '16px',
              fontSize: '0.88rem',
              lineHeight: 1.5,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Identifies languages, frameworks, cloud tools &amp; architecture patterns
            </span>
            <button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting}
              className="btn-primary"
              id="btn-ai-extract"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              {isExtracting ? (
                <>
                  <RefreshCw size={15} aria-hidden="true" className="animate-spin" />
                  <span>Extracting Skills...</span>
                </>
              ) : (
                <>
                  <Zap size={15} aria-hidden="true" />
                  <span>Extract Skills via AI</span>
                </>
              )}
            </button>
          </div>

          {workspaceMode === 'portfolio' && (
            <RecruiterScorecard
              extractedSkills={extractedSkills}
              onHighlightOnResume={onHighlightOnResume}
              onNotify={onNotify}
            />
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
              <div className="section-eyebrow" style={{ marginBottom: 0 }}>
                Extracted Skill Tokens ({extractedSkills.length}) • Select a skill to inspect
              </div>
              {extractionMeta?.source === 'gemini' && (
                <span className="badge badge-emerald">
                  Live Gemini AI ({extractionMeta.model || 'gemini-3.5-flash-lite'})
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
                    aria-pressed={isActive}
                    onClick={() => setActiveSkill(skill)}
                    title={workspaceMode === 'portfolio' ? matchInfo.evidence : undefined}
                    style={{
                      padding: '7px 13px',
                      borderRadius: 'var(--radius-sm)',
                      border: isActive
                        ? '1.5px solid var(--accent-crimson)'
                        : '1px solid var(--border-control)',
                      background: isActive ? 'var(--bg-inset)' : 'var(--bg-surface)',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
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
                        <CheckCircle size={13} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
                      ) : workspaceMode === 'portfolio' && matchInfo.matched ? (
                        <CheckCircle size={13} aria-hidden="true" style={{ color: 'var(--status-success)' }} />
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
              <label htmlFor="ai-custom-skill-input" className="sr-only">
                Add custom skill
              </label>
              <input
                id="ai-custom-skill-input"
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                placeholder="Add or speak any skill (e.g. Kubernetes, Rust)..."
                className="form-input"
                style={{
                  flex: 1,
                  minWidth: '180px',
                  width: 'auto',
                  padding: '8px 12px',
                  fontSize: '0.84rem',
                }}
              />
              <button
                type="button"
                onClick={toggleVoiceSkill}
                aria-pressed={isListeningSkill}
                className={isListeningSkill ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  background: isListeningSkill ? 'var(--accent-crimson-solid)' : undefined,
                  borderColor: isListeningSkill ? 'var(--accent-crimson-solid)' : undefined,
                  color: isListeningSkill ? '#ffffff' : undefined
                }}
                title="Speak a skill name to add it hands-free"
              >
                {isListeningSkill ? (
                  <MicOff size={14} aria-hidden="true" />
                ) : (
                  <Mic size={14} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
                )}
                <span>{isListeningSkill ? 'Listening...' : 'Speak'}</span>
              </button>
              <button type="submit" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <Plus size={14} aria-hidden="true" />
                <span>Add Skill</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Curated Learning Pathways */}
        <LearningResourceList
          workspaceMode={workspaceMode}
          activeSkill={activeSkill}
          resources={resources}
          loadingResources={loadingResources}
          savedNotice={savedNotice}
          onSaveSkillAsGoal={handleSaveSkillAsGoal}
          targetHours={goalTargetHours}
          onTargetHoursChange={setGoalTargetHours}
          linkedGoal={linkedGoal}
          onLogResourceHours={handleLogResourceHours}
          onNavigateToGoals={onNavigateToGoals}
          canEdit={canEdit}
          onOpenLogin={onOpenLogin}
          onSwitchToPersonal={onSwitchToPersonal}
        />
      </div>

      <CareerEntryModal
        isOpen={entryPrefill !== null}
        mode="add"
        prefill={entryPrefill}
        categories={categories}
        goals={effectiveGoals}
        canEdit={canEdit}
        onOpenLogin={
          onOpenLogin
            ? () => {
                setEntryPrefill(null);
                onOpenLogin();
              }
            : undefined
        }
        onSwitchToPersonal={
          onSwitchToPersonal
            ? () => {
                setEntryPrefill(null);
                onSwitchToPersonal();
              }
            : undefined
        }
        onClose={() => setEntryPrefill(null)}
        onSaved={handleEntrySaved}
      />
    </div>
  );
};
