import React, { useEffect, useMemo, useState } from 'react';
import type { CareerEntry, Category, Goal } from '../types';
import { ApiService } from '../services/api';
import { Calendar, Plus, ShieldAlert, X, Trash2, TrendingUp, Clock, List, LayoutGrid, LogIn, UserCheck } from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  computeAnnualProgress,
  formatEntryHours,
} from '../utils/advancementUtils';
import { AnnualProgressBanner } from './goals/AnnualProgressBanner';
import { CareerEntryModal } from './goals/CareerEntryModal';
import { CareerEntriesList } from './goals/CareerEntriesList';
import { ImportCareerEntriesModal } from './goals/ImportCareerEntriesModal';
import { ReadOnlyPortfolioBanner } from './goals/ReadOnlyPortfolioBanner';
import { ModalDialog } from './ui/ModalDialog';

interface GoalsSectionProps {
  goals: Goal[];
  onRefresh: () => void;
  entries?: CareerEntry[];
  workspaceMode?: 'portfolio' | 'personal';
  profileName?: string;
  annualGoalHours?: number;
  onAnnualGoalHoursChange?: (hours: number) => Promise<void> | void;
  onOpenLogin?: () => void;
  onSwitchToPersonal?: () => void;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  onRefresh,
  entries,
  workspaceMode,
  profileName,
  annualGoalHours,
  onAnnualGoalHoursChange,
  onOpenLogin,
  onSwitchToPersonal,
}) => {
  const currentUser = ApiService.getUser();
  const isAuthenticated = currentUser?.role === 'admin';
  const canEdit = Boolean(
    isAuthenticated && (workspaceMode !== 'portfolio' || ApiService.isPortfolioOwner(currentUser))
  );

  const [filter, setFilter] = useState<'All' | 'Technical' | 'Personal'>('All');
  const [viewMode, setViewMode] = useState<'board' | 'log'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [readOnlyNotice, setReadOnlyNotice] = useState<string | null>(null);
  const [activityNotice, setActivityNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [internalEntries, setInternalEntries] = useState<CareerEntry[]>(() =>
    workspaceMode === 'personal' ? ApiService.getPersonalEntries() : ApiService.getDefaultPortfolioEntries()
  );
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [entryModalState, setEntryModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'duplicate';
    initialEntry: CareerEntry | null;
    preselectedGoalId: number | null;
  }>({
    isOpen: false,
    mode: 'add',
    initialEntry: null,
    preselectedGoalId: null,
  });

  // Modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Technical' | 'Personal'>('Technical');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('Q4 2026');
  const [newTargetHours, setNewTargetHours] = useState('');
  const [newProgress, setNewProgress] = useState(25);
  const [newTags, setNewTags] = useState('Architecture, Milestone');

  useEffect(() => {
    let active = true;
    ApiService.getCategories().then((cats) => {
      if (active && cats.length > 0) {
        setCategories(cats);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (entries !== undefined) return;
    if (workspaceMode === 'personal') {
      setInternalEntries(ApiService.getPersonalEntries());
      return;
    }
    let active = true;
    ApiService.getCareerEntries().then((loaded) => {
      if (active) {
        setInternalEntries(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, [entries, workspaceMode, goals]);

  const activeEntries = entries ?? internalEntries;

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), 2026, 2025]);
    for (const entry of activeEntries) {
      const yr = Number(entry.startDate?.slice(0, 4));
      if (Number.isInteger(yr) && yr > 2000) {
        years.add(yr);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [activeEntries]);

  const effectiveAnnualGoalHours = annualGoalHours ?? (workspaceMode === 'personal' ? 45 : 55);
  const annualProgress = useMemo(
    () => computeAnnualProgress(activeEntries, effectiveAnnualGoalHours, selectedYear),
    [activeEntries, effectiveAnnualGoalHours, selectedYear]
  );

  const selectedYearEntriesCount = useMemo(
    () => activeEntries.filter((e) => e.startDate?.slice(0, 4) === String(selectedYear)).length,
    [activeEntries, selectedYear]
  );

  const filteredGoals = goals.filter((g) => {
    if (filter === 'All') return true;
    return g.category === filter;
  });

  const refreshWorkspace = async () => {
    if (entries === undefined) {
      if (workspaceMode === 'personal') {
        setInternalEntries(ApiService.getPersonalEntries());
      } else {
        setInternalEntries(await ApiService.getCareerEntries());
      }
    }
    onRefresh();
  };

  const handleCreateAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setReadOnlyNotice(null);

    const parsedTags = newTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const parsedTargetHours = Number(newTargetHours);
    const hasTargetHours = Number.isFinite(parsedTargetHours) && parsedTargetHours > 0;
    const effectiveInitialProgress = hasTargetHours ? 0 : (Number(newProgress) || 25);

    const result = await ApiService.createGoal({
      title: newTitle || 'New Candidate Goal',
      description: newDescription || 'Custom milestone tracked in Career Architecture Platform.',
      category: newCategory,
      progress: effectiveInitialProgress,
      targetHours: hasTargetHours ? parsedTargetHours : null,
      targetDate: newTargetDate || '2026',
      status: effectiveInitialProgress >= 100 ? 'Completed' : 'InProgress',
      tags: parsedTags.length > 0 ? parsedTags : ['Custom', newCategory],
    });

    setIsSubmitting(false);

    if (result.status === 403 || !result.success) {
      setReadOnlyNotice(
        result.message || 'Guest accounts have read-only demo access. Writes are protected by ASP.NET Core authorization policies.'
      );
    } else {
      setNewTitle('');
      setNewDescription('');
      setNewTargetHours('');
      setIsModalOpen(false);
      await refreshWorkspace();
    }
  };

  const handleIncrementProgress = (goal: Goal) => {
    const next = goal.progress >= 100 ? 25 : Math.min(100, goal.progress + 25);
    ApiService.updateGoalProgress(goal.id, next);
    onRefresh();
  };

  const handleDeleteCustomGoal = (goalId: number) => {
    ApiService.deleteCustomGoal(goalId);
    onRefresh();
  };

  const handleAnnualGoalHoursUpdate = async (newGoalHours: number) => {
    setActivityNotice(null);
    if (onAnnualGoalHoursChange) {
      await onAnnualGoalHoursChange(newGoalHours);
      return;
    }
    const res = await ApiService.updateAnnualGoalHours(newGoalHours);
    if (!res.success) {
      setActivityNotice(res.message);
      return;
    }
    await refreshWorkspace();
  };

  const handleDeleteEntry = async (entryId: number) => {
    setActivityNotice(null);
    const res = await ApiService.deleteCareerEntry(entryId);
    if (!res.success) {
      setActivityNotice(res.message);
      return;
    }
    await refreshWorkspace();
  };

  const openLogHoursModal = (preselectedGoalId: number | null = null) => {
    setActivityNotice(null);
    setEntryModalState({
      isOpen: true,
      mode: 'add',
      initialEntry: null,
      preselectedGoalId,
    });
  };

  const handleExportEntries = async (format: 'xlsx' | 'csv' = 'xlsx', allYears = false) => {
    await ApiService.exportCareerEntries({
      year: allYears ? null : selectedYear,
      format,
      entries: activeEntries,
      profileName,
      annualGoalHours: effectiveAnnualGoalHours,
      workspaceMode,
    });
  };

  const handleTriggerLogin = onOpenLogin
    ? () => {
        setIsModalOpen(false);
        setIsImportModalOpen(false);
        setEntryModalState((prev) => ({ ...prev, isOpen: false }));
        onOpenLogin();
      }
    : undefined;

  const handleTriggerSwitchPersonal = onSwitchToPersonal
    ? () => {
        setIsModalOpen(false);
        setIsImportModalOpen(false);
        setEntryModalState((prev) => ({ ...prev, isOpen: false }));
        onSwitchToPersonal();
      }
    : undefined;

  return (
    <div style={{ marginBottom: '36px' }}>
      {!canEdit && (
        <div style={{ marginBottom: '16px' }}>
          <ReadOnlyPortfolioBanner
            profileName={profileName}
            context="section"
            onOpenLogin={onOpenLogin}
            onSwitchToPersonal={onSwitchToPersonal}
          />
        </div>
      )}

      <AnnualProgressBanner
        progress={annualProgress}
        selectedYear={selectedYear}
        availableYears={availableYears}
        onYearChange={setSelectedYear}
        canEdit={canEdit}
        onUpdateGoalHours={handleAnnualGoalHoursUpdate}
        onLogHoursClick={() => openLogHoursModal(null)}
        onImportClick={() => setIsImportModalOpen(true)}
        onExportClick={() => void handleExportEntries('xlsx', false)}
      />

      {/* Section Header & Filters */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Architecture &amp; Life Goals</h2>
          <p className="section-subtitle">
            Technical initiatives and career advancement hours working in tandem
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Board / Activity Log View Switcher */}
          <div className="segmented-control" role="group" aria-label="Goals view mode">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              aria-pressed={viewMode === 'board'}
              className="segmented-btn"
            >
              <LayoutGrid size={13} aria-hidden="true" />
              <span>Goals Board ({goals.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('log')}
              aria-pressed={viewMode === 'log'}
              className="segmented-btn"
            >
              <List size={13} aria-hidden="true" />
              <span>Activity Log ({selectedYearEntriesCount})</span>
            </button>
          </div>

          {viewMode === 'board' && (
            /* Category Filter Chips */
            <div className="segmented-control" role="group" aria-label="Goal category filter">
              <button
                type="button"
                onClick={() => setFilter('All')}
                aria-pressed={filter === 'All'}
                className="segmented-btn"
              >
                All ({goals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('Technical')}
                aria-pressed={filter === 'Technical'}
                className="segmented-btn"
              >
                Technical ({goals.filter((g) => g.category === 'Technical').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('Personal')}
                aria-pressed={filter === 'Personal'}
                className="segmented-btn"
              >
                Personal ({goals.filter((g) => g.category === 'Personal').length})
              </button>
            </div>
          )}

          {/* Add Goal Action Button */}
          <button
            type="button"
            onClick={() => {
              setReadOnlyNotice(null);
              setIsModalOpen(true);
            }}
            className="btn-primary"
            id="btn-add-goal"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Plus size={15} aria-hidden="true" />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {activityNotice && (
        <div
          role="alert"
          className="callout-danger"
          style={{
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--status-danger)' }} />
            <span>
              <strong style={{ color: 'var(--status-danger)' }}>ASP.NET Core 403 Forbidden: </strong>
              {activityNotice}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActivityNotice(null)}
            aria-label="Dismiss Notice"
            className="icon-btn"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {viewMode === 'log' ? (
        <CareerEntriesList
          entries={activeEntries}
          categories={categories}
          goals={goals}
          selectedYear={selectedYear}
          canEdit={canEdit}
          onEdit={(entry) =>
            setEntryModalState({
              isOpen: true,
              mode: 'edit',
              initialEntry: entry,
              preselectedGoalId: entry.goalId ?? null,
            })
          }
          onDuplicate={(entry) =>
            setEntryModalState({
              isOpen: true,
              mode: 'duplicate',
              initialEntry: entry,
              preselectedGoalId: entry.goalId ?? null,
            })
          }
          onDelete={handleDeleteEntry}
          onLogHoursClick={() => openLogHoursModal(null)}
          onImportClick={() => setIsImportModalOpen(true)}
          onExportClick={(format, allYears) => void handleExportEntries(format, allYears)}
        />
      ) : (
        /* Goal Cards Grid */
        <div className="responsive-card-grid">
          {filteredGoals.map((goal) => {
            const hasTargetHours = typeof goal.targetHours === 'number' && goal.targetHours > 0;
            const hasLoggedHours = (goal.loggedHours ?? 0) > 0 || (goal.entryCount ?? 0) > 0;

            return (
              <div
                key={goal.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span
                      className={goal.category === 'Technical' ? 'badge badge-cyan' : 'badge badge-amber'}
                    >
                      {goal.category}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} aria-hidden="true" />
                        <span>{goal.targetDate}</span>
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openLogHoursModal(goal.id)}
                          title={`Log hours toward ${goal.title}`}
                          className="btn-secondary"
                          style={{
                            minHeight: '28px',
                            padding: '3px 9px',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} aria-hidden="true" />
                          <span>+ Log Hours</span>
                        </button>
                      )}
                      {canEdit && goal.id > 6 && !hasTargetHours && (
                        <button
                          type="button"
                          onClick={() => handleIncrementProgress(goal)}
                          title="Advance goal progress (+25%)"
                          aria-label={`Advance ${goal.title} progress by 25 percent`}
                          className="btn-secondary"
                          style={{
                            minHeight: '28px',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            gap: '3px',
                          }}
                        >
                          <TrendingUp size={12} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
                          <span>+25%</span>
                        </button>
                      )}
                      {canEdit && goal.id > 6 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomGoal(goal.id)}
                          title="Remove custom goal"
                          aria-label={`Remove ${goal.title}`}
                          className="icon-btn"
                          style={{ minWidth: '28px', minHeight: '28px', padding: '4px' }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.12rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                    {goal.title}
                  </h3>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>
                    {goal.description}
                  </p>
                </div>

                <div>
                  {/* Progress Bar & Percentage */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {hasTargetHours
                          ? `${formatEntryHours(goal.loggedHours ?? 0)} / ${formatEntryHours(goal.targetHours ?? 0)} hrs • ${goal.entryCount ?? 0} ${(goal.entryCount ?? 0) === 1 ? 'entry' : 'entries'}`
                          : hasLoggedHours
                            ? `${formatEntryHours(goal.loggedHours ?? 0)} hrs logged • ${goal.entryCount ?? 0} ${(goal.entryCount ?? 0) === 1 ? 'entry' : 'entries'}`
                            : 'Progress'}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {goal.progress}%
                      </span>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuenow={goal.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.title} progress`}
                    >
                      <div
                        className="progress-fill"
                        style={{
                          width: `${goal.progress}%`,
                          background: goal.category === 'Technical' ? 'var(--text-primary)' : 'var(--accent-crimson)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Tag Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {goal.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="tag-chip"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal / Guest Write Protection Demo */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        disableClose={isSubmitting}
        labelledBy="add-goal-modal-title"
        maxWidth="520px"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <h2 id="add-goal-modal-title" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
            Add New Architecture Goal
          </h2>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            aria-label="Close add goal modal"
            className="icon-btn"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {!canEdit && (
          <div style={{ marginBottom: '16px' }}>
            <ReadOnlyPortfolioBanner
              profileName={profileName}
              context="modal"
              onOpenLogin={handleTriggerLogin}
              onSwitchToPersonal={handleTriggerSwitchPersonal}
            />
          </div>
        )}

        {/* Read-Only Notice (Triggered on 403 Forbidden) */}
        {readOnlyNotice && (
          <div
            role="alert"
            className="callout-danger"
            style={{
              marginBottom: '18px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldAlert size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--status-danger)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-danger)' }}>
                ASP.NET Core 403 Forbidden Policy
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '2px' }}>
                {readOnlyNotice}
              </div>
              {(handleTriggerSwitchPersonal || handleTriggerLogin) && (
                <div style={{ marginTop: '8px' }}>
                  {handleTriggerSwitchPersonal ? (
                    <button
                      type="button"
                      onClick={handleTriggerSwitchPersonal}
                      className="btn-secondary"
                      style={{ minHeight: '32px', padding: '5px 10px', fontSize: '0.78rem' }}
                    >
                      <UserCheck size={13} aria-hidden="true" />
                      <span>Switch to My Profile</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerLogin}
                      className="btn-secondary"
                      style={{ minHeight: '32px', padding: '5px 10px', fontSize: '0.78rem' }}
                    >
                      <LogIn size={13} aria-hidden="true" />
                      <span>Sign In / Build Your Own</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleCreateAttempt}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="goal-title-input" className="form-label">
              Goal Title
            </label>
            <input
              id="goal-title-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus in .NET 10"
              className="form-input"
              required
            />
          </div>

          <div className="modal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="goal-category-select" className="form-label">
                Category
              </label>
              <select
                id="goal-category-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as 'Technical' | 'Personal')}
                className="form-select"
              >
                <option value="Technical">Technical Architecture</option>
                <option value="Personal">Personal Milestone</option>
              </select>
            </div>

            <div>
              <label htmlFor="goal-target-date-input" className="form-label">
                Target Date / Quarter
              </label>
              <input
                id="goal-target-date-input"
                type="text"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                placeholder="e.g. Q4 2026"
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="goal-target-hours-input" className="form-label">
                Target Hours (Optional Auto-Rollup)
              </label>
              <input
                id="goal-target-hours-input"
                type="number"
                min={0}
                max={2000}
                step={0.5}
                value={newTargetHours}
                onChange={(e) => setNewTargetHours(e.target.value)}
                placeholder="e.g. 20 (leave blank for manual %)"
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="goal-progress-range" className="form-label">
                {Number(newTargetHours) > 0
                  ? 'Initial Progress (0% — rolls up from logged hours)'
                  : `Initial Progress (${newProgress}%)`}
              </label>
              <input
                id="goal-progress-range"
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={Number(newTargetHours) > 0}
                value={Number(newTargetHours) > 0 ? 0 : newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
                style={{ width: '100%', marginTop: '10px', accentColor: 'var(--accent-crimson)' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="goal-tags-input" className="form-label">
              Tags (comma-separated)
            </label>
            <input
              id="goal-tags-input"
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="e.g. .NET 10, Cloud"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="goal-description-input" className="form-label">
              Description
            </label>
            <textarea
              id="goal-description-input"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe architectural scope or training schedule..."
              rows={3}
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              id="btn-submit-goal"
            >
              {isSubmitting
                ? 'Saving...'
                : canEdit
                  ? 'Save Goal to Workspace'
                  : 'Submit to API (Test Write Lock)'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <CareerEntryModal
        isOpen={entryModalState.isOpen}
        mode={entryModalState.mode}
        initialEntry={entryModalState.initialEntry}
        preselectedGoalId={entryModalState.preselectedGoalId}
        categories={categories}
        goals={goals}
        canEdit={canEdit}
        profileName={profileName}
        onOpenLogin={handleTriggerLogin}
        onSwitchToPersonal={handleTriggerSwitchPersonal}
        onClose={() =>
          setEntryModalState((prev) => ({
            ...prev,
            isOpen: false,
            initialEntry: null,
            preselectedGoalId: null,
          }))
        }
        onSaved={refreshWorkspace}
      />

      {isImportModalOpen && (
        <ImportCareerEntriesModal
          isOpen={isImportModalOpen}
          categories={categories}
          goals={goals}
          canEdit={canEdit}
          profileName={profileName}
          onOpenLogin={handleTriggerLogin}
          onSwitchToPersonal={handleTriggerSwitchPersonal}
          onClose={() => setIsImportModalOpen(false)}
          onImported={refreshWorkspace}
        />
      )}
    </div>
  );
};
