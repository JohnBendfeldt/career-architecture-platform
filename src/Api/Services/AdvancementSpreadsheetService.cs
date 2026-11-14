using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using CareerPlatform.Api.Models;

namespace CareerPlatform.Api.Services;

/// <summary>
/// Generates zero-dependency OpenXML (.xlsx) workbooks and OWASP-safe CSV exports
/// for career development entries using .NET 10 BCL compression and XML primitives.
/// </summary>
public static class AdvancementSpreadsheetService
{
    private static readonly Encoding Utf8NoBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
    private static readonly XNamespace MainNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static readonly XNamespace RelNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static readonly XNamespace PkgRelNs = "http://schemas.openxmlformats.org/package/2006/relationships";
    private static readonly XNamespace ContentTypesNs = "http://schemas.openxmlformats.org/package/2006/content-types";
    private static readonly XNamespace XmlNs = XNamespace.Xml;

    public static string SanitizeXmlText(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var sb = new StringBuilder(value.Length);
        foreach (var ch in value)
        {
            if (ch == '\t' || ch == '\n' || ch == '\r' || ch >= 0x20)
            {
                sb.Append(ch);
            }
        }

        return sb.ToString();
    }

    public static string SanitizeCsvCell(string? value)
    {
        var raw = value ?? string.Empty;
        if (raw.Length > 0)
        {
            var trimmedStart = raw.TrimStart(' ');
            var firstRaw = raw[0];
            var firstNonSpace = trimmedStart.Length > 0 ? trimmedStart[0] : '\0';
            if (firstRaw == '\t' || firstRaw == '\r' ||
                firstNonSpace is '=' or '+' or '-' or '@' or '\t' or '\r')
            {
                raw = "'" + raw;
            }
        }

        if (raw.IndexOfAny([',', '"', '\r', '\n']) >= 0)
        {
            return "\"" + raw.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
        }

        return raw;
    }

    public static byte[] BuildCareerDevelopmentCsv(IReadOnlyList<CareerEntryDto> entries)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Title,Category,Linked Goal,Start Date,End Date,Hours,Description");

        foreach (var entry in entries)
        {
            var fields = new[]
            {
                SanitizeCsvCell(entry.Title),
                SanitizeCsvCell(string.IsNullOrWhiteSpace(entry.Category) ? "Uncategorized" : entry.Category),
                SanitizeCsvCell(entry.GoalTitle ?? string.Empty),
                SanitizeCsvCell(entry.StartDate),
                SanitizeCsvCell(entry.EndDate),
                entry.Hours.ToString("0.##", CultureInfo.InvariantCulture),
                SanitizeCsvCell(entry.Description ?? string.Empty)
            };

            sb.AppendLine(string.Join(",", fields));
        }

        return Utf8NoBom.GetBytes(sb.ToString());
    }

    public static byte[] BuildCareerDevelopmentWorkbook(
        string professionalName,
        decimal annualGoalHours,
        int? year,
        IReadOnlyList<CareerEntryDto> entries)
    {
        using var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteXmlEntry(archive, "[Content_Types].xml", BuildContentTypesXml());
            WriteXmlEntry(archive, "_rels/.rels", BuildRootRelsXml());
            WriteXmlEntry(archive, "xl/workbook.xml", BuildWorkbookXml());
            WriteXmlEntry(archive, "xl/_rels/workbook.xml.rels", BuildWorkbookRelsXml());
            WriteXmlEntry(archive, "xl/styles.xml", BuildStylesXml());
            WriteXmlEntry(archive, "xl/worksheets/sheet1.xml", BuildWorksheetXml(professionalName, annualGoalHours, year, entries));
        }

        return stream.ToArray();
    }

    private static void WriteXmlEntry(ZipArchive archive, string path, XDocument document)
    {
        var entry = archive.CreateEntry(path, CompressionLevel.Optimal);
        using var entryStream = entry.Open();
        using var writer = new StreamWriter(entryStream, Utf8NoBom);
        document.Save(writer, SaveOptions.DisableFormatting);
    }

    private static XDocument BuildContentTypesXml() =>
        new(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                ContentTypesNs + "Types",
                new XElement(ContentTypesNs + "Default", new XAttribute("Extension", "rels"), new XAttribute("ContentType", "application/vnd.openxmlformats-package.relationships+xml")),
                new XElement(ContentTypesNs + "Default", new XAttribute("Extension", "xml"), new XAttribute("ContentType", "application/xml")),
                new XElement(ContentTypesNs + "Override", new XAttribute("PartName", "/xl/workbook.xml"), new XAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml")),
                new XElement(ContentTypesNs + "Override", new XAttribute("PartName", "/xl/worksheets/sheet1.xml"), new XAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml")),
                new XElement(ContentTypesNs + "Override", new XAttribute("PartName", "/xl/styles.xml"), new XAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"))
            )
        );

    private static XDocument BuildRootRelsXml() =>
        new(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                PkgRelNs + "Relationships",
                new XElement(
                    PkgRelNs + "Relationship",
                    new XAttribute("Id", "rId1"),
                    new XAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"),
                    new XAttribute("Target", "xl/workbook.xml")
                )
            )
        );

    private static XDocument BuildWorkbookXml() =>
        new(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                MainNs + "workbook",
                new XAttribute(XNamespace.Xmlns + "r", RelNs.NamespaceName),
                new XElement(
                    MainNs + "sheets",
                    new XElement(
                        MainNs + "sheet",
                        new XAttribute("name", "Career Development"),
                        new XAttribute("sheetId", "1"),
                        new XAttribute(RelNs + "id", "rId1")
                    )
                )
            )
        );

    private static XDocument BuildWorkbookRelsXml() =>
        new(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                PkgRelNs + "Relationships",
                new XElement(
                    PkgRelNs + "Relationship",
                    new XAttribute("Id", "rId1"),
                    new XAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"),
                    new XAttribute("Target", "worksheets/sheet1.xml")
                ),
                new XElement(
                    PkgRelNs + "Relationship",
                    new XAttribute("Id", "rId2"),
                    new XAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"),
                    new XAttribute("Target", "styles.xml")
                )
            )
        );

    private static XElement CreateFontElement(int size, string argbColor, bool bold = false)
    {
        var font = new XElement(MainNs + "font");
        if (bold)
        {
            font.Add(new XElement(MainNs + "b"));
        }

        font.Add(
            new XElement(MainNs + "sz", new XAttribute("val", size)),
            new XElement(MainNs + "color", new XAttribute("rgb", argbColor)),
            new XElement(MainNs + "name", new XAttribute("val", "Calibri"))
        );
        return font;
    }

    private static XDocument BuildStylesXml() =>
        new(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                MainNs + "styleSheet",
                new XElement(
                    MainNs + "numFmts",
                    new XAttribute("count", "1"),
                    new XElement(MainNs + "numFmt", new XAttribute("numFmtId", "164"), new XAttribute("formatCode", "0.0"))
                ),
                new XElement(
                    MainNs + "fonts",
                    new XAttribute("count", "5"),
                    CreateFontElement(11, "FF111111"),
                    CreateFontElement(14, "FF111111", bold: true),
                    CreateFontElement(11, "FF3D3D3A"),
                    CreateFontElement(11, "FFE60012", bold: true),
                    CreateFontElement(11, "FFFFFFFF", bold: true)
                ),
                new XElement(
                    MainNs + "fills",
                    new XAttribute("count", "4"),
                    new XElement(MainNs + "fill", new XElement(MainNs + "patternFill", new XAttribute("patternType", "none"))),
                    new XElement(MainNs + "fill", new XElement(MainNs + "patternFill", new XAttribute("patternType", "gray125"))),
                    new XElement(
                        MainNs + "fill",
                        new XElement(
                            MainNs + "patternFill",
                            new XAttribute("patternType", "solid"),
                            new XElement(MainNs + "fgColor", new XAttribute("rgb", "FF111111")),
                            new XElement(MainNs + "bgColor", new XAttribute("indexed", "64"))
                        )
                    ),
                    new XElement(
                        MainNs + "fill",
                        new XElement(
                            MainNs + "patternFill",
                            new XAttribute("patternType", "solid"),
                            new XElement(MainNs + "fgColor", new XAttribute("rgb", "FFF6F5F0")),
                            new XElement(MainNs + "bgColor", new XAttribute("indexed", "64"))
                        )
                    )
                ),
                new XElement(
                    MainNs + "borders",
                    new XAttribute("count", "3"),
                    new XElement(
                        MainNs + "border",
                        new XElement(MainNs + "left"),
                        new XElement(MainNs + "right"),
                        new XElement(MainNs + "top"),
                        new XElement(MainNs + "bottom"),
                        new XElement(MainNs + "diagonal")
                    ),
                    new XElement(
                        MainNs + "border",
                        new XElement(MainNs + "left"),
                        new XElement(MainNs + "right"),
                        new XElement(MainNs + "top"),
                        new XElement(MainNs + "bottom", new XAttribute("style", "medium"), new XElement(MainNs + "color", new XAttribute("rgb", "FFE60012"))),
                        new XElement(MainNs + "diagonal")
                    ),
                    new XElement(
                        MainNs + "border",
                        new XElement(MainNs + "left"),
                        new XElement(MainNs + "right"),
                        new XElement(MainNs + "top"),
                        new XElement(MainNs + "bottom", new XAttribute("style", "thin"), new XElement(MainNs + "color", new XAttribute("rgb", "FFE2E1DC"))),
                        new XElement(MainNs + "diagonal")
                    )
                ),
                new XElement(
                    MainNs + "cellStyleXfs",
                    new XAttribute("count", "1"),
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "0"), new XAttribute("fillId", "0"), new XAttribute("borderId", "0"))
                ),
                new XElement(
                    MainNs + "cellXfs",
                    new XAttribute("count", "9"),
                    // 0: Default
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "0"), new XAttribute("fillId", "0"), new XAttribute("borderId", "0"), new XAttribute("xfId", "0")),
                    // 1: Title
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "1"), new XAttribute("fillId", "0"), new XAttribute("borderId", "0"), new XAttribute("xfId", "0"), new XAttribute("applyFont", "1")),
                    // 2: Subtitle
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "2"), new XAttribute("fillId", "0"), new XAttribute("borderId", "0"), new XAttribute("xfId", "0"), new XAttribute("applyFont", "1")),
                    // 3: Crimson summary
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "3"), new XAttribute("fillId", "0"), new XAttribute("borderId", "0"), new XAttribute("xfId", "0"), new XAttribute("applyFont", "1")),
                    // 4: Carbon header
                    new XElement(
                        MainNs + "xf",
                        new XAttribute("numFmtId", "0"),
                        new XAttribute("fontId", "4"),
                        new XAttribute("fillId", "2"),
                        new XAttribute("borderId", "1"),
                        new XAttribute("xfId", "0"),
                        new XAttribute("applyFont", "1"),
                        new XAttribute("applyFill", "1"),
                        new XAttribute("applyBorder", "1"),
                        new XAttribute("applyAlignment", "1"),
                        new XElement(MainNs + "alignment", new XAttribute("vertical", "center"))
                    ),
                    // 5: White row text
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "0"), new XAttribute("fillId", "0"), new XAttribute("borderId", "2"), new XAttribute("xfId", "0"), new XAttribute("applyFont", "1"), new XAttribute("applyBorder", "1")),
                    // 6: Editorial Paper row text
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "0"), new XAttribute("fontId", "0"), new XAttribute("fillId", "3"), new XAttribute("borderId", "2"), new XAttribute("xfId", "0"), new XAttribute("applyFont", "1"), new XAttribute("applyFill", "1"), new XAttribute("applyBorder", "1")),
                    // 7: White row number (0.0)
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "164"), new XAttribute("fontId", "0"), new XAttribute("fillId", "0"), new XAttribute("borderId", "2"), new XAttribute("xfId", "0"), new XAttribute("applyNumberFormat", "1"), new XAttribute("applyFont", "1"), new XAttribute("applyBorder", "1")),
                    // 8: Editorial Paper row number (0.0)
                    new XElement(MainNs + "xf", new XAttribute("numFmtId", "164"), new XAttribute("fontId", "0"), new XAttribute("fillId", "3"), new XAttribute("borderId", "2"), new XAttribute("xfId", "0"), new XAttribute("applyNumberFormat", "1"), new XAttribute("applyFont", "1"), new XAttribute("applyFill", "1"), new XAttribute("applyBorder", "1"))
                )
            )
        );

    private static XElement InlineStringCell(string cellRef, int styleIndex, string? value)
    {
        var safe = SanitizeXmlText(value);
        return new XElement(
            MainNs + "c",
            new XAttribute("r", cellRef),
            new XAttribute("s", styleIndex),
            new XAttribute("t", "inlineStr"),
            new XElement(
                MainNs + "is",
                new XElement(
                    MainNs + "t",
                    new XAttribute(XmlNs + "space", "preserve"),
                    safe
                )
            )
        );
    }

    private static XElement NumericCell(string cellRef, int styleIndex, decimal value) =>
        new(
            MainNs + "c",
            new XAttribute("r", cellRef),
            new XAttribute("s", styleIndex),
            new XElement(MainNs + "v", value.ToString("0.##", CultureInfo.InvariantCulture))
        );

    private static XDocument BuildWorksheetXml(
        string professionalName,
        decimal annualGoalHours,
        int? year,
        IReadOnlyList<CareerEntryDto> entries)
    {
        var widths = new[] { 38, 22, 34, 14, 14, 10, 48 };
        var colsElement = new XElement(MainNs + "cols");
        for (int i = 0; i < widths.Length; i++)
        {
            var colIndex = i + 1;
            colsElement.Add(
                new XElement(
                    MainNs + "col",
                    new XAttribute("min", colIndex),
                    new XAttribute("max", colIndex),
                    new XAttribute("width", widths[i]),
                    new XAttribute("customWidth", "1")
                )
            );
        }

        var totalHours = entries.Sum(e => e.Hours);
        var yearLabel = year.HasValue ? $"Year: {year.Value}" : "All Years";
        var summaryText = string.Create(
            CultureInfo.InvariantCulture,
            $"Annual Goal: {annualGoalHours:F1} hrs | Total Logged: {totalHours:F1} hrs");

        var sheetData = new XElement(
            MainNs + "sheetData",
            new XElement(
                MainNs + "row",
                new XAttribute("r", 1),
                InlineStringCell("A1", 1, $"Career Development History - {professionalName}")
            ),
            new XElement(
                MainNs + "row",
                new XAttribute("r", 2),
                InlineStringCell("A2", 2, yearLabel)
            ),
            new XElement(
                MainNs + "row",
                new XAttribute("r", 3),
                InlineStringCell("A3", 3, summaryText)
            )
        );

        var headers = new[] { "Title", "Category", "Linked Goal", "Start Date", "End Date", "Hours", "Description" };
        var headerRow = new XElement(
            MainNs + "row",
            new XAttribute("r", 5),
            new XAttribute("ht", "24"),
            new XAttribute("customHeight", "1")
        );
        for (int i = 0; i < headers.Length; i++)
        {
            var colLetter = ((char)('A' + i)).ToString();
            headerRow.Add(InlineStringCell($"{colLetter}5", 4, headers[i]));
        }
        sheetData.Add(headerRow);

        for (int idx = 0; idx < entries.Count; idx++)
        {
            var rowNumber = 6 + idx;
            var isAlternate = idx % 2 == 1;
            var textStyle = isAlternate ? 6 : 5;
            var numStyle = isAlternate ? 8 : 7;
            var entry = entries[idx];

            sheetData.Add(
                new XElement(
                    MainNs + "row",
                    new XAttribute("r", rowNumber),
                    InlineStringCell($"A{rowNumber}", textStyle, entry.Title),
                    InlineStringCell($"B{rowNumber}", textStyle, string.IsNullOrWhiteSpace(entry.Category) ? "Uncategorized" : entry.Category),
                    InlineStringCell($"C{rowNumber}", textStyle, entry.GoalTitle ?? string.Empty),
                    InlineStringCell($"D{rowNumber}", textStyle, entry.StartDate),
                    InlineStringCell($"E{rowNumber}", textStyle, entry.EndDate),
                    NumericCell($"F{rowNumber}", numStyle, entry.Hours),
                    InlineStringCell($"G{rowNumber}", textStyle, entry.Description ?? string.Empty)
                )
            );
        }

        return new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                MainNs + "worksheet",
                colsElement,
                sheetData
            )
        );
    }
}
