import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcription, template } = req.body;
  if (!transcription || !template) {
    return res.status(400).json({ error: 'Transcription and template are required' });
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    const properties = {
      Name: { title: [{ text: { content: `${template.charAt(0).toUpperCase() + template.slice(1)} Note` }] },
    };

    let blocks: any[] = [];
    switch (template) {
      case 'general':
        blocks = [{ paragraph: { rich_text: [{ text: { content: transcription } }] } }];
        break;
      case 'meeting_notes':
        blocks = [
          { heading_2: { rich_text: [{ text: { content: 'Meeting Notes' } }] } },
          { paragraph: { rich_text: [{ text: { content: transcription } }] } },
        ];
        break;
      case 'brainstorming_ideas':
        blocks = [
          { heading_2: { rich_text: [{ text: { content: 'Brainstorming Ideas' } }] } },
          { bulleted_list_item: { rich_text: [{ text: { content: transcription } }] } },
        ];
        break;
      case 'quick_notes':
        blocks = [
          { heading_2: { rich_text: [{ text: { content: 'Quick Notes' } }] } },
          { paragraph: { rich_text: [{ text: { content: transcription } }] } },
        ];
        break;
      case 'summary':
        blocks = [
          { heading_2: { rich_text: [{ text: { content: 'Summary' } }] } },
          { paragraph: { rich_text: [{ text: { content: transcription } }] } },
        ];
        break;
      default:
        blocks = [{ paragraph: { rich_text: [{ text: { content: transcription } }] } }];
    }

    await notion.pages.create({
      parent: { database_id: databaseId! },
      properties,
      children: blocks,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notion error:', error);
    res.status(500).json({ error: 'Failed to save to Notion' });
  }
}
