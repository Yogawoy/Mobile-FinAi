# 📱 FinAI Mobile App (React Native / Expo) - Project Context

Dokumen ini menghubungkan proyek **FinAI Mobile** ke sistem backend **FinAI Web & API**.

---

## 🔗 Hubungan Proyek
- **Mobile Project Path**: `D:\Projek November 1\Apk FinAi`
- **Backend / Web Project Path**: `D:\Semester 5\Metopen\FINAI`
- **Production Base URL**: `https://finai-yogawoy8-9503s-projects.vercel.app`
- **Local Dev Base URL**:
  - **HP Fisik (Expo Go, Wi-Fi sama)**: `http://<LAN_IP_PC>:3000` (atur via `EXPO_PUBLIC_API_URL` di `.env`)
  - **Android Emulator**: `http://10.0.2.2:3000`
  - **Web / Simulator**: `http://localhost:3000`

---

## 📌 Pedoman Arsitektur Mobile (React Native / Expo + TypeScript)
1. **Routing & Navigasi**: Gunakan `expo-router` dengan struktur `(auth)` untuk login/register dan `(tabs)` untuk navigasi utama (Beranda, Dompet, Transaksi, Anggaran, Target, Asisten AI).
2. **Network Layer**: Gunakan `src/lib/api-client.ts` (fetch/axios wrapper) yang otomatis menyematkan header:
   - `Content-Type: application/json`
   - `Accept: application/json`
   - `x-client-type: mobile`
   - `Authorization: Bearer <token>` (jika tersedia)
3. **Secure Storage**: Simpan session token pengguna menggunakan `expo-secure-store` melalui `src/lib/storage.ts`.
4. **Sinkronisasi Tipe & Konstanta**: Selalu sinkronkan tipe API, kategori (`categories.ts`), tema kartu dompet (`walletTheme.ts`), dan kontrak endpoint dengan [API_CONTRACT.md](./API_CONTRACT.md) dan backend `FINAI`.
5. **Desain Visual**: Mengikuti identitas visual FinAI Web (`#F6F7FB` canvas, `#FFFFFF` card, `#7C7CE6` periwinkle accent, `#242636` primary text, `#757A95` secondary text).
