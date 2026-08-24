import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Image, Sheet, Download, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { generateSamplePdf, generateSampleImage, generateSampleExcel, formatBytes } from '../utils/pdfHelpers';

interface QuickTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSampleIntoTool: (file: File) => void;
  activeToolName?: string;
}

export const QuickTestModal: React.FC<QuickTestModalProps> = ({
  isOpen,
  onClose,
  onLoadSampleIntoTool,
  activeToolName,
}) => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (type: 'pdf' | 'image' | 'excel', action: 'load' | 'download') => {
    setGenerating(type);
    try {
      let file: File;
      if (type === 'pdf') {
        file = await generateSamplePdf('เอกสารตัวอย่างสำหรับทดสอบระบบ (Test Document)', 3);
      } else if (type === 'image') {
        file = await generateSampleImage('ภาพตัวอย่างทดสอบแปลงไฟล์');
      } else {
        file = await generateSampleExcel();
      }

      if (action === 'load') {
        onLoadSampleIntoTool(file);
        setSuccessMsg(`โหลด "${file.name}" เข้าสู่เครื่องมือเรียบร้อยแล้ว!`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setSuccessMsg(`ดาวน์โหลด "${file.name}" สำเร็จ!`);
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ทดสอบ: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Test Generator</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                สร้างไฟล์ตัวอย่างเพื่อทดสอบระบบทันที
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                คลิกปุ่มเพื่อสร้างไฟล์จำลองและใส่ลงในเครื่องมือทันที ไม่จำเป็นต้องเตรียมไฟล์เอง
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Banner if any */}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-medium rounded-xl border border-emerald-200 mb-4"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Sample Cards */}
          <div className="space-y-3 mb-6">
            {/* 1. PDF Sample */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-red-300 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">เอกสาร PDF ตัวอย่าง (3 หน้า)</h4>
                  <p className="text-xs text-slate-500">มีหัวข้อ ตาราง เส้นกราฟ และข้อความภาษาอังกฤษ/ตัวเลข</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={generating !== null}
                  onClick={() => handleGenerate('pdf', 'load')}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>ใส่ในเครื่องมือ</span>
                </button>
                <button
                  disabled={generating !== null}
                  onClick={() => handleGenerate('pdf', 'download')}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all"
                  title="ดาวน์โหลดเก็บไว้"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Image Sample */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">รูปภาพตัวอย่าง (.jpg)</h4>
                  <p className="text-xs text-slate-500">ขนาด 800x600 px สำหรับทดสอบบีบอัด, แปลงเป็น PDF, หรือ OCR</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={generating !== null}
                  onClick={() => handleGenerate('image', 'load')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>ใส่ในเครื่องมือ</span>
                </button>
                <button
                  disabled={generating !== null}
                  onClick={() => handleGenerate('image', 'download')}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all"
                  title="ดาวน์โหลดเก็บไว้"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Excel Sample */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <Sheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">ตาราง Excel ตัวอย่าง (.xlsx)</h4>
                  <p className="text-xs text-slate-500">รายงานสินค้า 6 รายการ พร้อมราคาและยอดคำนวณ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={generating !== null}
                  onClick={() => handleGenerate('excel', 'load')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>ใส่ในเครื่องมือ</span>
                </button>
                <button
                  disabled={generating !== null}
                  onClick={() => handleGenerate('excel', 'download')}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all"
                  title="ดาวน์โหลดเก็บไว้"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>
              เครื่องมือปัจจุบัน:{' '}
              <strong className="text-slate-800 font-semibold">{activeToolName || 'ยังไม่ได้เลือกเครื่องมือ'}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
