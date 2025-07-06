import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent([
      {
        text: `Answer the following question or provide insights based on this text: ${text}`,
      },
    ]);
    const result = response.response.text();
    res.status(200).json({ response: result });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to query Gemini' });
  }
}
