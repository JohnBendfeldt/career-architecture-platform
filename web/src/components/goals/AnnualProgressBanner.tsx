import React, { useEffect, useState } from 'react';
import { Calendar, Check, Edit2, Plus, Target, TrendingUp, X } from 'lucide-react';
import type { AnnualProgress } from '../../types';
import { formatEntryHours } from '../../utils/advancementUtils';

interface AnnualProgressBannerProps {
  progress: AnnualProgress;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  canEdit: boolean;
  onUpdateGoalHours: (newGoalHours: number) => Promise<void> | void;
  onLogHoursClick: () => void;
}

export const AnnualProgressBanner: React.FC<AnnualProgressBannerProps> = ({
  progress,
  selectedYear,
  availableYears,
  onYearChange,
  canEdit,
  onUpdateGoalHours,
  onLogHoursClick,
}) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState(String(progress.annualGoalHours));
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    setGoalHoursInput(String(progress.annualGoalHours));
  }, [progress.annualGoalHours]);

  const handleSaveGoalHours = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalHoursInput);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 2000) return;
    setSavingGoal(true);
    try {
      await onUpdateGoalHours(parsed);
      setIsEditingGoal(false);
    } finally {
      setSavingGoal(false);
    }
  };

  const remainingHours = Math.max(
    0,
    Math.round((progress.annualGoalHours - progress.completedHours) * 100) / 100
  );
  const fillWidth = `${Math.min(100, Math.max(0, progress.percentComplete))}%`;
  const fillGradient = progress.isOnTrack
    ? 'linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))'
    : 'linear-gradient(90deg, #f59e0b, var(--accent-cyan))';

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px 24px',
        marginBottom: '24px',
        border: '1px solid rgba(6, 182, 212, 0.28)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Annual Career Advancement
            </h3>
            <span className={`badge ${progress.isOnTrack ? 'badge-emerald' : 'badge-amber'}`}>
              {progress.isOnTrack ? 'ON TRACK' : 'BEHIND PACE'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {progress.quarterLabel} • Checkpoint target: <strong>{progress.expectedProgressPercent}%</strong> •{' '}
            <strong>{progress.totalEntries}</strong> logged {progress.totalEntries === 1 ? 'entry' : 'entries'} in {selectedYear}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              aria-label="Select Advancement Year"
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-log-career-hours"
            type="button"
            onClick={onLogHoursClick}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            Log Career Hours
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {formatEntryHours(progress.completedHours)}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            / {formatEntryHours(progress.annualGoalHours)} hrs annual goal
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              marginLeft: '4px',
            }}
          >
            ({progress.percentComplete}%)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <span>
            {remainingHours > 0
              ? `${formatEntryHours(remainingHours)} hrs remaining`
              : 'Annual target reached!'}
          </span>

          {canEdit && !isEditingGoal && (
            <button
              type="button"
              onClick={() => setIsEditingGoal(true)}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '5px' }}
              title="Customize Annual Hour Target"
            >
              <Target size={13} />
              Edit Target
              <Edit2 size={11} />
            </button>
          )}

          {canEdit && isEditingGoal && (
            <form
              onSubmit={handleSaveGoalHours}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <input
                aria-label="Annual Goal Hours"
                type="number"
                min={1}
                max={2000}
                step={0.5}
                value={goalHoursInput}
                onChange={(e) => setGoalHoursInput(e.target.value)}
                style={{
                  width: '78px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent-cyan)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                }}
              />
              <button
                type="submit"
                disabled={savingGoal}
                aria-label="Save Annual Target"
                style={{
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#6ee7b7',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalHoursInput(String(progress.annualGoalHours));
                  setIsEditingGoal(false);
                }}
                aria-label="Cancel Editing Target"
                style={{
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="progress-track" style={{ height: '10px' }}>
        <div
          className="progress-fill"
          style={{
            width: fillWidth,
            background: fillGradient,
          }}
        />
      </div>
    </div>
  );
};
