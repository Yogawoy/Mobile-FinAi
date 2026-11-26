import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPENSE_CATEGORIES,
  findTransactionCategory,
  getGoalCategoryLabel,
  getTransactionCategoryLabel,
  INCOME_CATEGORIES,
  normalizeTransactionCategory,
} from '../src/constants/categories';
import { getWalletTypeLabels, resolveWalletTheme } from '../src/constants/walletTheme';
import {
  computeTotalBalance,
  formatCompactIDR,
  formatDateID,
  formatIDR,
  parseDecimal,
} from '../src/lib/format';
import type { Wallet } from '../src/types/api';

test('formatIDR and parseDecimal handle Prisma decimal strings', () => {
  assert.equal(parseDecimal('45000.00'), 45000);
  assert.equal(parseDecimal(null), 0);
  assert.equal(formatIDR('1500000.00'), 'Rp 1.500.000');
  assert.equal(formatIDR(-25000), '-Rp 25.000');
  assert.equal(formatCompactIDR('2500000.00'), 'Rp 2.5 jt');
  assert.equal(formatDateID('2026-11-25T12:00:00.000Z'), '25 Nov 2026');
});

test('categories include bills and match backend aliases', () => {
  assert.ok(EXPENSE_CATEGORIES.some((c) => c.id === 'bills'));
  assert.ok(INCOME_CATEGORIES.some((c) => c.id === 'salary'));
  assert.equal(normalizeTransactionCategory('makan siang'), 'other');
  assert.equal(normalizeTransactionCategory('kopi'), 'food');
  assert.equal(findTransactionCategory('listrik')?.id, 'bills');
  assert.equal(getTransactionCategoryLabel('shopping'), 'Belanja');
  assert.equal(getGoalCategoryLabel('emergency'), 'Dana Darurat');
});

test('wallet theme and total balance calculation work accurately', () => {
  const wallets: Wallet[] = [
    {
      id: 'w1',
      userId: 'u1',
      name: 'BCA',
      type: 'BANK',
      institution: 'BCA',
      accountLast4: '1234',
      balance: '15000000.00',
      color: 'periwinkle',
      icon: 'Bank',
      createdAt: '2026-11-25T00:00:00.000Z',
      updatedAt: '2026-11-25T00:00:00.000Z',
    },
    {
      id: 'w2',
      userId: 'u1',
      name: 'GoPay',
      type: 'E_WALLET',
      institution: 'Gojek',
      accountLast4: '5678',
      balance: '500000.50',
      color: null,
      icon: 'Wallet',
      createdAt: '2026-11-25T00:00:00.000Z',
      updatedAt: '2026-11-25T00:00:00.000Z',
    },
  ];

  assert.equal(computeTotalBalance(wallets), 15500000.5);
  assert.equal(resolveWalletTheme('periwinkle', 'BANK').key, 'periwinkle');
  assert.equal(resolveWalletTheme(null, 'E_WALLET').key, 'teal');
  assert.equal(getWalletTypeLabels('CASH').typeLabel, 'Tunai');
});
