import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = await req.formData();
    const audioFiles = Array.from(formData.entries()).filter(([key]) => key.startsWith('audio'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    let fullTranscription = '';

    for (const [_, file] of audioFiles) {
      const arrayBuffer = await (file as File).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
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
    }

    res.status(200).json({ transcription: fullTranscription.trim() });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
