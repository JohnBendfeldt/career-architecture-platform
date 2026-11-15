import React, { useEffect, useState } from 'react';
import { Calendar, Check, Download, Edit2, Plus, Target, Upload, X } from 'lucide-react';
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
  onImportClick?: () => void;
  onExportClick?: () => void;
}

export const AnnualProgressBanner: React.FC<AnnualProgressBannerProps> = ({
  progress,
  selectedYear,
  availableYears,
  onYearChange,
  canEdit,
  onUpdateGoalHours,
  onLogHoursClick,
  onImportClick,
  onExportClick,
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
  const clampedPercent = Math.min(100, Math.max(0, Math.round(progress.percentComplete)));
  const fillWidth = `${Math.min(100, Math.max(0, progress.percentComplete))}%`;
  const fillColor = progress.isOnTrack ? 'var(--status-success)' : 'var(--accent-crimson)';

  return (
    <div
      className="glass-panel"
      style={{
        padding: '22px 24px',
        marginBottom: '26px',
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
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Annual Career Advancement
            </h2>
            <span className={`badge ${progress.isOnTrack ? 'badge-emerald' : 'badge-amber'}`}>
              {progress.isOnTrack ? 'ON TRACK' : 'BEHIND PACE'}
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            {progress.quarterLabel} • Checkpoint target: <strong>{progress.expectedProgressPercent}%</strong> •{' '}
            <strong>{progress.totalEntries}</strong> logged {progress.totalEntries === 1 ? 'entry' : 'entries'} in {selectedYear}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
            <select
              aria-label="Select Advancement Year"
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="form-select"
              style={{
                width: 'auto',
                padding: '7px 12px',
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

          {onImportClick && (
            <button
              id="btn-import-career-entries"
              type="button"
              onClick={onImportClick}
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.82rem' }}
              title={
                canEdit
                  ? 'Bulk import from .csv or .xlsx'
                  : 'Preview bulk CSV/XLSX import (sign in to save to your workspace)'
              }
            >
              <Upload size={14} aria-hidden="true" />
              <span>Import</span>
            </button>
          )}

          {onExportClick && (
            <button
              id="btn-export-career-entries"
              type="button"
              onClick={onExportClick}
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.82rem' }}
              title="Export career development report (.xlsx)"
            >
              <Download size={14} aria-hidden="true" />
              <span>Export .xlsx</span>
            </button>
          )}

          <button
            id="btn-log-career-hours"
            type="button"
            onClick={onLogHoursClick}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title={
              canEdit
                ? 'Log career development hours'
                : 'Preview logging career hours (sign in to save to your workspace)'
            }
          >
            <Plus size={15} aria-hidden="true" />
            <span>Log Career Hours</span>
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
              fontSize: '0.92rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
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
              style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.78rem', gap: '5px' }}
              title="Customize Annual Hour Target"
            >
              <Target size={13} aria-hidden="true" />
              <span>Edit Target</span>
              <Edit2 size={11} aria-hidden="true" />
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
                className="form-input"
                style={{
                  width: '82px',
                  padding: '5px 8px',
                  fontSize: '0.82rem',
                }}
              />
              <button
                type="submit"
                disabled={savingGoal}
                aria-label="Save Annual Target"
                style={{
                  minHeight: '30px',
                  padding: '5px 9px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--status-success-border)',
                  background: 'var(--status-success-bg)',
                  color: 'var(--status-success)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalHoursInput(String(progress.annualGoalHours));
                  setIsEditingGoal(false);
                }}
                aria-label="Cancel Editing Target"
                className="btn-secondary"
                style={{
                  minHeight: '30px',
                  padding: '5px 9px',
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={clampedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Annual career advancement progress"
        style={{ height: '8px' }}
      >
        <div
          className="progress-fill"
          style={{
            width: fillWidth,
            background: fillColor,
          }}
        />
      </div>
    </div>
  );
};
