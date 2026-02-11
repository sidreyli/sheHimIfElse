import { Router } from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config.js';

export const aslRouter = Router();

const SYSTEM_PROMPT = `You are an expert ASL (American Sign Language) interpreter analyzing video frames from a webcam.

Your task: Identify the ASL sign being performed in these frames.

Rules:
- Respond with ONLY a JSON object: {"sign": "<word or short phrase>", "confidence": <0.0-1.0>}
- If you can clearly identify a sign, return it with high confidence
- If you see a hand but can't determine the sign, return {"sign": "", "confidence": 0}
- If no hands are visible, return {"sign": "", "confidence": 0}
- Common ASL signs include letters (A-Z), numbers, and words like: hello, thank you, please, sorry, yes, no, help, more, water, eat, drink, love, friend, family, school, work, good, bad, happy, sad, want, need, like, understand, learn, teach, name, what, where, when, how, why, who
- Consider the motion across frames — ASL signs often involve movement
- Be concise: return single words or very short phrases only
- Do NOT explain or include extra text — JSON only`;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

aslRouter.post('/recognize', async (req, res) => {
  try {
    const { frames } = req.body as { frames: string[] }; // base64 JPEG frames

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'No frames provided' });
    }

    // Limit to 5 frames max to keep request fast
    const selectedFrames = frames.slice(0, 5);

    console.log(`[ASL Vision] Processing ${selectedFrames.length} frames (sizes: ${selectedFrames.map(f => f.length).join(', ')} chars)`);

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

    // Detect MIME type from base64 header bytes
    const detectMime = (b64: string): string => {
      if (b64.startsWith('/9j/')) return 'image/jpeg';
      if (b64.startsWith('iVBOR')) return 'image/png';
      return 'image/jpeg'; // default
    };

    const imageParts = selectedFrames.map((base64) => ({
      inlineData: {
        data: base64,
        mimeType: detectMime(base64) as 'image/jpeg' | 'image/png',
      },
    }));

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      ...imageParts,
      'What ASL sign is being performed in these frames? Respond with JSON only.',
    ]);

    const text = result.response.text().trim();

    // Parse JSON from response (handle markdown code blocks)
    let parsed: { sign: string; confidence: number };
    try {
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[ASL Vision] Failed to parse Gemini response:', text);
      parsed = { sign: '', confidence: 0 };
    }

    res.json({
      sign: parsed.sign || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error('[ASL Vision] Error:', msg);

    // Forward 429 status so the client can back off
    if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
      return res.status(429).json({ error: 'Rate limited — please wait before retrying', retryAfter: 30 });
    }

    res.status(500).json({ error: msg });
  }
});

