import React, { useEffect, useMemo, useState } from 'react';
import type { CareerEntry, Category, Goal } from '../types';
import { ApiService } from '../services/api';
import { Calendar, Plus, ShieldAlert, Code, Heart, X, Trash2, TrendingUp, Clock, List, LayoutGrid } from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  computeAnnualProgress,
  formatEntryHours,
} from '../utils/advancementUtils';
import { AnnualProgressBanner } from './goals/AnnualProgressBanner';
import { CareerEntryModal } from './goals/CareerEntryModal';
import { CareerEntriesList } from './goals/CareerEntriesList';

interface GoalsSectionProps {
  goals: Goal[];
  onRefresh: () => void;
  entries?: CareerEntry[];
  workspaceMode?: 'portfolio' | 'personal';
  annualGoalHours?: number;
  onAnnualGoalHoursChange?: (hours: number) => Promise<void> | void;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  goals,
  onRefresh,
  entries,
  workspaceMode,
  annualGoalHours,
  onAnnualGoalHoursChange,
}) => {
  const currentUser = ApiService.getUser();
  const isAuthenticated = currentUser?.role === 'admin';
  const canEdit = Boolean(
    isAuthenticated && (workspaceMode === 'personal' || ApiService.isPortfolioOwner(currentUser))
  );

  const [filter, setFilter] = useState<'All' | 'Technical' | 'Personal'>('All');
  const [viewMode, setViewMode] = useState<'board' | 'log'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  return (
    <div style={{ marginBottom: '36px' }}>
      <AnnualProgressBanner
        progress={annualProgress}
        selectedYear={selectedYear}
        availableYears={availableYears}
        onYearChange={setSelectedYear}
        canEdit={canEdit}
        onUpdateGoalHours={handleAnnualGoalHoursUpdate}
        onLogHoursClick={() => openLogHoursModal(null)}
      />

      {/* Section Header & Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              Architecture & Life Goals
            </h2>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              Pre-Seeded Active State
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Technical initiatives and career advancement hours working in tandem
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Board / Activity Log View Switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-card)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              style={{
                background: viewMode === 'board' ? 'var(--accent-cyan)' : 'transparent',
                color: viewMode === 'board' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s'
              }}
            >
              <LayoutGrid size={13} />
              Goals Board ({goals.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('log')}
              style={{
                background: viewMode === 'log' ? 'var(--accent-cyan)' : 'transparent',
                color: viewMode === 'log' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s'
              }}
            >
              <List size={13} />
              Activity Log ({selectedYearEntriesCount})
            </button>
          </div>

          {viewMode === 'board' && (
            /* Category Filter Chips */
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              background: 'var(--bg-card)',
              padding: '4px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                onClick={() => setFilter('All')}
                style={{
                  background: filter === 'All' ? 'var(--text-primary)' : 'transparent',
                  color: filter === 'All' ? 'var(--bg-card)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                All ({goals.length})
              </button>
              <button
                onClick={() => setFilter('Technical')}
                style={{
                  background: filter === 'Technical' ? 'var(--text-primary)' : 'transparent',
                  color: filter === 'Technical' ? 'var(--bg-card)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <Code size={13} />
                <span>Technical ({goals.filter(g => g.category === 'Technical').length})</span>
              </button>
              <button
                onClick={() => setFilter('Personal')}
                style={{
                  background: filter === 'Personal' ? 'var(--text-primary)' : 'transparent',
                  color: filter === 'Personal' ? 'var(--bg-card)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <Heart size={13} />
                <span>Personal ({goals.filter(g => g.category === 'Personal').length})</span>
              </button>
            </div>
          )}

          {/* Add Goal Action Button */}
          <button
            onClick={() => {
              setReadOnlyNotice(null);
              setIsModalOpen(true);
            }}
            className="btn-primary"
            id="btn-add-goal"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {activityNotice && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(230, 0, 18, 0.08)',
            border: '1px solid rgba(230, 0, 18, 0.3)',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={18} color="var(--accent-crimson)" style={{ flexShrink: 0 }} />
            <span>
              <strong style={{ color: 'var(--accent-crimson)' }}>ASP.NET Core 403 Forbidden: </strong>
              {activityNotice}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActivityNotice(null)}
            aria-label="Dismiss Notice"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
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
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span
                      className={goal.category === 'Technical' ? 'badge badge-cyan' : 'badge badge-amber'}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {goal.category}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Calendar size={13} />
                      <span>{goal.targetDate}</span>
                      <button
                        type="button"
                        onClick={() => openLogHoursModal(goal.id)}
                        title={`Log hours toward ${goal.title}`}
                        style={{
                          background: 'rgba(6, 182, 212, 0.1)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: 'var(--accent-cyan)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 7px',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Clock size={11} />
                        <span>+ Log Hours</span>
                      </button>
                      {isAuthenticated && goal.id > 100 && !hasTargetHours && (
                        <button
                          type="button"
                          onClick={() => handleIncrementProgress(goal)}
                          title="Advance goal progress (+25%)"
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '2px 6px',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <TrendingUp size={11} color="var(--accent-crimson)" />
                          <span>+25%</span>
                        </button>
                      )}
                      {isAuthenticated && goal.id > 100 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomGoal(goal.id)}
                          title="Remove custom goal"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                    {goal.title}
                  </h3>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    {goal.description}
                  </p>
                </div>

                <div>
                  {/* Progress Bar & Percentage */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {hasTargetHours
                          ? `${formatEntryHours(goal.loggedHours ?? 0)} / ${formatEntryHours(goal.targetHours ?? 0)} hrs • ${goal.entryCount ?? 0} ${(goal.entryCount ?? 0) === 1 ? 'entry' : 'entries'}`
                          : hasLoggedHours
                            ? `${formatEntryHours(goal.loggedHours ?? 0)} hrs logged • ${goal.entryCount ?? 0} ${(goal.entryCount ?? 0) === 1 ? 'entry' : 'entries'}`
                            : 'Progress'}
                      </span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{goal.progress}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${goal.progress}%`,
                          background: goal.category === 'Technical' ? 'var(--cyan-gradient)' : 'var(--emerald-gradient)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Tag Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {goal.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                          borderRadius: 'var(--radius-sm)',
                          fontFamily: 'var(--font-mono)'
                        }}
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
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-card)',
            padding: '30px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={22} color="var(--accent-crimson)" />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Add New Architecture Goal</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Read-Only Notice (Triggered on 403 Forbidden) */}
            {readOnlyNotice && (
              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(230, 0, 18, 0.08)',
                border: '1px solid rgba(230, 0, 18, 0.3)',
                marginBottom: '18px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <ShieldAlert size={20} color="var(--accent-crimson)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-crimson)' }}>
                    ASP.NET Core 403 Forbidden Policy
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                    {readOnlyNotice}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAttempt}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus in .NET 10"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as 'Technical' | 'Personal')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Technical">Technical Architecture</option>
                    <option value="Personal">Personal Milestone</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Target Date / Quarter
                  </label>
                  <input
                    type="text"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    placeholder="e.g. Q4 2026"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label
                    htmlFor="goal-target-hours-input"
                    style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
                  >
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
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {Number(newTargetHours) > 0
                      ? 'Initial Progress (0% — rolls up from logged hours)'
                      : `Initial Progress (${newProgress}%)`}
                  </label>
                  <input
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
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. .NET 10, Cloud"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe architectural scope or training schedule..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
                    : isAuthenticated
                      ? 'Save Goal to Workspace'
                      : 'Submit to API (Test Write Lock)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CareerEntryModal
        isOpen={entryModalState.isOpen}
        mode={entryModalState.mode}
        initialEntry={entryModalState.initialEntry}
        preselectedGoalId={entryModalState.preselectedGoalId}
        categories={categories}
        goals={goals}
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
    </div>
  );
};
