import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import * as advisorService from './advisor.service';
import type { AiChatInput, GenerateAdvisorInput } from './ai.schema';
import * as anomalyService from './anomaly.service';
import * as chatService from './chat.service';
import * as forecastService from './forecast.service';

function resolvePeriod(rawMonth?: unknown, rawYear?: unknown) {
  const now = new Date();
  const month = rawMonth ? Number(rawMonth) : now.getMonth() + 1;
  const year = rawYear ? Number(rawYear) : now.getFullYear();
  return { month, year };
}

export async function getForecastHandler(req: Request, res: Response) {
  const { month, year } = resolvePeriod(req.query.month, req.query.year);
  const data = await forecastService.computeAndSaveForecast(
    req.user!.userId,
    month,
    year
  );
  return sendSuccess(res, 'Proyeksi arus kas & deteksi anomali berhasil dihitung', data);
}

export async function dismissAnomalyHandler(req: Request, res: Response) {
  const data = await anomalyService.dismissAnomaly(
    req.user!.userId,
    String(req.params.id)
  );
  return sendSuccess(res, 'Anomali ditandai telah ditinjau', data);
}

export async function getAdvisorHandler(req: Request, res: Response) {
  const { month, year } = resolvePeriod(req.query.month, req.query.year);
  const data = await advisorService.getCachedAdvisor(
    req.user!.userId,
    month,
    year
  );
  if (!data) {
    return sendSuccess(
      res,
      'Analisis AI untuk periode ini belum digenerate',
      null
    );
  }
  return sendSuccess(res, 'Analisis AI tersimpan berhasil diambil', data);
}

export async function generateAdvisorHandler(req: Request, res: Response) {
  const body = (req.body ?? {}) as GenerateAdvisorInput;
  const { month, year } = resolvePeriod(body.month, body.year);
  const data = await advisorService.generateAdvisorInsight(
    req.user!.userId,
    month,
    year,
    req.ip ?? null
  );
  return sendSuccess(res, 'Analisis AI Advisor berhasil digenerate', data, 201);
}

export async function aiChatHandler(req: Request, res: Response) {
  const body = req.body as AiChatInput;
  const { month, year } = resolvePeriod(body.month, body.year);
  const data = await chatService.chatWithFinAi({
    userId: req.user!.userId,
    message: body.message,
    month,
    year,
    executeImmediately: body.executeImmediately,
    history: body.history,
    ipAddress: req.ip ?? null,
  });
  return sendSuccess(res, 'Respons FinAI Assistant berhasil dibuat', data);
}
