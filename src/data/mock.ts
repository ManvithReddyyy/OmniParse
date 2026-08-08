/* ═══════════════════════════════════════════════════════════
   Data Types & Core Engine Definitions — OmniParse IDP
   ═══════════════════════════════════════════════════════════ */

export type DocumentType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'png' | 'jpg' | 'jpeg' | 'webp';
export type DocumentStatus = 'completed' | 'processing' | 'pending' | 'error';
export type OutputFormat = 'markdown' | 'json' | 'plaintext';

export interface Document {
  id: string;
  filename: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadDate: string;
  fileSize: number;
  pages?: number;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  documentName: string;
  status: DocumentStatus;
  started: string;
  duration: string;
  outputFormat: OutputFormat;
}

export interface LayoutRegion {
  id: string;
  type: 'header' | 'title' | 'paragraph' | 'table' | 'figure' | 'footer' | 'list' | 'caption';
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  content?: string;
}

export interface TextBlock {
  id: string;
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  blockType: string;
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: string[][];
  confidence: number;
}

export interface ExtractedImage {
  id: string;
  label: string;
  width: number;
  height: number;
  format: string;
  url?: string;
  size?: string;
}

export interface DocumentMetadata {
  language: string;
  pages: number;
  documentType: string;
  wordCount: number;
  fileSize: string;
  creationDate: string;
  author: string;
  encoding: string;
}

export interface ReadingOrderItem {
  order: number;
  regionType: string;
  label: string;
  regionId: string;
}

export interface DocumentAnalysis {
  documentId: string;
  layoutRegions: LayoutRegion[];
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  images: ExtractedImage[];
  metadata: DocumentMetadata;
  readingOrder: ReadingOrderItem[];
  pageImages?: string[];
}

export interface TransformOutput {
  documentId: string;
  markdown: string;
  json: string;
  plaintext: string;
  originalTokens: number;
  markdownTokens: number;
  jsonTokens: number;
  plaintextTokens: number;
}


/* ── Real Dynamic Store Collections ─────────────────────── */

export const mockDocuments: Document[] = [];

export const mockJobs: ProcessingJob[] = [];

export const mockAnalysis: Record<string, DocumentAnalysis> = {};

export const mockTransforms: Record<string, TransformOutput> = {};


/* ── Supported Formats ──────────────────────────────────── */

export const supportedFormats = [
  { extension: 'PDF', description: 'Portable Document Format' },
  { extension: 'DOCX', description: 'Microsoft Word' },
  { extension: 'PPTX', description: 'Microsoft PowerPoint' },
  { extension: 'TXT', description: 'Plain Text' },
  { extension: 'PNG', description: 'PNG Image' },
  { extension: 'JPG', description: 'JPEG Image' },
  { extension: 'JPEG', description: 'JPEG Image' },
  { extension: 'WEBP', description: 'WebP Image' },
];


/* ── Processing Steps ───────────────────────────────────── */

export const processingSteps = [
  { id: 'upload', label: 'Uploading', duration: 800 },
  { id: 'layout', label: 'Layout Analysis', duration: 1200 },
  { id: 'ocr', label: 'OCR', duration: 1000 },
  { id: 'tables', label: 'Table Detection', duration: 900 },
  { id: 'images', label: 'Image Detection', duration: 800 },
  { id: 'semantic', label: 'Semantic Reconstruction', duration: 1000 },
  { id: 'completed', label: 'Completed', duration: 0 },
];


/* ── Utility ────────────────────────────────────────────── */

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (isNaN(date.getTime())) return 'Just now';
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}
