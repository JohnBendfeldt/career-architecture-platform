import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, X } from 'lucide-react';
import type { CareerEntry, Category, CreateCareerEntryInput, Goal } from '../../types';
import { ApiService } from '../../services/api';
import { toLocalDateString, validateCareerEntry } from '../../utils/advancementUtils';

const LAST_CATEGORY_STORAGE_KEY = 'cap_last_category_id';

interface CareerEntryModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'duplicate';
  initialEntry?: CareerEntry | null;
  preselectedGoalId?: number | null;
  categories: Category[];
  goals: Goal[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const CareerEntryModal: React.FC<CareerEntryModalProps> = ({
  isOpen,
  mode,
  initialEntry,
  preselectedGoalId,
  categories,
  goals,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(toLocalDateString());
  const [endDate, setEndDate] = useState(toLocalDateString());
  const [hours, setHours] = useState('1.5');
  const [categoryId, setCategoryId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [readOnlyNotice, setReadOnlyNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setReadOnlyNotice(null);

    if (initialEntry && (mode === 'edit' || mode === 'duplicate')) {
      setTitle(mode === 'duplicate' ? `${initialEntry.title} (Copy)` : initialEntry.title);
      setDescription(initialEntry.description || '');
      const today = toLocalDateString();
      setStartDate(initialEntry.startDate > today ? today : initialEntry.startDate);
      setEndDate(initialEntry.endDate > today ? today : initialEntry.endDate);
      setHours(String(initialEntry.hours));
      setCategoryId(initialEntry.categoryId ? String(initialEntry.categoryId) : '');
      setGoalId(initialEntry.goalId ? String(initialEntry.goalId) : '');
      return;
    }

    const today = toLocalDateString();
    const rememberedCategory = localStorage.getItem(LAST_CATEGORY_STORAGE_KEY);
    const defaultCategoryId =
      rememberedCategory && categories.some((c) => String(c.id) === rememberedCategory)
        ? rememberedCategory
        : categories[0]
          ? String(categories[0].id)
          : '';

    setTitle('');
    setDescription('');
    setStartDate(today);
    setEndDate(today);
    setHours('1.5');
    setCategoryId(defaultCategoryId);
    setGoalId(preselectedGoalId ? String(preselectedGoalId) : '');
  }, [isOpen, mode, initialEntry, preselectedGoalId, categories]);

  if (!isOpen) return null;

  const submitEntry = async (keepOpenForAnother: boolean) => {
    setErrorMsg(null);
    setReadOnlyNotice(null);

    const parsedHours = Number(hours);
    const parsedCategoryId = categoryId ? Number(categoryId) : null;
    const parsedGoalId = goalId ? Number(goalId) : null;

    const input: CreateCareerEntryInput = {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      hours: parsedHours,
      categoryId: parsedCategoryId,
      goalId: parsedGoalId,
    };

    const validationError = validateCareerEntry(input);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const result =
        mode === 'edit' && initialEntry
          ? await ApiService.updateCareerEntry(initialEntry.id, input)
          : await ApiService.createCareerEntry(input);

      if (!result.success) {
        if (result.status === 403) {
          setReadOnlyNotice(result.message);
        } else {
          setErrorMsg(result.message);
        }
        return;
      }

      if (parsedCategoryId) {
        localStorage.setItem(LAST_CATEGORY_STORAGE_KEY, String(parsedCategoryId));
      }

      await onSaved();

      if (keepOpenForAnother && mode !== 'edit') {
        setTitle('');
        setDescription('');
        setHours('1.5');
      } else {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEntry(false);
  };

  const modalTitle =
    mode === 'edit'
      ? 'Edit Career Development Entry'
      : mode === 'duplicate'
        ? 'Duplicate Career Entry'
        : 'Log Career Development Hours';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(6, 9, 14, 0.84)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '28px',
          position: 'relative',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Career Entry Modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Clock size={20} style={{ color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{modalTitle}</h3>
        </div>

        {readOnlyNotice && (
          <div
            role="alert"
            style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#f87171' }} />
            <div>
              <strong style={{ color: '#fecaca', display: 'block', marginBottom: '2px' }}>
                ASP.NET Core 403 Forbidden — Read-Only Demo Lock
              </strong>
              {readOnlyNotice}
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fcd34d',
              fontSize: '0.85rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="entry-title-input"
              style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
            >
              Activity Title *
            </label>
            <input
              id="entry-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. .NET 10 Distributed Tracing Spike"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div className="modal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label
                htmlFor="entry-category-select"
                style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                Category
              </label>
              <select
                id="entry-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="entry-goal-select"
                style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                Linked Goal (Auto-Rollup)
              </label>
              <select
                id="entry-goal-select"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">Standalone (No Goal)</option>
                {goals.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.title}
                    {g.targetHours ? ` (${g.targetHours}h target)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label
                htmlFor="entry-start-date"
                style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                Start Date *
              </label>
              <input
                id="entry-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="entry-end-date"
                style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                End Date *
              </label>
              <input
                id="entry-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="entry-hours-input"
                style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                Hours *
              </label>
              <input
                id="entry-hours-input"
                type="number"
                required
                step="0.25"
                min="0.25"
                max="1000"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="entry-description-input"
              style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
            >
              Notes / Evidence
            </label>
            <textarea
              id="entry-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize outcomes, pull requests, coursework modules, or architecture findings..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            {mode !== 'edit' && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitEntry(true)}
                className="btn-secondary"
                style={{ borderColor: 'rgba(6, 182, 212, 0.35)', color: 'var(--accent-cyan)' }}
              >
                Save &amp; Add Another
              </button>
            )}
            <button type="submit" disabled={submitting} className="btn-primary">
              {mode === 'edit' ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
