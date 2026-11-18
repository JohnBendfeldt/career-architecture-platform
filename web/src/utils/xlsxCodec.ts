import type { CareerEntry } from '../types';

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_UNZIPPED_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_XLSX_COL_INDEX = 128;
export const MAX_XLSX_ROWS = 5_000;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8');

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function escapeXml(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  let cleaned = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code === 0x09 || code === 0x0a || code === 0x0d || code >= 0x20) {
      cleaned += raw[i];
    }
  }

  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ZipWriteEntry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

export function buildZipStore(entries: Array<{ name: string; content: string }>): Uint8Array {
  const prepared: ZipWriteEntry[] = [];
  let totalLength = 22; // End of Central Directory

  for (const item of entries) {
    const nameBytes = TEXT_ENCODER.encode(item.name);
    const data = TEXT_ENCODER.encode(item.content);
    const crc = computeCrc32(data);
    prepared.push({ nameBytes, data, crc, offset: 0 });
    totalLength += 30 + nameBytes.length + data.length; // Local header + data
    totalLength += 46 + nameBytes.length; // Central directory header
  }

  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);
  const modTime = 0;
  const modDate = 0x5c21; // 2026-01-01 in MS-DOS date format

  let cursor = 0;
  for (const entry of prepared) {
    entry.offset = cursor;
    // Local file header
    view.setUint32(cursor, 0x04034b50, true);
    view.setUint16(cursor + 4, 20, true); // version needed
    view.setUint16(cursor + 6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(cursor + 8, 0, true); // method: STORE
    view.setUint16(cursor + 10, modTime, true);
    view.setUint16(cursor + 12, modDate, true);
    view.setUint32(cursor + 14, entry.crc, true);
    view.setUint32(cursor + 18, entry.data.length, true);
    view.setUint32(cursor + 22, entry.data.length, true);
    view.setUint16(cursor + 26, entry.nameBytes.length, true);
    view.setUint16(cursor + 28, 0, true); // extra length
    cursor += 30;

    out.set(entry.nameBytes, cursor);
    cursor += entry.nameBytes.length;
    out.set(entry.data, cursor);
    cursor += entry.data.length;
  }

  const centralDirectoryOffset = cursor;
  for (const entry of prepared) {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true); // version made by
    view.setUint16(cursor + 6, 20, true); // version needed
    view.setUint16(cursor + 8, 0x0800, true); // UTF-8 filename flag
    view.setUint16(cursor + 10, 0, true); // method: STORE
    view.setUint16(cursor + 12, modTime, true);
    view.setUint16(cursor + 14, modDate, true);
    view.setUint32(cursor + 16, entry.crc, true);
    view.setUint32(cursor + 20, entry.data.length, true);
    view.setUint32(cursor + 24, entry.data.length, true);
    view.setUint16(cursor + 28, entry.nameBytes.length, true);
    view.setUint16(cursor + 30, 0, true); // extra len
    view.setUint16(cursor + 32, 0, true); // comment len
    view.setUint16(cursor + 34, 0, true); // disk number
    view.setUint16(cursor + 36, 0, true); // internal attrs
    view.setUint32(cursor + 38, 0, true); // external attrs
    view.setUint32(cursor + 42, entry.offset, true);
    cursor += 46;

    out.set(entry.nameBytes, cursor);
    cursor += entry.nameBytes.length;
  }

  const centralDirectorySize = cursor - centralDirectoryOffset;

  // End of central directory record
  view.setUint32(cursor, 0x06054b50, true);
  view.setUint16(cursor + 4, 0, true);
  view.setUint16(cursor + 6, 0, true);
  view.setUint16(cursor + 8, prepared.length, true);
  view.setUint16(cursor + 10, prepared.length, true);
  view.setUint32(cursor + 12, centralDirectorySize, true);
  view.setUint32(cursor + 16, centralDirectoryOffset, true);
  view.setUint16(cursor + 20, 0, true);

  return out;
}

function inlineCell(ref: string, styleIndex: number, value: string | null | undefined): string {
  return `<c r="${ref}" s="${styleIndex}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

export function buildCareerDevelopmentXlsx(options: {
  professionalName: string;
  annualGoalHours: number;
  year?: number | null;
  entries: CareerEntry[];
}): Uint8Array {
  const { professionalName, annualGoalHours, year, entries } = options;
  const totalHours = Math.round(entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0) * 100) / 100;
  const yearLabel = year ? `Year: ${year}` : 'All Years';
  const summaryLine = `Annual Goal: ${annualGoalHours.toFixed(1)} hrs | Total Logged: ${totalHours.toFixed(1)} hrs`;

  const headers = ['Title', 'Category', 'Linked Goal', 'Start Date', 'End Date', 'Hours', 'Description'];
  const headerCells = headers
    .map((h, i) => inlineCell(`${String.fromCharCode(65 + i)}5`, 4, h))
    .join('');

  const dataRows = entries
    .map((entry, idx) => {
      const rowNum = 6 + idx;
      const isAlt = idx % 2 === 1;
      const textStyle = isAlt ? 6 : 5;
      const numStyle = isAlt ? 8 : 7;
      const safeHours = Number.isFinite(Number(entry.hours)) ? Number(entry.hours) : 0;

      return `<row r="${rowNum}">${[
        inlineCell(`A${rowNum}`, textStyle, entry.title),
        inlineCell(`B${rowNum}`, textStyle, entry.category || 'Uncategorized'),
        inlineCell(`C${rowNum}`, textStyle, entry.goalTitle || ''),
        inlineCell(`D${rowNum}`, textStyle, entry.startDate),
        inlineCell(`E${rowNum}`, textStyle, entry.endDate),
        `<c r="F${rowNum}" s="${numStyle}"><v>${safeHours}</v></c>`,
        inlineCell(`G${rowNum}`, textStyle, entry.description || ''),
      ].join('')}</row>`;
    })
    .join('');

  const contentTypesXml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Career Development" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const stylesXml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>` +
    `<fonts count="5">` +
    `<font><sz val="11"/><color rgb="FF111111"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="14"/><color rgb="FF111111"/><name val="Calibri"/></font>` +
    `<font><sz val="11"/><color rgb="FF3D3D3A"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFE60012"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `</fonts>` +
    `<fills count="4">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF6F5F0"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="3">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border><left/><right/><top/><bottom style="medium"><color rgb="FFE60012"/></bottom><diagonal/></border>` +
    `<border><left/><right/><top/><bottom style="thin"><color rgb="FFE2E1DC"/></bottom><diagonal/></border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="9">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>` +
    `<xf numFmtId="0" fontId="0" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>` +
    `<xf numFmtId="164" fontId="0" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>` +
    `</cellXfs>` +
    `</styleSheet>`;

  const colWidths = [38, 22, 34, 14, 14, 10, 48]
    .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  const worksheetXml =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<cols>${colWidths}</cols>` +
    `<sheetData>` +
    `<row r="1">${inlineCell('A1', 1, `Career Development History - ${professionalName}`)}</row>` +
    `<row r="2">${inlineCell('A2', 2, yearLabel)}</row>` +
    `<row r="3">${inlineCell('A3', 3, summaryLine)}</row>` +
    `<row r="5" ht="24" customHeight="1">${headerCells}</row>` +
    dataRows +
    `</sheetData>` +
    `</worksheet>`;

  return buildZipStore([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: worksheetXml },
  ]);
}

async function inflateDeflateRaw(compressed: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress compressed .xlsx archives; please save as .csv.');
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    },
  });

  const reader = stream
    .pipeThrough(new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>)
    .getReader();

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Decompressed .xlsx content exceeds the 10 MB safety limit.');
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function unzipXmlEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  if (buffer.byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error('Uploaded .xlsx file exceeds the 2 MB size limit.');
  }
  if (buffer.byteLength < 22) {
    throw new Error('Invalid .xlsx file (archive too small).');
  }

  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Invalid .xlsx file (missing ZIP signature).');
  }

  const view = new DataView(buffer);
  const minScan = Math.max(0, bytes.length - 65557);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= minScan; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid .xlsx file (ZIP central directory not found).');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);
  const files = new Map<string, string>();
  let totalUnzipped = 0;

  for (let i = 0; i < totalEntries; i++) {
    if (cdOffset + 46 > bytes.length || view.getUint32(cdOffset, true) !== 0x02014b50) {
      throw new Error('Corrupted .xlsx ZIP central directory.');
    }

    const method = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const uncompressedSize = view.getUint32(cdOffset + 24, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = TEXT_DECODER.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
    cdOffset += 46 + nameLen + extraLen + commentLen;

    const lowerName = fileName.toLowerCase();
    const isRelevantXml =
      lowerName.endsWith('.xml') || lowerName.endsWith('.rels');
    if (!isRelevantXml) {
      continue;
    }

    if (uncompressedSize > MAX_UNZIPPED_BYTES || totalUnzipped + uncompressedSize > MAX_UNZIPPED_BYTES) {
      throw new Error('Decompressed .xlsx content exceeds the 10 MB safety limit.');
    }

    if (localHeaderOffset + 30 > bytes.length || view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      throw new Error(`Corrupted local header in .xlsx for ${fileName}.`);
    }

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) {
      throw new Error(`Truncated .xlsx entry for ${fileName}.`);
    }

    const rawSlice = bytes.slice(dataStart, dataEnd);
    let inflated: Uint8Array;
    if (method === 0) {
      inflated = rawSlice;
    } else if (method === 8) {
      inflated = await inflateDeflateRaw(rawSlice, MAX_UNZIPPED_BYTES - totalUnzipped);
    } else {
      throw new Error(`Unsupported .xlsx compression method (${method}); please save as standard .xlsx or .csv.`);
    }

    totalUnzipped += inflated.byteLength;
    if (totalUnzipped > MAX_UNZIPPED_BYTES) {
      throw new Error('Decompressed .xlsx content exceeds the 10 MB safety limit.');
    }

    files.set(fileName.replace(/^\/+/, ''), TEXT_DECODER.decode(inflated));
  }

  return files;
}

function getElementsByLocalName(root: Document | Element, localName: string): Element[] {
  const all = root.getElementsByTagName('*');
  const matches: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const name = el.localName || el.tagName.split(':').pop() || el.tagName;
    if (name === localName) {
      matches.push(el);
    }
  }
  return matches;
}

function parseXmlDocument(xmlText: string): Document {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML structure inside .xlsx archive.');
  }
  return doc;
}

function parseSharedStrings(xmlText: string | undefined): string[] {
  if (!xmlText) return [];
  const doc = parseXmlDocument(xmlText);
  const items = getElementsByLocalName(doc, 'si');
  return items.map((si) => {
    const tNodes = getElementsByLocalName(si, 't').filter((t) => {
      let parent = t.parentElement;
      while (parent && parent !== si) {
        const pName = parent.localName || parent.tagName.split(':').pop();
        if (pName === 'rPh') return false;
        parent = parent.parentElement;
      }
      return true;
    });
    return tNodes.map((t) => t.textContent ?? '').join('');
  });
}

function isDateNumberFormat(numFmtId: number, customFormatCode?: string): boolean {
  if ((numFmtId >= 14 && numFmtId <= 22) || (numFmtId >= 27 && numFmtId <= 36) || (numFmtId >= 45 && numFmtId <= 47)) {
    return true;
  }
  if (!customFormatCode) return false;
  const stripped = customFormatCode
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .toLowerCase();
  return /[yd]/.test(stripped) || (stripped.includes('m') && /[/-]/.test(stripped));
}

function parseDateStyleIndices(xmlText: string | undefined): Set<number> {
  const dateStyles = new Set<number>();
  if (!xmlText) return dateStyles;

  const doc = parseXmlDocument(xmlText);
  const numFmts = new Map<number, string>();
  for (const nf of getElementsByLocalName(doc, 'numFmt')) {
    const id = Number(nf.getAttribute('numFmtId'));
    const code = nf.getAttribute('formatCode') ?? '';
    if (Number.isInteger(id)) {
      numFmts.set(id, code);
    }
  }

  const cellXfsList = getElementsByLocalName(doc, 'cellXfs');
  if (cellXfsList.length === 0) return dateStyles;

  const xfs = getElementsByLocalName(cellXfsList[0], 'xf');
  xfs.forEach((xf, idx) => {
    const numFmtId = Number(xf.getAttribute('numFmtId'));
    if (Number.isInteger(numFmtId) && isDateNumberFormat(numFmtId, numFmts.get(numFmtId))) {
      dateStyles.add(idx);
    }
  });

  return dateStyles;
}

function resolveFirstSheetPath(files: Map<string, string>): string {
  const workbookXml = files.get('xl/workbook.xml');
  const relsXml = files.get('xl/_rels/workbook.xml.rels');

  if (workbookXml && relsXml) {
    try {
      const wbDoc = parseXmlDocument(workbookXml);
      const sheets = getElementsByLocalName(wbDoc, 'sheet');
      const firstSheet = sheets[0];
      const relId = firstSheet?.getAttribute('r:id') || firstSheet?.getAttribute('id');

      if (relId) {
        const relsDoc = parseXmlDocument(relsXml);
        const rels = getElementsByLocalName(relsDoc, 'Relationship');
        const match = rels.find((r) => r.getAttribute('Id') === relId);
        const target = match?.getAttribute('Target');
        if (target) {
          const normalized = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
          if (files.has(normalized)) {
            return normalized;
          }
        }
      }
    } catch {
      // Fallback below
    }
  }

  if (files.has('xl/worksheets/sheet1.xml')) {
    return 'xl/worksheets/sheet1.xml';
  }

  const fallback = Array.from(files.keys()).find((k) => /^xl\/worksheets\/sheet.*\.xml$/i.test(k));
  if (!fallback) {
    throw new Error('No worksheet found inside .xlsx archive.');
  }
  return fallback;
}

export function colLettersToZeroIndex(cellRef: string): number {
  const match = /^[A-Za-z]+/.exec(cellRef);
  if (!match) return -1;
  const letters = match[0].toUpperCase();
  if (letters.length > 3) return -1;
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  const zeroIdx = col - 1;
  return zeroIdx >= 0 && zeroIdx <= MAX_XLSX_COL_INDEX ? zeroIdx : -1;
}

export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958466) {
    return null;
  }
  const utcMs = Date.UTC(1899, 11, 30) + Math.round(serial * 86_400_000);
  const d = new Date(utcMs);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function readXlsxRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  const files = await unzipXmlEntries(buffer);
  const sharedStrings = parseSharedStrings(files.get('xl/sharedStrings.xml'));
  const dateStyles = parseDateStyleIndices(files.get('xl/styles.xml'));
  const sheetPath = resolveFirstSheetPath(files);
  const sheetXml = files.get(sheetPath);

  if (!sheetXml) {
    throw new Error('Unable to read primary worksheet from .xlsx archive.');
  }

  const sheetDoc = parseXmlDocument(sheetXml);
  const rowElements = getElementsByLocalName(sheetDoc, 'row');
  const rows: unknown[][] = [];

  for (const rowEl of rowElements) {
    if (rows.length >= MAX_XLSX_ROWS) {
      break;
    }

    const cellElements = getElementsByLocalName(rowEl, 'c');
    const rowValues: unknown[] = [];
    let nextSequentialCol = 0;

    for (const cellEl of cellElements) {
      const refAttr = cellEl.getAttribute('r') ?? '';
      const hasColRef = /^[A-Za-z]+/.test(refAttr);
      let colIdx: number;
      if (hasColRef) {
        colIdx = colLettersToZeroIndex(refAttr);
        if (colIdx < 0) {
          continue;
        }
      } else {
        colIdx = nextSequentialCol;
        if (colIdx > MAX_XLSX_COL_INDEX) {
          continue;
        }
      }
      nextSequentialCol = colIdx + 1;

      while (rowValues.length <= colIdx) {
        rowValues.push('');
      }

      const cellType = cellEl.getAttribute('t') ?? '';
      const styleIdx = Number(cellEl.getAttribute('s') ?? '-1');

      if (cellType === 'inlineStr') {
        const inlineTNodes = getElementsByLocalName(cellEl, 't');
        rowValues[colIdx] = inlineTNodes.map((n) => n.textContent ?? '').join('');
        continue;
      }

      const vNodes = getElementsByLocalName(cellEl, 'v');
      const vText = vNodes[0]?.textContent ?? '';

      if (cellType === 's') {
        const strIdx = Number(vText);
        rowValues[colIdx] = Number.isInteger(strIdx) && strIdx >= 0 ? (sharedStrings[strIdx] ?? '') : '';
      } else if (cellType === 'str' || cellType === 'e') {
        rowValues[colIdx] = vText;
      } else if (cellType === 'b') {
        rowValues[colIdx] = vText === '1' || vText.toLowerCase() === 'true';
      } else if (vText !== '') {
        const numVal = Number(vText);
        if (Number.isFinite(numVal)) {
          if (dateStyles.has(styleIdx)) {
            rowValues[colIdx] = excelSerialToIsoDate(numVal) ?? numVal;
          } else {
            rowValues[colIdx] = numVal;
          }
        } else {
          rowValues[colIdx] = vText;
        }
      }
    }

    rows.push(rowValues);
  }

  return rows;
}
