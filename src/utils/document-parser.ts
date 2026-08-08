import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { type DocumentAnalysis, type LayoutRegion, type TextBlock, type ReadingOrderItem, formatFileSize } from '../data/mock';

// Set up PDF.js worker using unpkg CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

export async function extractPdfText(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const lines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items: PdfItem[] = [];
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const transform = item.transform;
          const x = transform ? transform[4] : 0;
          const y = transform ? transform[5] : 0;
          items.push({
            str: item.str.trim(),
            x,
            y,
            width: item.width || 0,
          });
        }
      }

      if (items.length === 0) continue;

      // Detect if page has a 2-column layout
      const xCoords = items.map((it) => it.x);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const widthRange = maxX - minX;

      let splitX: number | null = null;
      if (widthRange > 250) {
        const midPoint = minX + widthRange / 2;
        const leftItems = items.filter((it) => it.x < midPoint - 30);
        const rightItems = items.filter((it) => it.x > midPoint + 30);
        if (leftItems.length > 5 && rightItems.length > 5) {
          splitX = midPoint;
        }
      }

      const processItemGroup = (groupItems: PdfItem[]) => {
        groupItems.sort((a, b) => (Math.abs(a.y - b.y) > 5 ? b.y - a.y : a.x - b.x));

        let currentLine = '';
        let lastY: number | null = null;
        let lastX: number | null = null;

        for (const item of groupItems) {
          const isNewY = lastY !== null && Math.abs(item.y - lastY) > 5;
          const isBigXGap = lastX !== null && !isNewY && item.x - lastX > 50;

          if (isNewY || isBigXGap) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = item.str;
          } else {
            currentLine += (currentLine ? ' ' : '') + item.str;
          }
          lastY = item.y;
          lastX = item.x + item.width;
        }
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
      };

      if (splitX !== null) {
        const leftCol = items.filter((it) => it.x < splitX);
        const rightCol = items.filter((it) => it.x >= splitX);
        processItemGroup(leftCol);
        processItemGroup(rightCol);
      } else {
        processItemGroup(items);
      }
    }

    return lines.filter((l) => l.trim().length > 0);
  } catch (err) {
    console.warn('PDF text extraction error via PDF.js, using fallback string extractor:', err);
    return extractStringsFromFile(file);
  }
}

/**
 * Extract all text from a PPTX file by reading every slide XML inside the zip.
 * Uses pure regex on raw XML to avoid DOMParser namespace issues.
 */
export async function extractPptxText(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const lines: string[] = [];

    // Log every file in the zip for debugging
    const allZipFiles = Object.keys(zip.files);
    console.log('[PPTX Debug] All files in zip:', allZipFiles);

    // Match ONLY slide XML files like ppt/slides/slide1.xml (NOT slideLayout, slideMaster, etc.)
    const slideFiles = allZipFiles
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || '0', 10);
        const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || '0', 10);
        return numA - numB;
      });

    console.log('[PPTX Debug] Matched slide files:', slideFiles);

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFileName = slideFiles[i];
      const zipEntry = zip.files[slideFileName];
      if (!zipEntry || zipEntry.dir) continue;

      const xmlStr = await zipEntry.async('string');
      console.log(`[PPTX Debug] Slide ${i + 1} (${slideFileName}): XML length = ${xmlStr.length}`);

      // Extract all text using regex directly on the raw XML string.
      // In OOXML, text runs are inside <a:t>...</a:t> tags.
      // We group text by paragraph: each <a:p> ... </a:p> block is one paragraph.
      const slideLines: string[] = [];

      // Split XML into paragraph blocks (<a:p> ... </a:p>)
      const paragraphRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/gi;
      let pMatch;
      while ((pMatch = paragraphRegex.exec(xmlStr)) !== null) {
        const pBlock = pMatch[1];
        // Extract all <a:t>...</a:t> text runs within this paragraph
        const textRunRegex = /<a:t>([\s\S]*?)<\/a:t>/gi;
        let tMatch;
        let paragraphText = '';
        while ((tMatch = textRunRegex.exec(pBlock)) !== null) {
          paragraphText += tMatch[1];
        }
        paragraphText = paragraphText
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();
        if (paragraphText) {
          slideLines.push(paragraphText);
        }
      }

      console.log(`[PPTX Debug] Slide ${i + 1}: extracted ${slideLines.length} text lines:`, slideLines);

      // Always add the slide header, even if no text was found (image-only slides)
      lines.push(`Slide ${i + 1}`);
      if (slideLines.length > 0) {
        lines.push(...slideLines);
      } else {
        lines.push('[Image-only slide — no extractable text]');
      }
    }

    console.log('[PPTX Debug] Total extracted lines:', lines.length);
    if (lines.length > 0) return lines;
  } catch (err) {
    console.warn('Error extracting text from PPTX file:', err);
  }
  return [];
}

export async function extractDocxText(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file('word/document.xml');
    if (!docFile) return [];

    const xmlStr = await docFile.async('string');
    const lines: string[] = [];

    // Use regex to extract text from <w:t>...</w:t> grouped by <w:p>...</w:p>
    const paragraphRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;
    let pMatch;
    while ((pMatch = paragraphRegex.exec(xmlStr)) !== null) {
      const pBlock = pMatch[1];
      const textRunRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/gi;
      let tMatch;
      let paragraphText = '';
      while ((tMatch = textRunRegex.exec(pBlock)) !== null) {
        paragraphText += tMatch[1];
      }
      paragraphText = paragraphText
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
      if (paragraphText) {
        lines.push(paragraphText);
      }
    }

    if (lines.length > 0) return lines;
  } catch (err) {
    console.warn('Error extracting text from DOCX file:', err);
  }
  return [];
}

export async function extractPlainText(file: File): Promise<string[]> {
  try {
    const text = await file.text();
    return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

export async function extractStringsFromFile(file: File): Promise<string[]> {
  try {
    const text = await file.text();
    const cleanLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (cleanLines.length > 0) return cleanLines;
  } catch {
    // ignore
  }
  return [];
}

export async function parseDocumentFile(file: File): Promise<string[]> {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.pdf')) {
    return await extractPdfText(file);
  } else if (filename.endsWith('.pptx') || filename.endsWith('.ppt')) {
    const pptxLines = await extractPptxText(file);
    if (pptxLines.length > 0) return pptxLines;
  } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
    const docxLines = await extractDocxText(file);
    if (docxLines.length > 0) return docxLines;
  } else if (filename.endsWith('.txt') || filename.endsWith('.json') || filename.endsWith('.csv') || filename.endsWith('.md')) {
    return await extractPlainText(file);
  }

  const lines = await extractStringsFromFile(file);
  if (lines.length > 0) return lines;
  return extractPlainText(file);
}

export async function extractEmbeddedImagesFromFile(file: File): Promise<ExtractedImage[]> {
  const filename = file.name.toLowerCase();
  const images: ExtractedImage[] = [];

  if (filename.endsWith('.pptx') || filename.endsWith('.ppt') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      let imgCount = 0;

      for (const zipPath of Object.keys(zip.files)) {
        if (zipPath.includes('/media/') && !zip.files[zipPath].dir) {
          const fileExt = zipPath.split('.').pop()?.toLowerCase() || 'png';
          if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(fileExt)) {
            const b64 = await zip.files[zipPath].async('base64');
            const mime = fileExt === 'svg' ? 'image/svg+xml' : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
            const url = `data:${mime};base64,${b64}`;
            imgCount++;

            images.push({
              id: `img-${imgCount}`,
              label: zipPath.split('/').pop() || `Embedded Image ${imgCount}`,
              width: 800,
              height: 600,
              format: fileExt.toUpperCase(),
              url,
              size: formatFileSize(Math.round((b64.length * 3) / 4)),
            });
          }
        }
      }
    } catch (err) {
      console.warn('Error extracting zip embedded images:', err);
    }
  } else if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    images.push({
      id: `img-standalone-1`,
      label: file.name,
      width: 1200,
      height: 800,
      format: file.name.split('.').pop()?.toUpperCase() || 'IMAGE',
      url,
      size: formatFileSize(file.size),
    });
  }

  return images;
}

export function createAnalysisFromLines(
  lines: string[],
  file: File,
  extractedImages: ExtractedImage[] = [],
  pageImages: string[] = []
): DocumentAnalysis {
  const blocks: { type: 'header' | 'title' | 'paragraph' | 'list'; text: string }[] = [];
  let currentParagraph = '';
  let currentList: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      blocks.push({ type: 'paragraph', text: currentParagraph.trim() });
      currentParagraph = '';
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: 'list', text: currentList.join('\n') });
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const isList = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+[\.\)]/.test(line);

    const isHeading =
      !isList &&
      (i === 0 ||
        /^Slide \d+$/.test(line) ||
        line.startsWith('Page ') ||
        line.endsWith(':') ||
        (line.length < 50 && (line.includes('Projects') || line.includes('Skills') || line.includes('Education') || line.includes('Experience') || line.includes('Chapter') || line.includes('Contents'))) ||
        (line.length < 35 && /^[A-Z0-9\s\-\,\(\)\|\/]+$/.test(line) && !line.includes('@') && !line.includes('http')));

    if (isHeading) {
      flushParagraph();
      flushList();
      blocks.push({ type: i === 0 || /^Slide \d+$/.test(line) || line.startsWith('Page ') ? 'header' : 'title', text: line });
    } else if (isList) {
      flushParagraph();
      currentList.push(line);
    } else {
      flushList();
      if (currentParagraph) {
        currentParagraph += ' ' + line;
      } else {
        currentParagraph = line;
      }
    }
  }

  flushParagraph();
  flushList();

  const layoutRegions: LayoutRegion[] = blocks.map((b, idx) => ({
    id: `lr-${idx + 1}`,
    type: b.type === 'header' ? 'header' : b.type === 'title' ? 'title' : b.type === 'list' ? 'list' : 'paragraph',
    confidence: 0.985,
    bbox: { x: 50, y: 40 + idx * 45, width: 700, height: Math.max(25, Math.ceil(b.text.length / 60) * 20) },
    content: b.text,
  }));

  const textBlocks: TextBlock[] = blocks.map((b, idx) => ({
    id: `tb-${idx + 1}`,
    text: b.text,
    confidence: 0.985,
    bbox: { x: 50, y: 40 + idx * 45, width: 700, height: Math.max(25, Math.ceil(b.text.length / 60) * 20) },
    blockType: b.type,
  }));

  const readingOrder: ReadingOrderItem[] = blocks.map((b, idx) => ({
    order: idx + 1,
    regionType: b.type,
    label: b.text.length > 40 ? b.text.slice(0, 40) + '...' : b.text,
    regionId: `lr-${idx + 1}`,
  }));

  const wordCount = lines.join(' ').split(/\s+/).filter(Boolean).length;
  const pageCount = pageImages.length > 0 ? pageImages.length : Math.max(1, Math.ceil(lines.length / 25));

  return {
    documentId: `doc-live-${Date.now()}`,
    layoutRegions,
    textBlocks,
    tables: [],
    images: extractedImages,
    pageImages,
    metadata: {
      language: 'English',
      pages: pageCount,
      documentType: file.name.endsWith('.pdf')
        ? 'PDF Document'
        : file.name.endsWith('.pptx') || file.name.endsWith('.ppt')
        ? 'PowerPoint Presentation'
        : file.name.endsWith('.docx') || file.name.endsWith('.doc')
        ? 'Word Document'
        : 'Text Document',
      wordCount: wordCount || 100,
      fileSize: formatFileSize(file.size),
      creationDate: new Date().toISOString().split('T')[0],
      author: 'PaddleOCR / OmniParse Engine',
      encoding: 'UTF-8',
    },
    readingOrder,
  };
}
