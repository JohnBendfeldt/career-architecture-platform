import type {
  CareerEntry,
  Category,
  Goal,
  ImportCareerEntryRowPayload,
  ParsedImportRow,
} from '../types';
import { toLocalDateString } from './advancementUtils';
import {
  MAX_IMPORT_FILE_BYTES,
  buildCareerDevelopmentXlsx,
  excelSerialToIsoDate,
  readXlsxRows,
} from './xlsxCodec';

export const SELF_IMPORT_MAX_ROWS = 50;
export const MAX_TITLE_LENGTH = 200;

export const SAMPLE_IMPORT_TEMPLATE_CSV = [
  'Title,Description,Start Date,End Date,Hours,Category,Linked Goal',
  'Advanced React 19 Patterns,Component composition and concurrent rendering study,2026-03-12,2026-03-14,6,Development,',
  'Zero-Downtime Database Migrations,Expand-contract schema rollout and covering index tuning,2026-05-04,,4.5,Cloud Computing,',
  'Security Hardening Workshop,OWASP ASVS controls and CSP policy validation,2026-07-19,2026-07-19,3.5,Security,',
  'Engineering Mentorship Sync,Architecture design review and career roadmap feedback,2026-09-08,,2,Leadership,',
].join('\n');

const HEADER_ALIASES = {
  title: ['title', 'activity', 'course', 'course title', 'entry'],
  description: ['description', 'notes', 'details'],
  startDate: ['start date', 'startdate', 'date'],
  endDate: ['end date', 'enddate'],
  hours: ['hours', 'hrs', 'duration'],
  category: ['category', 'type', 'track'],
  goal: ['linked goal', 'goal', 'goal title', 'milestone'],
};

function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ');
}

function findColumn(headers: string[], key: keyof typeof HEADER_ALIASES): number {
  for (const alias of HEADER_ALIASES[key]) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseCsvText(content: string): string[][] {
  const normalized = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (normalized[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

export function parseDateValue(dateVal: unknown): string | null {
  if (dateVal instanceof Date) {
    if (Number.isNaN(dateVal.getTime())) return null;
    const year = dateVal.getUTCFullYear();
    const month = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateVal === 'number' && Number.isFinite(dateVal) && dateVal >= 1 && dateVal <= 109574) {
    return excelSerialToIsoDate(dateVal);
  }

  const dateStr = String(dateVal ?? '').trim();
  if (!dateStr) return null;

  const isoOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (isoOnlyMatch) {
    const y = Number(isoOnlyMatch[1]);
    const m = Number(isoOnlyMatch[2]);
    const d = Number(isoOnlyMatch[3]);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() === y &&
      probe.getUTCMonth() + 1 === m &&
      probe.getUTCDate() === d
    ) {
      return dateStr;
    }
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    const datePart = dateStr.slice(0, 10);
    return parseDateValue(datePart);
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr);
  if (slashMatch) {
    const m = Number(slashMatch[1]);
    const d = Number(slashMatch[2]);
    const y = Number(slashMatch[3]);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() === y &&
      probe.getUTCMonth() + 1 === m &&
      probe.getUTCDate() === d
    ) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return toLocalDateString(parsed);
}

export function matchCategoryName(
  raw: string | null | undefined,
  categories: Category[]
): { categoryId: number | null; category: string | null; unrecognized: string | null } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { categoryId: null, category: null, unrecognized: null };
  }
  const lower = trimmed.toLowerCase();
  if (lower === 'uncategorized' || lower === 'none' || lower === '-') {
    return { categoryId: null, category: null, unrecognized: null };
  }

  const found = categories.find((c) => c.name.trim().toLowerCase() === lower);
  if (!found) {
    return { categoryId: null, category: null, unrecognized: trimmed };
  }
  return { categoryId: found.id, category: found.name, unrecognized: null };
}

export function matchGoalTitle(
  raw: string | null | undefined,
  goals: Goal[]
): { goalId: number | null; goalTitle: string | null; unrecognized: string | null } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { goalId: null, goalTitle: null, unrecognized: null };
  }
  const lower = trimmed.toLowerCase();
  if (lower === 'none' || lower === 'standalone' || lower === '-') {
    return { goalId: null, goalTitle: null, unrecognized: null };
  }

  const found = goals.find((g) => g.title.trim().toLowerCase() === lower);
  if (!found) {
    return { goalId: null, goalTitle: null, unrecognized: trimmed };
  }
  return { goalId: found.id, goalTitle: found.title, unrecognized: null };
}

export function parseCareerImportRows(
  rows: unknown[][],
  categories: Category[] = [],
  goals: Goal[] = []
): ParsedImportRow[] {
  const nonEmptyRows = (rows || []).filter(
    (row) =>
      Array.isArray(row) &&
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  );

  if (nonEmptyRows.length < 2) {
    throw new Error('File must contain a header row and at least one data row.');
  }

  let headerRowIdx = -1;
  let titleIdx = -1;
  let descriptionIdx = -1;
  let startDateIdx = -1;
  let endDateIdx = -1;
  let hoursIdx = -1;
  let categoryIdx = -1;
  let goalIdx = -1;

  const maxHeaderScan = Math.min(10, nonEmptyRows.length);
  for (let i = 0; i < maxHeaderScan; i++) {
    const candidateHeaders = nonEmptyRows[i].map(normalizeHeader);
    const tIdx = findColumn(candidateHeaders, 'title');
    const hIdx = findColumn(candidateHeaders, 'hours');
    const sIdx = findColumn(candidateHeaders, 'startDate');
    if (tIdx !== -1 && hIdx !== -1 && sIdx !== -1) {
      headerRowIdx = i;
      titleIdx = tIdx;
      hoursIdx = hIdx;
      startDateIdx = sIdx;
      descriptionIdx = findColumn(candidateHeaders, 'description');
      endDateIdx = findColumn(candidateHeaders, 'endDate');
      categoryIdx = findColumn(candidateHeaders, 'category');
      goalIdx = findColumn(candidateHeaders, 'goal');
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      'File must contain Title, Hours, and Start Date columns (Description, End Date, Category, and Linked Goal are optional).'
    );
  }

  if (nonEmptyRows.length <= headerRowIdx + 1) {
    throw new Error('File must contain a header row and at least one data row.');
  }

  const parsed: ParsedImportRow[] = [];

  for (let i = headerRowIdx + 1; i < nonEmptyRows.length; i++) {
    const values = nonEmptyRows[i];
    const rowNumber = i + 1;

    const rawCell = (idx: number): unknown => (idx !== -1 ? values[idx] : null);
    const cellText = (idx: number): string => {
      const val = rawCell(idx);
      return val !== null && val !== undefined ? String(val).trim() : '';
    };

    const title = cellText(titleIdx);
    const hoursStr = cellText(hoursIdx);
    const startRaw = rawCell(startDateIdx);
    const startStr = cellText(startDateIdx);

    if (!title || !hoursStr || !startStr) {
      continue;
    }

    const hours = Number.parseFloat(hoursStr);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 999.99) {
      throw new Error(`Invalid hours value at row ${rowNumber}: "${hoursStr}" (must be between 0.01 and 999.99).`);
    }

    const startDate = parseDateValue(startRaw);
    if (!startDate) {
      throw new Error(`Invalid start date at row ${rowNumber}: "${startStr}".`);
    }

    const endRaw = rawCell(endDateIdx);
    const endStr = cellText(endDateIdx);
    let endDate = startDate;
    if (endStr) {
      const parsedEnd = parseDateValue(endRaw);
      if (!parsedEnd) {
        throw new Error(`Invalid end date at row ${rowNumber}: "${endStr}".`);
      }
      if (parsedEnd < startDate) {
        throw new Error(`End date is before start date at row ${rowNumber}: ${startDate} > ${parsedEnd}.`);
      }
      endDate = parsedEnd;
    }

    const categoryMatch = categories.length > 0
      ? matchCategoryName(cellText(categoryIdx), categories)
      : { categoryId: null, category: cellText(categoryIdx) || null, unrecognized: null };

    const goalMatch = goals.length > 0
      ? matchGoalTitle(cellText(goalIdx), goals)
      : { goalId: null, goalTitle: cellText(goalIdx) || null, unrecognized: null };

    parsed.push({
      title,
      description: cellText(descriptionIdx) || null,
      startDate,
      endDate,
      hours: Math.round(hours * 100) / 100,
      category: categoryMatch.category,
      categoryId: categoryMatch.categoryId,
      unrecognizedCategory: categoryMatch.unrecognized,
      goalTitle: goalMatch.goalTitle,
      goalId: goalMatch.goalId,
      unrecognizedGoal: goalMatch.unrecognized,
    });
  }

  if (parsed.length === 0) {
    throw new Error('No valid career development entries were found in the file.');
  }

  return parsed;
}

export async function parseImportFile(
  file: File,
  categories: Category[] = [],
  goals: Goal[] = []
): Promise<ParsedImportRow[]> {
  const lowerName = (file.name || '').toLowerCase();
  if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx')) {
    throw new Error('Only CSV (.csv) and Excel (.xlsx) files are supported.');
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error('Selected file exceeds the 2 MB size limit.');
  }

  if (lowerName.endsWith('.xlsx')) {
    const buffer =
      typeof file.arrayBuffer === 'function'
        ? await file.arrayBuffer()
        : await new Response(file).arrayBuffer();
    const rows = await readXlsxRows(buffer);
    return parseCareerImportRows(rows, categories, goals);
  }

  const text =
    typeof file.text === 'function'
      ? await file.text()
      : await new Response(file).text();
  const rows = parseCsvText(text);
  return parseCareerImportRows(rows, categories, goals);
}

export function prepareEntriesForImport(
  rows: ParsedImportRow[],
  defaultGoalId: number | null = null,
  goals: Goal[] = []
): ImportCareerEntryRowPayload[] {
  const defaultGoal = defaultGoalId ? goals.find((g) => g.id === defaultGoalId) : undefined;

  return rows.map((entry) => {
    let title = entry.title.trim();
    let description = entry.description ? entry.description.trim() : null;

    if (title.length > MAX_TITLE_LENGTH) {
      description = title + (description ? `\n\n${description}` : '');
      let truncated = title.slice(0, MAX_TITLE_LENGTH);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > MAX_TITLE_LENGTH * 0.6) {
        truncated = truncated.slice(0, lastSpace);
      }
      title = truncated.trim();
    }

    const resolvedGoalId = entry.goalId ?? (defaultGoal ? defaultGoal.id : null);
    const resolvedGoalTitle = entry.goalTitle ?? (defaultGoal ? defaultGoal.title : null);

    return {
      title,
      description,
      startDate: entry.startDate,
      endDate: entry.endDate || entry.startDate,
      hours: entry.hours,
      category: entry.category,
      categoryId: entry.categoryId,
      goalTitle: resolvedGoalTitle,
      goalId: resolvedGoalId,
    };
  });
}

const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@', '\t', '\r', '\n', '|']);

export function sanitizeCsvCell(value: string | number | null | undefined): string {
  let raw = value == null ? '' : String(value);
  if (raw.length > 0) {
    const trimmed = raw.trimStart();
    const firstRaw = raw[0];
    const firstTrimmed = trimmed[0] ?? '';
    if (FORMULA_TRIGGER_CHARS.has(firstRaw) || FORMULA_TRIGGER_CHARS.has(firstTrimmed)) {
      raw = `'${raw}`;
    }
  }

  if (/[,"\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildCareerEntriesCsv(entries: CareerEntry[]): string {
  const lines = ['Title,Category,Linked Goal,Start Date,End Date,Hours,Description'];
  for (const entry of entries) {
    lines.push(
      [
        sanitizeCsvCell(entry.title),
        sanitizeCsvCell(entry.category || 'Uncategorized'),
        sanitizeCsvCell(entry.goalTitle || ''),
        sanitizeCsvCell(entry.startDate),
        sanitizeCsvCell(entry.endDate),
        String(Math.round((Number(entry.hours) || 0) * 100) / 100),
        sanitizeCsvCell(entry.description || ''),
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSampleImportTemplate(): void {
  const blob = new Blob([SAMPLE_IMPORT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
  triggerBlobDownload(blob, 'sample-career-development-template.csv');
}

export { buildCareerDevelopmentXlsx, readXlsxRows };
