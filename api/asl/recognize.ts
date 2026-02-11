import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { handleCors } from '../../lib/cors';

const SYSTEM_PROMPT = `You are an expert ASL (American Sign Language) interpreter analyzing video frames from a webcam.

You receive:
1. Video frames (images) showing the signer
2. Structured hand/body landmark data from MediaPipe (JSON) — this gives you precise 3D coordinates of each hand joint and body position across time

Your task: Identify the ASL sign being performed.

How to use the landmark data:
- Each snapshot has "hands" (array of hands, each with 21 3D landmarks), "handedness" (Left/Right), and optional "pose" (upper body joints)
- Multiple snapshots show motion over time — compare them to detect movement direction, speed, and trajectory
- Hand shape (finger positions relative to palm) + location (near face, chest, etc.) + movement = ASL sign
- Fingerspelling: single hand near face, rapid small movements between letters

Rules:
- Respond with ONLY a JSON object: {"sign": "<word or short phrase>", "confidence": <0.0-1.0>}
- If you can clearly identify a sign, return it with high confidence
- If you see a hand but can't determine the sign, return {"sign": "", "confidence": 0}
- If no hands are visible, return {"sign": "", "confidence": 0}
- Consider the motion across frames and landmark snapshots — ASL signs often involve movement
- Be concise: return single words or very short phrases only
- Do NOT explain or include extra text — JSON only`;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { frames, landmarks } = req.body as { frames: string[]; landmarks?: any[] };

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'No frames provided' });
    }

    const selectedFrames = frames.slice(0, 5);

    const ai = getGenAI();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const detectMime = (b64: string): string => {
      if (b64.startsWith('/9j/')) return 'image/jpeg';
      if (b64.startsWith('iVBOR')) return 'image/png';
      return 'image/jpeg';
    };

    const imageParts = selectedFrames.map((base64) => ({
      inlineData: {
        data: base64,
        mimeType: detectMime(base64) as 'image/jpeg' | 'image/png',
      },
    }));

    let landmarkContext = '';
    if (landmarks && Array.isArray(landmarks) && landmarks.length > 0) {
      landmarkContext = '\n\nMediaPipe landmark data (JSON):\n' + JSON.stringify(landmarks, null, 0);
    }

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      ...imageParts,
      `What ASL sign is being performed? ${landmarkContext ? 'Use both the images AND the landmark data below to identify the sign.' : 'Respond with JSON only.'}${landmarkContext}\n\nRespond with JSON only.`,
    ]);

    const text = result.response.text().trim();

    let parsed: { sign: string; confidence: number };
    try {
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { sign: '', confidence: 0 };
    }

    res.json({
      sign: parsed.sign || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error('[ASL Vision] Error:', msg);

    if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
      return res.status(429).json({ error: 'Rate limited — please wait before retrying', retryAfter: 30 });
    }

    res.status(500).json({ error: msg });
  }
}
