/* ═══════════════════════════════════════════════════════════
   Mock Data — OmniParse IDP
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


/* ── Documents ──────────────────────────────────────────── */

export const mockDocuments: Document[] = [
  {
    id: 'doc-001',
    filename: 'Q4-2024-Financial-Report.pdf',
    type: 'pdf',
    status: 'completed',
    uploadDate: '2026-07-19T12:30:00Z',
    fileSize: 2456000,
    pages: 24,
  },
  {
    id: 'doc-002',
    filename: 'Product-Requirements-v3.docx',
    type: 'docx',
    status: 'completed',
    uploadDate: '2026-07-19T10:15:00Z',
    fileSize: 890000,
    pages: 12,
  },
  {
    id: 'doc-003',
    filename: 'Architecture-Diagram.png',
    type: 'png',
    status: 'completed',
    uploadDate: '2026-07-18T16:45:00Z',
    fileSize: 1230000,
  },
  {
    id: 'doc-004',
    filename: 'Board-Presentation-Q3.pptx',
    type: 'pptx',
    status: 'processing',
    uploadDate: '2026-07-19T14:00:00Z',
    fileSize: 5670000,
    pages: 38,
  },
  {
    id: 'doc-005',
    filename: 'API-Documentation.txt',
    type: 'txt',
    status: 'completed',
    uploadDate: '2026-07-17T09:20:00Z',
    fileSize: 45000,
  },
  {
    id: 'doc-006',
    filename: 'Invoice-2024-0892.pdf',
    type: 'pdf',
    status: 'completed',
    uploadDate: '2026-07-16T14:30:00Z',
    fileSize: 320000,
    pages: 2,
  },
  {
    id: 'doc-007',
    filename: 'Research-Paper-Draft.pdf',
    type: 'pdf',
    status: 'pending',
    uploadDate: '2026-07-19T14:20:00Z',
    fileSize: 3400000,
    pages: 42,
  },
  {
    id: 'doc-008',
    filename: 'Scanned-Contract.jpg',
    type: 'jpg',
    status: 'error',
    uploadDate: '2026-07-15T11:00:00Z',
    fileSize: 890000,
  },
];


/* ── Processing Jobs ────────────────────────────────────── */

export const mockJobs: ProcessingJob[] = [
  {
    id: 'job-001',
    documentId: 'doc-001',
    documentName: 'Q4-2024-Financial-Report.pdf',
    status: 'completed',
    started: '2026-07-19T12:30:00Z',
    duration: '4.2s',
    outputFormat: 'markdown',
  },
  {
    id: 'job-002',
    documentId: 'doc-002',
    documentName: 'Product-Requirements-v3.docx',
    status: 'completed',
    started: '2026-07-19T10:15:00Z',
    duration: '3.1s',
    outputFormat: 'markdown',
  },
  {
    id: 'job-003',
    documentId: 'doc-003',
    documentName: 'Architecture-Diagram.png',
    status: 'completed',
    started: '2026-07-18T16:45:00Z',
    duration: '1.8s',
    outputFormat: 'json',
  },
  {
    id: 'job-004',
    documentId: 'doc-004',
    documentName: 'Board-Presentation-Q3.pptx',
    status: 'processing',
    started: '2026-07-19T14:00:00Z',
    duration: '—',
    outputFormat: 'markdown',
  },
  {
    id: 'job-005',
    documentId: 'doc-005',
    documentName: 'API-Documentation.txt',
    status: 'completed',
    started: '2026-07-17T09:20:00Z',
    duration: '0.9s',
    outputFormat: 'plaintext',
  },
  {
    id: 'job-006',
    documentId: 'doc-006',
    documentName: 'Invoice-2024-0892.pdf',
    status: 'completed',
    started: '2026-07-16T14:30:00Z',
    duration: '2.4s',
    outputFormat: 'markdown',
  },
];


/* ── Document Analysis Data ─────────────────────────────── */

export const mockAnalysis: Record<string, DocumentAnalysis> = {
  'doc-001': {
    documentId: 'doc-001',
    layoutRegions: [
      { id: 'lr-1', type: 'header', confidence: 0.98, bbox: { x: 50, y: 20, width: 700, height: 60 }, content: 'ACME Corporation' },
      { id: 'lr-2', type: 'title', confidence: 0.99, bbox: { x: 50, y: 100, width: 700, height: 45 }, content: 'Q4 2024 Financial Report' },
      { id: 'lr-3', type: 'paragraph', confidence: 0.96, bbox: { x: 50, y: 170, width: 700, height: 120 }, content: 'Executive Summary' },
      { id: 'lr-4', type: 'table', confidence: 0.94, bbox: { x: 50, y: 310, width: 700, height: 200 }, content: 'Revenue Breakdown' },
      { id: 'lr-5', type: 'figure', confidence: 0.92, bbox: { x: 50, y: 530, width: 350, height: 250 }, content: 'Revenue Chart' },
      { id: 'lr-6', type: 'paragraph', confidence: 0.97, bbox: { x: 420, y: 530, width: 330, height: 150 }, content: 'Analysis Notes' },
      { id: 'lr-7', type: 'footer', confidence: 0.95, bbox: { x: 50, y: 800, width: 700, height: 30 }, content: 'Page 1 of 24' },
    ],
    textBlocks: [
      { id: 'tb-1', text: 'ACME Corporation — Confidential', confidence: 0.99, bbox: { x: 50, y: 20, width: 700, height: 30 }, blockType: 'header' },
      { id: 'tb-2', text: 'Q4 2024 Financial Report\nAnnual Performance Review', confidence: 0.99, bbox: { x: 50, y: 100, width: 700, height: 45 }, blockType: 'title' },
      { id: 'tb-3', text: 'This report presents a comprehensive overview of ACME Corporation\'s financial performance during the fourth quarter of fiscal year 2024. Total revenue increased by 18.3% year-over-year, driven primarily by expansion in the enterprise segment and strategic partnerships established in Q2.', confidence: 0.97, bbox: { x: 50, y: 170, width: 700, height: 120 }, blockType: 'paragraph' },
      { id: 'tb-4', text: 'Key Metrics:\n• Revenue: $142.8M (+18.3% YoY)\n• Operating Margin: 24.1%\n• Net Income: $34.4M\n• Customer Acquisition: 1,247 new accounts\n• Retention Rate: 96.2%', confidence: 0.96, bbox: { x: 50, y: 310, width: 700, height: 100 }, blockType: 'list' },
      { id: 'tb-5', text: 'The enterprise segment contributed 67% of total revenue, with a notable increase in average contract value from $85K to $112K per account.', confidence: 0.95, bbox: { x: 420, y: 530, width: 330, height: 150 }, blockType: 'paragraph' },
    ],
    tables: [
      {
        id: 'tbl-1',
        headers: ['Segment', 'Q4 Revenue', 'Q3 Revenue', 'Change', 'Margin'],
        rows: [
          ['Enterprise', '$95.7M', '$82.1M', '+16.5%', '28.4%'],
          ['Mid-Market', '$31.2M', '$27.8M', '+12.2%', '21.7%'],
          ['SMB', '$15.9M', '$14.2M', '+12.0%', '18.9%'],
          ['Total', '$142.8M', '$124.1M', '+15.1%', '24.1%'],
        ],
        confidence: 0.94,
      },
      {
        id: 'tbl-2',
        headers: ['Region', 'Revenue', 'Growth', 'Accounts'],
        rows: [
          ['North America', '$89.2M', '+14.8%', '842'],
          ['Europe', '$35.1M', '+22.1%', '298'],
          ['Asia Pacific', '$18.5M', '+31.4%', '107'],
        ],
        confidence: 0.92,
      },
    ],
    images: [
      { id: 'img-1', label: 'Revenue Trend Chart', width: 640, height: 380, format: 'png' },
      { id: 'img-2', label: 'Segment Distribution Pie', width: 400, height: 400, format: 'png' },
      { id: 'img-3', label: 'Company Logo', width: 200, height: 60, format: 'svg' },
    ],
    metadata: {
      language: 'English',
      pages: 24,
      documentType: 'Financial Report',
      wordCount: 8420,
      fileSize: '2.4 MB',
      creationDate: '2026-07-15',
      author: 'ACME Finance Team',
      encoding: 'UTF-8',
    },
    readingOrder: [
      { order: 1, regionType: 'header', label: 'Company Header', regionId: 'lr-1' },
      { order: 2, regionType: 'title', label: 'Report Title', regionId: 'lr-2' },
      { order: 3, regionType: 'paragraph', label: 'Executive Summary', regionId: 'lr-3' },
      { order: 4, regionType: 'table', label: 'Revenue Breakdown Table', regionId: 'lr-4' },
      { order: 5, regionType: 'figure', label: 'Revenue Trend Chart', regionId: 'lr-5' },
      { order: 6, regionType: 'paragraph', label: 'Analysis Commentary', regionId: 'lr-6' },
      { order: 7, regionType: 'footer', label: 'Page Footer', regionId: 'lr-7' },
    ],
  },
};

// Generate analysis for other docs referencing the same structure
const defaultAnalysis: DocumentAnalysis = {
  documentId: '',
  layoutRegions: [
    { id: 'lr-1', type: 'header', confidence: 0.97, bbox: { x: 40, y: 15, width: 720, height: 50 } },
    { id: 'lr-2', type: 'title', confidence: 0.98, bbox: { x: 40, y: 80, width: 720, height: 40 } },
    { id: 'lr-3', type: 'paragraph', confidence: 0.95, bbox: { x: 40, y: 140, width: 720, height: 180 } },
    { id: 'lr-4', type: 'paragraph', confidence: 0.93, bbox: { x: 40, y: 340, width: 720, height: 160 } },
    { id: 'lr-5', type: 'footer', confidence: 0.96, bbox: { x: 40, y: 780, width: 720, height: 25 } },
  ],
  textBlocks: [
    { id: 'tb-1', text: 'Document content extracted via OCR processing.', confidence: 0.97, bbox: { x: 40, y: 15, width: 720, height: 50 }, blockType: 'header' },
    { id: 'tb-2', text: 'Section heading detected with high confidence.', confidence: 0.98, bbox: { x: 40, y: 80, width: 720, height: 40 }, blockType: 'title' },
    { id: 'tb-3', text: 'Body text paragraph containing the main content of this document section. The OCR engine has processed this region with character-level accuracy and reconstructed the text flow.', confidence: 0.95, bbox: { x: 40, y: 140, width: 720, height: 180 }, blockType: 'paragraph' },
  ],
  tables: [
    {
      id: 'tbl-1',
      headers: ['Item', 'Description', 'Value'],
      rows: [
        ['Row 1', 'Sample data extracted from document', '$1,200'],
        ['Row 2', 'Additional data point', '$3,450'],
        ['Row 3', 'Final entry in table', '$2,100'],
      ],
      confidence: 0.91,
    },
  ],
  images: [
    { id: 'img-1', label: 'Embedded Figure', width: 480, height: 320, format: 'png' },
  ],
  metadata: {
    language: 'English',
    pages: 1,
    documentType: 'Document',
    wordCount: 1240,
    fileSize: '890 KB',
    creationDate: '2026-07-18',
    author: 'Unknown',
    encoding: 'UTF-8',
  },
  readingOrder: [
    { order: 1, regionType: 'header', label: 'Document Header', regionId: 'lr-1' },
    { order: 2, regionType: 'title', label: 'Section Title', regionId: 'lr-2' },
    { order: 3, regionType: 'paragraph', label: 'Body Content', regionId: 'lr-3' },
    { order: 4, regionType: 'paragraph', label: 'Secondary Content', regionId: 'lr-4' },
    { order: 5, regionType: 'footer', label: 'Page Footer', regionId: 'lr-5' },
  ],
};

// Fill in analysis for remaining docs
['doc-002', 'doc-003', 'doc-005', 'doc-006'].forEach((id) => {
  mockAnalysis[id] = { ...defaultAnalysis, documentId: id };
});


/* ── Transform Outputs ──────────────────────────────────── */

export const mockTransforms: Record<string, TransformOutput> = {
  'doc-001': {
    documentId: 'doc-001',
    originalTokens: 18400,
    markdownTokens: 7100,
    jsonTokens: 9200,
    plaintextTokens: 6800,
    markdown: `# Q4 2024 Financial Report

**ACME Corporation** — Confidential

## Executive Summary

This report presents a comprehensive overview of ACME Corporation's financial performance during the fourth quarter of fiscal year 2024. Total revenue increased by **18.3% year-over-year**, driven primarily by expansion in the enterprise segment and strategic partnerships established in Q2.

## Key Metrics

| Metric | Value |
|--------|-------|
| Revenue | $142.8M (+18.3% YoY) |
| Operating Margin | 24.1% |
| Net Income | $34.4M |
| Customer Acquisition | 1,247 new accounts |
| Retention Rate | 96.2% |

## Revenue by Segment

| Segment | Q4 Revenue | Q3 Revenue | Change | Margin |
|---------|-----------|-----------|--------|--------|
| Enterprise | $95.7M | $82.1M | +16.5% | 28.4% |
| Mid-Market | $31.2M | $27.8M | +12.2% | 21.7% |
| SMB | $15.9M | $14.2M | +12.0% | 18.9% |
| **Total** | **$142.8M** | **$124.1M** | **+15.1%** | **24.1%** |

## Regional Performance

| Region | Revenue | Growth | Accounts |
|--------|---------|--------|----------|
| North America | $89.2M | +14.8% | 842 |
| Europe | $35.1M | +22.1% | 298 |
| Asia Pacific | $18.5M | +31.4% | 107 |

## Analysis

The enterprise segment contributed 67% of total revenue, with a notable increase in average contract value from $85K to $112K per account.

---

*Page 1 of 24*`,
    json: `{
  "document": {
    "type": "Financial Report",
    "title": "Q4 2024 Financial Report",
    "author": "ACME Finance Team",
    "date": "2026-07-15",
    "confidential": true
  },
  "sections": [
    {
      "heading": "Executive Summary",
      "content": "This report presents a comprehensive overview of ACME Corporation's financial performance during Q4 2024. Total revenue increased by 18.3% year-over-year."
    },
    {
      "heading": "Key Metrics",
      "data": {
        "revenue": "$142.8M",
        "revenue_change": "+18.3% YoY",
        "operating_margin": "24.1%",
        "net_income": "$34.4M",
        "new_accounts": 1247,
        "retention_rate": "96.2%"
      }
    },
    {
      "heading": "Revenue by Segment",
      "table": {
        "headers": ["Segment", "Q4 Revenue", "Q3 Revenue", "Change", "Margin"],
        "rows": [
          ["Enterprise", "$95.7M", "$82.1M", "+16.5%", "28.4%"],
          ["Mid-Market", "$31.2M", "$27.8M", "+12.2%", "21.7%"],
          ["SMB", "$15.9M", "$14.2M", "+12.0%", "18.9%"]
        ]
      }
    }
  ],
  "metadata": {
    "pages": 24,
    "word_count": 8420,
    "language": "en"
  }
}`,
    plaintext: `Q4 2024 Financial Report
ACME Corporation — Confidential

Executive Summary

This report presents a comprehensive overview of ACME Corporation's financial performance during the fourth quarter of fiscal year 2024. Total revenue increased by 18.3% year-over-year, driven primarily by expansion in the enterprise segment and strategic partnerships established in Q2.

Key Metrics

Revenue: $142.8M (+18.3% YoY)
Operating Margin: 24.1%
Net Income: $34.4M
Customer Acquisition: 1,247 new accounts
Retention Rate: 96.2%

Revenue by Segment

Enterprise    $95.7M    $82.1M    +16.5%    28.4%
Mid-Market    $31.2M    $27.8M    +12.2%    21.7%
SMB           $15.9M    $14.2M    +12.0%    18.9%
Total         $142.8M   $124.1M   +15.1%    24.1%

Regional Performance

North America   $89.2M   +14.8%   842 accounts
Europe          $35.1M   +22.1%   298 accounts
Asia Pacific    $18.5M   +31.4%   107 accounts

Analysis

The enterprise segment contributed 67% of total revenue, with a notable increase in average contract value from $85K to $112K per account.

Page 1 of 24`,
  },
};

// Generate default transforms for other completed docs
['doc-002', 'doc-003', 'doc-005', 'doc-006'].forEach((id) => {
  const doc = mockDocuments.find(d => d.id === id);
  mockTransforms[id] = {
    documentId: id,
    originalTokens: 12600,
    markdownTokens: 4800,
    jsonTokens: 6100,
    plaintextTokens: 4500,
    markdown: `# ${doc?.filename?.replace(/\.[^/.]+$/, '').replace(/-/g, ' ') ?? 'Document'}\n\nExtracted content from document analysis.\n\n## Section 1\n\nBody text content processed via OmniParse layout analysis and OCR pipeline.\n\n## Section 2\n\n| Column A | Column B | Column C |\n|----------|----------|----------|\n| Data 1   | Data 2   | Data 3   |\n| Data 4   | Data 5   | Data 6   |\n\n---\n\n*Processed by OmniParse IDP*`,
    json: `{\n  "document": {\n    "title": "${doc?.filename?.replace(/\.[^/.]+$/, '').replace(/-/g, ' ') ?? 'Document'}",\n    "type": "${doc?.type ?? 'unknown'}"\n  },\n  "sections": [\n    {\n      "heading": "Section 1",\n      "content": "Body text content processed via OmniParse."\n    }\n  ]\n}`,
    plaintext: `${doc?.filename?.replace(/\.[^/.]+$/, '').replace(/-/g, ' ') ?? 'Document'}\n\nExtracted content from document analysis.\n\nSection 1\n\nBody text content processed via OmniParse layout analysis and OCR pipeline.\n\nSection 2\n\nColumn A    Column B    Column C\nData 1      Data 2      Data 3\nData 4      Data 5      Data 6`,
  };
});


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

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}
