import assert from 'node:assert/strict';
import { CategoryType } from '@prisma/client';
import {
  buildDraftCard,
  clearPendingDraft,
  detectIncompleteDraftIntent,
  evaluateDraftMissingSlots,
  getPendingDraft,
  isCancelDraftCommand,
  mergePendingDraft,
  setPendingDraft,
  type DraftContextData,
} from '../src/services/pendingDraft.service';

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

  // 1. "beli makan" -> DRAFT_CARD (Item: Makan, Nominal: Belum diisi, Dompet: Belum dipilih)
  const d1 = detectIncompleteDraftIntent('beli makan', MOCK_CTX);
  assert.ok(d1, 'beli makan harus terdeteksi sebagai incomplete draft');
  assert.equal(d1.intent, 'CREATE_TRANSACTION');
  const m1 = evaluateDraftMissingSlots(d1);
  assert.deepEqual(m1, ['amount', 'walletId']);
  setPendingDraft(userId, d1);
  const card1 = buildDraftCard(d1, MOCK_CTX);
  assert.equal(card1.type, 'DRAFT_CARD');
  assert.equal(card1.rows[0].value, 'Makan');
  assert.equal(card1.rows[1].isMissing, true);
  assert.equal(card1.rows[2].isMissing, true);
  console.log('PASS 1: "beli makan" -> DRAFT_CARD:', card1.rows.map((r) => `${r.label}=${r.value}`).join(', '));

  // 2. Balasan "25rb" -> draft ter-update (amount: 25000), sisa 1 slot missing (walletId)
  const active = getPendingDraft(userId)!;
  const d2 = mergePendingDraft(active, '25rb', MOCK_CTX);
  assert.equal(d2.intent, 'CREATE_TRANSACTION');
  assert.equal(d2.data.amount, 25000);
  assert.equal(d2.data.description, 'Makan');
  const m2 = evaluateDraftMissingSlots(d2);
  assert.deepEqual(m2, ['walletId']);
  console.log('PASS 2: balasan "25rb" -> amount=25000, missingSlots=[walletId]');

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
}

runTests();
