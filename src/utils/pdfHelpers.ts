import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as XLSX from 'xlsx';

// Declare global PDF.js and Tesseract if loaded from CDN
declare global {
  interface Window {
    pdfjsLib?: any;
    Tesseract?: any;
    jspdf?: any;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function baseName(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

export function parseRanges(str: string, maxPage: number): number[] {
  const result = new Set<number>();
  str.split(',').forEach(part => {
    part = part.trim();
    if (!part) return;
    if (part.includes('-')) {
      let [a, b] = part.split('-').map(s => parseInt(s.trim(), 10));
      if (isNaN(a)) return;
      if (isNaN(b)) b = a;
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        if (i >= 1 && i <= maxPage) result.add(i - 1);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= maxPage) result.add(n - 1);
    }
  });
  return Array.from(result).sort((x, y) => x - y);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas conversion failed'));
      },
      type,
      quality
    );
  });
}

export function fileToImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = e => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const v = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  return {
    r: ((v >> 16) & 255) / 255,
    g: ((v >> 8) & 255) / 255,
    b: (v & 255) / 255,
  };
}

export function escRtf(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\r?\n/g, '\\par ')
    .replace(/[\u0100-\uffff]/g, c => '\\u' + c.charCodeAt(0) + '?');
}

export function csvEscape(s: unknown): string {
  const str = s == null ? '' : String(s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

export function groupTextLines(items: any[]): string[][] {
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
  const lines: any[][] = [];
  let currentY: number | null = null;
  let currentLine: any[] = [];

  sorted.forEach(it => {
    const y = it.transform[5];
    if (currentY === null || Math.abs(y - currentY) > 4) {
      if (currentLine.length) lines.push(currentLine);
      currentLine = [it];
      currentY = y;
    } else {
      currentLine.push(it);
    }
  });
  if (currentLine.length) lines.push(currentLine);
  return lines.map(line => line.sort((a, b) => a.transform[4] - b.transform[4]).map(it => it.str));
}

export async function extractAllText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    throw new Error('PDF.js library is not loaded');
  }
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = groupTextLines(content.items);
    text += `--- Page ${i} ---\n` + lines.map(l => l.join(' ')).join('\n') + '\n\n';
  }
  return text.trim();
}

export function diffWords(a: string[], b: string[]) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: { type: 'equal' | 'add' | 'del'; text: string }[] = [];
  let i = a.length,
    j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'equal', text: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ type: 'del', text: a[i - 1] });
      i--;
    } else {
      result.unshift({ type: 'add', text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    result.unshift({ type: 'del', text: a[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ type: 'add', text: b[j - 1] });
    j--;
  }
  return result;
}

// -------------------------------------------------------------
// Sample Test File Generators for Instant Testing
// -------------------------------------------------------------

export async function generateSamplePdf(
  title = 'เอกสารตัวอย่างสำหรับทดสอบระบบ (Test Document)',
  pagesCount = 3
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pagesCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Top banner
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width,
      height: 100,
      color: rgb(0.12, 0.44, 0.96),
    });

    page.drawText('PDF CRAFT STUDIO — SAMPLE TEST DOCUMENT', {
      x: 40,
      y: height - 55,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Page ${i} of ${pagesCount}`, {
      x: width - 120,
      y: height - 55,
      size: 12,
      font: fontBold,
      color: rgb(0.9, 0.95, 1),
    });

    // Content
    page.drawText(`Chapter ${i}: Feature Verification & Performance Test`, {
      x: 40,
      y: height - 140,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    const sampleLines = [
      `This is a synthetic sample document created for instant testing in PDF Craft Studio.`,
      `You can test all tools: Split, Merge, Rotate, Compress, Convert, Watermark, Sign, and OCR.`,
      `Document Generated Date: ${new Date().toLocaleDateString('th-TH')}`,
      `Security Status: Standard / Unlocked (Test-ready)`,
      `Paragraph 1: Testing text layout, typography rendering, and vector canvas positioning.`,
      `Paragraph 2: Rapid client-side execution test with zero server dependency.`,
      `Data Row Sample A: Item #100${i} | Status: Approved | Amount: $${(i * 125.5).toFixed(2)}`,
      `Data Row Sample B: Verification Code: CRAFT-TEST-2026-${i}`,
    ];

    let yPos = height - 180;
    sampleLines.forEach(line => {
      page.drawText(line, {
        x: 40,
        y: yPos,
        size: 11,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35),
      });
      yPos -= 24;
    });

    // Draw a sample box
    page.drawRectangle({
      x: 40,
      y: yPos - 120,
      width: width - 80,
      height: 100,
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
      color: rgb(0.96, 0.98, 1),
    });

    page.drawText('Note: You can draw signatures, add watermarks, or redact confidential boxes here.', {
      x: 60,
      y: yPos - 70,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.4, 0.5),
    });

    // Footer
    page.drawText(`Generated by I PWK • Instant Browser Sandbox`, {
      x: 40,
      y: 30,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], `sample-document-${pagesCount}pages.pdf`, { type: 'application/pdf' });
}

export async function generateSampleImage(title = 'Sample Image'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 600);
  grad.addColorStop(0, '#3b82f6');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);

  // Decorative card
  ctx.fillStyle = '#ffffff';
  ctx.roundRect(60, 60, 680, 480, 16);
  ctx.fill();

  // Text
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(title, 100, 140);

  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.fillText('Test Image for PDF Conversion, OCR, and Image Compression', 100, 190);
  ctx.fillText(`Created at: ${new Date().toLocaleTimeString()}`, 100, 230);

  // Decorative shape
  ctx.fillStyle = '#e0e7ff';
  ctx.fillRect(100, 280, 600, 180);

  ctx.fillStyle = '#4338ca';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Sample Text for OCR & Visual Testing', 130, 360);
  ctx.font = '16px monospace';
  ctx.fillText('CODE: CRAFT-IMG-2026-OK', 130, 400);

  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
  return new File([blob], 'sample-image.jpg', { type: 'image/jpeg' });
}

export async function generateSampleExcel(): Promise<File> {
  const wsData = [
    ['รหัสสินค้า', 'รายการสินค้า', 'หมวดหมู่', 'จำนวน', 'ราคาต่อหน่วย (บาท)', 'ยอดรวม (บาท)'],
    ['SKU-001', 'กระดาษพิมพ์ A4 Double A 80g', 'เครื่องเขียน', 50, 135, 6750],
    ['SKU-002', 'ปากกาหมึกเจล 0.5mm สีน้ำเงิน', 'เครื่องเขียน', 120, 25, 3000],
    ['SKU-003', 'แฟ้มแขวนเอกสาร A4 สีแดง', 'อุปกรณ์สำนักงาน', 30, 45, 1350],
    ['SKU-004', 'หมึกพิมพ์เลเซอร์ HP 85A', 'ไอที', 5, 2450, 12250],
    ['SKU-005', 'คลิปหนีบกระดาษ 32mm', 'อุปกรณ์สำนักงาน', 40, 18, 720],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายงานสินค้าตัวอย่าง');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([wbout], 'sample-sales-report.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
