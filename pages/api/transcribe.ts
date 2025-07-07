import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import { promises as fs } from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ multiples: true });
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const audioFiles = Object.values(files).filter((file) => Array.isArray(file) ? file[0].originalFilename?.startsWith('audio') : file.originalFilename?.startsWith('audio'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    let fullTranscription = '';

    for (const file of audioFiles) {
      const fileArray = Array.isArray(file) ? file[0] : file;
      const buffer = await fs.readFile(fileArray.filepath);
      const response = await model.generateContent([
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: buffer.toString('base64'),
          },
        },
        {
          text: 'Transcribe this audio in Burmese (language code: my). Provide a verbatim transcription.',
        },
      ]);
      const transcription = response.response.text();
      fullTranscription += transcription + '\n';
      await fs.unlink(fileArray.filepath); // Clean up temporary file
    }

    res.status(200).json({ transcription: fullTranscription.trim() });
  } catch (error: any) {
    console.error('Transcription error:', error.message);
    res.status(500).json({ error: `Failed to transcribe audio: ${error.message}` });
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to allow formidable to handle multipart data
  },
};
