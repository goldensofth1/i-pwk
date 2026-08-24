import React from 'react';
import {
  Layers,
  Scissors,
  LayoutGrid,
  RotateCw,
  Camera,
  Minimize2,
  Image as ImageIcon,
  Wrench,
  FileText,
  Table,
  Presentation,
  FileType,
  Sheet,
  Images,
  FileImage,
  RefreshCw,
  Code,
  FileCode2,
  PenTool,
  Stamp,
  Hash,
  Crop,
  PenLine,
  Unlock,
  EyeOff,
  GitCompare,
  ScanText,
  Sparkles,
  Languages,
  FileBox,
} from 'lucide-react';

interface ToolIconProps {
  name: string;
  className?: string;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Layers':
      return <Layers className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'LayoutGrid':
      return <LayoutGrid className={className} />;
    case 'RotateCw':
      return <RotateCw className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Minimize2':
      return <Minimize2 className={className} />;
    case 'Image':
      return <ImageIcon className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Table':
      return <Table className={className} />;
    case 'Presentation':
      return <Presentation className={className} />;
    case 'FileType':
      return <FileType className={className} />;
    case 'Sheet':
      return <Sheet className={className} />;
    case 'Images':
      return <Images className={className} />;
    case 'FileImage':
      return <FileImage className={className} />;
    case 'RefreshCw':
      return <RefreshCw className={className} />;
    case 'Code':
      return <Code className={className} />;
    case 'FileCode2':
      return <FileCode2 className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Stamp':
      return <Stamp className={className} />;
    case 'Hash':
      return <Hash className={className} />;
    case 'Crop':
      return <Crop className={className} />;
    case 'PenLine':
      return <PenLine className={className} />;
    case 'Unlock':
      return <Unlock className={className} />;
    case 'EyeOff':
      return <EyeOff className={className} />;
    case 'GitCompare':
      return <GitCompare className={className} />;
    case 'ScanText':
      return <ScanText className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Languages':
      return <Languages className={className} />;
    default:
      return <FileBox className={className} />;
  }
};
