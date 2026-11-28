import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan ke server. Silakan coba lagi sebentar.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan autentikasi. Coba lagi dalam 15 menit.',
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Batas permintaan analisis AI tercapai (maks 5x/jam). Silakan coba lagi nanti.',
  },
});

export const aiChatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Batas pesan AI Chat tercapai (maks 30 pesan/jam). Silakan coba lagi nanti.',
  },
});
