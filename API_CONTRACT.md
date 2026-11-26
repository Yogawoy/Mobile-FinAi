# 📋 FinAI API Contract & Data Specification

Dokumen spesifikasi API resmi untuk integrasi aplikasi mobile **FinAI (React Native / Expo TypeScript)** dengan backend **Next.js & Vercel** (`D:\Semester 5\Metopen\FINAI`).

> **Catatan Penting**: Backend menggunakan validasi Zod `.strict()` pada banyak endpoint mutasi (`POST`/`PATCH`). Jangan mengirim field di luar skema yang tercantum di bawah agar tidak ditolak dengan `400 VALIDATION_ERROR`. Semua nominal `Decimal` diserialisasi oleh backend sebagai string dengan 2 desimal (contoh: `"45000.00"`).

---

## 🌐 1. Base URL & Header Konfigurasi

- **Production URL**: `https://finai-yogawoy8-9503s-projects.vercel.app`
- **Development URL (HP Fisik via Expo Go)**: `http://<LAN_IP_PC>:3000`
- **Development URL (Android Emulator)**: `http://10.0.2.2:3000`
- **Development URL (Desktop / iOS Simulator)**: `http://localhost:3000`

### Header Standar
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <session_token>
x-client-type: mobile
```

### Standar Format Response
```json
// Sukses
{
  "success": true,
  "data": { ... }
}

// Gagal
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan error bahasa Indonesia yang ramah pengguna",
    "details": {}
  }
}
```

---

## 🔐 2. Autentikasi (`/api/auth`)

### A. Daftar Akun Baru
- **Endpoint**: `POST /api/auth/register`
- **Header wajib**: `x-client-type: mobile` (agar server mengembalikan field `token`)
- **Request Body**:
  ```json
  {
    "name": "Yoga Saputra",
    "email": "yoga@example.com",
    "password": "password123"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "userId": "uuid",
        "name": "Yoga Saputra",
        "email": "yoga@example.com",
        "avatarUrl": null,
        "createdAt": "2026-11-25T00:00:00.000Z"
      },
      "token": "raw_session_token_64_chars_hex"
    }
  }
  ```

### B. Masuk (Login)
- **Endpoint**: `POST /api/auth/login`
- **Header wajib**: `x-client-type: mobile`
- **Request Body**:
  ```json
  {
    "email": "yoga@example.com",
    "password": "password123",
    "rememberMe": true
  }
  ```
- **Response (`200 OK`)**: `data.user` + `data.token` (30 hari jika `rememberMe: true`, 7 hari jika `false`).

### C. Profil Pengguna Saat Ini
- **Endpoint**: `GET /api/auth/me`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "userId": "uuid",
        "name": "Yoga Saputra",
        "email": "yoga@example.com",
        "avatarUrl": null,
        "createdAt": "2026-11-25T00:00:00.000Z"
      }
    }
  }
  ```

### D. Perbarui Nama Profil
- **Endpoint**: `PATCH /api/auth/me`
- **Request Body**: `{ "name": "Yoga Saputra" }` (min 2, max 100 karakter)
- **Response (`200 OK`)**: `{ "user": { ... } }`

### E. Keluar (Logout)
- **Endpoint**: `POST /api/auth/logout`
- **Header**: `Authorization: Bearer <token>`
- **Response (`200 OK`)**: `{ "message": "Berhasil keluar" }`

---

## 💳 3. Dompet & Transfer (`/api/wallets`, `/api/transfers`)

### A. Ambil Semua Dompet
- **Endpoint**: `GET /api/wallets`
- **Response (`200 OK`)**:
  > Server mengembalikan `{ wallets }` **tanpa** `totalBalance`. Client menghitung `totalBalance` dari penjumlahan `wallets[].balance`. Default wallet diambil dari `GET /api/settings` (`defaultWalletId`).
  ```json
  {
    "success": true,
    "data": {
      "wallets": [
        {
          "id": "uuid",
          "userId": "uuid",
          "name": "BCA Utama",
          "type": "BANK",
          "institution": "BCA",
          "accountLast4": "7890",
          "balance": "15000000.00",
          "color": "periwinkle",
          "icon": "Bank",
          "createdAt": "2026-11-25T00:00:00.000Z",
          "updatedAt": "2026-11-25T00:00:00.000Z"
        }
      ]
    }
  }
  ```

### B. Tambah Dompet
- **Endpoint**: `POST /api/wallets`
- **Request Body (`.strict()`)**:
  ```json
  {
    "name": "GoPay",
    "type": "E_WALLET",
    "institution": "Gojek",
    "accountLast4": "6789",
    "balance": 500000,
    "color": "teal",
    "icon": "Wallet"
  }
  ```
  - `type`: `"BANK" | "E_WALLET" | "CASH"` (default `"BANK"`)
  - `institution`: opsional `string | null` (max 50)
  - `accountLast4`: opsional `string | null` (max 10)
  - `color`: opsional `string | null` (max 20, mis. `"periwinkle"`, `"teal"`, `"blue"`, `"slate"`, `"navy"`, `"peach"`, `"lavender"`)
  - `icon`: opsional `string | null` (max 20)
- **Response (`201 Created`)**: `{ "wallet": { ... } }`

### C. Detail / Ubah / Hapus Dompet
- **Detail**: `GET /api/wallets/:id` → `{ "wallet": { ... } }`
- **Ubah**: `PATCH /api/wallets/:id` (`.strict()`: `name?`, `type?`, `institution?`, `accountLast4?`, `color?`, `icon?`) → `{ "wallet": { ... } }`
- **Hapus**: `DELETE /api/wallets/:id` → `{ "message": "Dompet berhasil dihapus" }` (mengembalikan `409 WALLET_IN_USE` jika masih memiliki transaksi atau terkait target)

### D. Transfer Antar Dompet (Kanonik)
- **Endpoint**: `POST /api/transfers` *(Endpoint lama `/api/wallets/transfer` berstatus `@deprecated`)*
- **Request Body**:
  ```json
  {
    "fromWalletId": "uuid-dompet-asal",
    "toWalletId": "uuid-dompet-tujuan",
    "amount": 250000,
    "date": "2026-11-25T12:00:00.000Z",
    "note": "Topup GoPay dari BCA"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "fromWallet": { "...": "..." },
      "toWallet": { "...": "..." },
      "message": "Transfer saldo berhasil dilakukan"
    }
  }
  ```

---

## 💸 4. Transaksi (`/api/transactions`)

### A. Daftar Transaksi
- **Endpoint**: `GET /api/transactions`
- **Query Params Opsional**:
  - `limit` (integer >= 0, default `50`)
  - `offset` (integer >= 0, default `0`)
  - `walletId` (uuid)
  - `type` (`INCOME` | `EXPENSE`)
  - `category` (string key kategori)
  - `startDate`, `endDate` (ISO date string)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "total": 120,
      "limit": 20,
      "offset": 0,
      "transactions": [
        {
          "id": "uuid",
          "userId": "uuid",
          "walletId": "uuid",
          "type": "EXPENSE",
          "amount": "45000.00",
          "category": "food",
          "description": "Makan Siang Ayam Geprek",
          "transactionDate": "2026-11-25T12:00:00.000Z",
          "createdAt": "2026-11-25T12:00:00.000Z",
          "updatedAt": "2026-11-25T12:00:00.000Z",
          "wallet": {
            "id": "uuid",
            "name": "BCA Utama",
            "type": "BANK",
            "institution": "BCA"
          }
        }
      ]
    }
  }
  ```

### B. Tambah Transaksi
- **Endpoint**: `POST /api/transactions`
- **Request Body (`.strict()`)**:
  ```json
  {
    "walletId": "uuid",
    "type": "EXPENSE",
    "amount": 45000,
    "category": "food",
    "description": "Makan Siang",
    "transactionDate": "2026-11-25T12:00:00.000Z"
  }
  ```
- **Response (`201 Created`)**: `{ "transaction": { ... }, "wallet": { ... } }`

### C. Detail / Ubah / Hapus Transaksi
- **Detail**: `GET /api/transactions/:id` → `{ "transaction": { ... } }`
- **Ubah**: `PATCH /api/transactions/:id` (`.strict()`: field parsial dari create) → `{ "transaction": { ... } }`
- **Hapus**: `DELETE /api/transactions/:id` → `{ "message": "Transaksi berhasil dihapus dan saldo dompet telah dipulihkan" }`

---

## 📊 5. Pos Anggaran (`/api/budgets`)

### A. Ambil Anggaran Periode
- **Endpoint**: `GET /api/budgets?month=11&year=2026` (default bulan & tahun berjalan)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "budgets": [
        {
          "id": "uuid",
          "userId": "uuid",
          "category": "food",
          "limitAmount": "2000000.00",
          "month": 11,
          "year": 2026,
          "usedAmount": "650000.00",
          "remainingAmount": "1350000.00",
          "percentage": 33,
          "status": "SAFE",
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  }
  ```
  - `status`: `"SAFE"` (< 70%), `"WARNING"` (70–90%), `"CRITICAL"` (> 90%).

### B. Buat Anggaran
- **Endpoint**: `POST /api/budgets`
- **Request Body (`.strict()`)**:
  ```json
  {
    "category": "food",
    "limitAmount": 2000000,
    "month": 11,
    "year": 2026
  }
  ```
- **Response (`201 Created`)**: `{ "budget": { ... } }` (mengembalikan `409 CONFLICT` jika kategori pada bulan & tahun tersebut sudah ada)

### C. Detail / Ubah / Hapus Anggaran
- **Detail**: `GET /api/budgets/:id` → `{ "budget": { ... } }`
- **Ubah**: `PATCH /api/budgets/:id` (`.strict()`: `category?`, `limitAmount?`, `month?`, `year?`) → `{ "budget": { ... } }`
- **Hapus**: `DELETE /api/budgets/:id` → `{ "message": "Pos anggaran berhasil dihapus" }`

---

## 🎯 6. Target Impian (`/api/goals`)

### A. Ambil Semua Target
- **Endpoint**: `GET /api/goals`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "goals": [
        {
          "id": "uuid",
          "userId": "uuid",
          "name": "Dana Darurat",
          "category": "emergency",
          "targetAmount": "30000000.00",
          "currentAmount": "5000000.00",
          "deadline": "2027-12-31T00:00:00.000Z",
          "sourceWalletId": null,
          "destinationWalletId": null,
          "frequency": "MONTHLY",
          "autoDeposit": false,
          "nextDueDate": null,
          "remainingAmount": "25000000.00",
          "progressPercentage": 17,
          "remainingMonths": 13,
          "recommendedMonthlySaving": "1923077.00",
          "contributions": [],
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  }
  ```

### B. Buat Target
- **Endpoint**: `POST /api/goals`
- **Request Body (`.strict()`)**:
  ```json
  {
    "name": "Dana Darurat",
    "category": "emergency",
    "targetAmount": 30000000,
    "deadline": "2027-12-31T00:00:00.000Z",
    "sourceWalletId": null,
    "destinationWalletId": null,
    "frequency": "MONTHLY",
    "autoDeposit": false
  }
  ```
- **Response (`201 Created`)**: `{ "goal": { ... } }`

### C. Detail / Ubah / Hapus Target
- **Detail**: `GET /api/goals/:id` → `{ "goal": { ... } }`
- **Ubah**: `PATCH /api/goals/:id` (`.strict()`) → `{ "goal": { ... } }`
- **Hapus**: `DELETE /api/goals/:id` → `{ "message": "Target berhasil dihapus" }`

### D. Nabung / Setoran ke Target
- **Endpoint**: `POST /api/goals/:id/contributions`
- **Request Body (`.strict()`)**:
  ```json
  {
    "sourceWalletId": "uuid",
    "amount": 1000000,
    "contributionDate": "2026-11-25T12:00:00.000Z"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "contribution": {
        "id": "uuid",
        "goalId": "uuid",
        "sourceWalletId": "uuid",
        "amount": "1000000.00",
        "contributionDate": "...",
        "createdAt": "..."
      },
      "goal": { "...": "..." },
      "wallet": { "...": "..." },
      "message": "Setoran target berhasil dicatat"
    }
  }
  ```

---

## ⚙️ 7. Pengaturan Pengguna (`/api/settings`)

### A. Ambil Pengaturan
- **Endpoint**: `GET /api/settings`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "settings": {
        "id": "uuid",
        "userId": "uuid",
        "language": "id-ID",
        "currency": "IDR",
        "numberFormat": "id-ID",
        "defaultWalletId": null,
        "defaultCategory": null,
        "budgetReminder": true,
        "goalReminder": true,
        "financialSummary": true,
        "aiPersonalization": true,
        "aiActionConfirmation": true,
        "animations": true,
        "createdAt": "...",
        "updatedAt": "..."
      }
    }
  }
  ```

### B. Perbarui Pengaturan
- **Endpoint**: `PATCH /api/settings`
- **Request Body**: field parsial dari object `settings` di atas (`defaultWalletId` menerima UUID, `""` menjadi `null`, atau `null`).

---

## ✨ 8. FinAI Assistant (`/api/ai/chat`)

- **Endpoint**: `POST /api/ai/chat`
- **Request Body**:
  ```json
  {
    "message": "Catat makan siang 45rb pakai BCA",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }
  ```
  - `message`: 1–2000 karakter
  - `history`: opsional, maksimal 20 item (`role`: `"user" | "assistant"`)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "response": {
        "type": "text | financial_action | clarification | error | budget | goal | wallet | summary | insight | spending_breakdown | financial_plan",
        "message": "Teks respon asisten",
        "action": "create_transaction | transfer | goal_contribution | create_budget | create_goal",
        "payload": {},
        "requiresConfirmation": true,
        "data": {}
      },
      "meta": {
        "provider": "groq | xai",
        "model": "...",
        "timestamp": "..."
      }
    }
  }
  ```

---

## 🎨 9. Standar Kategori & Warna Resmi FinAI (`src/lib/categories.ts`)

### Pengeluaran (`EXPENSE_CATEGORIES` / `BUDGET_CATEGORIES`):
| Key | Label | Short Label | Hex Color |
| :--- | :--- | :--- | :--- |
| `food` | Makanan & Minuman | Makanan | `#7C7CE6` |
| `transport` | Transportasi | Transportasi | `#8E9AF7` |
| `shopping` | Belanja | Belanja | `#10B981` |
| `bills` | Tagihan & Utilitas | Tagihan | `#F97316` |
| `daily_needs` | Kebutuhan Harian | Kebutuhan Harian | `#0EA5E9` |
| `housing` | Tempat Tinggal | Tempat Tinggal | `#6366F1` |
| `entertainment` | Hiburan | Hiburan | `#F59E0B` |
| `health` | Kesehatan | Kesehatan | `#EC4899` |
| `education` | Pendidikan | Pendidikan | `#9F7AEA` |
| `social` | Sosial & Donasi | Sosial | `#F43F5E` |
| `debt` | Cicilan & Utang | Cicilan | `#EF4444` |
| `electronics` | Elektronik & Gadget | Elektronik | `#06B6D4` |
| `other` | Lainnya | Lainnya | `#757A95` |

### Pemasukan (`INCOME_CATEGORIES`):
| Key | Label | Short Label | Hex Color |
| :--- | :--- | :--- | :--- |
| `salary` | Gaji & Pendapatan | Gaji | `#10B981` |
| `freelance` | Freelance | Freelance | `#3B82F6` |
| `bonus` | Bonus & Hadiah | Bonus | `#10B981` |
| `business` | Penjualan & Bisnis | Bisnis | `#14B8A6` |
| `investment` | Investasi | Investasi | `#F59E0B` |
| `other` | Lainnya | Lainnya | `#757A95` |

### Kategori Target Impian (`GOAL_CATEGORIES`):
| Key | Label | Short Label |
| :--- | :--- | :--- |
| `laptop` | Gadget / Laptop | Gadget |
| `travel` | Liburan & Wisata | Liburan |
| `emergency` | Dana Darurat | Darurat |
| `vehicle` | Kendaraan | Kendaraan |
| `home` | Rumah & Properti | Properti |
| `course` | Pendidikan | Pendidikan |
| `wedding` | Pernikahan | Pernikahan |
| `worship` | Ibadah / Umroh | Ibadah |
| `business` | Modal Usaha | Modal Usaha |
| `other` | Lainnya | Lainnya |
