-- CreateEnum
CREATE TYPE "GoalMutationType" AS ENUM ('CONTRIBUTE', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "GoalFundFlowType" AS ENUM ('WALLET', 'EXTERNAL');

-- CreateTable
CREATE TABLE "goal_mutations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "type" "GoalMutationType" NOT NULL,
    "flow_type" "GoalFundFlowType" NOT NULL,
    "wallet_id" TEXT,
    "wallet_name" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_mutations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_mutations_user_id_goal_id_idx" ON "goal_mutations"("user_id", "goal_id");

-- AddForeignKey
ALTER TABLE "goal_mutations" ADD CONSTRAINT "goal_mutations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_mutations" ADD CONSTRAINT "goal_mutations_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_mutations" ADD CONSTRAINT "goal_mutations_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
