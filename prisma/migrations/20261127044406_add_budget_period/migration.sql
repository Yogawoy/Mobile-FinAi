-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY';
