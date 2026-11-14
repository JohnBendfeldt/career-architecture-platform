import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  buildCareerEntriesCsv,
  parseCareerImportRows,
  parseCsvText,
  sanitizeCsvCell,
} from '../utils/advancementImportExport';
import {
  buildCareerDevelopmentXlsx,
  excelSerialToIsoDate,
  readXlsxRows,
} from '../utils/xlsxCodec';
import { DEFAULT_CATEGORIES } from '../utils/advancementUtils';
import { ApiService } from '../services/api';
import { GoalsSection } from '../components/GoalsSection';
import type { CareerEntry } from '../types';

vi.mock('../services/supabase', () => ({
  getOrInitSupabaseClient: () => null,
  signOutFromSupabase: vi.fn(),
  consumeGoogleIdTokenFromHash: vi.fn().mockResolvedValue(undefined),
}));

async function deflateRaw(input: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
  const reader = stream
    .pipeThrough(new CompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>)
    .getReader();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.byteLength;
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function buildCompressedXlsxWithSharedStringsAndDates(): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const xmlFiles: Array<{ name: string; content: string }> = [
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/styles.xml',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<cellXfs count="2">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
        '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>' +
        '</cellXfs>' +
        '</styleSheet>',
    },
    {
      name: 'xl/sharedStrings.xml',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="4">' +
        '<si><t>Title</t></si>' +
        '<si><t>Description</t></si>' +
        '<si><t>Start Date</t></si>' +
        '<si><t>Hours</t></si>' +
        '<si><t>Category</t></si>' +
        '<si><t>OpenXML Compressed Study</t></si>' +
        '<si><t>Security</t></si>' +
        '</sst>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData>' +
        '<row r="1">' +
        '<c r="A1" t="s"><v>0</v></c>' +
        '<c r="B1" t="s"><v>1</v></c>' +
        '<c r="C1" t="s"><v>2</v></c>' +
        '<c r="D1" t="s"><v>3</v></c>' +
        '<c r="E1" t="s"><v>4</v></c>' +
        '</row>' +
        '<row r="2">' +
        '<c r="A2" t="s"><v>5</v></c>' +
        '<c r="C2" s="1"><v>46034</v></c>' +
        '<c r="D2"><v>5.5</v></c>' +
        '<c r="E2" t="s"><v>6</v></c>' +
        '</row>' +
        '</sheetData>' +
        '</worksheet>',
    },
  ];

  const prepared: Array<{
    nameBytes: Uint8Array;
    compressed: Uint8Array;
    rawSize: number;
    offset: number;
  }> = [];

  let totalSize = 22;
  for (const item of xmlFiles) {
    const raw = encoder.encode(item.content);
    const compressed = await deflateRaw(raw);
    const nameBytes = encoder.encode(item.name);
    prepared.push({ nameBytes, compressed, rawSize: raw.length, offset: 0 });
    totalSize += 30 + nameBytes.length + compressed.length;
    totalSize += 46 + nameBytes.length;
  }

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);
  let cursor = 0;

  for (const entry of prepared) {
    entry.offset = cursor;
    view.setUint32(cursor, 0x04034b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 0x0800, true);
    view.setUint16(cursor + 8, 8, true); // DEFLATE
    view.setUint32(cursor + 18, entry.compressed.length, true);
    view.setUint32(cursor + 22, entry.rawSize, true);
    view.setUint16(cursor + 26, entry.nameBytes.length, true);
    cursor += 30;
    out.set(entry.nameBytes, cursor);
    cursor += entry.nameBytes.length;
    out.set(entry.compressed, cursor);
    cursor += entry.compressed.length;
  }

  const cdOffset = cursor;
  for (const entry of prepared) {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 8, 0x0800, true);
    view.setUint16(cursor + 10, 8, true);
    view.setUint32(cursor + 20, entry.compressed.length, true);
    view.setUint32(cursor + 24, entry.rawSize, true);
    view.setUint16(cursor + 28, entry.nameBytes.length, true);
    view.setUint32(cursor + 42, entry.offset, true);
    cursor += 46;
    out.set(entry.nameBytes, cursor);
    cursor += entry.nameBytes.length;
  }

  const cdSize = cursor - cdOffset;
  view.setUint32(cursor, 0x06054b50, true);
  view.setUint16(cursor + 8, prepared.length, true);
  view.setUint16(cursor + 10, prepared.length, true);
  view.setUint32(cursor + 12, cdSize, true);
  view.setUint32(cursor + 16, cdOffset, true);

  return out.buffer;
}

describe('Career Advancement Phase 2: Bulk Import, .xlsx & .csv Export', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('CSV parsing, validation & OWASP formula-injection sanitization', () => {
    it('parses RFC 4180 CSV with quoted commas, matches categories & goals, and flags unrecognized values', async () => {
      const goals = await ApiService.getGoals();
      const csv = [
        '\uFEFFTitle,Description,Start Date,End Date,Hours,Category,Linked Goal',
        '"React 19, Hooks & Suspense","Deep dive into async transitions, actions",2026-03-10,2026-03-12,6.5,Development,"Cloud Architecture & Microservices (.NET & YARP)"',
        'GraphQL Federation,,2026-04-02,,3,Unknown Track,',
      ].join('\n');

      const rawRows = parseCsvText(csv);
      const parsed = parseCareerImportRows(rawRows, DEFAULT_CATEGORIES, goals);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('React 19, Hooks & Suspense');
      expect(parsed[0].description).toBe('Deep dive into async transitions, actions');
      expect(parsed[0].categoryId).toBe(1);
      expect(parsed[0].category).toBe('Development');
      expect(parsed[0].goalId).toBe(5);
      expect(parsed[0].unrecognizedCategory).toBeNull();

      expect(parsed[1].endDate).toBe('2026-04-02');
      expect(parsed[1].categoryId).toBeNull();
      expect(parsed[1].unrecognizedCategory).toBe('Unknown Track');
    });

    it('rejects invalid hours and inverted date ranges during CSV parsing', () => {
      expect(() =>
        parseCareerImportRows(
          parseCsvText('Title,Start Date,Hours\nBad Hours,2026-03-10,-2'),
          DEFAULT_CATEGORIES,
          []
        )
      ).toThrow(/Invalid hours value at row 2/i);

      expect(() =>
        parseCareerImportRows(
          parseCsvText('Title,Start Date,End Date,Hours\nInverted,2026-04-10,2026-04-01,2'),
          DEFAULT_CATEGORIES,
          []
        )
      ).toThrow(/End date is before start date/i);
    });

    it('neutralizes formula-injection prefixes in CSV exports', () => {
      expect(sanitizeCsvCell('=1+2')).toBe("'=1+2");
      expect(sanitizeCsvCell('=CMD("calc")')).toBe('"\'=CMD(""calc"")"');
      expect(sanitizeCsvCell('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
      expect(sanitizeCsvCell('-2+3')).toBe("'-2+3");
      expect(sanitizeCsvCell('@malicious')).toBe("'@malicious");

      const entries: CareerEntry[] = [
        {
          id: 1,
          title: '=HYPERLINK("https://evil.example","Click")',
          description: '+cmd|calc & "quoted"',
          startDate: '2026-05-01',
          endDate: '2026-05-01',
          hours: 2.5,
          categoryId: 1,
          category: 'Development',
          goalId: null,
          goalTitle: null,
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: null,
        },
      ];

      const csvOutput = buildCareerEntriesCsv(entries);
      expect(csvOutput).toContain('Title,Category,Linked Goal,Start Date,End Date,Hours,Description');
      expect(csvOutput).toContain('"\'=HYPERLINK(""https://evil.example"",""Click"")"');
      expect(csvOutput).toContain('"\'+cmd|calc & ""quoted"""');
    });
  });

  describe('Zero-dependency OpenXML (.xlsx) round-trip codec', () => {
    it('exports an .xlsx workbook and parses it back cleanly including Row 5 header detection & XML escaping', async () => {
      const goals = await ApiService.getGoals();
      const sourceEntries: CareerEntry[] = [
        {
          id: 101,
          title: 'CQRS & Event Sourcing <Deep Dive>',
          description: 'Handled "idempotent" outbox & dead-letter recovery.',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
          hours: 7.5,
          categoryId: 1,
          category: 'Development',
          goalId: 5,
          goalTitle: 'Cloud Architecture & Microservices (.NET & YARP)',
          createdAt: '2026-06-03T12:00:00Z',
          updatedAt: null,
        },
      ];

      const xlsxBytes = buildCareerDevelopmentXlsx({
        professionalName: 'Jordan & Taylor',
        annualGoalHours: 55,
        year: 2026,
        entries: sourceEntries,
      });

      const sheetRows = await readXlsxRows(xlsxBytes.buffer as ArrayBuffer);
      expect(sheetRows[0][0]).toBe('Career Development History - Jordan & Taylor');
      expect(sheetRows[1][0]).toBe('Year: 2026');
      expect(sheetRows[2][0]).toBe('Annual Goal: 55.0 hrs | Total Logged: 7.5 hrs');

      const reimported = parseCareerImportRows(sheetRows, DEFAULT_CATEGORIES, goals);
      expect(reimported).toHaveLength(1);
      expect(reimported[0].title).toBe('CQRS & Event Sourcing <Deep Dive>');
      expect(reimported[0].description).toBe('Handled "idempotent" outbox & dead-letter recovery.');
      expect(reimported[0].hours).toBe(7.5);
      expect(reimported[0].categoryId).toBe(1);
      expect(reimported[0].goalId).toBe(5);
    });

    it('reads DEFLATE-compressed .xlsx files with sharedStrings.xml, sparse columns, and Excel serial dates', async () => {
      expect(excelSerialToIsoDate(46034)).toBe('2026-01-12');

      const compressedBuffer = await buildCompressedXlsxWithSharedStringsAndDates();
      const rows = await readXlsxRows(compressedBuffer);
      const parsed = parseCareerImportRows(rows, DEFAULT_CATEGORIES, []);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('OpenXML Compressed Study');
      expect(parsed[0].description).toBeNull();
      expect(parsed[0].startDate).toBe('2026-01-12');
      expect(parsed[0].endDate).toBe('2026-01-12');
      expect(parsed[0].hours).toBe(5.5);
      expect(parsed[0].categoryId).toBe(6);
      expect(parsed[0].category).toBe('Security');
    });
  });

  describe('ApiService bulk import & export with tandem goal rollup', () => {
    it('blocks bulk import for guest users with 403 and enforces the 50-row limit', async () => {
      await ApiService.loginAsGuest();

      const guestRes = await ApiService.importCareerEntries([
        {
          title: 'Guest Entry',
          startDate: '2026-05-01',
          endDate: '2026-05-01',
          hours: 2,
          categoryId: 1,
        },
      ]);
      expect(guestRes.success).toBe(false);
      expect(guestRes.status).toBe(403);

      ApiService.setSession('oauth-admin', {
        id: 'admin-1',
        name: 'Taylor',
        email: 'taylor@example.com',
        role: 'admin',
        avatarUrl: '',
      });

      const oversized = Array.from({ length: 51 }, (_, idx) => ({
        title: `Batch Item ${idx + 1}`,
        startDate: '2026-05-01',
        endDate: '2026-05-01',
        hours: 1,
      }));
      const tooManyRes = await ApiService.importCareerEntries(oversized);
      expect(tooManyRes.success).toBe(false);
      expect(tooManyRes.status).toBe(400);
    });

    it('imports entries, skips duplicates (intra-batch & existing), and auto-completes linked tandem goals', async () => {
      ApiService.setSession('oauth-admin', {
        id: 'admin-2',
        name: 'Taylor Engineer',
        email: 'taylor@example.com',
        role: 'admin',
        avatarUrl: '',
      });

      const goalRes = await ApiService.createGoal({
        title: 'Bulk Import Target Goal',
        description: 'Verify automatic rollup after CSV import.',
        category: 'Technical',
        targetHours: 10,
      });
      const goalId = goalRes.goal!.id;

      const batchResult = await ApiService.importCareerEntries([
        {
          title: 'Distributed Cache Lab',
          startDate: '2026-04-10',
          endDate: '2026-04-10',
          hours: 4,
          categoryId: 1,
          goalId,
        },
        {
          title: 'Distributed Cache Lab', // Intra-batch duplicate
          startDate: '2026-04-10',
          endDate: '2026-04-10',
          hours: 4,
          categoryId: 1,
          goalId,
        },
        {
          title: 'Resilient Messaging Lab',
          startDate: '2026-04-12',
          endDate: '2026-04-12',
          hours: 6,
          categoryId: 4,
          goalId,
        },
      ]);

      expect(batchResult.success).toBe(true);
      expect(batchResult.successCount).toBe(2);
      expect(batchResult.duplicateCount).toBe(1);
      expect(batchResult.errorCount).toBe(1);

      const updatedGoal = ApiService.getPersonalGoals().find((g) => g.id === goalId)!;
      expect(updatedGoal.loggedHours).toBe(10);
      expect(updatedGoal.entryCount).toBe(2);
      expect(updatedGoal.progress).toBe(100);
      expect(updatedGoal.status).toBe('Completed');

      // Re-importing the same row should detect existing duplicate
      const secondRun = await ApiService.importCareerEntries([
        {
          title: 'Distributed Cache Lab',
          startDate: '2026-04-10',
          endDate: '2026-04-10',
          hours: 4,
          categoryId: 1,
          goalId,
        },
      ]);
      expect(secondRun.success).toBe(false);
      expect(secondRun.duplicateCount).toBe(1);
    });

    it('exports .xlsx and .csv career reports as downloadable blobs', async () => {
      const capturedBlobs: Blob[] = [];
      vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
        capturedBlobs.push(obj as Blob);
        return `blob:http://localhost/export-${capturedBlobs.length}`;
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const xlsxMeta = await ApiService.exportCareerEntries({
        year: 2026,
        format: 'xlsx',
        entries: ApiService.getDefaultPortfolioEntries(),
        profileName: 'John F. Bendfeldt',
        annualGoalHours: 55,
      });
      expect(xlsxMeta.filename).toMatch(/^CareerDevelopment_2026_\d{8}\.xlsx$/);

      const csvMeta = await ApiService.exportCareerEntries({
        year: 2026,
        format: 'csv',
        entries: ApiService.getDefaultPortfolioEntries(),
      });
      expect(csvMeta.filename).toMatch(/^CareerDevelopment_2026_\d{8}\.csv$/);
      expect(clickSpy).toHaveBeenCalledTimes(2);

      const exportedXlsxBuffer = await capturedBlobs[0].arrayBuffer();
      const decodedRows = await readXlsxRows(exportedXlsxBuffer);
      expect(decodedRows.length).toBeGreaterThanOrEqual(8); // Summary rows + row 5 headers + 5 2026 entries

      const exportedCsvText = await capturedBlobs[1].text();
      expect(exportedCsvText).toContain('Subscription Ledger & Checkout Accounting Architecture');
      expect(exportedCsvText).not.toContain('Docker & Container Orchestration Deep Dive'); // 2025 excluded
    });
  });

  describe('ImportCareerEntriesModal & GoalsSection UI integration', () => {
    it('uploads CSV, lets user remap unrecognized category/goal in preview, and displays import results', async () => {
      ApiService.setSession('oauth-personal', {
        id: 'personal-1',
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        role: 'admin',
        avatarUrl: '',
      });

      const goals = ApiService.getPersonalGoals();
      const entries = ApiService.getPersonalEntries();
      const onRefresh = vi.fn();

      render(
        <GoalsSection
          goals={goals}
          entries={entries}
          workspaceMode="personal"
          profileName="Jordan Lee"
          annualGoalHours={45}
          onRefresh={onRefresh}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /^Import$/i }));
      expect(screen.getByText(/Bulk Import Career Entries/i)).toBeDefined();

      const csvContent = [
        'Title,Description,Start Date,End Date,Hours,Category,Linked Goal',
        'Clean Architecture Deep Dive,Hexagonal ports and adapters,2026-04-14,2026-04-14,3.5,Development,',
        'UI Polish Sprint,Editorial dark mode contrast check,2026-05-18,,2,Custom Unknown Cat,',
      ].join('\n');
      const file = new File([csvContent], 'training-log.csv', { type: 'text/csv' });

      const fileInput = screen.getByTestId('import-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Preview: 2 entries ready \(5.5 hrs total\)/i)).toBeDefined();
      });
      expect(screen.getByText(/1 unrecognized category name/i)).toBeDefined();

      // Remap row 2 category to Design (id: 9) and link row 1 to Step 2 goal (id: 1002)
      const row2CategorySelect = screen.getByLabelText('Category for row 2') as HTMLSelectElement;
      fireEvent.change(row2CategorySelect, { target: { value: '9' } });

      const row1GoalSelect = screen.getByLabelText('Linked Goal for row 1') as HTMLSelectElement;
      fireEvent.change(row1GoalSelect, { target: { value: '1002' } });

      fireEvent.click(screen.getByRole('button', { name: /Import 2 Entries/i }));

      await waitFor(() => {
        expect(screen.getByText('Import Completed Successfully')).toBeDefined();
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('surfaces 403 Forbidden policy notice when a guest submits a parsed import batch', async () => {
      await ApiService.loginAsGuest();
      const goals = await ApiService.getGoals();
      const entries = ApiService.getDefaultPortfolioEntries();

      render(
        <GoalsSection
          goals={goals}
          entries={entries}
          workspaceMode="portfolio"
          annualGoalHours={55}
          onRefresh={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /^Import$/i }));

      const csvFile = new File(
        ['Title,Start Date,Hours,Category\nGuest Attempt,2026-05-01,2,Development'],
        'guest.csv',
        { type: 'text/csv' }
      );
      fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [csvFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Preview: 1 entry ready/i)).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Import 1 Entry/i }));

      await waitFor(() => {
        expect(screen.getByText(/ASP\.NET Core 403 Forbidden Policy/i)).toBeDefined();
      });
    });
  });
});
