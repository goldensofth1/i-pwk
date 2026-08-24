import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { ToolItem } from '../types';
import { ToolIcon } from './ToolIcon';

interface ToolCardProps {
  tool: ToolItem;
  isActive: boolean;
  onSelect: (tool: ToolItem) => void;
  index: number;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isActive,
  onSelect,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(tool)}
      className={`group relative flex flex-col justify-between p-5 rounded-2xl bg-white border cursor-pointer transition-all duration-200 shadow-sm ${
        isActive
          ? 'border-red-500 ring-2 ring-red-500/20 shadow-md shadow-red-500/10'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60'
      }`}
    >
      <div>
        {/* Top Meta Row */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {tool.code}
            </span>
            {tool.badge && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                <Sparkles className="w-2.5 h-2.5" />
                {tool.badge}
              </span>
            )}
          </div>

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${
              isActive
                ? 'bg-red-600 text-white'
                : `bg-gradient-to-tr ${tool.gradient} text-white`
            }`}
          >
            <ToolIcon name={tool.iconName} className="w-4 h-4" />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-slate-900 mb-1.5 group-hover:text-red-600 transition-colors">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
          {tool.desc}
        </p>
      </div>

      {/* Bottom Action Hint */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-red-600 transition-colors">
        <span className="text-[11px] uppercase tracking-wider font-medium text-slate-400">
          {tool.categoryName}
        </span>
        <div className="flex items-center gap-1 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all">
          <span>ใช้งาน</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  );
};
