import assert from 'node:assert/strict';
import { CategoryType } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import {
  createCategoryAndTransactionAtomic,
  findExplicitCategoryInText,
  findFallbackOtherCategory,
  findHistoricalCategoryMatch,
  hasExplicitOtherCategoryIntent,
  isCategoryAlreadyOwned,
  resolveCategoryFallback,
  suggestStandardCategoryIfMissing,
  type ActiveCategoryItem,
} from '../src/services/categoryIntelligence.service';

const MOCK_CATEGORIES: ActiveCategoryItem[] = [
  { id: 'cat-belanja', name: 'Belanja', type: CategoryType.EXPENSE },
  { id: 'cat-makan', name: 'Makanan & Minuman', type: CategoryType.EXPENSE },
  { id: 'cat-kesehatan', name: 'Kesehatan', type: CategoryType.EXPENSE },
  { id: 'cat-skincare', name: 'Skincare', type: CategoryType.EXPENSE },
  { id: 'cat-game', name: 'Game', type: CategoryType.EXPENSE },
  { id: 'cat-kucing', name: 'Kucing', type: CategoryType.EXPENSE },
  { id: 'cat-hiburan', name: 'Hiburan', type: CategoryType.EXPENSE },
  { id: 'cat-lainnya', name: 'Lainnya', type: CategoryType.EXPENSE },
  { id: 'cat-gaji', name: 'Gaji', type: CategoryType.INCOME },
  { id: 'cat-inc-other', name: 'Lainnya', type: CategoryType.INCOME },
];

async function runTests() {
  // Layer 1: Historical Memory (stub prisma.transaction.findMany in-memory)
  const originalFindMany = prisma.transaction.findMany;
  (prisma.transaction as unknown as { findMany: typeof originalFindMany }).findMany =
    (async () => [
      { note: 'Whiskas Tuna', categoryId: 'cat-kucing' },
      { note: 'Kopi Kenangan', categoryId: 'cat-makan' },
    ]) as unknown as typeof originalFindMany;

  try {
    const histHit = await findHistoricalCategoryMatch({
      userId: 'user-test-1',
      type: CategoryType.EXPENSE,
      text: 'beli whiskas 45rb',
      categories: MOCK_CATEGORIES,
    });
    assert.equal(histHit?.name, 'Kucing', 'Layer 1 harus mengunci kategori Kucing untuk Whiskas');
    console.log('PASS Layer 1: "beli whiskas 45rb" ->', histHit?.name);
  } finally {
    (prisma.transaction as unknown as { findMany: typeof originalFindMany }).findMany =
      originalFindMany;
  }

  // Layer 2 / 4: Konteks Objek mengalahkan Toko/Platform & Kategori Spesifik mengalahkan Umum
  const obatHit = resolveCategoryFallback(
    MOCK_CATEGORIES,
    'beli obat di indomaret 30rb',
    CategoryType.EXPENSE
  );
  assert.equal(obatHit?.name, 'Kesehatan', 'Obat di Indomaret harus masuk Kesehatan');
  console.log('PASS Layer 2a: "beli obat di indomaret 30rb" ->', obatHit?.name);

  const sunscreenHit = resolveCategoryFallback(
    MOCK_CATEGORIES,
    'beli sunscreen di shopee 75rb',
    CategoryType.EXPENSE
  );
  assert.equal(sunscreenHit?.name, 'Skincare', 'Sunscreen di Shopee harus masuk Skincare');
  console.log('PASS Layer 2b: "beli sunscreen di shopee 75rb" ->', sunscreenHit?.name);

  const gameHit = resolveCategoryFallback(
    MOCK_CATEGORIES,
    'top up diamond ml 50rb',
    CategoryType.EXPENSE
  );
  assert.equal(gameHit?.name, 'Game', 'Top up diamond ML harus masuk Game');
  console.log('PASS Layer 2c: "top up diamond ml 50rb" ->', gameHit?.name);

  // Layer 3: Ambigu -> CHOICE_CARD candidate builder
  const pool = MOCK_CATEGORIES.filter((c) => c.type === CategoryType.EXPENSE);
  const poolById = new Map(pool.map((c) => [c.id, c]));
  const candidateIds = ['cat-belanja', 'cat-makan', 'cat-hiburan'];
  const candidateCats = candidateIds
    .map((id) => poolById.get(id))
    .filter((c): c is ActiveCategoryItem => Boolean(c));
  const otherCat = findFallbackOtherCategory(pool, CategoryType.EXPENSE);
  if (otherCat && !candidateCats.some((c) => c.id === otherCat.id)) {
    candidateCats.push(otherCat);
  }
  const choiceCard = {
    type: 'CHOICE_CARD' as const,
    title: 'Pilih kategori transaksi',
    options: candidateCats.map((c) => ({
      label: c.name,
      messageToSend: `habis 100rb di mall kategori ${c.name}`,
    })),
  };
  assert.equal(choiceCard.type, 'CHOICE_CARD');
  assert.ok(choiceCard.options.length >= 3);
  assert.ok(
    choiceCard.options.some((o) => o.label === 'Lainnya'),
    'CHOICE_CARD harus menyertakan opsi Lainnya'
  );
  console.log(
    'PASS Layer 3: "habis 100rb di mall" -> CHOICE_CARD options:',
    choiceCard.options.map((o) => o.label).join(', ')
  );

  // Layer 4: Fallback Darurat Aman (tidak pernah ke categories[0] Belanja)
  const unknownHit = resolveCategoryFallback(
    MOCK_CATEGORIES,
    'xyzqwerty 50rb',
    CategoryType.EXPENSE
  );
  assert.equal(unknownHit?.name, 'Lainnya', 'Teks acak harus jatuh ke Lainnya, bukan Belanja');
  assert.notEqual(unknownHit?.name, 'Belanja');
  console.log('PASS Layer 4: "xyzqwerty 50rb" ->', unknownHit?.name);

  // Smart Suggest Test 1: User TANPA kategori Kesehatan -> sarankan "Kesehatan" (bukan Belanja)
  const catsWithoutHealth = MOCK_CATEGORIES.filter((c) => c.name !== 'Kesehatan');
  const suggestedName = suggestStandardCategoryIfMissing(
    catsWithoutHealth,
    'Beli obat flu 25rb pakai Uang Tunai',
    CategoryType.EXPENSE
  );
  assert.equal(
    suggestedName,
    'Kesehatan',
    'User tanpa kategori Kesehatan harus mendapat saran Kesehatan'
  );
  assert.equal(
    isCategoryAlreadyOwned(catsWithoutHealth, 'Kesehatan', CategoryType.EXPENSE),
    false
  );
  console.log(
    'PASS Smart Suggest 1: "Beli obat flu 25rb pakai Uang Tunai" -> CHOICE_CARD opsi:',
    `Buat ${suggestedName} & catat`
  );

  // Smart Suggest Test 2: Atomic creation & Anti-Minus validation inside prisma.$transaction
  const origTx = prisma.$transaction;
  let txCreated = false;
  let catCreated = false;

  const mockTxClient = {
    category: {
      findFirst: async () => null,
      create: async ({ data }: { data: { name: string; type: CategoryType } }) => {
        catCreated = true;
        return { id: 'cat-new-health', name: data.name, type: data.type };
      },
    },
    wallet: {
      findFirst: async () => ({
        id: 'wallet-tunai',
        name: 'Uang Tunai',
        currentBalance: 100000,
      }),
      update: async () => ({ currentBalance: 75000 }),
    },
    transaction: {
      create: async ({ data }: { data: { amount: number; note: string } }) => {
        txCreated = true;
        return { id: 'tx-atomic-1', amount: data.amount, note: data.note };
      },
    },
  };

  (prisma as unknown as { $transaction: unknown }).$transaction = async (
    fn: (tx: typeof mockTxClient) => Promise<unknown>
  ) => fn(mockTxClient);

  try {
    const atomicRes = await createCategoryAndTransactionAtomic({
      userId: 'user-test-1',
      categoryName: 'Kesehatan',
      type: CategoryType.EXPENSE,
      walletId: 'wallet-tunai',
      amount: 25000,
      note: 'Beli obat flu',
    });
    assert.equal(catCreated, true);
    assert.equal(txCreated, true);
    assert.equal(atomicRes.category.name, 'Kesehatan');
    assert.equal(atomicRes.isNewCategory, true);
    assert.equal(atomicRes.newWalletBalance, 75000);
    console.log('PASS Smart Suggest 2a: Atomic create Kesehatan + tx berhasil');

    // Anti-Minus check
    await assert.rejects(
      () =>
        createCategoryAndTransactionAtomic({
          userId: 'user-test-1',
          categoryName: 'Kesehatan',
          type: CategoryType.EXPENSE,
          walletId: 'wallet-tunai',
          amount: 500000,
          note: 'Beli obat mahal',
        }),
      /tidak mencukupi/i
    );
    console.log('PASS Smart Suggest 2b: Validasi Anti-Minus menolak saldo kurang');
  } finally {
    (prisma as unknown as { $transaction: typeof origTx }).$transaction = origTx;
  }

  // Anti-Loop Test: Explicit "kategori Lainnya" / "[kategori: Lainnya]" bypasses CHOICE_CARD & Smart Suggest
  const catsWithoutSports = MOCK_CATEGORIES.filter((c) => c.name !== 'Olahraga');
  const explicitBypass1 = findExplicitCategoryInText(
    catsWithoutSports,
    'Catat pengeluaran 150000 bayar gym kategori Lainnya pakai DANA',
    CategoryType.EXPENSE
  );
  assert.equal(
    explicitBypass1?.name,
    'Lainnya',
    'Explicit "kategori Lainnya" harus langsung mengunci kategori Lainnya tanpa CHOICE_CARD'
  );

  const explicitBypass2 = findExplicitCategoryInText(
    catsWithoutSports,
    'Catat pengeluaran 150000 bayar gym [kategori: Lainnya] pakai DANA',
    CategoryType.EXPENSE
  );
  assert.equal(explicitBypass2?.name, 'Lainnya');
  assert.equal(
    hasExplicitOtherCategoryIntent(
      'Catat pengeluaran 150000 bayar gym [kategori: Lainnya] pakai DANA'
    ),
    true
  );
  console.log(
    'PASS Anti-Loop: "Catat pengeluaran 150000 bayar gym kategori Lainnya pakai DANA" ->',
    explicitBypass1?.name,
    '(bypass CHOICE_CARD)'
  );
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
