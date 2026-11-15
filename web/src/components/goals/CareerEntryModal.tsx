import React, { useEffect, useState } from 'react';
import { LogIn, ShieldAlert, UserCheck, X } from 'lucide-react';
import type { CareerEntry, CareerEntryPrefill, Category, CreateCareerEntryInput, Goal } from '../../types';
import { ApiService } from '../../services/api';
import { toLocalDateString, validateCareerEntry } from '../../utils/advancementUtils';
import { ReadOnlyPortfolioBanner } from './ReadOnlyPortfolioBanner';
import { ModalDialog } from '../ui/ModalDialog';

const LAST_CATEGORY_STORAGE_KEY = 'cap_last_category_id';

interface CareerEntryModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'duplicate';
  initialEntry?: CareerEntry | null;
  preselectedGoalId?: number | null;
  prefill?: CareerEntryPrefill | null;
  categories: Category[];
  goals: Goal[];
  canEdit?: boolean;
  profileName?: string;
  onOpenLogin?: () => void;
  onSwitchToPersonal?: () => void;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const CareerEntryModal: React.FC<CareerEntryModalProps> = ({
  isOpen,
  mode,
  initialEntry,
  preselectedGoalId,
  prefill,
  categories,
  goals,
  canEdit = true,
  profileName,
  onOpenLogin,
  onSwitchToPersonal,
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

    const resolvedCategoryId =
      prefill?.categoryId != null && categories.some((c) => c.id === prefill.categoryId)
        ? String(prefill.categoryId)
        : defaultCategoryId;
    const resolvedGoalId = prefill?.goalId ?? preselectedGoalId ?? null;

    setTitle(prefill?.title ?? '');
    setDescription(prefill?.description ?? '');
    setStartDate(today);
    setEndDate(today);
    setHours(prefill?.hours != null ? String(prefill.hours) : '1.5');
    setCategoryId(resolvedCategoryId);
    setGoalId(resolvedGoalId ? String(resolvedGoalId) : '');
  }, [isOpen, mode, initialEntry, preselectedGoalId, prefill, categories]);

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
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      disableClose={submitting}
      labelledBy="career-entry-modal-title"
      maxWidth="580px"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <h2 id="career-entry-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
          {modalTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Career Entry Modal"
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
            onOpenLogin={onOpenLogin}
            onSwitchToPersonal={onSwitchToPersonal}
          />
        </div>
      )}

      {readOnlyNotice && (
        <div
          role="alert"
          className="callout-danger"
          style={{
            marginBottom: '16px',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--status-danger)' }} />
          <div>
            <strong style={{ color: 'var(--status-danger)', display: 'block', marginBottom: '2px' }}>
              ASP.NET Core 403 Forbidden — Read-Only Demo Lock
            </strong>
            {readOnlyNotice}
            {(onSwitchToPersonal || onOpenLogin) && (
              <div style={{ marginTop: '8px' }}>
                {onSwitchToPersonal ? (
                  <button
                    type="button"
                    onClick={onSwitchToPersonal}
                    className="btn-secondary"
                    style={{ minHeight: '32px', padding: '5px 10px', fontSize: '0.78rem' }}
                  >
                    <UserCheck size={13} aria-hidden="true" />
                    <span>Switch to My Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenLogin}
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

      {errorMsg && (
        <div
          role="alert"
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--status-warning-bg)',
            border: '1px solid var(--status-warning-border)',
            color: 'var(--status-warning)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      {mode === 'add' && prefill?.title && (
        <div
          className="callout-banner"
          style={{
            marginBottom: '16px',
            fontSize: '0.82rem',
            lineHeight: 1.45,
          }}
        >
          Prefilled from AI Curriculum — adjust hours, dates, or linked goal before saving.
        </div>
      )}

      <form onSubmit={handleFormSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="entry-title-input" className="form-label">
            Activity Title *
          </label>
          <input
            id="entry-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. .NET 10 Distributed Tracing Spike"
            className="form-input"
          />
        </div>

        <div className="modal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label htmlFor="entry-category-select" className="form-label">
              Category
            </label>
            <select
              id="entry-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-select"
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
            <label htmlFor="entry-goal-select" className="form-label">
              Linked Goal (Auto-Rollup)
            </label>
            <select
              id="entry-goal-select"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="form-select"
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
            <label htmlFor="entry-start-date" className="form-label">
              Start Date *
            </label>
            <input
              id="entry-start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="entry-end-date" className="form-label">
              End Date *
            </label>
            <input
              id="entry-end-date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="entry-hours-input" className="form-label">
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
              className="form-input"
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="entry-description-input" className="form-label">
            Notes / Evidence
          </label>
          <textarea
            id="entry-description-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Summarize outcomes, pull requests, coursework modules, or architecture findings..."
            className="form-textarea"
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
            >
              Save &amp; Add Another
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {mode === 'edit' ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
};
