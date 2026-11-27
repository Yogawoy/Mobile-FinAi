import { TransactionType } from '@prisma/client';
import { prisma } from '../src/config/prisma';

async function main() {
  const candidates = await prisma.transaction.findMany({
    where: {
      type: { in: [TransactionType.EXPENSE, TransactionType.INCOME] },
      OR: [
        { note: { startsWith: 'Setoran target', mode: 'insensitive' } },
        { note: { startsWith: 'Setor target', mode: 'insensitive' } },
        { note: { startsWith: 'Setor Tabungan', mode: 'insensitive' } },
        { note: { startsWith: 'Setoran Tabungan', mode: 'insensitive' } },
        { note: { startsWith: 'Tabungan:', mode: 'insensitive' } },
        { note: { startsWith: 'Pindah dana target', mode: 'insensitive' } },
        {
          AND: [
            { categoryId: null },
            {
              OR: [
                { note: { contains: 'setoran target', mode: 'insensitive' } },
                { note: { contains: 'setor tabungan', mode: 'insensitive' } },
              ],
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      type: true,
      amount: true,
      note: true,
      transactionDate: true,
    },
  });

  console.log(`Found ${candidates.length} dirty savings transaction(s) in DB.`);
  for (const row of candidates) {
    console.log(
      ` - [${row.type}] Rp ${Number(row.amount).toLocaleString('id-ID')} | "${row.note ?? ''}" (${row.id})`
    );
  }

  let updatedCount = 0;
  if (candidates.length > 0) {
    const res = await prisma.transaction.updateMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      data: {
        type: TransactionType.TRANSFER,
        categoryId: null,
      },
    });
    updatedCount = res.count;
  }

  const deletedInsights = await prisma.aiInsight.deleteMany({});
  const deletedAnomalies = await prisma.spendingAnomaly.deleteMany({});

  console.log(`Updated ${updatedCount} transaction(s) to TRANSFER.`);
  console.log(`Cleared ${deletedInsights.count} cached ai_insights row(s).`);
  console.log(`Cleared ${deletedAnomalies.count} cached spending_anomalies row(s).`);
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
