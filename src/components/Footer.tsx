import React from 'react';
import { ShieldCheck, Lock, Cpu, Sparkles, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white pt-12 pb-10 text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Security & Client-side guarantee grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-8 border-b border-slate-100">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                ความเป็นส่วนตัว 100%
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                ไฟล์ทั้งหมดของคุณถูกประมวลผลภายในเบราว์เซอร์ผ่าน WebAssembly และ JavaScript ไม่มีการส่งข้อมูลขึ้นเซิร์ฟเวอร์
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                ทำงานรวดเร็ว ไม่จำกัดขนาด
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                ใช้พลังการประมวลผลจาก CPU ของเครื่องคุณเองโดยตรง รวดเร็ว ปลอดภัย และไม่จำกัดโควต้าการแปลงไฟล์
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                ทดสอบได้ทันทีใน 1 คลิก
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                มีเครื่องมือสร้างไฟล์ตัวอย่างจำลองทั้ง PDF, Word, Excel และรูปภาพ ให้ทดสอบระบบได้โดยไม่ต้องหาไฟล์
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800">I PWK — PDF CRAFT STUDIO</span>
            <span className="text-slate-400">•</span>
            <span>โต๊ะช่างไฟล์ PDF ส่วนตัว</span>
          </div>

          <p className="text-slate-600 font-medium">
            พัฒนาโดย <span className="font-bold text-slate-900">นายทศพร คำเพชร (บาส)</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
