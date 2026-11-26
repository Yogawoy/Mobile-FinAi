import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {
  CategoryType,
  GoalStatus,
  NotificationType,
  PrismaClient,
  RecurringFrequency,
  TransactionType,
  WalletType,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}> = [
  { name: 'Makanan & Minuman', type: CategoryType.EXPENSE, icon: 'utensils', color: '#3B7AF5' },
  { name: 'Transportasi', type: CategoryType.EXPENSE, icon: 'car', color: '#F59E0B' },
  { name: 'Belanja', type: CategoryType.EXPENSE, icon: 'shopping', color: '#0D9488' },
  { name: 'Tagihan & Utilitas', type: CategoryType.EXPENSE, icon: 'zap', color: '#EF4444' },
  { name: 'Ngopi & Hiburan', type: CategoryType.EXPENSE, icon: 'coffee', color: '#64748B' },
  { name: 'Kesehatan', type: CategoryType.EXPENSE, icon: 'heart', color: '#EC4899' },
  { name: 'Gaji / Proyek', type: CategoryType.INCOME, icon: 'briefcase', color: '#10B981' },
  { name: 'Bonus & Hadiah', type: CategoryType.INCOME, icon: 'gift', color: '#3B7AF5' },
  { name: 'Investasi & Dividen', type: CategoryType.INCOME, icon: 'trending-up', color: '#059669' },
];

async function main() {
  const demoEmail = 'yoga@smartfinance.id';
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: 'Yoga Saputra',
      passwordHash,
      currency: 'IDR',
      monthlyIncomeTarget: 8500000,
      financialChallenge: 'Mengerem jajan & pengeluaran impulsif',
      budgetRule: '50-30-20',
      hasCompletedSetup: true,
      isActive: true,
    },
    create: {
      name: 'Yoga Saputra',
      email: demoEmail,
      passwordHash,
      currency: 'IDR',
      monthlyIncomeTarget: 8500000,
      financialChallenge: 'Mengerem jajan & pengeluaran impulsif',
      budgetRule: '50-30-20',
      hasCompletedSetup: true,
      isActive: true,
    },
  });

  // 1. 9 Kategori Bawaan
  const categoryMap = new Map<string, string>();
  for (const cat of DEFAULT_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: {
        userId_name_type: {
          userId: user.id,
          name: cat.name,
          type: cat.type,
        },
      },
      update: {
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      },
      create: {
        userId: user.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      },
    });
    categoryMap.set(`${cat.name}:${cat.type}`, record.id);
  }

  // 2. 4 Dompet
  const walletDefs: Array<{
    id: string;
    name: string;
    type: WalletType;
    initialBalance: number;
    currentBalance: number;
    color: string;
    accountNumber: string | null;
  }> = [
    {
      id: 'seed-wallet-bca',
      name: 'Bank BCA',
      type: WalletType.BANK,
      initialBalance: 6500000,
      currentBalance: 7450000,
      color: '#2563EB',
      accountNumber: '8821',
    },
    {
      id: 'seed-wallet-gopay',
      name: 'GoPay',
      type: WalletType.EWALLET,
      initialBalance: 850000,
      currentBalance: 620000,
      color: '#00AED6',
      accountNumber: '0812',
    },
    {
      id: 'seed-wallet-mandiri',
      name: 'Tabungan Mandiri',
      type: WalletType.SAVINGS,
      initialBalance: 12000000,
      currentBalance: 13500000,
      color: '#0F172A',
      accountNumber: '4490',
    },
    {
      id: 'seed-wallet-cash',
      name: 'Uang Tunai',
      type: WalletType.CASH,
      initialBalance: 500000,
      currentBalance: 380000,
      color: '#10B981',
      accountNumber: null,
    },
  ];

  for (const w of walletDefs) {
    await prisma.wallet.upsert({
      where: { id: w.id },
      update: {
        userId: user.id,
        name: w.name,
        type: w.type,
        initialBalance: w.initialBalance,
        currentBalance: w.currentBalance,
        color: w.color,
        accountNumber: w.accountNumber,
      },
      create: {
        id: w.id,
        userId: user.id,
        name: w.name,
        type: w.type,
        initialBalance: w.initialBalance,
        currentBalance: w.currentBalance,
        color: w.color,
        accountNumber: w.accountNumber,
      },
    });
  }

  // 3. 15 Transaksi Realistis Lintas 2 Bulan (untuk deteksi CATEGORY_SPIKE & OUTLIER_TX)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const prevMonthDate = new Date(currentYear, now.getMonth() - 1, 15);

  const txDate = (monthOffset: 0 | -1, day: number) => {
    const d = new Date(currentYear, now.getMonth() + monthOffset, day, 10, 30, 0);
    return d;
  };

  const foodId = categoryMap.get('Makanan & Minuman:EXPENSE')!;
  const transportId = categoryMap.get('Transportasi:EXPENSE')!;
  const shoppingId = categoryMap.get('Belanja:EXPENSE')!;
  const billsId = categoryMap.get('Tagihan & Utilitas:EXPENSE')!;
  const coffeeId = categoryMap.get('Ngopi & Hiburan:EXPENSE')!;
  const salaryId = categoryMap.get('Gaji / Proyek:INCOME')!;
  const bonusId = categoryMap.get('Bonus & Hadiah:INCOME')!;

  const txSeeds: Array<{
    id: string;
    walletId: string;
    destinationWalletId?: string;
    categoryId: string | null;
    type: TransactionType;
    amount: number;
    note: string;
    transactionDate: Date;
  }> = [
    // Bulan Lalu (-1)
    { id: 'seed-tx-01', walletId: 'seed-wallet-bca', categoryId: salaryId, type: TransactionType.INCOME, amount: 8500000, note: 'Gaji Bulanan', transactionDate: txDate(-1, 1) },
    { id: 'seed-tx-02', walletId: 'seed-wallet-bca', categoryId: billsId, type: TransactionType.EXPENSE, amount: 1120000, note: 'Kos & Listrik Bulan Lalu', transactionDate: txDate(-1, 5) },
    { id: 'seed-tx-03', walletId: 'seed-wallet-gopay', categoryId: foodId, type: TransactionType.EXPENSE, amount: 320000, note: 'Belanja Makan Mingguan', transactionDate: txDate(-1, 10) },
    { id: 'seed-tx-04', walletId: 'seed-wallet-gopay', categoryId: transportId, type: TransactionType.EXPENSE, amount: 165000, note: 'Ojek & Transportasi', transactionDate: txDate(-1, 14) },
    { id: 'seed-tx-05', walletId: 'seed-wallet-cash', categoryId: coffeeId, type: TransactionType.EXPENSE, amount: 95000, note: 'Ngopi Akhir Pekan', transactionDate: txDate(-1, 20) },
    { id: 'seed-tx-06', walletId: 'seed-wallet-bca', categoryId: shoppingId, type: TransactionType.EXPENSE, amount: 250000, note: 'Perlengkapan Rumah', transactionDate: txDate(-1, 24) },

    // Bulan Berjalan (0)
    { id: 'seed-tx-07', walletId: 'seed-wallet-bca', categoryId: salaryId, type: TransactionType.INCOME, amount: 8500000, note: 'Gaji Bulanan', transactionDate: txDate(0, 1) },
    { id: 'seed-tx-08', walletId: 'seed-wallet-bca', categoryId: bonusId, type: TransactionType.INCOME, amount: 1250000, note: 'Proyek Freelance UI', transactionDate: txDate(0, 4) },
    { id: 'seed-tx-09', walletId: 'seed-wallet-bca', destinationWalletId: 'seed-wallet-mandiri', categoryId: null, type: TransactionType.TRANSFER, amount: 1500000, note: 'Sisihkan Tabungan Rutin', transactionDate: txDate(0, 5) },
    { id: 'seed-tx-10', walletId: 'seed-wallet-bca', categoryId: billsId, type: TransactionType.EXPENSE, amount: 1150000, note: 'Kos, Internet & Cloud', transactionDate: txDate(0, 6) },
    { id: 'seed-tx-11', walletId: 'seed-wallet-gopay', categoryId: foodId, type: TransactionType.EXPENSE, amount: 480000, note: 'Makan & Pesan Antar', transactionDate: txDate(0, 8) },
    { id: 'seed-tx-12', walletId: 'seed-wallet-gopay', categoryId: transportId, type: TransactionType.EXPENSE, amount: 210000, note: 'BBM & Parkir', transactionDate: txDate(0, 10) },
    { id: 'seed-tx-13', walletId: 'seed-wallet-cash', categoryId: coffeeId, type: TransactionType.EXPENSE, amount: 145000, note: 'Nongkrong & Kopi', transactionDate: txDate(0, 12) },
    { id: 'seed-tx-14', walletId: 'seed-wallet-gopay', categoryId: foodId, type: TransactionType.EXPENSE, amount: 520000, note: 'Traktir Tim & Makan Malam', transactionDate: txDate(0, 15) },
    { id: 'seed-tx-15', walletId: 'seed-wallet-bca', categoryId: shoppingId, type: TransactionType.EXPENSE, amount: 1850000, note: 'Belanja Elektronik (Outlier)', transactionDate: txDate(0, 18) },
  ];

  for (const tx of txSeeds) {
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: {
        userId: user.id,
        walletId: tx.walletId,
        destinationWalletId: tx.destinationWalletId ?? null,
        categoryId: tx.categoryId,
        type: tx.type,
        amount: tx.amount,
        note: tx.note,
        transactionDate: tx.transactionDate,
      },
      create: {
        id: tx.id,
        userId: user.id,
        walletId: tx.walletId,
        destinationWalletId: tx.destinationWalletId ?? null,
        categoryId: tx.categoryId,
        type: tx.type,
        amount: tx.amount,
        note: tx.note,
        transactionDate: tx.transactionDate,
      },
    });
  }

  // 4. 5 Anggaran Bulanan (bulan berjalan)
  const budgetSeeds = [
    { categoryId: foodId, limitAmount: 1200000, alertThresholdPct: 80 },
    { categoryId: transportId, limitAmount: 500000, alertThresholdPct: 80 },
    { categoryId: shoppingId, limitAmount: 1000000, alertThresholdPct: 80 },
    { categoryId: billsId, limitAmount: 1300000, alertThresholdPct: 85 },
    { categoryId: coffeeId, limitAmount: 350000, alertThresholdPct: 80 },
  ];

  for (const b of budgetSeeds) {
    await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: user.id,
          categoryId: b.categoryId,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {
        limitAmount: b.limitAmount,
        alertThresholdPct: b.alertThresholdPct,
      },
      create: {
        userId: user.id,
        categoryId: b.categoryId,
        month: currentMonth,
        year: currentYear,
        limitAmount: b.limitAmount,
        alertThresholdPct: b.alertThresholdPct,
      },
    });
  }

  // 5. 3 Target Tabungan
  const goalSeeds = [
    { id: 'seed-goal-1', name: 'Dana Darurat 6 Bulan', targetAmount: 25000000, currentAmount: 13500000, deadline: new Date(currentYear + 1, 5, 30) },
    { id: 'seed-goal-2', name: 'MacBook Pro Kerja', targetAmount: 22000000, currentAmount: 8400000, deadline: new Date(currentYear + 1, 2, 15) },
    { id: 'seed-goal-3', name: 'Liburan Akhir Tahun', targetAmount: 8000000, currentAmount: 3200000, deadline: new Date(currentYear, 11, 20) },
  ];

  for (const g of goalSeeds) {
    await prisma.financialGoal.upsert({
      where: { id: g.id },
      update: {
        userId: user.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        status: GoalStatus.ACTIVE,
      },
      create: {
        id: g.id,
        userId: user.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        status: GoalStatus.ACTIVE,
      },
    });
  }

  // 6. 3 Jadwal Rutin
  const recurringSeeds = [
    { id: 'seed-rec-1', walletId: 'seed-wallet-bca', categoryId: billsId, title: 'Bayar Kos', type: TransactionType.EXPENSE, amount: 850000, frequency: RecurringFrequency.MONTHLY, nextRunDate: new Date(currentYear, now.getMonth() + 1, 1) },
    { id: 'seed-rec-2', walletId: 'seed-wallet-bca', categoryId: billsId, title: 'WiFi & Server Cloud', type: TransactionType.EXPENSE, amount: 270000, frequency: RecurringFrequency.MONTHLY, nextRunDate: new Date(currentYear, now.getMonth() + 1, 5) },
    { id: 'seed-rec-3', walletId: 'seed-wallet-bca', categoryId: salaryId, title: 'Gaji Bulanan', type: TransactionType.INCOME, amount: 8500000, frequency: RecurringFrequency.MONTHLY, nextRunDate: new Date(currentYear, now.getMonth() + 1, 1) },
  ];

  for (const r of recurringSeeds) {
    await prisma.recurringTransaction.upsert({
      where: { id: r.id },
      update: {
        userId: user.id,
        walletId: r.walletId,
        categoryId: r.categoryId,
        title: r.title,
        type: r.type,
        amount: r.amount,
        frequency: r.frequency,
        nextRunDate: r.nextRunDate,
        isActive: true,
      },
      create: {
        id: r.id,
        userId: user.id,
        walletId: r.walletId,
        categoryId: r.categoryId,
        title: r.title,
        type: r.type,
        amount: r.amount,
        frequency: r.frequency,
        nextRunDate: r.nextRunDate,
        isActive: true,
      },
    });
  }

  // 7. 3 Notifikasi Awal
  const notifSeeds = [
    {
      id: 'seed-notif-1',
      type: NotificationType.BUDGET_ALERT,
      title: 'Anggaran Belanja Melewati Batas',
      body: 'Pengeluaran Belanja bulan ini sudah melampaui Rp 1.000.000. Periksa transaksi terakhirmu.',
      isRead: false,
    },
    {
      id: 'seed-notif-2',
      type: NotificationType.ANOMALY_ALERT,
      title: 'Terdeteksi Lonjakan Pengeluaran',
      body: `Kategori Makanan & Minuman naik dibanding bulan ${prevMonthDate.toLocaleDateString('id-ID', { month: 'long' })}.`,
      isRead: false,
    },
    {
      id: 'seed-notif-3',
      type: NotificationType.GOAL_MILESTONE,
      title: 'Target Dana Darurat 54% Tercapai',
      body: 'Saldo tabunganmu sudah mencapai Rp 13.500.000 dari target Rp 25.000.000.',
      isRead: true,
    },
  ];

  for (const n of notifSeeds) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {
        userId: user.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
      },
      create: {
        id: n.id,
        userId: user.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
      },
    });
  }

  console.log(`Seed selesai untuk akun demo: ${demoEmail} (ID: ${user.id})`);
}

main()
  .catch((err) => {
    console.error('Gagal menjalankan seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
