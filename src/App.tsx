import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

import { ToolCategory, ToolItem, OutputFile, ProcessingProgress } from './types';
import { CATEGORIES_DATA, TOOLS_DATA } from './data/toolsData';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ToolCard } from './components/ToolCard';
import { Workbench } from './components/Workbench';
import { QuickTestModal } from './components/QuickTestModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { Footer } from './components/Footer';

export default function App() {
  // Navigation & Tool Selection
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Test Modal & Injected Files
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [injectedSampleFile, setInjectedSampleFile] = useState<File | null>(null);

  // Global processed stats
  const [processedCount, setProcessedCount] = useState(0);

  // Shared processing progress for loading overlay
  const [globalProgress, setGlobalProgress] = useState<ProcessingProgress>({
    state: 'idle',
    progress: 0,
    currentStep: '',
  });

  const workbenchRef = useRef<HTMLDivElement>(null);

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    return TOOLS_DATA.filter(tool => {
      const matchCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        (tool.nameEn && tool.nameEn.toLowerCase().includes(q)) ||
        tool.desc.toLowerCase().includes(q) ||
        tool.code.toLowerCase().includes(q) ||
        tool.categoryName.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Group filtered tools by category for structured display
  const groupedTools = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery.trim()) {
      return [{ category: null, tools: filteredTools }];
    }
    return CATEGORIES_DATA.map(cat => ({
      category: cat,
      tools: TOOLS_DATA.filter(t => t.category === cat.id),
    }));
  }, [filteredTools, selectedCategory, searchQuery]);

  const handleSelectTool = (tool: ToolItem) => {
    setSelectedTool(tool);
    setTimeout(() => {
      workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleLoadSampleIntoTool = (sampleFile: File) => {
    if (!selectedTool) {
      // Default to Merge or Split or whatever fits best
      if (sampleFile.name.endsWith('.pdf')) {
        setSelectedTool(TOOLS_DATA.find(t => t.id === 'split') || TOOLS_DATA[0]);
      } else if (sampleFile.name.endsWith('.xlsx')) {
        setSelectedTool(TOOLS_DATA.find(t => t.id === 'excel2pdf') || TOOLS_DATA[0]);
      } else {
        setSelectedTool(TOOLS_DATA.find(t => t.id === 'img2pdf') || TOOLS_DATA[0]);
      }
    }
    setInjectedSampleFile(sampleFile);
    setTimeout(() => {
      workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleProcessedSuccess = (result: OutputFile) => {
    setProcessedCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* 1. Header */}
      <Header
        onOpenTestModal={() => setIsTestModalOpen(true)}
        processedCount={processedCount}
        onResetWorkbench={() => setSelectedTool(null)}
      />

      {/* 2. Hero Section with Search & Filter */}
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        toolsCount={TOOLS_DATA.length}
      />

      {/* 3. Main Workspace & Tool Board */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Active Workbench if a tool is chosen */}
        <div ref={workbenchRef}>
          <AnimatePresence mode="wait">
            {selectedTool && (
              <Workbench
                key={selectedTool.id}
                tool={selectedTool}
                onClose={() => setSelectedTool(null)}
                onProcessedSuccess={handleProcessedSuccess}
                injectedFile={injectedSampleFile}
                onClearInjectedFile={() => setInjectedSampleFile(null)}
                onOpenTestModal={() => setIsTestModalOpen(true)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Tools Section Heading */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {searchQuery ? `ผลการค้นหา "${searchQuery}"` : 'เลือกเครื่องมือที่ต้องการใช้งาน'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              พบ {filteredTools.length} เครื่องมือ พร้อมให้ใช้งานได้ทันที
            </p>
          </div>

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              ล้างการค้นหาทั้งหมด
            </button>
          )}
        </div>

        {/* Grouped Category Sections */}
        <div className="space-y-12">
          {groupedTools.map((group, groupIdx) => {
            if (!group.tools.length) return null;

            return (
              <section key={groupIdx} className="space-y-4">
                {/* Category Header if browsing all */}
                {group.category && (
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-200/80">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-lg border ${group.category.badgeColor}`}
                    >
                      {group.category.name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      {group.category.desc}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 ml-auto">
                      {group.tools.length} เครื่องมือ
                    </span>
                  </div>
                )}

                {/* Grid of Tool Cards with Scroll Reveal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {group.tools.map((tool, toolIdx) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      isActive={selectedTool?.id === tool.id}
                      onSelect={handleSelectTool}
                      index={toolIdx}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {filteredTools.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">ไม่พบเครื่องมือที่ตรงกับคำค้นหา</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                ลองค้นหาด้วยคำอื่น เช่น รวมไฟล์, แปลง, บีบอัด, ลายเซ็น หรือดูทุกเครื่องมือ
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-md hover:bg-slate-800 transition-colors"
              >
                ดูเครื่องมือทั้งหมด
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 4. Quick Test Modal */}
      <QuickTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onLoadSampleIntoTool={handleLoadSampleIntoTool}
        activeToolName={selectedTool?.name}
      />

      {/* 5. Processing Loading Overlay */}
      <ProcessingOverlay progress={globalProgress} />

      {/* 6. Footer */}
      <Footer />
    </div>
  );
}
