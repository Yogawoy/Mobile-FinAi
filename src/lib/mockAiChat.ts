export type ChatRichCardType =
  | 'SUMMARY'
  | 'FORECAST'
  | 'ANOMALY'
  | 'RECOMMENDATIONS';

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  richCard?: ChatRichCardType;
}

export const QUICK_PROMPTS = [
  'Analisis bulan ini',
  'Cek kategori paling boros',
  'Prediksi saldo akhir bulan',
  'Tips hemat Rp 500rb',
];

export function formatNowTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getWelcomeMessage(): ChatMessage {
  return {
    id: 'msg-welcome',
    sender: 'AI',
    text: 'Halo Yoga! Aku sudah membaca ringkasan keuanganmu bulan November 2026. Mau cek prediksi akhir bulan, deteksi pemborosan, atau cari cara hemat?',
    timestamp: formatNowTime(),
    richCard: 'SUMMARY',
  };
}

export function generateAiReply(userText: string): {
  text: string;
  richCard?: ChatRichCardType;
} {
  const q = userText.toLowerCase();

  if (
    q.includes('prediksi') ||
    q.includes('akhir bulan') ||
    q.includes('proyeksi') ||
    q.includes('burn')
  ) {
    return {
      text: 'Dengan rata-rata pengeluaran (burn rate) Rp 125rb/hr, total pengeluaranmu hingga akhir November diproyeksikan sekitar Rp 3,75jt. Kabar baiknya, saldo akhir bulanmu masih surplus sekitar +Rp 2,45jt.',
      richCard: 'FORECAST',
    };
  }

  if (
    q.includes('boros') ||
    q.includes('anomali') ||
    q.includes('peringatan') ||
    q.includes('over')
  ) {
    return {
      text: 'Aku menemukan 2 sinyal pemborosan utama bulan ini: kategori Belanja sudah tembus 108% (lebih Rp 40.000 dari batas Rp 500.000), dan pengeluaran Makanan naik +28% dibanding rata-rata bulan lalu.',
      richCard: 'ANOMALY',
    };
  }

  if (
    q.includes('hemat') ||
    q.includes('saran') ||
    q.includes('tips') ||
    q.includes('500')
  ) {
    return {
      text: 'Ini 3 langkah paling cepat untuk menghemat sekitar Rp 485rb – Rp 500rb per bulan berdasarkan pola transaksimu:',
      richCard: 'RECOMMENDATIONS',
    };
  }

  if (
    q.includes('saldo') ||
    q.includes('dompet') ||
    q.includes('rekening') ||
    q.includes('uang')
  ) {
    return {
      text: 'Total saldo aktifmu saat ini Rp 4.850.000 yang tersebar di 4 dompet: Bank BCA (Rp 2.500.000), Tabungan Mandiri (Rp 1.000.000), GoPay (Rp 850.000), dan Uang Tunai (Rp 500.000).',
      richCard: 'SUMMARY',
    };
  }

  if (
    q.includes('anggaran') ||
    q.includes('budget') ||
    q.includes('analisis') ||
    q.includes('bulan ini')
  ) {
    return {
      text: 'Kondisi keuanganmu bulan November 2026 tergolong Sehat dengan skor 84/100. Pemasukan tercatat Rp 6.200.000 dan pengeluaran Rp 1.350.000, sehingga sisa anggaranmu masih aman sekitar Rp 2,65jt.',
      richCard: 'SUMMARY',
    };
  }

  return {
    text: 'Berdasarkan data November 2026, skor kesehatan keuanganmu 84/100 (Sehat) dengan total saldo Rp 4.850.000 dan burn rate Rp 125rb/hr. Kamu bisa tanya detail soal prediksi akhir bulan, kategori boros, atau tips hemat!',
    richCard: 'SUMMARY',
  };
}
