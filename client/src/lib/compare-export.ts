import ExcelJS from "exceljs";
import { ColorBand, colorForDiff, extractNumber, fmt } from "@/components/compare-panel";

type Row = { id: number; data: Record<string, any> };

export interface ComputedShape {
  mode: "two-rows" | "matrix" | "sequential";
  rows: Row[];
  cols: string[];
  rowA?: Row;
  rowB?: Row;
  matrixRef?: "first" | "previous" | "raw";
}

// تحويل لون HSL إلى ARGB hex لاستخدامه في ExcelJS
function hslToHex(hsl: string): string {
  if (!hsl) return "FFFFFFFF";
  if (hsl.startsWith("#")) {
    const c = hsl.replace("#", "");
    return "FF" + (c.length === 6 ? c : c.padEnd(6, "0")).toUpperCase();
  }
  const m = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (!m) return "FFFFFFFF";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return "FF" + toHex(r) + toHex(g) + toHex(b);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportCompareToExcel(
  computed: ComputedShape,
  bands: ColorBand[],
  rowLabel: (r: Row) => string,
  opts: { isAr: boolean; datasetName?: string },
) {
  const { isAr, datasetName } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Qiyasat";
  wb.created = new Date();
  const ws = wb.addWorksheet(isAr ? "نتائج المقارنة" : "Compare Results", {
    views: [{ rightToLeft: isAr }],
  });

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };
  const labelFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE5E7EB" } },
    left: { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    right: { style: "thin", color: { argb: "FFE5E7EB" } },
  };

  const { mode, rows, cols, rowA, rowB, matrixRef } = computed;

  if (mode === "two-rows" && rowA && rowB) {
    // العناوين
    const headers = [
      isAr ? "العمود" : "Column",
      rowLabel(rowA),
      rowLabel(rowB),
      isAr ? "الفرق" : "Diff",
    ];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderAll;
    });

    for (const c of cols) {
      const a = extractNumber(rowA.data[c]);
      const b = extractNumber(rowB.data[c]);
      const diff = !isNaN(a) && !isNaN(b) ? b - a : NaN;
      const bothText = isNaN(a) && isNaN(b);
      const diffText = bothText
        ? String(rowB.data[c] ?? rowA.data[c] ?? "")
        : isNaN(diff)
          ? "—"
          : diff;
      const row = ws.addRow([
        c,
        isNaN(a) ? String(rowA.data[c] ?? "—") : a,
        isNaN(b) ? String(rowB.data[c] ?? "—") : b,
        diffText,
      ]);
      row.getCell(1).fill = labelFill;
      row.getCell(1).font = { bold: true };
      row.eachCell((cell, idx) => {
        cell.border = borderAll;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (idx === 4 && !isNaN(diff)) {
          const { bg, fg } = colorForDiff(diff, bands);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: hslToHex(bg) },
          };
          cell.font = { bold: true, color: { argb: hslToHex(fg) } };
          cell.numFmt = "+0.##;-0.##;0";
        }
      });
    }

    ws.columns.forEach((col) => {
      col.width = 18;
    });
  } else if (mode === "matrix") {
    const ref = matrixRef ?? "first";
    const headerRow = ws.addRow([isAr ? "الصف" : "Row", ...cols]);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderAll;
    });

    rows.forEach((r, i) => {
      const cellValues: any[] = [rowLabel(r)];
      const diffs: number[] = [];
      cols.forEach((c) => {
        const v = extractNumber(r.data[c]);
        let diff = NaN;
        let display: any = "—";

        if (ref === "raw") {
          diff = v;
          display = isNaN(v) ? String(r.data[c] ?? "—") : v;
        } else if (ref === "first") {
          const baseRow = rows[0];
          const base = extractNumber(baseRow.data[c]);
          if (!isNaN(v) && !isNaN(base)) {
            diff = v - base;
            display = i === 0 ? v : diff;
          } else {
            display = isNaN(v) ? String(r.data[c] ?? "—") : v;
          }
        } else if (ref === "previous") {
          if (i === 0) {
            diff = NaN;
            display = isNaN(v) ? String(r.data[c] ?? "—") : v;
          } else {
            const prev = extractNumber(rows[i - 1].data[c]);
            if (!isNaN(v) && !isNaN(prev)) {
              diff = v - prev;
              display = diff;
            } else {
              display = isNaN(v) ? String(r.data[c] ?? "—") : v;
            }
          }
        }
        cellValues.push(display);
        diffs.push(diff);
      });

      const row = ws.addRow(cellValues);
      row.getCell(1).fill = labelFill;
      row.getCell(1).font = { bold: true };
      row.eachCell((cell, idx) => {
        cell.border = borderAll;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (idx >= 2) {
          const d = diffs[idx - 2];
          if (!isNaN(d)) {
            const { bg, fg } = colorForDiff(d, bands);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: hslToHex(bg) },
            };
            cell.font = { color: { argb: hslToHex(fg) } };
            if (ref !== "raw" && !(ref === "first" && i === 0)) {
              cell.numFmt = "+0.##;-0.##;0";
            }
          }
        }
      });
    });

    ws.columns.forEach((col, i) => {
      col.width = i === 0 ? 22 : 14;
    });
  } else if (mode === "sequential") {
    const headerRow = ws.addRow([isAr ? "الصف" : "Row", ...cols]);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderAll;
    });

    rows.forEach((r, i) => {
      const cellValues: any[] = [rowLabel(r)];
      const diffs: number[] = [];
      cols.forEach((c) => {
        const v = extractNumber(r.data[c]);
        if (i === 0) {
          cellValues.push(isNaN(v) ? String(r.data[c] ?? "—") : v);
          diffs.push(NaN);
        } else {
          const prev = extractNumber(rows[i - 1].data[c]);
          if (!isNaN(v) && !isNaN(prev)) {
            const d = v - prev;
            cellValues.push(d);
            diffs.push(d);
          } else {
            cellValues.push(isNaN(v) ? String(r.data[c] ?? "—") : v);
            diffs.push(NaN);
          }
        }
      });

      const row = ws.addRow(cellValues);
      row.getCell(1).fill = labelFill;
      row.getCell(1).font = { bold: true };
      row.eachCell((cell, idx) => {
        cell.border = borderAll;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (idx >= 2 && i > 0) {
          const d = diffs[idx - 2];
          if (!isNaN(d)) {
            const { bg, fg } = colorForDiff(d, bands);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: hslToHex(bg) },
            };
            cell.font = { color: { argb: hslToHex(fg) } };
            cell.numFmt = "+0.##;-0.##;0";
          }
        }
      });
    });

    ws.columns.forEach((col, i) => {
      col.width = i === 0 ? 22 : 14;
    });
  }

  // إضافة صف توضيحي للنطاقات اللونية في الأسفل
  ws.addRow([]);
  const legendHeader = ws.addRow([
    isAr ? "النطاقات اللونية:" : "Color bands:",
  ]);
  legendHeader.getCell(1).font = { bold: true, italic: true };
  bands.forEach((b) => {
    const r = ws.addRow([b.label, `≥ ${b.minDiff}`]);
    r.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: hslToHex(b.bg) },
    };
    r.getCell(2).font = { color: { argb: hslToHex(b.fg) }, bold: true };
    r.getCell(2).alignment = { horizontal: "center" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const name =
    (datasetName ? `${datasetName}_` : "") +
    `compare_${mode}_${stamp}.xlsx`;
  downloadBlob(blob, name);
}
