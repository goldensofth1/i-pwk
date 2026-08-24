import React from 'react';
import { Sparkles, ShieldCheck, FileCheck, Layers } from 'lucide-react';

interface HeaderProps {
  onOpenTestModal: () => void;
  processedCount: number;
  onResetWorkbench: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTestModal,
  processedCount,
  onResetWorkbench,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          onClick={onResetWorkbench}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">I PWK</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                PDF CRAFT
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">โต๊ะช่างจัดการและแปลงไฟล์ PDF • พัฒนาโดย นายทศพร คำเพชร (บาส)</p>
          </div>
        </div>

        {/* Badges and Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Privacy Security Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ประมวลผลในเครื่อง 100% ปลอดภัย</span>
          </div>

          {/* Processed Count if any */}
          {processedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
              <FileCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>แปลงแล้ว {processedCount} ไฟล์</span>
            </div>
          )}

          {/* Quick Test Button */}
          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 border border-indigo-200/80 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
            title="สร้างไฟล์ทดสอบเพื่อลองใช้งานเครื่องมือทันที"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>สร้างไฟล์ทดสอบ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
