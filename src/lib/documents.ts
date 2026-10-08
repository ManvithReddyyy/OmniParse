import { supabase } from './supabase';
import {
  type Document,
  type DocumentAnalysis,
  type TransformOutput,
  type ProcessingJob,
  type DocumentType,
} from '../data/mock';
import {
  createAnalysisFromLines,
  generateMarkdownWithImages,
  generateJsonWithImages,
  generatePlainTextWithImages,
} from '../utils/document-parser';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface SaveDocumentParams {
  file: File;
  lines: string[];
  durationSec?: number;
  backendImages?: any[];
  pageImages?: string[];
  userId?: string;
  isRealSession?: boolean;
}

export interface SaveDocumentResult {
  document: Document;
  analysis: DocumentAnalysis;
  transform: TransformOutput;
  job: ProcessingJob;
  savedToCloud: boolean;
  cloudDocId?: string;
}

/**
 * Saves a newly processed document and its OCR results to Supabase (if authenticated)
 * and generates matching frontend state models.
 */
export async function persistDocument(params: SaveDocumentParams): Promise<SaveDocumentResult> {
  const {
    file,
    lines,
    durationSec = 1.0,
    backendImages = [],
    pageImages = [],
    userId,
    isRealSession = false,
  } = params;

  const docUuid = generateUuid();
  const fileExt = (file.name.split('.').pop()?.toLowerCase() || 'pdf') as DocumentType;

  // 1. Build Client Analysis & Transforms
  const analysis = createAnalysisFromLines(lines, file, backendImages, pageImages);
  analysis.documentId = docUuid;

  const markdownText = generateMarkdownWithImages(lines, backendImages, file.name);
  const jsonText = generateJsonWithImages(lines, backendImages, file.name, analysis.metadata);
  const plainText = generatePlainTextWithImages(lines, backendImages);
  const approxTokens = Math.round(plainText.length / 4);

  const document: Document = {
    id: docUuid,
    filename: file.name,
    type: fileExt,
    status: 'completed',
    uploadDate: new Date().toISOString(),
    fileSize: file.size,
    pages: analysis.metadata.pages,
  };

  const transform: TransformOutput = {
    documentId: docUuid,
    markdown: markdownText,
    json: jsonText,
    plaintext: plainText,
    originalTokens: approxTokens * 2,
    markdownTokens: Math.round(approxTokens * 0.75),
    jsonTokens: Math.round(approxTokens * 1.25),
    plaintextTokens: approxTokens,
  };

  const job: ProcessingJob = {
    id: 'job-' + Date.now(),
    documentId: docUuid,
    documentName: file.name,
    status: 'completed',
    started: new Date().toISOString(),
    duration: `${durationSec.toFixed(1)}s`,
    outputFormat: 'markdown',
  };

  let savedToCloud = false;

  // 2. Persist to Supabase if a real authenticated session exists
  if (isRealSession && userId) {
    try {
      // Insert Document
      const { data: dbDoc, error: docErr } = await supabase
        .from('documents')
        .insert({
          id: docUuid,
          user_id: userId,
          filename: file.name,
          file_type: fileExt,
          file_size: file.size,
          status: 'completed',
          pages: analysis.metadata.pages,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docErr) {
        console.warn('[OmniParse] Could not save document to Supabase:', docErr.message);
      } else if (dbDoc) {
        savedToCloud = true;

        // Parse JSON output safely
        let parsedJson: any = {};
        try {
          parsedJson = JSON.parse(jsonText);
        } catch {
          parsedJson = { text: plainText, lines };
        }

        // Insert OCR Results
        const { error: ocrErr } = await supabase
          .from('ocr_results')
          .insert({
            document_id: docUuid,
            user_id: userId,
            extracted_text: plainText,
            extracted_lines: lines,
            markdown_output: markdownText,
            json_output: parsedJson,
            word_count: analysis.metadata.wordCount,
            confidence: 0.985,
            processing_time_ms: Math.round(durationSec * 1000),
            metadata: {
              fileSize: file.size,
              pages: analysis.metadata.pages,
              language: analysis.metadata.language,
            },
          });

        if (ocrErr) {
          console.warn('[OmniParse] Could not save OCR result to Supabase:', ocrErr.message);
        }

        // Log usage in usage_logs
        try {
          await supabase
            .from('usage_logs')
            .insert({
              user_id: userId,
              document_id: docUuid,
              endpoint: '/v1/extract',
              method: 'POST',
              status_code: 200,
              file_type: fileExt,
              file_size: file.size,
              latency_ms: Math.round(durationSec * 1000),
            });
        } catch {
          // ignore usage log error
        }
      }
    } catch (err) {
      console.warn('[OmniParse] Error saving to Supabase:', err);
    }
  }

  return {
    document,
    analysis,
    transform,
    job,
    savedToCloud,
    cloudDocId: savedToCloud ? docUuid : undefined,
  };
}

/**
 * Fetches all persistent documents and OCR results from Supabase for the current user.
 */
export async function fetchUserDocumentsFromCloud(userId: string): Promise<{
  documents: Document[];
  analysisStore: Record<string, DocumentAnalysis>;
  transformStore: Record<string, TransformOutput>;
  jobs: ProcessingJob[];
}> {
  const result = {
    documents: [] as Document[],
    analysisStore: {} as Record<string, DocumentAnalysis>,
    transformStore: {} as Record<string, TransformOutput>,
    jobs: [] as ProcessingJob[],
  };

  try {
    const { data: dbDocs, error } = await supabase
      .from('documents')
      .select('*, ocr_results(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !dbDocs) {
      console.warn('[OmniParse] Failed to fetch documents from Supabase:', error);
      return result;
    }

    for (const row of dbDocs) {
      const ext = (row.file_type || 'pdf') as DocumentType;
      const doc: Document = {
        id: row.id,
        filename: row.filename,
        type: ext,
        status: row.status || 'completed',
        uploadDate: row.created_at,
        fileSize: row.file_size || 0,
        pages: row.pages || 1,
      };
      result.documents.push(doc);

      const ocrRow = Array.isArray(row.ocr_results) ? row.ocr_results[0] : row.ocr_results;
      const textLines = ocrRow?.extracted_lines || (ocrRow?.extracted_text ? ocrRow.extracted_text.split('\n') : [row.filename]);
      const markdown = ocrRow?.markdown_output || (ocrRow?.extracted_text ? `## Extracted Content\n\n${ocrRow.extracted_text}` : `# ${row.filename}`);
      const jsonStr = ocrRow?.json_output ? JSON.stringify(ocrRow.json_output, null, 2) : JSON.stringify({ filename: row.filename }, null, 2);
      const plaintext = ocrRow?.extracted_text || textLines.join('\n');
      const approxTokens = Math.round(plaintext.length / 4);

      // Dummy file object for analysis builder
      const dummyFile = new File([''], row.filename, { type: 'application/octet-stream' });
      const analysis = createAnalysisFromLines(textLines, dummyFile);
      analysis.documentId = row.id;
      result.analysisStore[row.id] = analysis;

      result.transformStore[row.id] = {
        documentId: row.id,
        markdown,
        json: jsonStr,
        plaintext,
        originalTokens: approxTokens * 2,
        markdownTokens: Math.round(approxTokens * 0.75),
        jsonTokens: Math.round(approxTokens * 1.25),
        plaintextTokens: approxTokens,
      };

      result.jobs.push({
        id: 'job-' + row.id.substring(0, 8),
        documentId: row.id,
        documentName: row.filename,
        status: row.status || 'completed',
        started: row.created_at,
        duration: ocrRow?.processing_time_ms ? `${(ocrRow.processing_time_ms / 1000).toFixed(1)}s` : '1.2s',
        outputFormat: 'markdown',
      });
    }
  } catch (err) {
    console.warn('[OmniParse] Cloud fetch exception:', err);
  }

  return result;
}

/**
 * Deletes a document and cascades to its OCR result in Supabase.
 */
export async function deleteDocumentFromCloud(documentId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[OmniParse] Failed to delete document from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[OmniParse] Delete document exception:', err);
    return false;
  }
}
