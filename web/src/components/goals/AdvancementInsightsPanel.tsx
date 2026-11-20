import React, { useMemo, useState } from 'react';
import { BarChart3, PieChart, Printer, ArrowUpRight } from 'lucide-react';
import type { AnnualProgress, CareerEntry, Goal } from '../../types';
import { formatEntryHours } from '../../utils/advancementUtils';
import {
  computeCategoryBreakdown,
  computeMonthlyBreakdown,
  exportPrintableAnnualSummary,
} from '../../utils/advancementReportExport';

interface AdvancementInsightsPanelProps {
  entries: CareerEntry[];
  goals: Goal[];
  progress: AnnualProgress;
  selectedYear: number;
  profileName: string;
  onSelectCategoryFilter?: (categoryId: number | null) => void;
  onNotify?: (message: string, tone?: 'success' | 'info' | 'error') => void;
}

export const AdvancementInsightsPanel: React.FC<AdvancementInsightsPanelProps> = ({
  entries,
  goals,
  progress,
  selectedYear,
  profileName,
  onSelectCategoryFilter,
  onNotify,
}) => {
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  const monthly = useMemo(() => computeMonthlyBreakdown(entries, selectedYear), [entries, selectedYear]);
  const categories = useMemo(() => computeCategoryBreakdown(entries, selectedYear), [entries, selectedYear]);

  const maxMonthHours = useMemo(
    () => Math.max(1, ...monthly.map((m) => m.hours)),
    [monthly]
  );

  const activeMonths = useMemo(
    () => monthly.filter((m) => m.hours > 0).length,
    [monthly]
  );

  const peakMonth = useMemo(() => {
    let best = monthly[0];
    for (const m of monthly) {
      if (m.hours > (best?.hours ?? 0)) best = m;
    }
    return best && best.hours > 0 ? best : null;
  }, [monthly]);

  const focusedMonth = hoveredMonthIdx !== null ? monthly[hoveredMonthIdx] : null;

  const handlePrintSummary = () => {
    const opened = exportPrintableAnnualSummary({
      profileName,
      selectedYear,
      progress,
      entries,
      goals,
    });
    if (opened) {
      onNotify?.(`Opened printable FY ${selectedYear} Annual Development Report.`, 'success');
    } else {
      onNotify?.('Pop-up blocked — allow pop-ups to open the printable annual report.', 'error');
    }
  };

  return (
    <section
      aria-label={`FY ${selectedYear} career advancement analytics`}
      className="insights-two-col-grid"
      style={{ marginBottom: '26px' }}
    >
      {/* Left: 12-Month Activity Bar Chart */}
      <div className="glass-panel" style={{ padding: '20px 22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
            <h3 style={{ fontSize: '0.96rem', margin: 0, color: 'var(--text-primary)' }}>
              Monthly Cadence ({selectedYear})
            </h3>
          </div>

          <div
            aria-live="polite"
            style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
          >
            {focusedMonth ? (
              <span>
                <strong style={{ color: 'var(--accent-crimson)' }}>{focusedMonth.label}:</strong>{' '}
                {formatEntryHours(focusedMonth.hours)} hrs ({focusedMonth.entries}{' '}
                {focusedMonth.entries === 1 ? 'entry' : 'entries'})
              </span>
            ) : peakMonth ? (
              <span>
                {activeMonths} active mo • Peak: {peakMonth.label} ({formatEntryHours(peakMonth.hours)}h)
              </span>
            ) : (
              <span>No logged hours in {selectedYear}</span>
            )}
          </div>
        </div>

        <svg
          role="img"
          tabIndex={0}
          aria-label={`Monthly logged hours bar chart for ${selectedYear}. Use left and right arrow keys to inspect months.`}
          viewBox="0 0 480 132"
          style={{ width: '100%', height: '132px', display: 'block' }}
          onMouseLeave={() => setHoveredMonthIdx(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              setHoveredMonthIdx((prev) => (prev === null ? 0 : (prev + 1) % 12));
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setHoveredMonthIdx((prev) => (prev === null ? 11 : (prev + 11) % 12));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setHoveredMonthIdx(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setHoveredMonthIdx(11);
            } else if (e.key === 'Escape') {
              setHoveredMonthIdx(null);
            }
          }}
        >
          <line x1="8" y1="104" x2="472" y2="104" stroke="var(--border-subtle)" strokeWidth="1" />
          <line x1="8" y1="54" x2="472" y2="54" stroke="var(--border-subtle)" strokeDasharray="3 4" strokeWidth="1" />

          {monthly.map((bucket, idx) => {
            const slotW = 464 / 12;
            const barW = 22;
            const x = 8 + idx * slotW + (slotW - barW) / 2;
            const maxBarH = 88;
            const barH = bucket.hours > 0 ? Math.max(6, (bucket.hours / maxMonthHours) * maxBarH) : 3;
            const y = 104 - barH;
            const isPeak = peakMonth?.monthIndex === idx;
            const isHovered = hoveredMonthIdx === idx;
            const fill =
              bucket.hours === 0
                ? 'var(--border-subtle)'
                : isHovered || isPeak
                  ? 'var(--accent-crimson)'
                  : 'var(--text-primary)';

            return (
              <g
                key={bucket.label}
                onMouseEnter={() => setHoveredMonthIdx(idx)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x - 5}
                  y="8"
                  width={barW + 10}
                  height="118"
                  fill="transparent"
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="3"
                  fill={fill}
                  style={{ transition: 'fill 0.15s ease' }}
                />
                <text
                  x={x + barW / 2}
                  y="122"
                  textAnchor="middle"
                  fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontSize="12"
                  fontFamily="var(--font-mono)"
                  fontWeight={isHovered || isPeak ? '700' : '500'}
                >
                  {bucket.label.slice(0, 1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Right: Category Breakdown + Printable Review Export */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={16} aria-hidden="true" style={{ color: 'var(--text-primary)' }} />
              <h3 style={{ fontSize: '0.96rem', margin: 0, color: 'var(--text-primary)' }}>
                Focus Areas ({categories.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={handlePrintSummary}
              className="btn-secondary"
              style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.76rem', gap: '5px' }}
              title={`Open printable FY ${selectedYear} Annual Development Report`}
            >
              <Printer size={13} aria-hidden="true" />
              <span>Print Annual Report</span>
            </button>
          </div>

          {categories.length === 0 ? (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>
              Log or import entries for {selectedYear} to visualize hours across engineering tracks.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.slice(0, 4).map((cat, idx) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => onSelectCategoryFilter?.(cat.categoryId)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 0',
                    textAlign: 'left',
                    cursor: onSelectCategoryFilter ? 'pointer' : 'default',
                    width: '100%',
                  }}
                  title={onSelectCategoryFilter ? `Filter Activity Log by ${cat.name}` : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{cat.name}</span>
                      {onSelectCategoryFilter && (
                        <ArrowUpRight size={12} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                      )}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {formatEntryHours(cat.hours)}h ({cat.sharePercent}%)
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: '6px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(4, cat.sharePercent)}%`,
                        background: idx === 0 ? 'var(--accent-crimson)' : 'var(--text-primary)',
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
