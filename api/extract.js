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
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: mimeType });
        formData.append('file', blob, filename);
        formData.append('ocr_lang', 'en');

        const hfRes = await fetch('https://manvithreddy-omniparse-backend.hf.space/v1/vision/analyze', {
          method: 'POST',
          body: formData,
        });

        const data = await hfRes.json();
        const lines = data?.payload?.extracted_text || ['[No text detected]'];

        return res.status(200).json({
          status: 'success',
          code: 200,
          engine: 'OmniParse Vision v3.0 (Indra OCR + PyMuPDF4LLM)',
          latency_sec: data?.latency_sec,
          filename,
          payload: {
            lines_count: lines.length,
            extracted_text: lines,
            blocks: data?.payload?.blocks || [],
            tables: data?.payload?.tables || [],
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
