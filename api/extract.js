import { Client } from '@gradio/client';
import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validate API Key
  const auth = req.headers['authorization'];
  if (!auth || (!auth.startsWith('Bearer op_live_') && !auth.startsWith('Bearer dev-token') && !auth.startsWith('Bearer tok_'))) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Unauthorized: Invalid or missing OmniParse API Key. Pass your key via header: Authorization: Bearer op_live_...',
    });
  }

  try {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let filename = 'document.png';
    let mimeType = 'image/png';

    bb.on('file', (_name, file, info) => {
      filename = info.filename;
      mimeType = info.mimeType;
      const chunks = [];
      file.on('data', (d) => chunks.push(d));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('finish', async () => {
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'No file received in multipart request under field "file"',
        });
      }

      try {
        const client = await Client.connect('ManvithReddy/omniparse-backend');
        const blob = new Blob([fileBuffer], { type: mimeType });
        const result = await client.predict('/gradio_ocr', { img: blob });
        const raw = result.data?.[0] || '';
        const lines = raw
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && l !== '[No text detected in image]');

        return res.status(200).json({
          status: 'success',
          code: 200,
          engine: 'OmniParse Vision Neural v2.3 (PaddleOCR 3.7 Core)',
          filename,
          payload: {
            lines_count: lines.length,
            extracted_text: lines.length > 0 ? lines : [raw.trim() || '[No text detected in image]'],
          },
        });
      } catch (ocrErr) {
        return res.status(500).json({
          status: 'error',
          code: 500,
          message: ocrErr.message || 'OCR extraction failed',
        });
      }
    });

    req.pipe(bb);
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to parse request: ' + err.message,
    });
  }
}
