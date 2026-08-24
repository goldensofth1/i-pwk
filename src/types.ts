export type ToolCategory = 
  | 'organize' 
  | 'optimize' 
  | 'convert' 
  | 'edit' 
  | 'security' 
  | 'intel';

export interface ToolItem {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  desc: string;
  category: ToolCategory;
  categoryName: string;
  iconName: string;
  color: string;
  gradient: string;
  accentBg: string;
  badge?: string;
  accept: string;
  multiple: boolean;
  sampleType?: 'pdf' | 'docx' | 'xlsx' | 'image' | 'text';
}

export type ProcessingState = 'idle' | 'reading' | 'processing' | 'finalizing' | 'success' | 'error';

export interface ProcessingProgress {
  state: ProcessingState;
  progress: number; // 0 - 100
  currentStep: string;
  detail?: string;
  timeElapsed?: number;
}

export interface OutputFile {
  id: string;
  name: string;
  size: number;
  blob: Blob;
  url: string;
  text?: string;
  type: string;
  createdAt: Date;
}

export interface HistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  inputFileName: string;
  outputFileName: string;
  outputSize: number;
  timestamp: Date;
  downloadUrl: string;
}

export interface PageThumb {
  origIndex: number;
  rotation: number;
  dataUrl: string;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'rect' | 'free' | 'sign';
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  color: string;
  size?: number;
  points?: { x: number; y: number }[];
  dataUrl?: string;
}
