import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, FileCode2, CheckCircle2, Sparkles, FileText } from 'lucide-react';
import { ProcessingProgress } from '../types';

interface ProcessingOverlayProps {
  progress: ProcessingProgress;
  onCancel?: () => void;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  progress,
}) => {
  if (progress.state === 'idle') return null;

  const isSuccess = progress.state === 'success';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden text-center"
        >
          {/* Top Decorative glowing background */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-red-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl" />

          {/* Central Animated Illustration */}
          <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
            {/* Pulsing ring */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute inset-0 rounded-full ${
                isSuccess ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            />

            {/* Circular Progress SVG */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#e2e8f0"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                stroke={isSuccess ? '#10b981' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * Math.max(5, progress.progress)) / 100}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </svg>

            {/* Center Icon with smooth flip or pulse */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle2 className="w-7 h-7" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  className="relative flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                    <FileText className="w-6 h-6 animate-pulse" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Progress Percentage */}
          <div className="mb-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isSuccess ? '100%' : `${Math.round(progress.progress)}%`}
            </span>
          </div>

          {/* Current Step Message */}
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {progress.currentStep || 'กำลังประมวลผลไฟล์...'}
          </h3>

          {/* Detailed hint */}
          <p className="text-xs sm:text-sm text-slate-500 mb-6 min-h-[20px]">
            {progress.detail || 'ระบบกำลังอ่านและแปลงข้อมูลในเบราว์เซอร์อย่างปลอดภัย'}
          </p>

          {/* Animated Multi-Step Breadcrumb */}
          <div className="space-y-2 text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-4">
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  progress.progress >= 20
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                1
              </div>
              <span className={progress.progress >= 20 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                โหลดและอ่านโครงสร้างไฟล์ (Parse file structure)
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-medium">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  progress.progress >= 60
                    ? 'bg-emerald-500 text-white'
                    : progress.progress >= 20
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                2
              </div>
              <span className={progress.progress >= 60 ? 'text-slate-800 font-semibold' : progress.progress >= 20 ? 'text-red-600 font-semibold' : 'text-slate-400'}>
                แปลงและประมวลผลข้อมูล (Core conversion engine)
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-medium">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  progress.progress >= 100
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                3
              </div>
              <span className={progress.progress >= 100 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                สร้างไฟล์ผลลัพธ์พร้อมดาวน์โหลด (Ready to export)
              </span>
            </div>
          </div>

          {/* Shimmer Bar */}
          {!isSuccess && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className="bg-gradient-to-r from-red-500 to-rose-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
              <div className="absolute inset-0 bg-white/30 animate-shimmer" />
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>ประมวลผลสำเร็จเรียบร้อย!</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
