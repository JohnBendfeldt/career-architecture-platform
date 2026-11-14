import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Copy, Download, Edit2, Filter, Link2, Plus, Trash2, Upload } from 'lucide-react';
import type { CareerEntry, Category, Goal } from '../../types';
import { formatEntryHours } from '../../utils/advancementUtils';

interface CareerEntriesListProps {
  entries: CareerEntry[];
  categories: Category[];
  goals: Goal[];
  selectedYear: number;
  canEdit: boolean;
  onEdit: (entry: CareerEntry) => void;
  onDuplicate: (entry: CareerEntry) => void;
  onDelete: (entryId: number) => Promise<void> | void;
  onLogHoursClick: () => void;
  onImportClick?: () => void;
  onExportClick?: (format: 'xlsx' | 'csv', allYears?: boolean) => void;
}

export const CareerEntriesList: React.FC<CareerEntriesListProps> = ({
  entries,
  categories,
  goals,
  selectedYear,
  canEdit,
  onEdit,
  onDuplicate,
  onDelete,
  onLogHoursClick,
  onImportClick,
  onExportClick,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const yearMatch = e.startDate?.slice(0, 4) === String(selectedYear);
        if (!yearMatch) return false;
        if (categoryFilter !== 'all' && String(e.categoryId ?? '') !== categoryFilter) {
          return false;
        }
        if (goalFilter === 'unlinked' && e.goalId != null) {
          return false;
        }
        if (goalFilter !== 'all' && goalFilter !== 'unlinked' && String(e.goalId ?? '') !== goalFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.endDate.localeCompare(a.endDate) || b.id - a.id);
  }, [entries, selectedYear, categoryFilter, goalFilter]);

  const totalFilteredHours = useMemo(
    () => Math.round(filteredEntries.reduce((sum, item) => sum + Number(item.hours || 0), 0) * 100) / 100,
    [filteredEntries]
  );

  return (
    <div>
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          marginBottom: '18px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Filter size={15} style={{ color: 'var(--accent-cyan)' }} />
          <select
            aria-label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Goal"
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              maxWidth: '280px',
            }}
          >
            <option value="all">All Linked Goals</option>
            <option value="unlinked">Standalone Entries</option>
            {goals.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} •{' '}
            <strong style={{ color: 'var(--accent-cyan)' }}>{formatEntryHours(totalFilteredHours)} hrs</strong>
          </div>

          {onImportClick && (
            <button
              type="button"
              onClick={onImportClick}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '4px' }}
              title={
                canEdit
                  ? 'Bulk import from .csv or .xlsx'
                  : 'Preview bulk CSV/XLSX import (sign in to save to your workspace)'
              }
            >
              <Upload size={12} />
              Import
            </button>
          )}

          {onExportClick && (
            <>
              <button
                type="button"
                onClick={() => onExportClick('xlsx', false)}
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '4px' }}
                title={`Export ${selectedYear} report (.xlsx)`}
              >
                <Download size={12} />
                Export .xlsx
              </button>
              <button
                type="button"
                onClick={() => onExportClick('csv', false)}
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.76rem', gap: '4px' }}
                title={`Export ${selectedYear} report (.csv)`}
              >
                <Download size={12} />
                Export .csv
              </button>
            </>
          )}
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="glass-panel" style={{ padding: '42px 24px', textAlign: 'center' }}>
          <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>No career entries logged for {selectedYear}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '18px' }}>
            Log hours linked to a technical or personal goal to automatically roll up milestone progress.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {onImportClick && (
              <button type="button" onClick={onImportClick} className="btn-secondary">
                <Upload size={15} />
                Import CSV / XLSX
              </button>
            )}
            <button type="button" onClick={onLogHoursClick} className="btn-primary">
              <Plus size={16} />
              Log Career Hours
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredEntries.map((entry) => {
            const dateLabel =
              entry.startDate === entry.endDate
                ? entry.startDate
                : `${entry.startDate} → ${entry.endDate}`;

            return (
              <div
                key={entry.id}
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="badge badge-cyan">
                      <Calendar size={11} style={{ marginRight: '5px' }} />
                      {dateLabel}
                    </span>
                    <span className="badge badge-emerald" style={{ fontFamily: 'var(--font-mono)' }}>
                      <Clock size={11} style={{ marginRight: '5px' }} />
                      {formatEntryHours(entry.hours)} hrs
                    </span>
                    {entry.category && (
                      <span className="badge badge-indigo">{entry.category}</span>
                    )}
                  </div>

                  {canEdit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        title="Edit entry"
                        aria-label={`Edit ${entry.title}`}
                        className="btn-secondary"
                        style={{ padding: '5px 9px', fontSize: '0.76rem', gap: '4px' }}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(entry)}
                        title="Duplicate entry"
                        aria-label={`Duplicate ${entry.title}`}
                        className="btn-secondary"
                        style={{ padding: '5px 9px', fontSize: '0.76rem', gap: '4px' }}
                      >
                        <Copy size={12} />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        title="Delete entry"
                        aria-label={`Delete ${entry.title}`}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: entry.description ? '4px' : 0 }}>
                    {entry.title}
                  </h4>
                  {entry.description && (
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                      {entry.description}
                    </p>
                  )}
                </div>

                {entry.goalTitle && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                    <Link2 size={13} />
                    <span>Linked Goal: {entry.goalTitle}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
