import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderOpen,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import type {
  Category,
  Goal,
  ImportCareerEntriesResult,
  ParsedImportRow,
} from '../../types';
import { ApiService } from '../../services/api';
import { formatEntryHours } from '../../utils/advancementUtils';
import {
  SELF_IMPORT_MAX_ROWS,
  downloadSampleImportTemplate,
  parseImportFile,
  prepareEntriesForImport,
} from '../../utils/advancementImportExport';

interface ImportCareerEntriesModalProps {
  isOpen: boolean;
  categories: Category[];
  goals: Goal[];
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

const PREVIEW_ROW_LIMIT = 20;

export const ImportCareerEntriesModal: React.FC<ImportCareerEntriesModalProps> = ({
  isOpen,
  categories,
  goals,
  onClose,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [defaultGoalId, setDefaultGoalId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [readOnlyNotice, setReadOnlyNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportCareerEntriesResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, importing, onClose]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [categories]
  );

  const unrecognizedCategoryCount = useMemo(
    () => parsedRows.filter((r) => Boolean(r.unrecognizedCategory)).length,
    [parsedRows]
  );

  const unrecognizedGoalCount = useMemo(
    () => parsedRows.filter((r) => Boolean(r.unrecognizedGoal)).length,
    [parsedRows]
  );

  const totalParsedHours = useMemo(
    () => Math.round(parsedRows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0) * 100) / 100,
    [parsedRows]
  );

  if (!isOpen) return null;

  const clearSelection = () => {
    setSelectedFileName('');
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setReadOnlyNotice(null);
    setImportResult(null);
    setSelectedFileName(file.name);

    try {
      const rows = await parseImportFile(file, categories, goals);
      if (rows.length > SELF_IMPORT_MAX_ROWS) {
        setErrorMsg(
          `This file has ${rows.length} entries, exceeding the ${SELF_IMPORT_MAX_ROWS}-entry limit per import. Please split it into smaller batches.`
        );
        clearSelection();
        return;
      }
      setParsedRows(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to parse selected file.';
      setErrorMsg(msg);
      clearSelection();
    }
  };

  const handleRowCategoryChange = (rowIndex: number, categoryIdStr: string) => {
    setParsedRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        if (!categoryIdStr) {
          return {
            ...row,
            categoryId: null,
            category: null,
            unrecognizedCategory: null,
          };
        }
        const matched = categories.find((c) => String(c.id) === categoryIdStr);
        return {
          ...row,
          categoryId: matched ? matched.id : null,
          category: matched ? matched.name : null,
          unrecognizedCategory: null,
        };
      })
    );
  };

  const handleRowGoalChange = (rowIndex: number, goalIdStr: string) => {
    setParsedRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        if (!goalIdStr) {
          return {
            ...row,
            goalId: null,
            goalTitle: null,
            unrecognizedGoal: null,
          };
        }
        const matched = goals.find((g) => String(g.id) === goalIdStr);
        return {
          ...row,
          goalId: matched ? matched.id : null,
          goalTitle: matched ? matched.title : null,
          unrecognizedGoal: null,
        };
      })
    );
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setErrorMsg(null);
    setReadOnlyNotice(null);
    setImporting(true);

    try {
      const parsedDefaultGoal = defaultGoalId ? Number(defaultGoalId) : null;
      const payload = prepareEntriesForImport(parsedRows, parsedDefaultGoal, goals);
      const result = await ApiService.importCareerEntries(payload);

      if (result.status === 403) {
        setReadOnlyNotice(result.message);
        return;
      }

      if (result.status === 400) {
        setErrorMsg(result.message);
        return;
      }

      setImportResult(result);
      clearSelection();

      if (result.successCount > 0) {
        await onImported();
      }
    } finally {
      setImporting(false);
    }
  };

  const previewSlice = parsedRows.slice(0, PREVIEW_ROW_LIMIT);
  const failedOrSkippedRows = importResult ? importResult.results.filter((r) => !r.success) : [];
  const successRate =
    importResult && importResult.totalRows > 0
      ? Math.round((importResult.successCount / importResult.totalRows) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-entries-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 3100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '820px',
          width: '100%',
          background: 'var(--bg-card)',
          padding: '28px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={20} style={{ color: 'var(--accent-crimson)' }} />
            <h3 id="import-entries-modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              Bulk Import Career Entries (.csv / .xlsx)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label="Close Import Modal"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions & Template Download */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '16px',
            alignItems: 'center',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <div>
              <strong>Required columns:</strong> <code>Title</code>, <code>Start Date</code>, <code>Hours</code>
            </div>
            <div>
              <strong>Optional columns:</strong> <code>Description</code>, <code>End Date</code>, <code>Category</code>,{' '}
              <code>Linked Goal</code> (up to {SELF_IMPORT_MAX_ROWS} entries per batch; duplicates are automatically skipped).
            </div>
          </div>

          <button
            type="button"
            onClick={downloadSampleImportTemplate}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            <Download size={14} />
            Download CSV Template
          </button>
        </div>

        {/* File Picker & Default Goal */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
            alignItems: 'end',
          }}
        >
          <div>
            <label
              htmlFor="import-default-goal-select"
              style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}
            >
              Default Linked Goal (applied if row has no Linked Goal)
            </label>
            <select
              id="import-default-goal-select"
              aria-label="Default Linked Goal"
              value={defaultGoalId}
              onChange={(e) => setDefaultGoalId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
              }}
            >
              <option value="">None (Standalone unless specified in file)</option>
              {goals.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <input
              ref={fileInputRef}
              data-testid="import-file-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
              style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            >
              <FolderOpen size={15} />
              Select File (.csv or .xlsx)
            </button>

            {selectedFileName && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)' }}>
                  {selectedFileName}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="btn-secondary"
                  aria-label="Clear selected file"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Read-Only 403 Policy Alert */}
        {readOnlyNotice && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(230, 0, 18, 0.08)',
              border: '1px solid rgba(230, 0, 18, 0.35)',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldAlert size={18} color="var(--accent-crimson)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--accent-crimson)' }}>ASP.NET Core 403 Forbidden Policy: </strong>
              {readOnlyNotice}
            </div>
          </div>
        )}

        {/* Parse / Validation Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '11px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#dc2626',
              fontSize: '0.84rem',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Interactive Preview Table */}
        {parsedRows.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Preview: {parsedRows.length} {parsedRows.length === 1 ? 'entry' : 'entries'} ready (
                {formatEntryHours(totalParsedHours)} hrs total)
              </div>
              {(unrecognizedCategoryCount > 0 || unrecognizedGoalCount > 0) && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#b45309',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 10px',
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>
                    {unrecognizedCategoryCount > 0
                      ? `${unrecognizedCategoryCount} unrecognized category name(s)`
                      : ''}
                    {unrecognizedCategoryCount > 0 && unrecognizedGoalCount > 0 ? ' • ' : ''}
                    {unrecognizedGoalCount > 0
                      ? `${unrecognizedGoalCount} unrecognized goal title(s)`
                      : ''}
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                overflowX: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 10px' }}>Title</th>
                    <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Dates</th>
                    <th style={{ padding: '8px 10px' }}>Hrs</th>
                    <th style={{ padding: '8px 10px' }}>Category</th>
                    <th style={{ padding: '8px 10px' }}>Linked Goal</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSlice.map((row, idx) => (
                    <tr
                      key={`${row.title}-${row.startDate}-${idx}`}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <td style={{ padding: '8px 10px', maxWidth: '210px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.title}</div>
                        {row.description && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {row.description.slice(0, 70)}
                            {row.description.length > 70 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {row.startDate === row.endDate ? row.startDate : `${row.startDate} → ${row.endDate}`}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {formatEntryHours(row.hours)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          aria-label={`Category for row ${idx + 1}`}
                          value={row.categoryId ? String(row.categoryId) : ''}
                          onChange={(e) => handleRowCategoryChange(idx, e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: row.unrecognizedCategory
                              ? '1px solid #f59e0b'
                              : '1px solid var(--border-subtle)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                          }}
                        >
                          <option value="">No category</option>
                          {sortedCategories.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {row.unrecognizedCategory && (
                          <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '3px' }}>
                            Unmatched: &ldquo;{row.unrecognizedCategory}&rdquo;
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          aria-label={`Linked Goal for row ${idx + 1}`}
                          value={row.goalId ? String(row.goalId) : ''}
                          onChange={(e) => handleRowGoalChange(idx, e.target.value)}
                          style={{
                            maxWidth: '200px',
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: row.unrecognizedGoal
                              ? '1px solid #f59e0b'
                              : '1px solid var(--border-subtle)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                          }}
                        >
                          <option value="">
                            {defaultGoalId ? 'Use default linked goal' : 'Standalone (no goal)'}
                          </option>
                          {goals.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              {g.title}
                            </option>
                          ))}
                        </select>
                        {row.unrecognizedGoal && (
                          <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '3px' }}>
                            Unmatched: &ldquo;{row.unrecognizedGoal}&rdquo;
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {parsedRows.length > PREVIEW_ROW_LIMIT && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          fontStyle: 'italic',
                          color: 'var(--text-muted)',
                        }}
                      >
                        ... and {parsedRows.length - PREVIEW_ROW_LIMIT} more entries
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Execution Results */}
        {importResult && (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <CheckCircle2
                size={18}
                style={{
                  color: importResult.successCount > 0 ? 'var(--accent-emerald)' : 'var(--accent-crimson)',
                }}
              />
              <h4 style={{ margin: 0, fontSize: '0.98rem' }}>
                {importResult.successCount > 0 && importResult.errorCount === 0
                  ? 'Import Completed Successfully'
                  : importResult.successCount > 0
                    ? 'Import Completed with Warnings'
                    : 'No New Entries Imported'}
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {importResult.message}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '8px',
                marginBottom: failedOrSkippedRows.length > 0 ? '14px' : '0',
              }}
            >
              <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                  {importResult.successCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Imported</div>
              </div>
              <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                  {importResult.duplicateCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Duplicates Skipped</div>
              </div>
              <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                  {importResult.errorCount - importResult.duplicateCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Errors</div>
              </div>
              <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                  {successRate}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Success Rate</div>
              </div>
            </div>

            {failedOrSkippedRows.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Row</th>
                      <th style={{ padding: '6px 8px' }}>Title</th>
                      <th style={{ padding: '6px 8px' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedOrSkippedRows.map((item) => (
                      <tr key={item.rowNumber} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>#{item.rowNumber}</td>
                        <td style={{ padding: '6px 8px' }}>{item.title}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                          {item.errorMessage || (item.isDuplicate ? 'Duplicate skipped' : 'Validation error')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="btn-secondary"
          >
            Close
          </button>
          {parsedRows.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing}
              className="btn-primary"
            >
              <Upload size={15} />
              {importing ? 'Importing...' : `Import ${parsedRows.length} ${parsedRows.length === 1 ? 'Entry' : 'Entries'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
