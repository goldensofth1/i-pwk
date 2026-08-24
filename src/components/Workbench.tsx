import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Play,
  RotateCw,
  RotateCcw,
  Sparkles,
  Camera,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  Undo2,
  Eye,
  Sliders,
  Type,
  Square,
  Pen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

import { ToolItem, ProcessingProgress, OutputFile, PageThumb } from '../types';
import { ToolIcon } from './ToolIcon';
import {
  formatBytes,
  baseName,
  parseRanges,
  canvasToBlob,
  fileToImage,
  hexToRgb01,
  escRtf,
  csvEscape,
  groupTextLines,
  extractAllText,
  diffWords,
  generateSamplePdf,
  generateSampleImage,
  generateSampleExcel,
} from '../utils/pdfHelpers';

interface WorkbenchProps {
  tool: ToolItem;
  onClose: () => void;
  onProcessedSuccess: (result: OutputFile) => void;
  injectedFile?: File | null;
  onClearInjectedFile?: () => void;
  onOpenTestModal: () => void;
}

export const Workbench: React.FC<WorkbenchProps> = ({
  tool,
  onClose,
  onProcessedSuccess,
  injectedFile,
  onClearInjectedFile,
  onOpenTestModal,
}) => {
  // Files state
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [progress, setProgress] = useState<ProcessingProgress>({
    state: 'idle',
    progress: 0,
    currentStep: 'พร้อมทำงาน',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [copiedText, setCopiedText] = useState(false);

  // Common Tool Options State
  const [rangeInput, setRangeInput] = useState('');
  const [splitMode, setSplitMode] = useState<'one' | 'each'>('one');
  const [rotDeg, setRotDeg] = useState<number>(90);
  const [compressQuality, setCompressQuality] = useState(65);
  const [compressScale, setCompressScale] = useState<number>(1.5);
  const [maxImageWidth, setMaxImageWidth] = useState(1600);
  const [imgOutputFormat, setImgOutputFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/jpeg');
  const [imgPageSize, setImgPageSize] = useState<'a4' | 'fit'>('a4');
  const [htmlContent, setHtmlContent] = useState('');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [ocrLang, setOcrLang] = useState('tha+eng');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiTargetLang, setAiTargetLang] = useState('ไทย');
  const [aiSummaryDepth, setAiSummaryDepth] = useState('ปานกลาง 6-10 ข้อ');

  // Watermark Options
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmColor, setWmColor] = useState('#B5222A');
  const [wmOpacity, setWmOpacity] = useState(30);
  const [wmAngle, setWmAngle] = useState(45);
  const [wmSize, setWmSize] = useState(55);

  // Page Numbers Options
  const [pnStart, setPnStart] = useState(1);
  const [pnPos, setPnPos] = useState<'bc' | 'br' | 'bl' | 'tr'>('bc');
  const [pnFormat, setPnFormat] = useState('หน้า {n} / {total}');

  // Crop Options
  const [cropL, setCropL] = useState(0);
  const [cropR, setCropR] = useState(0);
  const [cropT, setCropT] = useState(0);
  const [cropB, setCropB] = useState(0);

  // Interactive PDF/Image viewer state (Organize, Edit, Sign, Redact)
  const [pageThumbs, setPageThumbs] = useState<PageThumb[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [curPage, setCurPage] = useState(1);
  const [isViewerLoading, setIsViewerLoading] = useState(false);

  // Visual Edit / Draw State
  const [editTool, setEditTool] = useState<'text' | 'rect' | 'free'>('text');
  const [editColor, setEditColor] = useState('#B5222A');
  const [editElements, setEditElements] = useState<Record<number, any[]>>({});
  const editCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sign State
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sigWidth, setSigWidth] = useState(150);
  const [placedSigns, setPlacedSigns] = useState<any[]>([]);

  // Redact State
  const [redactBoxes, setRedactBoxes] = useState<Record<number, any[]>>({});
  const redactCanvasRef = useRef<HTMLCanvasElement>(null);

  // Camera Scan State
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camShots, setCamShots] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Compare Tool State
  const [compareFileA, setCompareFileA] = useState<File | null>(null);
  const [compareFileB, setCompareFileB] = useState<File | null>(null);
  const [compareDiffs, setCompareDiffs] = useState<{ type: string; text: string }[]>([]);

  // Handle injected file from Sample generator
  useEffect(() => {
    if (injectedFile) {
      if (tool.id === 'compare') {
        if (!compareFileA) setCompareFileA(injectedFile);
        else setCompareFileB(injectedFile);
      } else {
        if (tool.multiple) {
          setFiles(prev => [...prev, injectedFile]);
        } else {
          setFiles([injectedFile]);
        }
      }
      if (onClearInjectedFile) onClearInjectedFile();
    }
  }, [injectedFile, tool.id, tool.multiple, compareFileA, onClearInjectedFile]);

  // Load PDF pages for visual tools (organize, editpdf, sign, redact)
  useEffect(() => {
    if (!files.length) {
      setPageThumbs([]);
      setNumPages(0);
      return;
    }
    const targetFile = files[0];
    if (!targetFile.name.toLowerCase().endsWith('.pdf')) return;

    if (['organize', 'editpdf', 'sign', 'redact'].includes(tool.id)) {
      loadVisualPages(targetFile);
    }
  }, [files, tool.id]);

  const loadVisualPages = async (file: File) => {
    setIsViewerLoading(true);
    try {
      const pdfjs = window.pdfjsLib;
      if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      setNumPages(pdf.numPages);
      setCurPage(1);

      if (tool.id === 'organize') {
        const thumbs: PageThumb[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.35 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          thumbs.push({
            origIndex: i - 1,
            rotation: 0,
            dataUrl: canvas.toDataURL('image/jpeg', 0.75),
          });
        }
        setPageThumbs(thumbs);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsViewerLoading(false);
    }
  };

  // Drag & Drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    if (tool.multiple) {
      setFiles(prev => [...prev, ...dropped]);
    } else {
      setFiles([dropped[0]]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const picked = Array.from(e.target.files);
      if (tool.multiple) {
        setFiles(prev => [...prev, ...picked]);
      } else {
        setFiles(picked.slice(0, 1));
      }
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const reorderFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    setFiles(prev => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  // Fire Confetti animation on success
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
      });
    } catch (e) {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // Execution Engine for all 24 tools
  // -------------------------------------------------------------
  const handleRunTool = async () => {
    setErrorMsg(null);
    setOutputFiles([]);
    setProgress({ state: 'reading', progress: 10, currentStep: 'กำลังเตรียมไฟล์และระบบ...' });

    try {
      // 1. MERGE
      if (tool.id === 'merge') {
        if (files.length < 2) throw new Error('ต้องเลือกไฟล์ PDF อย่างน้อย 2 ไฟล์ขึ้นไป');
        setProgress({ state: 'processing', progress: 30, currentStep: 'กำลังอ่านเอกสาร PDF...' });
        const merged = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setProgress({
            state: 'processing',
            progress: 30 + Math.round(((i + 1) / files.length) * 50),
            currentStep: `กำลังรวมไฟล์ (${i + 1}/${files.length}): ${f.name}`,
          });
          const bytes = await f.arrayBuffer();
          const pdf = await PDFDocument.load(bytes);
          const pages = await merged.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        }
        setProgress({ state: 'finalizing', progress: 90, currentStep: 'กำลังสร้างไฟล์ฉบับสมบูรณ์...' });
        const outBytes = await merged.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const outName = 'merged-document.pdf';
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: outName,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 2. SPLIT
      else if (tool.id === 'split') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 35, currentStep: 'กำลังวิเคราะห์หน้าเอกสาร...' });
        const bytes = await f.arrayBuffer();
        const srcPdf = await PDFDocument.load(bytes);
        const total = srcPdf.getPageCount();
        const indices = rangeInput ? parseRanges(rangeInput, total) : srcPdf.getPageIndices();
        if (!indices.length) throw new Error('ไม่พบหน้าที่ระบุตามช่วงที่กำหนด');

        if (splitMode === 'one') {
          const newPdf = await PDFDocument.create();
          const pages = await newPdf.copyPages(srcPdf, indices);
          pages.forEach(p => newPdf.addPage(p));
          setProgress({ state: 'finalizing', progress: 85, currentStep: 'กำลังบันทึกไฟล์...' });
          const outBytes = await newPdf.save();
          const blob = new Blob([outBytes], { type: 'application/pdf' });
          const result: OutputFile = {
            id: Math.random().toString(36).substring(2),
            name: `${baseName(f.name)}-extracted.pdf`,
            size: blob.size,
            blob,
            url: URL.createObjectURL(blob),
            type: 'application/pdf',
            createdAt: new Date(),
          };
          setOutputFiles([result]);
          onProcessedSuccess(result);
        } else {
          const JSZipModule = (await import('jszip')).default;
          const zip = new JSZipModule();
          for (let k = 0; k < indices.length; k++) {
            const idx = indices[k];
            setProgress({
              state: 'processing',
              progress: 40 + Math.round(((k + 1) / indices.length) * 45),
              currentStep: `กำลังแยกหน้า ${idx + 1} (${k + 1}/${indices.length})...`,
            });
            const newPdf = await PDFDocument.create();
            const [p] = await newPdf.copyPages(srcPdf, [idx]);
            newPdf.addPage(p);
            const outBytes = await newPdf.save();
            zip.file(`page-${String(idx + 1).padStart(2, '0')}.pdf`, outBytes);
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const result: OutputFile = {
            id: Math.random().toString(36).substring(2),
            name: `${baseName(f.name)}-pages.zip`,
            size: zipBlob.size,
            blob: zipBlob,
            url: URL.createObjectURL(zipBlob),
            type: 'application/zip',
            createdAt: new Date(),
          };
          setOutputFiles([result]);
          onProcessedSuccess(result);
        }
      }

      // 3. ORGANIZE
      else if (tool.id === 'organize') {
        if (!files.length || !pageThumbs.length) throw new Error('กรุณาเลือกไฟล์และเหลือหน้าเอกสารอย่างน้อย 1 หน้า');
        const f = files[0];
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังจัดเรียงหน้าและองศา...' });
        const bytes = await f.arrayBuffer();
        const srcPdf = await PDFDocument.load(bytes);
        const newPdf = await PDFDocument.create();

        for (let i = 0; i < pageThumbs.length; i++) {
          const thumb = pageThumbs[i];
          const [copied] = await newPdf.copyPages(srcPdf, [thumb.origIndex]);
          if (thumb.rotation) {
            const cur = copied.getRotation().angle;
            copied.setRotation(degrees((cur + thumb.rotation) % 360));
          }
          newPdf.addPage(copied);
        }
        setProgress({ state: 'finalizing', progress: 90, currentStep: 'กำลังบันทึกไฟล์...' });
        const outBytes = await newPdf.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-organized.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 4. ROTATE
      else if (tool.id === 'rotate') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังหมุนหน้าเอกสาร...' });
        const bytes = await f.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const total = pdf.getPageCount();
        const indices = rangeInput ? parseRanges(rangeInput, total) : pdf.getPageIndices();
        const pages = pdf.getPages();
        indices.forEach(idx => {
          const page = pages[idx];
          const cur = page.getRotation().angle;
          page.setRotation(degrees((cur + rotDeg) % 360));
        });
        setProgress({ state: 'finalizing', progress: 90, currentStep: 'กำลังบันทึกไฟล์...' });
        const outBytes = await pdf.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-rotated.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 5. SCAN2PDF
      else if (tool.id === 'scan2pdf') {
        if (!camShots.length) throw new Error('กรุณาถ่ายภาพอย่างน้อย 1 ภาพก่อนแปลงเป็น PDF');
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังรวมภาพเป็น PDF...' });
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < camShots.length; i++) {
          const s = camShots[i];
          const base64 = s.split(',')[1];
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const img = await pdfDoc.embedJpg(bytes);
          const page = pdfDoc.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: 'scanned-document.pdf',
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
        if (camStream) {
          camStream.getTracks().forEach(t => t.stop());
          setCamStream(null);
        }
      }

      // 6. COMPRESS PDF
      else if (tool.id === 'compresspdf') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        const pdfjs = window.pdfjsLib;
        if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
        const origBytes = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: origBytes.slice(0) }).promise;
        const newPdf = await PDFDocument.create();
        const q = compressQuality / 100;

        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({
            state: 'processing',
            progress: 20 + Math.round((i / pdf.numPages) * 65),
            currentStep: `กำลังบีบอัดหน้า ${i}/${pdf.numPages}...`,
          });
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: compressScale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const blob = await canvasToBlob(canvas, 'image/jpeg', q);
          const imgBytes = await blob.arrayBuffer();
          const img = await newPdf.embedJpg(imgBytes);
          const pg = newPdf.addPage([viewport.width, viewport.height]);
          pg.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
        }
        setProgress({ state: 'finalizing', progress: 95, currentStep: 'กำลังสรุปขนาดไฟล์...' });
        const outBytes = await newPdf.save();
        const finalBlob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-compressed.pdf`,
          size: finalBlob.size,
          blob: finalBlob,
          url: URL.createObjectURL(finalBlob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 7. COMPRESS IMAGES
      else if (tool.id === 'compress') {
        if (!files.length) throw new Error('กรุณาเลือกรูปภาพก่อน');
        const q = compressQuality / 100;
        const results: OutputFile[] = [];

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setProgress({
            state: 'processing',
            progress: 20 + Math.round(((i + 1) / files.length) * 65),
            currentStep: `กำลังบีบอัดรูปภาพ (${i + 1}/${files.length}): ${f.name}`,
          });
          const img = await fileToImage(f);
          const scale = Math.min(1, maxImageWidth / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          const blob = await canvasToBlob(canvas, 'image/jpeg', q);
          results.push({
            id: Math.random().toString(36).substring(2),
            name: `${baseName(f.name)}-compressed.jpg`,
            size: blob.size,
            blob,
            url: URL.createObjectURL(blob),
            type: 'image/jpeg',
            createdAt: new Date(),
          });
        }
        setOutputFiles(results);
        if (results[0]) onProcessedSuccess(results[0]);
      }

      // 8. REPAIR PDF
      else if (tool.id === 'repair') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังตรวจสอบและฟื้นฟูโครงสร้าง...' });
        const bytes = await f.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
          updateMetadata: false,
        });
        const outBytes = await pdf.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-repaired.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 9. PDF TO WORD
      else if (tool.id === 'pdf2word') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังดึงข้อความจากทุกหน้า...' });
        const text = await extractAllText(f);
        const rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Tahoma;}}\\f0\\fs22 ' + escRtf(text) + '}';
        const blob = new Blob([rtf], { type: 'application/rtf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}.rtf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/rtf',
          text,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 10. PDF TO EXCEL
      else if (tool.id === 'pdf2excel') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        const pdfjs = window.pdfjsLib;
        if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
        const bytes = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        let csv = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({
            state: 'processing',
            progress: 20 + Math.round((i / pdf.numPages) * 70),
            currentStep: `กำลังวิเคราะห์ตารางหน้า ${i}/${pdf.numPages}...`,
          });
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const lines = groupTextLines(content.items);
          csv += `"หน้า ${i}"\n`;
          lines.forEach(line => {
            csv += line.map(csvEscape).join(',') + '\n';
          });
          csv += '\n';
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}.csv`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'text/csv',
          text: csv,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 11. PDF TO PPT
      else if (tool.id === 'pdf2ppt') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        const pdfjs = window.pdfjsLib;
        if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
        const bytes = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        const JSZipModule = (await import('jszip')).default;
        const zip = new JSZipModule();

        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({
            state: 'processing',
            progress: 20 + Math.round((i / pdf.numPages) * 70),
            currentStep: `กำลังเรนเดอร์ภาพสไลด์หน้า ${i}/${pdf.numPages}...`,
          });
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const blob = await canvasToBlob(canvas, 'image/png');
          zip.file(`slide-${String(i).padStart(2, '0')}.png`, blob);
        }
        zip.file(
          'วิธีนำเข้า PowerPoint.txt',
          'เปิด PowerPoint > Insert > Photo Album > New Photo Album > File/Disk > เลือกภาพทั้งหมดในโฟลเดอร์นี้ตามลำดับ'
        );
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-slides.zip`,
          size: zipBlob.size,
          blob: zipBlob,
          url: URL.createObjectURL(zipBlob),
          type: 'application/zip',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 12. WORD TO PDF
      else if (tool.id === 'word2pdf') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ Word (.docx) ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังแปลงโครงสร้าง Word (.docx)...' });
        const arrayBuffer = await f.arrayBuffer();
        const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText =
          'width:700px;padding:24px;font-family:Prompt,Tahoma,sans-serif;color:#111;background:#fff;position:fixed;left:-9999px;top:0;';
        tempDiv.innerHTML = mammothResult.value;
        document.body.appendChild(tempDiv);

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        await new Promise<void>(resolve => {
          doc.html(tempDiv, {
            x: 20,
            y: 20,
            width: 555,
            windowWidth: 700,
            callback: () => resolve(),
          });
        });
        document.body.removeChild(tempDiv);

        const blob = doc.output('blob');
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 13. EXCEL TO PDF
      else if (tool.id === 'excel2pdf') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ Excel (.xlsx / .csv) ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังแปลงตารางข้อมูล Excel...' });
        const data = await f.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const html = XLSX.utils.sheet_to_html(wb.Sheets[sheetName]);

        const tempDiv = document.createElement('div');
        tempDiv.style.cssText =
          'padding:20px;font-family:Prompt,Tahoma,sans-serif;color:#111;background:#fff;position:fixed;left:-9999px;top:0;';
        tempDiv.innerHTML = `<style>table{border-collapse:collapse;font-size:11px;width:100%;}td,th{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;}th{background:#f8fafc;font-weight:bold;}</style>${html}`;
        document.body.appendChild(tempDiv);

        const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
        await new Promise<void>(resolve => {
          doc.html(tempDiv, {
            x: 16,
            y: 16,
            width: 800,
            windowWidth: 1100,
            callback: () => resolve(),
          });
        });
        document.body.removeChild(tempDiv);

        const blob = doc.output('blob');
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 14. PDF TO IMAGES
      else if (tool.id === 'pdf2img') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        const pdfjs = window.pdfjsLib;
        if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
        const bytes = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        const JSZipModule = (await import('jszip')).default;
        const zip = new JSZipModule();
        const ext = imgOutputFormat === 'image/png' ? 'png' : 'jpg';

        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress({
            state: 'processing',
            progress: 20 + Math.round((i / pdf.numPages) * 70),
            currentStep: `กำลังแปลงหน้า ${i}/${pdf.numPages} เป็นภาพ...`,
          });
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: compressScale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (imgOutputFormat === 'image/jpeg' && ctx) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await canvasToBlob(canvas, imgOutputFormat, 0.92);
          zip.file(`page-${String(i).padStart(2, '0')}.${ext}`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-images.zip`,
          size: zipBlob.size,
          blob: zipBlob,
          url: URL.createObjectURL(zipBlob),
          type: 'application/zip',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 15. IMAGES TO PDF
      else if (tool.id === 'img2pdf') {
        if (!files.length) throw new Error('กรุณาเลือกรูปภาพก่อน');
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังรวมรูปภาพเข้าเอกสาร PDF...' });
        const pdfDoc = await PDFDocument.create();

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const bytes = await f.arrayBuffer();
          let embedded;
          if (f.type === 'image/png') {
            embedded = await pdfDoc.embedPng(bytes);
          } else if (f.type === 'image/jpeg') {
            embedded = await pdfDoc.embedJpg(bytes);
          } else {
            const img = await fileToImage(f);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            const pngBlob = await canvasToBlob(canvas, 'image/png');
            embedded = await pdfDoc.embedPng(await pngBlob.arrayBuffer());
          }

          const imgW = embedded.width;
          const imgH = embedded.height;
          if (imgPageSize === 'fit') {
            const page = pdfDoc.addPage([imgW, imgH]);
            page.drawImage(embedded, { x: 0, y: 0, width: imgW, height: imgH });
          } else {
            const pageW = 595.28;
            const pageH = 841.89;
            const margin = 36;
            const page = pdfDoc.addPage([pageW, pageH]);
            const maxW = pageW - margin * 2;
            const maxH = pageH - margin * 2;
            const scale = Math.min(maxW / imgW, maxH / imgH);
            const w = imgW * scale;
            const h = imgH * scale;
            page.drawImage(embedded, {
              x: (pageW - w) / 2,
              y: (pageH - h) / 2,
              width: w,
              height: h,
            });
          }
        }
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: 'images-combined.pdf',
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 16. CONVERT IMAGES
      else if (tool.id === 'convertimg') {
        if (!files.length) throw new Error('กรุณาเลือกรูปภาพก่อน');
        const ext = imgOutputFormat.split('/')[1] === 'jpeg' ? 'jpg' : imgOutputFormat.split('/')[1];
        const results: OutputFile[] = [];

        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setProgress({
            state: 'processing',
            progress: 20 + Math.round(((i + 1) / files.length) * 70),
            currentStep: `กำลังแปลงภาพ (${i + 1}/${files.length}): ${f.name}`,
          });
          const img = await fileToImage(f);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (imgOutputFormat === 'image/jpeg' && ctx) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx?.drawImage(img, 0, 0);
          const blob = await canvasToBlob(canvas, imgOutputFormat, 0.88);
          results.push({
            id: Math.random().toString(36).substring(2),
            name: `${baseName(f.name)}.${ext}`,
            size: blob.size,
            blob,
            url: URL.createObjectURL(blob),
            type: imgOutputFormat,
            createdAt: new Date(),
          });
        }
        setOutputFiles(results);
        if (results[0]) onProcessedSuccess(results[0]);
      }

      // 17. HTML / TEXT TO PDF
      else if (tool.id === 'html2pdf') {
        if (!htmlContent.trim()) throw new Error('กรุณาพิมพ์หรือวางเนื้อหาก่อน');
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังจัดหน้าเอกสาร PDF...' });
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText =
          'width:700px;padding:24px;font-family:Prompt,Tahoma,sans-serif;color:#111;background:#fff;position:fixed;left:-9999px;top:0;';
        if (isHtmlMode) {
          tempDiv.innerHTML = htmlContent;
        } else {
          const pre = document.createElement('div');
          pre.style.whiteSpace = 'pre-wrap';
          pre.textContent = htmlContent;
          tempDiv.appendChild(pre);
        }
        document.body.appendChild(tempDiv);

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        await new Promise<void>(resolve => {
          doc.html(tempDiv, {
            x: 20,
            y: 20,
            width: 555,
            windowWidth: 700,
            callback: () => resolve(),
          });
        });
        document.body.removeChild(tempDiv);

        const blob = doc.output('blob');
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: 'document.pdf',
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 18. PDF TO MARKDOWN
      else if (tool.id === 'pdf2md') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังแปลงเป็น Markdown (.md)...' });
        const pdfjs = window.pdfjsLib;
        if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
        const bytes = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        let md = `# ${baseName(f.name)}\n\n`;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const lines = groupTextLines(content.items);
          md += `## หน้า ${i}\n\n`;
          lines.forEach(l => {
            md += l.join(' ') + '\n\n';
          });
        }
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}.md`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'text/markdown',
          text: md,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 19. EDIT PDF (TEXT / RECT / DRAW)
      else if (tool.id === 'editpdf') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังผนวกเลเยอร์วาดและข้อความ...' });
        const bytes = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const pages = pdfDoc.getPages();
        const scale = 1.3;

        for (const pIdxStr of Object.keys(editElements)) {
          const pIdx = parseInt(pIdxStr, 10);
          const page = pages[pIdx];
          if (!page) continue;
          const { height } = page.getSize();
          for (const el of editElements[pIdx]) {
            const col = hexToRgb01(el.color);
            if (el.type === 'text') {
              page.drawText(el.text, {
                x: el.x / scale,
                y: height - el.y / scale,
                size: (el.size || 18) / scale,
                color: rgb(col.r, col.g, col.b),
              });
            } else if (el.type === 'rect') {
              page.drawRectangle({
                x: el.x / scale,
                y: height - (el.y + el.h) / scale,
                width: el.w / scale,
                height: el.h / scale,
                borderColor: rgb(col.r, col.g, col.b),
                borderWidth: 1.5,
              });
            } else if (el.type === 'free') {
              for (let i = 0; i < el.points.length - 1; i++) {
                const p1 = el.points[i];
                const p2 = el.points[i + 1];
                page.drawLine({
                  start: { x: p1.x / scale, y: height - p1.y / scale },
                  end: { x: p2.x / scale, y: height - p2.y / scale },
                  thickness: 1.5,
                  color: rgb(col.r, col.g, col.b),
                });
              }
            }
          }
        }
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-edited.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 20. WATERMARK
      else if (tool.id === 'watermark') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังประทับลายน้ำลงทุกหน้า...' });
        const bytes = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const col = hexToRgb01(wmColor);
        const pages = pdfDoc.getPages();

        pages.forEach(page => {
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(wmText, wmSize);
          page.drawText(wmText, {
            x: width / 2 - textWidth / 2,
            y: height / 2,
            size: wmSize,
            font,
            color: rgb(col.r, col.g, col.b),
            opacity: wmOpacity / 100,
            rotate: degrees(wmAngle),
          });
        });
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-watermarked.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 21. PAGE NUMBERS
      else if (tool.id === 'pagenum') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังใส่เลขหน้า...' });
        const bytes = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const total = pages.length;

        pages.forEach((page, i) => {
          const { width, height } = page.getSize();
          const label = pnFormat.replace('{n}', String(pnStart + i)).replace('{total}', String(total));
          const size = 10;
          const tw = font.widthOfTextAtSize(label, size);
          let x = width / 2 - tw / 2;
          let y = 24;
          if (pnPos === 'br') {
            x = width - tw - 30;
            y = 24;
          } else if (pnPos === 'bl') {
            x = 30;
            y = 24;
          } else if (pnPos === 'tr') {
            x = width - tw - 30;
            y = height - 30;
          }
          page.drawText(label, { x, y, size, font, color: rgb(0.2, 0.25, 0.3) });
        });
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-numbered.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 22. CROP
      else if (tool.id === 'crop') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังครอบตัดขอบกระดาษ...' });
        const bytes = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        pdfDoc.getPages().forEach(page => {
          const { width, height } = page.getSize();
          const newW = Math.max(10, width - cropL - cropR);
          const newH = Math.max(10, height - cropT - cropB);
          page.setCropBox(cropL, cropB, newW, newH);
        });
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-cropped.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 23. SIGN PDF
      else if (tool.id === 'sign') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        if (!placedSigns.length) throw new Error('กรุณาวาดและคลิกวางตำแหน่งลายเซ็นลงบนหน้าเอกสารอย่างน้อย 1 จุด');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังบันทึกลายเซ็นลงใน PDF...' });
        const bytes = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const pages = pdfDoc.getPages();
        const scale = 1.3;

        for (const p of placedSigns) {
          const page = pages[p.page];
          if (!page) continue;
          const { height } = page.getSize();
          const base64 = p.dataUrl.split(',')[1];
          const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const img = await pdfDoc.embedPng(imgBytes);
          const pw = p.w / scale;
          const ph = p.h / scale;
          page.drawImage(img, {
            x: p.x / scale,
            y: height - p.y / scale - ph,
            width: pw,
            height: ph,
          });
        }
        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-signed.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 24. UNLOCK PDF
      else if (tool.id === 'unlock') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังปลดล็อกข้อจำกัดสิทธิ์...' });
        const bytes = await f.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const outBytes = await pdf.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-unlocked.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 25. REDACT PDF (BLACKOUT)
      else if (tool.id === 'redact') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        const pdfjs = window.pdfjsLib;
        if (!pdfjs) throw new Error('PDF.js ไม่พร้อมใช้งาน');
        setProgress({ state: 'processing', progress: 30, currentStep: 'กำลังประมวลผลการปิดบังข้อมูลถาวร...' });
        const bytes = await f.arrayBuffer();
        const pdfjsDoc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
        const srcPdf = await PDFDocument.load(bytes);
        const newPdf = await PDFDocument.create();
        const scale = 1.3;

        for (let i = 0; i < pdfjsDoc.numPages; i++) {
          const boxes = redactBoxes[i];
          if (boxes && boxes.length) {
            const page = await pdfjsDoc.getPage(i + 1);
            const viewport = page.getViewport({ scale: 2 });
            const canvasR = document.createElement('canvas');
            canvasR.width = viewport.width;
            canvasR.height = viewport.height;
            const ctxR = canvasR.getContext('2d')!;
            await page.render({ canvasContext: ctxR, viewport }).promise;
            const ratio = 2 / scale;
            ctxR.fillStyle = '#000000';
            boxes.forEach(b => {
              ctxR.fillRect(b.x * ratio, b.y * ratio, b.w * ratio, b.h * ratio);
            });
            const blob = await canvasToBlob(canvasR, 'image/jpeg', 0.88);
            const imgBytes = await blob.arrayBuffer();
            const img = await newPdf.embedJpg(imgBytes);
            const pg = newPdf.addPage([viewport.width, viewport.height]);
            pg.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
          } else {
            const [copied] = await newPdf.copyPages(srcPdf, [i]);
            newPdf.addPage(copied);
          }
        }
        const outBytes = await newPdf.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-redacted.pdf`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'application/pdf',
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 26. COMPARE PDFS
      else if (tool.id === 'compare') {
        if (!compareFileA || !compareFileB) throw new Error('กรุณาเลือกไฟล์ PDF ให้ครบทั้ง 2 ไฟล์');
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังสกัดข้อความเพื่อเปรียบเทียบ...' });
        const textA = await extractAllText(compareFileA);
        const textB = await extractAllText(compareFileB);
        let wordsA = textA.split(/\s+/).filter(Boolean);
        let wordsB = textB.split(/\s+/).filter(Boolean);
        const CAP = 2500;
        if (wordsA.length > CAP) wordsA = wordsA.slice(0, CAP);
        if (wordsB.length > CAP) wordsB = wordsB.slice(0, CAP);
        const diff = diffWords(wordsA, wordsB);
        setCompareDiffs(diff);

        const reportTxt = diff
          .map(d => (d.type === 'add' ? '+ ' : d.type === 'del' ? '- ' : '  ') + d.text)
          .join('\n');
        const blob = new Blob([reportTxt], { type: 'text/plain;charset=utf-8' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: 'compare-difference-report.txt',
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'text/plain',
          text: reportTxt,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 27. OCR
      else if (tool.id === 'ocr') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์รูปภาพหรือ PDF ก่อน');
        const f = files[0];
        const tesseract = window.Tesseract;
        if (!tesseract) throw new Error('Tesseract OCR ไม่พร้อมใช้งาน');
        setProgress({ state: 'processing', progress: 30, currentStep: 'กำลังเตรียมโมเดลภาษา OCR...' });

        let fullText = '';
        if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
          const pdfjs = window.pdfjsLib;
          const bytes = await f.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: bytes }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            setProgress({
              state: 'processing',
              progress: 30 + Math.round((i / pdf.numPages) * 60),
              currentStep: `กำลัง OCR หน้า ${i}/${pdf.numPages}...`,
            });
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const { data } = await tesseract.recognize(canvas, ocrLang);
            fullText += `--- หน้า ${i} ---\n${data.text}\n\n`;
          }
        } else {
          setProgress({ state: 'processing', progress: 50, currentStep: 'กำลังสแกนตัวอักษรจากภาพ...' });
          const { data } = await tesseract.recognize(f, ocrLang);
          fullText = data.text;
        }

        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-ocr.txt`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'text/plain',
          text: fullText,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 28. AI SUMMARIZE
      else if (tool.id === 'summarize') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังดึงเนื้อหาจาก PDF...' });
        let text = await extractAllText(f);
        if (text.length > 15000) text = text.slice(0, 15000);

        setProgress({ state: 'processing', progress: 70, currentStep: 'กำลังประมวลผลสรุปเนื้อหา...' });
        let summaryResult = '';

        if (aiApiKey.trim()) {
          // If user provided custom Anthropic API key
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': aiApiKey.trim(),
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 2000,
              messages: [
                {
                  role: 'user',
                  content: `สรุปเนื้อหาเอกสารต่อไปนี้เป็นภาษาไทย ระดับความละเอียด: ${aiSummaryDepth} เน้นประเด็นหลักและจุดสำคัญ:\n\n${text}`,
                },
              ],
            }),
          });
          const data = await res.json();
          summaryResult = data.content.map((c: any) => c.text || '').join('\n');
        } else {
          // Built-in intelligent text extractor summary
          const lines = text
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 20);
          summaryResult = `### 📋 สรุปใจความสำคัญของเอกสาร (${baseName(f.name)})\n\n`;
          summaryResult += `**ความยาวเนื้อหา:** ประมาณ ${text.length.toLocaleString()} ตัวอักษร\n`;
          summaryResult += `**ประเด็นหลักที่ตรวจพบ:**\n\n`;
          const keyPoints = lines.slice(0, 8);
          if (keyPoints.length) {
            keyPoints.forEach((p, idx) => {
              summaryResult += `${idx + 1}. ${p}\n`;
            });
          } else {
            summaryResult += `- เอกสารมีเนื้อหาโครงสร้างทั่วไป\n- คุณสามารถใส่ Anthropic API Key เพื่อการสรุปเชิงลึกด้วย AI โมเดลขนาดใหญ่`;
          }
        }

        const blob = new Blob([summaryResult], { type: 'text/markdown;charset=utf-8' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-summary.md`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'text/markdown',
          text: summaryResult,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // 29. AI TRANSLATE
      else if (tool.id === 'translate') {
        if (!files.length) throw new Error('กรุณาเลือกไฟล์ PDF ก่อน');
        const f = files[0];
        setProgress({ state: 'processing', progress: 40, currentStep: 'กำลังดึงเนื้อหาจาก PDF...' });
        let text = await extractAllText(f);
        if (text.length > 15000) text = text.slice(0, 15000);

        setProgress({ state: 'processing', progress: 70, currentStep: `กำลังแปลเป็นภาษา${aiTargetLang}...` });
        let transResult = '';

        if (aiApiKey.trim()) {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': aiApiKey.trim(),
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 2000,
              messages: [
                {
                  role: 'user',
                  content: `แปลเนื้อหาต่อไปนี้เป็นภาษา${aiTargetLang} โดยคงโครงสร้างย่อหน้าเดิม:\n\n${text}`,
                },
              ],
            }),
          });
          const data = await res.json();
          transResult = data.content.map((c: any) => c.text || '').join('\n');
        } else {
          transResult = `### 🌐 ผลการแปลเอกสาร (${baseName(f.name)} → ${aiTargetLang})\n\n`;
          transResult += `(หมายเหตุ: ใส่ Anthropic API Key เพื่อแปลด้วยโมเดล Claude เต็มรูปแบบ หรือดูเนื้อหาต้นฉบับที่สกัดได้ด้านล่าง):\n\n${text.slice(0, 3000)}`;
        }

        const blob = new Blob([transResult], { type: 'text/markdown;charset=utf-8' });
        const result: OutputFile = {
          id: Math.random().toString(36).substring(2),
          name: `${baseName(f.name)}-translated.md`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
          type: 'text/markdown',
          text: transResult,
          createdAt: new Date(),
        };
        setOutputFiles([result]);
        onProcessedSuccess(result);
      }

      // Finalize animation and trigger Confetti
      setProgress({ state: 'success', progress: 100, currentStep: 'ประมวลผลเสร็จสมบูรณ์!' });
      triggerConfetti();
      setTimeout(() => {
        setProgress({ state: 'idle', progress: 0, currentStep: 'พร้อมทำงาน' });
      }, 900);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการประมวลผล');
      setProgress({ state: 'error', progress: 0, currentStep: 'เกิดข้อผิดพลาด' });
    }
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 25 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden mb-12"
    >
      {/* Workbench Top Bar */}
      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${tool.gradient} text-white flex items-center justify-center shadow-sm`}
          >
            <ToolIcon name={tool.iconName} className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {tool.code}
              </span>
              <h2 className="font-bold text-lg text-slate-900">{tool.name}</h2>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">{tool.desc}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          title="ปิดหน้าต่างเครื่องมือ"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Error Alert if any */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* ----------------- DROPZONE OR INPUT SECTION ----------------- */}
        {tool.id !== 'scan2pdf' && tool.id !== 'html2pdf' && tool.id !== 'compare' && (
          <div className="space-y-3">
            {/* Animated Dropzone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-red-500 bg-red-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={tool.multiple}
                accept={tool.accept}
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-100/80 text-red-600 flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7" />
              </div>

              <h4 className="text-base font-bold text-slate-800 mb-1">
                คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                {tool.multiple ? 'รองรับการเลือกหลายไฟล์พร้อมกัน' : 'รองรับ 1 ไฟล์'} ({tool.accept})
              </p>

              {/* Instant sample button in dropzone */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenTestModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>หรือคลิกที่นี่เพื่อใช้ไฟล์ตัวอย่างทดสอบ</span>
              </button>
            </div>

            {/* Selected File List */}
            {files.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                  <span>รายการไฟล์ที่เลือก ({files.length})</span>
                  {files.length > 1 && (
                    <button
                      onClick={() => setFiles([])}
                      className="text-red-600 hover:underline text-xs"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          ({formatBytes(file.size)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {tool.multiple && (
                          <>
                            <button
                              onClick={() => reorderFile(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600"
                              title="เลื่อนขึ้น"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => reorderFile(idx, idx + 1)}
                              disabled={idx === files.length - 1}
                              className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600"
                              title="เลื่อนลง"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                          title="ลบไฟล์"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- COMPARE DUAL DROPZONE ----------------- */}
        {tool.id === 'compare' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                เอกสารที่ 1 (ต้นฉบับ)
              </label>
              <div
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf';
                  input.onchange = (e: any) => setCompareFileA(e.target.files[0]);
                  input.click();
                }}
                className="border-2 border-dashed border-slate-300 hover:border-red-400 p-6 rounded-2xl text-center cursor-pointer bg-slate-50/50"
              >
                {compareFileA ? (
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-800">
                    <FileText className="w-5 h-5 text-red-600" />
                    <span className="truncate">{compareFileA.name}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    คลิกเลือกไฟล์ที่ 1
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                เอกสารที่ 2 (ฉบับแก้ไข)
              </label>
              <div
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf';
                  input.onchange = (e: any) => setCompareFileB(e.target.files[0]);
                  input.click();
                }}
                className="border-2 border-dashed border-slate-300 hover:border-red-400 p-6 rounded-2xl text-center cursor-pointer bg-slate-50/50"
              >
                {compareFileB ? (
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-800">
                    <FileText className="w-5 h-5 text-red-600" />
                    <span className="truncate">{compareFileB.name}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    คลิกเลือกไฟล์ที่ 2
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- HTML / TEXT INPUT ----------------- */}
        {tool.id === 'html2pdf' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                พิมพ์ข้อความหรือวาง HTML
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHtmlMode}
                  onChange={e => setIsHtmlMode(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>ประมวลผลเป็นโค้ด HTML</span>
              </label>
            </div>
            <textarea
              rows={8}
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              placeholder={
                isHtmlMode
                  ? '<h1>ใบเสนอราคา</h1><p>รายการสินค้า...</p>'
                  : 'พิมพ์ข้อความรายงาน หรือบันทึกข้อความที่ต้องการแปลงเป็น PDF...'
              }
              className="w-full p-4 rounded-2xl border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-mono text-sm outline-none"
            />
          </div>
        )}

        {/* ----------------- SCAN2PDF CAMERA ----------------- */}
        {tool.id === 'scan2pdf' && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-3xl overflow-hidden relative aspect-video max-h-[380px] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!camStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/80 p-4 text-center">
                  <Camera className="w-10 h-10 mb-2 text-red-400" />
                  <p className="text-sm font-semibold mb-3">กดเปิดกล้องเพื่อเริ่มถ่ายภาพเอกสาร</p>
                  <button
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                          video: { facingMode: 'environment' },
                        });
                        setCamStream(stream);
                        if (videoRef.current) videoRef.current.srcObject = stream;
                      } catch (err: any) {
                        alert('เปิดกล้องไม่ได้: ' + err.message);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
                  >
                    เปิดกล้องถ่ายเอกสาร
                  </button>
                </div>
              )}
            </div>

            {camStream && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    if (!videoRef.current) return;
                    const canvas = document.createElement('canvas');
                    canvas.width = videoRef.current.videoWidth || 1280;
                    canvas.height = videoRef.current.videoHeight || 720;
                    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    setCamShots(prev => [...prev, dataUrl]);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>ถ่ายภาพหน้านี้ ({camShots.length})</span>
                </button>
              </div>
            )}

            {/* Shots Preview */}
            {camShots.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {camShots.map((shot, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={shot} alt={`shot ${idx + 1}`} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => setCamShots(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 rounded bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ----------------- VISUAL THUMBNAIL ORGANIZER ----------------- */}
        {tool.id === 'organize' && pageThumbs.length > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              จัดเรียง สลับลำดับ หมุน หรือลบหน้า (คลิกปุ่มบนการ์ด)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[420px] overflow-y-auto p-1">
              {pageThumbs.map((thumb, i) => (
                <div
                  key={i}
                  className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex flex-col justify-between text-center"
                >
                  <div className="relative aspect-[3/4] bg-white rounded-lg border border-slate-200 overflow-hidden mb-2 flex items-center justify-center">
                    <img
                      src={thumb.dataUrl}
                      alt={`page ${i + 1}`}
                      style={{ transform: `rotate(${thumb.rotation}deg)` }}
                      className="max-w-full max-h-full object-contain transition-transform"
                    />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 mb-2">
                    หน้า {i + 1} (เดิม {thumb.origIndex + 1})
                  </span>

                  <div className="flex items-center justify-center gap-1 text-xs">
                    <button
                      onClick={() => {
                        if (i > 0) {
                          setPageThumbs(prev => {
                            const copy = [...prev];
                            [copy[i], copy[i - 1]] = [copy[i - 1], copy[i]];
                            return copy;
                          });
                        }
                      }}
                      disabled={i === 0}
                      className="p-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-30"
                      title="เลื่อนซ้าย"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => {
                        if (i < pageThumbs.length - 1) {
                          setPageThumbs(prev => {
                            const copy = [...prev];
                            [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
                            return copy;
                          });
                        }
                      }}
                      disabled={i === pageThumbs.length - 1}
                      className="p-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-30"
                      title="เลื่อนขวา"
                    >
                      →
                    </button>
                    <button
                      onClick={() => {
                        setPageThumbs(prev => {
                          const copy = [...prev];
                          copy[i].rotation = (copy[i].rotation + 90) % 360;
                          return copy;
                        });
                      }}
                      className="p-1 rounded bg-slate-200 hover:bg-slate-300"
                      title="หมุน 90 องศา"
                    >
                      ⟳
                    </button>
                    <button
                      onClick={() => {
                        setPageThumbs(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                      title="ลบหน้านี้"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- INTERACTIVE CANVAS FOR SIGNATURE / EDIT / REDACT ----------------- */}
        {tool.id === 'sign' && files.length > 0 && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">1. วาดลายเซ็นของคุณในกล่องด้านล่าง</h4>
                <p className="text-xs text-slate-500">จากนั้นคลิกตรงจุดที่ต้องการวางบนหน้าเอกสาร</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const ctx = sigCanvasRef.current?.getContext('2d');
                    if (ctx && sigCanvasRef.current) {
                      ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700"
                >
                  ล้างลายเซ็น
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <canvas
                ref={sigCanvasRef}
                width={320}
                height={110}
                onMouseDown={e => {
                  const canvas = sigCanvasRef.current;
                  if (!canvas) return;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  const rect = canvas.getBoundingClientRect();
                  ctx.lineWidth = 2.5;
                  ctx.strokeStyle = '#0f172a';
                  ctx.beginPath();
                  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                  const handleMove = (ev: MouseEvent) => {
                    ctx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
                    ctx.stroke();
                  };
                  const handleUp = () => {
                    window.removeEventListener('mousemove', handleMove);
                    window.removeEventListener('mouseup', handleUp);
                  };
                  window.addEventListener('mousemove', handleMove);
                  window.addEventListener('mouseup', handleUp);
                }}
                className="bg-white border-2 border-slate-300 rounded-2xl cursor-crosshair shadow-inner"
              />

              <div className="text-xs text-slate-500 space-y-2">
                <label className="font-semibold text-slate-700 block">ปรับขนาดลายเซ็นที่จะวาง</label>
                <input
                  type="range"
                  min="80"
                  max="280"
                  value={sigWidth}
                  onChange={e => setSigWidth(parseInt(e.target.value, 10))}
                  className="w-48 accent-red-600"
                />
                <div>ความกว้าง: {sigWidth} pt</div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SPECIFIC TOOL SETTINGS ----------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {/* Split Mode */}
          {tool.id === 'split' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ระบุหน้าที่ต้องการดึง</label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                  placeholder="เช่น 1-3, 5, 8"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">รูปแบบการบันทึก</label>
                <select
                  value={splitMode}
                  onChange={e => setSplitMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option value="one">รวมหน้าที่เลือกเป็นไฟล์เดียว</option>
                  <option value="each">แยกเป็นไฟล์ PDF ทีละหน้า (Zip)</option>
                </select>
              </div>
            </>
          )}

          {/* Rotate Degree */}
          {tool.id === 'rotate' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">หน้าที่ต้องการหมุน</label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                  placeholder="ว่างไว้ = ทุกหน้า (หรือ 1-3)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">องศาการหมุน</label>
                <select
                  value={rotDeg}
                  onChange={e => setRotDeg(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option value={90}>หมุนขวา 90° ตามเข็ม</option>
                  <option value={180}>หมุนกลับหัว 180°</option>
                  <option value={270}>หมุนซ้าย 90° ทวนเข็ม</option>
                </select>
              </div>
            </>
          )}

          {/* Compress Controls */}
          {(tool.id === 'compresspdf' || tool.id === 'compress') && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>คุณภาพการบีบอัด</span>
                  <span className="text-red-600">{compressQuality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={compressQuality}
                  onChange={e => setCompressQuality(parseInt(e.target.value, 10))}
                  className="w-full accent-red-600"
                />
              </div>
              {tool.id === 'compresspdf' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ความละเอียด</label>
                  <select
                    value={compressScale}
                    onChange={e => setCompressScale(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                  >
                    <option value={1}>ประหยัดสุด (1x)</option>
                    <option value={1.5}>สมดุล คมชัด (1.5x)</option>
                    <option value={2}>ความละเอียดสูง (2x)</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* Watermark Controls */}
          {tool.id === 'watermark' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ข้อความลายน้ำ</label>
                <input
                  type="text"
                  value={wmText}
                  onChange={e => setWmText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">สีและโทน</label>
                <select
                  value={wmColor}
                  onChange={e => setWmColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option value="#B5222A">สีแดง แฟ้มแดง</option>
                  <option value="#1e293b">สีเทาเข้ม</option>
                  <option value="#2563eb">สีน้ำเงิน</option>
                  <option value="#16a34a">สีเขียว</option>
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>ความโปร่งใส</span>
                  <span>{wmOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={wmOpacity}
                  onChange={e => setWmOpacity(parseInt(e.target.value, 10))}
                  className="w-full accent-red-600"
                />
              </div>
            </>
          )}

          {/* Page Numbers Controls */}
          {tool.id === 'pagenum' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ตำแหน่งวางเลขหน้า</label>
                <select
                  value={pnPos}
                  onChange={e => setPnPos(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  <option value="bc">ด้านล่าง - ตรงกลาง</option>
                  <option value="br">ด้านล่าง - ขวา</option>
                  <option value="bl">ด้านล่าง - ซ้าย</option>
                  <option value="tr">ด้านบน - ขวา</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">รูปแบบข้อความ</label>
                <input
                  type="text"
                  value={pnFormat}
                  onChange={e => setPnFormat(e.target.value)}
                  placeholder="หน้า {n} / {total}"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-red-500"
                />
              </div>
            </>
          )}

          {/* OCR Language */}
          {tool.id === 'ocr' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">ภาษาสำหรับ OCR</label>
              <select
                value={ocrLang}
                onChange={e => setOcrLang(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
              >
                <option value="tha+eng">ภาษาไทย + อังกฤษ (แนะนำ)</option>
                <option value="tha">ภาษาไทยล้วน</option>
                <option value="eng">ภาษาอังกฤษล้วน</option>
              </select>
            </div>
          )}

          {/* AI Settings */}
          {(tool.id === 'summarize' || tool.id === 'translate') && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Anthropic API Key (ไม่บังคับ - ว่างไว้จะใช้ระบบในตัว)
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-red-500"
                />
              </div>
              {tool.id === 'translate' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">แปลเป็นภาษา</label>
                  <select
                    value={aiTargetLang}
                    onChange={e => setAiTargetLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                  >
                    <option value="ไทย">ภาษาไทย</option>
                    <option value="อังกฤษ">ภาษาอังกฤษ (English)</option>
                    <option value="จีน">ภาษาจีน (Chinese)</option>
                    <option value="ญี่ปุ่น">ภาษาญี่ปุ่น (Japanese)</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* ----------------- ACTION RUN BUTTON BAR ----------------- */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <button
            disabled={progress.state !== 'idle' && progress.state !== 'error'}
            onClick={handleRunTool}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-red-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>เริ่มประมวลผล ({tool.name})</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span
              className={`w-2 h-2 rounded-full ${
                progress.state === 'processing' || progress.state === 'reading'
                  ? 'bg-amber-500 animate-ping'
                  : progress.state === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>{progress.currentStep}</span>
          </div>
        </div>

        {/* ----------------- RESULT OUTPUT SECTION ----------------- */}
        {outputFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 pt-6 border-t border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">ผลลัพธ์พร้อมดาวน์โหลด</h3>
              </div>
              {outputFiles[0]?.text && (
                <button
                  onClick={() => copyToClipboard(outputFiles[0]?.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {outputFiles.map(out => (
                <div
                  key={out.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{out.name}</h4>
                      <p className="text-xs text-slate-500">{formatBytes(out.size)}</p>
                    </div>
                  </div>

                  <a
                    href={out.url}
                    download={out.name}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์</span>
                  </a>
                </div>
              ))}
            </div>

            {/* Text result viewer for OCR / Compare / Summary */}
            {outputFiles[0]?.text && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">ตัวอย่างข้อความผลลัพธ์</label>
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {outputFiles[0].text}
                </div>
              </div>
            )}

            {/* Compare Visual Highlights */}
            {tool.id === 'compare' && compareDiffs.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">
                  การเปรียบเทียบคำ (เขียว = เพิ่มขึ้น, ขีดฆ่าแดง = ถูกลบ)
                </label>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm leading-relaxed max-h-72 overflow-y-auto">
                  {compareDiffs.map((d, i) => {
                    if (d.type === 'add') {
                      return (
                        <span key={i} className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-semibold mx-0.5">
                          {d.text}{' '}
                        </span>
                      );
                    }
                    if (d.type === 'del') {
                      return (
                        <span key={i} className="bg-red-100 text-red-900 line-through px-1 py-0.5 rounded opacity-75 mx-0.5">
                          {d.text}{' '}
                        </span>
                      );
                    }
                    return <span key={i}>{d.text} </span>;
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
