import assert from 'node:assert/strict';
import { CategoryType } from '@prisma/client';
import {
  buildDraftCard,
  clearPendingDraft,
  detectIncompleteDraftIntent,
  evaluateDraftMissingSlots,
  getGenericItemPrompt,
  getPendingDraft,
  hasExactDescriptionBypass,
  isCancelDraftCommand,
  isGenericDescription,
  mergePendingDraft,
  setPendingDraft,
  type DraftContextData,
} from '../src/services/pendingDraft.service';
import { resolveCategoryFallback } from '../src/services/categoryIntelligence.service';

const MOCK_CTX: DraftContextData = {
  wallets: [
    { id: 'w-tunai', name: 'Uang Tunai', color: '#059669', currentBalance: 250_000 },
    { id: 'w-bca', name: 'BCA', color: '#2563EB', currentBalance: 1_500_000 },
  ],
  categories: [
    { id: 'c-makan', name: 'Makanan & Minuman', type: CategoryType.EXPENSE },
    { id: 'c-lainnya', name: 'Lainnya', type: CategoryType.EXPENSE },
  ],
  goals: [{ id: 'g-darurat', name: 'Dana Darurat', targetAmount: 5_000_000, currentAmount: 1_000_000 }],
  budgets: [],
};

function runTests() {
  const userId = 'test-draft-user';
  clearPendingDraft(userId);

  // 1. "beli makan" -> DRAFT_CARD (Item: Belum spesifik, Nominal: Belum diisi, Dompet: Belum dipilih)
  const d1 = detectIncompleteDraftIntent('beli makan', MOCK_CTX);
  assert.ok(d1, 'beli makan harus terdeteksi sebagai incomplete draft');
  assert.equal(d1.intent, 'CREATE_TRANSACTION');
  const m1 = evaluateDraftMissingSlots(d1);
  assert.deepEqual(m1, ['description', 'amount', 'walletId']);
  setPendingDraft(userId, d1);
  const card1 = buildDraftCard(d1, MOCK_CTX);
  assert.equal(card1.type, 'DRAFT_CARD');
  assert.equal(card1.rows[0].value, 'Belum spesifik');
  assert.equal(card1.rows[1].isMissing, true);
  assert.equal(card1.rows[2].isMissing, true);
  console.log('PASS 1: "beli makan" -> DRAFT_CARD:', card1.rows.map((r) => `${r.label}=${r.value}`).join(', '));

  // 2. Balasan "25rb" -> draft ter-update (amount: 25000), sisa [description, walletId]
  const active = getPendingDraft(userId)!;
  const d2 = mergePendingDraft(active, '25rb', MOCK_CTX);
  assert.equal(d2.intent, 'CREATE_TRANSACTION');
  assert.equal(d2.data.amount, 25000);
  const m2 = evaluateDraftMissingSlots(d2);
  assert.deepEqual(m2, ['description', 'walletId']);
  console.log('PASS 2: balasan "25rb" -> amount=25000, missingSlots=[description, walletId]');

  // 3. "buat anggaran" -> DRAFT_CARD Anggaran
  const d3 = detectIncompleteDraftIntent('buat anggaran', MOCK_CTX);
  assert.ok(d3);
  assert.equal(d3.intent, 'SET_BUDGET');
  const card3 = buildDraftCard(d3, MOCK_CTX);
  assert.equal(card3.type, 'DRAFT_CARD');
  assert.equal(card3.title, 'Draf Anggaran');
  console.log('PASS 3: "buat anggaran" -> DRAFT_CARD:', card3.title);

  // 4. "mau nabung" -> DRAFT_CARD Tabungan
  const d4 = detectIncompleteDraftIntent('mau nabung', MOCK_CTX);
  assert.ok(d4);
  assert.equal(d4.intent, 'CREATE_GOAL');
  const card4 = buildDraftCard(d4, MOCK_CTX);
  assert.equal(card4.type, 'DRAFT_CARD');
  assert.equal(card4.title, 'Draf Tabungan');
  console.log('PASS 4: "mau nabung" -> DRAFT_CARD:', card4.title);

  // 5. "batal" -> membersihkan pendingDraft
  assert.equal(isCancelDraftCommand('batal'), true);
  clearPendingDraft(userId);
  assert.equal(getPendingDraft(userId), null);
  console.log('PASS 5: "batal" membersihkan pendingDraft');

  // 6. Generic Item Guard: "Beli makanan 20rb pakai Uang Tunai" -> tanya item + simpan amount & walletId
  const d6 = detectIncompleteDraftIntent('Beli makanan 20rb pakai Uang Tunai', MOCK_CTX);
  assert.ok(d6 && d6.intent === 'CREATE_TRANSACTION');
  assert.equal(d6.data.amount, 20000);
  assert.equal(d6.data.walletId, 'w-tunai');
  assert.equal(isGenericDescription(d6.data.description), true);
  assert.deepEqual(evaluateDraftMissingSlots(d6), ['description']);
  const prompt6 = getGenericItemPrompt(d6.data.description);
  assert.equal(prompt6.question, 'Makanan apa yang kamu beli?');
  setPendingDraft(userId, d6);
  console.log('PASS 6: "Beli makanan 20rb pakai Uang Tunai" ->', prompt6.question, `(opsi: Catat sebagai ${prompt6.label} saja)`);

  // 7. Balasan "Cilok" -> merge description + pembeda Makanan vs Jajanan
  const ctxWithJajan: DraftContextData = {
    ...MOCK_CTX,
    categories: [
      { id: 'c-makanan', name: 'Makanan', type: CategoryType.EXPENSE },
      { id: 'c-jajanan', name: 'Jajanan', type: CategoryType.EXPENSE },
      { id: 'c-lainnya', name: 'Lainnya', type: CategoryType.EXPENSE },
    ],
  };
  const d7 = mergePendingDraft(getPendingDraft(userId)!, 'Cilok', ctxWithJajan);
  assert.equal(d7.intent, 'CREATE_TRANSACTION');
  assert.equal(d7.data.description, 'Cilok');
  assert.equal(d7.data.amount, 20000);
  assert.equal(d7.data.walletId, 'w-tunai');
  assert.deepEqual(evaluateDraftMissingSlots(d7), []);
  const jajanCat = resolveCategoryFallback(ctxWithJajan.categories, 'Cilok', CategoryType.EXPENSE);
  assert.equal(jajanCat?.name, 'Jajanan');
  console.log('PASS 7: Balasan "Cilok" -> lengkap (Rp 20.000, Uang Tunai, kategori Jajanan)');

  // 8. Bypass tombol "Catat sebagai Makanan saja" -> langsung lengkap tanpa looping
  const bypassMsg = 'Konfirmasi catat pengeluaran 20000 deskripsi persis Makanan pakai Uang Tunai';
  assert.equal(hasExactDescriptionBypass(bypassMsg), 'Makanan');
  const d8 = mergePendingDraft(getPendingDraft(userId)!, bypassMsg, MOCK_CTX);
  assert.equal(d8.intent, 'CREATE_TRANSACTION');
  assert.equal(d8.data.description, 'Makanan');
  assert.equal(d8.data.descriptionLocked, true);
  assert.deepEqual(evaluateDraftMissingSlots(d8), []);
  clearPendingDraft(userId);
  console.log('PASS 8: Tombol bypass "Catat sebagai Makanan saja" -> langsung siap simpan');

  // 9. "Beli makan siang 35rb pakai" -> missingSlots ['description', 'walletId'] -> DRAFT_CARD
  assert.equal(isGenericDescription('Makan siang'), true);
  const d9 = detectIncompleteDraftIntent('Beli makan siang 35rb pakai', MOCK_CTX);
  assert.ok(d9 && d9.intent === 'CREATE_TRANSACTION');
  assert.equal(d9.data.amount, 35000);
  assert.deepEqual(evaluateDraftMissingSlots(d9), ['description', 'walletId']);
  const card9 = buildDraftCard(d9, MOCK_CTX);
  assert.equal(card9.type, 'DRAFT_CARD');
  assert.equal(card9.rows[0].value, 'Belum spesifik');
  assert.equal(card9.rows[1].value, 'Rp 35.000');
  assert.equal(card9.rows[2].value, 'Belum dipilih');
  console.log('PASS 9: "Beli makan siang 35rb pakai" -> DRAFT_CARD:', card9.rows.map((r) => `${r.label}=${r.value}`).join(', '));

  // 10. "Beli makan siang 35rb pakai Uang Tunai" -> tanya "Makan siang apa yang kamu beli?" + tombol bypass
  const d10 = detectIncompleteDraftIntent('Beli makan siang 35rb pakai Uang Tunai', MOCK_CTX);
  assert.ok(d10 && d10.intent === 'CREATE_TRANSACTION');
  assert.equal(d10.data.amount, 35000);
  assert.equal(d10.data.walletId, 'w-tunai');
  assert.deepEqual(evaluateDraftMissingSlots(d10), ['description']);
  const prompt10 = getGenericItemPrompt(d10.data.description);
  assert.equal(prompt10.question, 'Makan siang apa yang kamu beli?');
  assert.equal(prompt10.label, 'Makan siang');
  console.log('PASS 10: "Beli makan siang 35rb pakai Uang Tunai" ->', prompt10.question, `(opsi: Catat sebagai ${prompt10.label} saja)`);
}

runTests();
