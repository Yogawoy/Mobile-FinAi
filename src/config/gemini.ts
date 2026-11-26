import { GoogleGenAI } from '@google/genai';
import { AppError } from '../utils/errors';
import { env } from './env';

export const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      'GEMINI_API_KEY belum dikonfigurasi di server.',
      503
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

export interface GeminiResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  modelUsed: string;
}

async function callGroqFallback(params: {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
}): Promise<GeminiResult> {
  const groqKey = env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    throw new AppError(
      'GEMINI_API_KEY dan GROQ_API_KEY belum dikonfigurasi di server. Layanan AI sementara tidak tersedia.',
      503
    );
  }

  const model = env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: params.temperature ?? 0.5,
        ...(params.responseMimeType === 'application/json'
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Groq API error (${res.status}):`, errText);
      throw new AppError(
        'Layanan AI cadangan (Groq) sedang sibuk atau mengalami gangguan.',
        503
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new AppError('Respons dari layanan AI cadangan (Groq) kosong.', 503);
    }

    return {
      text,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      modelUsed: data.model || model,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('Groq fallback error:', err);
    throw new AppError(
      'Layanan AI (Gemini & Groq) sementara tidak dapat dijangkau. Silakan coba lagi.',
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function callGemini(params: {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
}): Promise<GeminiResult> {
  const hasGemini = Boolean(env.GEMINI_API_KEY?.trim());
  const hasGroq = Boolean(env.GROQ_API_KEY?.trim());

  if (hasGemini) {
    try {
      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: params.prompt,
        config: {
          ...(params.systemInstruction
            ? { systemInstruction: params.systemInstruction }
            : {}),
          ...(params.responseMimeType
            ? { responseMimeType: params.responseMimeType }
            : {}),
          ...(params.temperature !== undefined
            ? { temperature: params.temperature }
            : {}),
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new AppError('Respons dari layanan AI kosong. Silakan coba lagi.', 503);
      }

      return {
        text,
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        modelUsed: GEMINI_MODEL,
      };
    } catch (err) {
      console.warn(
        'Gemini API gagal/habis kuota, mencoba fallback ke Groq:',
        err instanceof Error ? err.message : err
      );
      if (hasGroq) {
        return callGroqFallback(params);
      }
      if (err instanceof AppError) throw err;
      throw new AppError(
        'Layanan Google Gemini AI sedang sibuk atau kuota habis. Silakan coba lagi beberapa saat.',
        503
      );
    }
  }

  if (hasGroq) {
    return callGroqFallback(params);
  }

  throw new AppError(
    'GEMINI_API_KEY maupun GROQ_API_KEY belum dikonfigurasi di server. Layanan AI sementara tidak tersedia.',
    503
  );
}
