import React from 'react';
import { motion } from 'motion/react';
import { Search, X, Shield, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { ToolCategory } from '../types';
import { CATEGORIES_DATA } from '../data/toolsData';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: ToolCategory | 'all';
  onCategoryChange: (cat: ToolCategory | 'all') => void;
  onOpenTestModal: () => void;
  toolsCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenTestModal,
  toolsCount,
}) => {
  return (
    <div className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-8 pb-10">
      {/* Background Subtle Gradient & Dots */}
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        {/* Top Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold mb-4 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold">I PWK PDF STUDIO</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight mb-4"
        >
          จัดการและแปลงไฟล์ <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">PDF ครบจบในที่เดียว</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 font-normal leading-relaxed"
        >
          รวมไฟล์, แยกหน้า, บีบอัด, แปลง Word/Excel/รูปภาพ, วาดลายเซ็น, OCR และสรุปด้วย AI ทุกไฟล์ถูกประมวลผลบนเครื่องของคุณ ไม่มีการอัปโหลดออกภายนอก
        </motion.p>

        {/* Quick Highlights */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 mb-8"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toolsCount} เครื่องมือครบครัน</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>ปลอดภัย ข้อมูลไม่หลุด</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>ประมวลผลเร็วทันใจ</span>
          </div>
          <div 
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 text-indigo-600 font-medium cursor-pointer hover:underline"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>มีไฟล์ตัวอย่างให้ทดสอบทันที</span>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-xl mx-auto mb-8"
        >
          <div className="relative flex items-center shadow-lg shadow-slate-200/50 rounded-2xl bg-white border border-slate-200 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="ค้นหาเครื่องมือ เช่น รวมไฟล์, แปลงเป็น Word, ลายเซ็น, บีบอัด..."
              className="w-full px-3 py-3.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="p-2 mr-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Category Selector Pills */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex items-center justify-center flex-wrap gap-2"
        >
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({toolsCount})
          </button>

          {CATEGORIES_DATA.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20 scale-105 font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
