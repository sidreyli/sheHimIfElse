import { Router } from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config.js';

export const aslRouter = Router();

type SignLanguage = 'ASL' | 'BSL' | 'CSL' | 'ISL' | 'FSL' | 'JSL';

const SIGN_LANGUAGE_NAMES: Record<SignLanguage, string> = {
  ASL: 'American Sign Language (ASL)',
  BSL: 'British Sign Language (BSL)',
  CSL: 'Chinese Sign Language (CSL / 中国手语)',
  ISL: 'Indian Sign Language (ISL)',
  FSL: 'French Sign Language (LSF / Langue des Signes Française)',
  JSL: 'Japanese Sign Language (JSL / 日本手話)',
};

const SIGN_LANGUAGE_DETAILS: Record<SignLanguage, string> = {
  ASL: `ASL-specific guidance:
- ASL uses a one-handed fingerspelling alphabet
- Many signs use Non-Manual Signals (facial expressions, mouth shapes)
- Dominant hand is typically the right hand
- Common signs involve locations near the face, chest, and neutral signing space`,
  BSL: `BSL-specific guidance:
- BSL uses a TWO-handed fingerspelling alphabet — this is the key differentiator from ASL
- BSL is completely distinct from ASL despite both being used in English-speaking countries
- Many BSL signs are formed with both hands active
- Location, handshape, movement, and orientation all matter
- Do NOT confuse BSL signs with ASL signs — they are entirely different languages`,
  CSL: `CSL-specific guidance:
- Chinese Sign Language uses a one-handed fingerspelling system based on pinyin initials
- Many CSL signs incorporate iconic/pictographic elements reflecting Chinese culture
- Mouth shapes often correspond to Chinese word pronunciation
- CSL has regional variations between northern and southern China
- Do NOT confuse with ASL, JSL, or other Asian sign languages`,
  ISL: `ISL-specific guidance:
- Indian Sign Language has its own unique grammar and vocabulary
- ISL uses a one-handed fingerspelling alphabet (based on Devanagari and English)
- Many signs involve culturally specific gestures from Indian context
- ISL is distinct from both ASL and BSL
- Do NOT confuse with British Sign Language despite historical connections`,
  FSL: `FSL (LSF) specific guidance:
- French Sign Language is the historical ancestor of ASL, but they have diverged significantly
- LSF uses its own fingerspelling system
- Many signs are two-handed
- French Sign Language has its own unique grammar structure
- Some signs may look similar to ASL due to shared heritage, but interpret strictly as FSL`,
  JSL: `JSL-specific guidance:
- Japanese Sign Language uses fingerspelling based on Japanese kana syllabary
- JSL has its own grammar distinct from spoken Japanese
- Many signs incorporate elements from kanji (Chinese characters)
- Facial expressions and mouth movements play an important role
- Do NOT confuse with CSL or other Asian sign languages — JSL is completely distinct`,
};

function buildSystemPrompt(signLanguage: SignLanguage): string {
  const fullName = SIGN_LANGUAGE_NAMES[signLanguage] || SIGN_LANGUAGE_NAMES.ASL;
  const details = SIGN_LANGUAGE_DETAILS[signLanguage] || SIGN_LANGUAGE_DETAILS.ASL;

  return `You are an expert ${fullName} interpreter analyzing video frames from a webcam.

IMPORTANT: You must interpret signs STRICTLY according to ${fullName}. Do NOT use knowledge from other sign languages. Each sign language is a completely independent language with its own vocabulary, grammar, and handshapes.

You receive:
1. Video frames (images) showing the signer
2. Structured hand/body landmark data from MediaPipe (JSON) — this gives you precise 3D coordinates of each hand joint and body position across time

Your task: Identify the ${fullName} sign being performed.

${details}

How to use the landmark data:
- Each snapshot has "hands" (array of hands, each with 21 3D landmarks), "handedness" (Left/Right), and optional "pose" (upper body joints)
- Multiple snapshots show motion over time — compare them to detect movement direction, speed, and trajectory
- Hand shape (finger positions relative to palm) + location (near face, chest, etc.) + movement = sign
- Fingerspelling: look for characteristic patterns of ${fullName} specifically

Rules:
- Respond with ONLY a JSON object: {"sign": "<word or short phrase>", "confidence": <0.0-1.0>}
- If you can clearly identify a sign in ${fullName}, return it with high confidence
- If you see a hand but can't determine the ${fullName} sign, return {"sign": "", "confidence": 0}
- If no hands are visible, return {"sign": "", "confidence": 0}
- Consider the motion across frames and landmark snapshots — signs often involve movement
- Be concise: return single words or very short phrases only
- Do NOT explain or include extra text — JSON only
- ONLY interpret as ${fullName} — never fall back to another sign language`;
}

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
    const { frames, landmarks, signLanguage: reqSignLanguage } = req.body as { frames: string[]; landmarks?: any[]; signLanguage?: string };

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'No frames provided' });
    }

    // Validate and default sign language
    const validLanguages: SignLanguage[] = ['ASL', 'BSL', 'CSL', 'ISL', 'FSL', 'JSL'];
    const signLanguage: SignLanguage = validLanguages.includes(reqSignLanguage as SignLanguage)
      ? (reqSignLanguage as SignLanguage)
      : 'ASL';

    // Limit to 5 frames max to keep request fast
    const selectedFrames = frames.slice(0, 5);

    console.log(`[${signLanguage} Vision] Processing ${selectedFrames.length} frames (sizes: ${selectedFrames.map(f => f.length).join(', ')} chars)`);

    const systemPrompt = buildSystemPrompt(signLanguage);
    const fullName = SIGN_LANGUAGE_NAMES[signLanguage];

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

    // Build landmark context string
    let landmarkContext = '';
    if (landmarks && Array.isArray(landmarks) && landmarks.length > 0) {
      landmarkContext = '\n\nMediaPipe landmark data (JSON):\n' + JSON.stringify(landmarks, null, 0);
    }

    const result = await model.generateContent([
      systemPrompt,
      ...imageParts,
      `What ${fullName} sign is being performed? ${landmarkContext ? 'Use both the images AND the landmark data below to identify the sign.' : 'Respond with JSON only.'}${landmarkContext}\n\nRespond with JSON only.`,
    ]);

    const text = result.response.text().trim();

    // Parse JSON from response (handle markdown code blocks)
    let parsed: { sign: string; confidence: number };
    try {
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn(`[${signLanguage} Vision] Failed to parse Gemini response:`, text);
      parsed = { sign: '', confidence: 0 };
    }

    res.json({
      sign: parsed.sign || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    });
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error(`[${(req.body as any)?.signLanguage || 'ASL'} Vision] Error:`, msg);

    // Forward 429 status so the client can back off
    if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
      return res.status(429).json({ error: 'Rate limited — please wait before retrying', retryAfter: 30 });
    }

    res.status(500).json({ error: msg });
  }
});

