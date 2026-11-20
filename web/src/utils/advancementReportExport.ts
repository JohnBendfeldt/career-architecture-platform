import type { AnnualProgress, CareerEntry, Goal } from '../types';
import { formatEntryHours } from './advancementUtils';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MonthlyBucket {
  monthIndex: number;
  label: string;
  hours: number;
  entries: number;
}

export interface CategoryBreakdownItem {
  name: string;
  categoryId: number | null;
  hours: number;
  entries: number;
  sharePercent: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function computeMonthlyBreakdown(entries: CareerEntry[], year: number): MonthlyBucket[] {
  const buckets: MonthlyBucket[] = MONTH_LABELS.map((label, idx) => ({
    monthIndex: idx,
    label,
    hours: 0,
    entries: 0,
  }));

  const prefix = `${year}-`;
  for (const entry of entries) {
    if (!entry.startDate || !entry.startDate.startsWith(prefix)) continue;
    const monthPart = Number(entry.startDate.slice(5, 7));
    if (!Number.isInteger(monthPart) || monthPart < 1 || monthPart > 12) continue;
    const bucket = buckets[monthPart - 1];
    bucket.hours = Math.round((bucket.hours + (Number(entry.hours) || 0)) * 100) / 100;
    bucket.entries += 1;
  }

  return buckets;
}

export function computeCategoryBreakdown(entries: CareerEntry[], year: number): CategoryBreakdownItem[] {
  const prefix = `${year}-`;
  const map = new Map<string, { categoryId: number | null; hours: number; entries: number }>();
  let totalHours = 0;

  for (const entry of entries) {
    if (!entry.startDate || !entry.startDate.startsWith(prefix)) continue;
    const name = (entry.category || 'Uncategorized').trim() || 'Uncategorized';
    const hrs = Number(entry.hours) || 0;
    totalHours += hrs;
    const prev = map.get(name) ?? { categoryId: entry.categoryId ?? null, hours: 0, entries: 0 };
    map.set(name, {
      categoryId: prev.categoryId ?? entry.categoryId ?? null,
      hours: Math.round((prev.hours + hrs) * 100) / 100,
      entries: prev.entries + 1,
    });
  }

  return Array.from(map.entries())
    .map(([name, stat]) => ({
      name,
      categoryId: stat.categoryId,
      hours: stat.hours,
      entries: stat.entries,
      sharePercent: totalHours > 0 ? Math.round((stat.hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
}

export function computeWeeklyPaceInsight(
  progress: AnnualProgress,
  now: Date = new Date()
): { remainingHours: number; weeksLeft: number; hoursPerWeekNeeded: number; statusSummary: string } {
  const remainingHours = Math.max(
    0,
    Math.round((progress.annualGoalHours - progress.completedHours) * 100) / 100
  );

  const currentYear = now.getFullYear();
  if (remainingHours <= 0) {
    const surplus = Math.round((progress.completedHours - progress.annualGoalHours) * 100) / 100;
    return {
      remainingHours: 0,
      weeksLeft: 0,
      hoursPerWeekNeeded: 0,
      statusSummary:
        surplus > 0
          ? `Annual target exceeded by +${formatEntryHours(surplus)} hrs`
          : 'Annual target achieved',
    };
  }

  if (progress.year < currentYear) {
    return {
      remainingHours,
      weeksLeft: 0,
      hoursPerWeekNeeded: 0,
      statusSummary: `Finished ${formatEntryHours(remainingHours)} hrs shy of ${progress.year} target`,
    };
  }

  const endOfYear = new Date(progress.year, 11, 31, 23, 59, 59);
  const startRef = progress.year > currentYear ? new Date(progress.year, 0, 1) : now;
  const msLeft = Math.max(0, endOfYear.getTime() - startRef.getTime());
  const weeksLeft = Math.max(1, Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000)));
  const hoursPerWeekNeeded = Math.round((remainingHours / weeksLeft) * 10) / 10;

  return {
    remainingHours,
    weeksLeft,
    hoursPerWeekNeeded,
    statusSummary: `~${hoursPerWeekNeeded} hrs/wk across ${weeksLeft} wk${weeksLeft === 1 ? '' : 's'} to reach goal`,
  };
}

export function exportPrintableAnnualSummary(options: {
  profileName: string;
  selectedYear: number;
  progress: AnnualProgress;
  entries: CareerEntry[];
  goals: Goal[];
}): boolean {
  const { profileName, selectedYear, progress, entries, goals } = options;
  const yearEntries = entries
    .filter((e) => e.startDate?.startsWith(`${selectedYear}-`))
    .sort((a, b) => b.endDate.localeCompare(a.endDate));
  const categories = computeCategoryBreakdown(entries, selectedYear);

  const win = window.open('', '_blank', 'width=940,height=1050');
  if (!win) {
    return false;
  }

  const categoriesHtml =
    categories.length > 0
      ? categories
          .map(
            (cat) => `
          <tr>
            <td>${escapeHtml(cat.name)}</td>
            <td class="num">${cat.entries}</td>
            <td class="num">${formatEntryHours(cat.hours)} hrs</td>
            <td class="num">${cat.sharePercent}%</td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="4">No categorized entries logged for this year.</td></tr>';

  const entriesHtml =
    yearEntries.length > 0
      ? yearEntries
          .map(
            (e) => `
          <tr>
            <td class="mono">${escapeHtml(e.startDate === e.endDate ? e.startDate : `${e.startDate} → ${e.endDate}`)}</td>
            <td>
              <strong>${escapeHtml(e.title)}</strong>
              ${e.description ? `<div class="note">${escapeHtml(e.description)}</div>` : ''}
            </td>
            <td>${escapeHtml(e.category || 'General')}</td>
            <td>${escapeHtml(e.goalTitle || '—')}</td>
            <td class="num mono">${formatEntryHours(e.hours)}</td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="5">No entries recorded for this period.</td></tr>';

  const goalsHtml =
    goals.length > 0
      ? goals
          .map(
            (g) => `
          <tr>
            <td><strong>${escapeHtml(g.title)}</strong></td>
            <td>${escapeHtml(g.category)}</td>
            <td class="mono">${escapeHtml(g.targetDate)}</td>
            <td class="num mono">${g.progress}%</td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="4">No strategic goals configured.</td></tr>';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(profileName)} — ${selectedYear} Career Development Report</title>
  <style>
    @page { margin: 0.6in; size: letter; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #141413;
      background: #ffffff;
      margin: 0;
      padding: 24px 32px;
      font-size: 10pt;
      line-height: 1.45;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f5f4ef;
      border: 1px solid #d4d2c9;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .toolbar button {
      background: #141413;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
    }
    header {
      border-bottom: 2px solid #141413;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 { font-size: 19pt; margin: 0 0 2px; letter-spacing: -0.02em; }
    .eyebrow { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #c40010; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi {
      border: 1px solid #d4d2c9;
      background: #faf9f5;
      padding: 10px 12px;
      border-radius: 5px;
    }
    .kpi-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #575651; font-weight: 700; }
    .kpi-val { font-size: 15pt; font-weight: 800; margin-top: 3px; }
    h2 {
      font-size: 10.5pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #d4d2c9;
      padding-bottom: 4px;
      margin: 18px 0 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e6e4dc; vertical-align: top; }
    th { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #575651; background: #f5f4ef; }
    .num { text-align: right; white-space: nowrap; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8.8pt; }
    .note { font-size: 8.5pt; color: #575651; margin-top: 2px; }
    @media print {
      body { padding: 0; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span><strong>FY ${selectedYear} Annual Career Development Report</strong> • Choose "Save as PDF" to export</span>
    <button id="print-annual-report-btn" type="button">Print / Save as PDF</button>
  </div>
  <header>
    <div>
      <div class="eyebrow">Career Architecture Platform • Annual Review Dossier</div>
      <h1>${escapeHtml(profileName)}</h1>
    </div>
    <div class="mono">FY ${selectedYear} • ${escapeHtml(progress.quarterLabel)}</div>
  </header>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Completed Hours</div><div class="kpi-val">${formatEntryHours(progress.completedHours)} hrs</div></div>
    <div class="kpi"><div class="kpi-label">Annual Target</div><div class="kpi-val">${formatEntryHours(progress.annualGoalHours)} hrs</div></div>
    <div class="kpi"><div class="kpi-label">Completion</div><div class="kpi-val">${progress.percentComplete}%</div></div>
    <div class="kpi"><div class="kpi-label">Pace Status</div><div class="kpi-val">${progress.isOnTrack ? 'On Track' : 'Behind Pace'}</div></div>
  </div>
  <h2>Category Distribution</h2>
  <table>
    <thead><tr><th>Category</th><th class="num">Entries</th><th class="num">Hours</th><th class="num">Share</th></tr></thead>
    <tbody>${categoriesHtml}</tbody>
  </table>
  <h2>Strategic Goals Alignment</h2>
  <table>
    <thead><tr><th>Goal</th><th>Track</th><th>Target</th><th class="num">Progress</th></tr></thead>
    <tbody>${goalsHtml}</tbody>
  </table>
  <h2>Logged Development Ledger (${yearEntries.length})</h2>
  <table>
    <thead><tr><th>Date</th><th>Activity</th><th>Category</th><th>Linked Goal</th><th class="num">Hours</th></tr></thead>
    <tbody>${entriesHtml}</tbody>
  </table>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();

  const btn = win.document.getElementById('print-annual-report-btn');
  if (btn) {
    btn.addEventListener('click', () => win.print());
  }
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // Ignore if print dialog was dismissed
    }
  }, 250);

  return true;
}
