-- CreateEnum ParameterColor
DO $$ BEGIN
  CREATE TYPE "ParameterColor" AS ENUM ('PRIMARY', 'SECONDARY', 'SUCCESS', 'DANGER', 'WARNING', 'INFO', 'LIGHT', 'DARK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum MakeOrBuyDecision
DO $$ BEGIN
  CREATE TYPE "MakeOrBuyDecision" AS ENUM ('MAKE', 'BUY', 'MAKE_OR_BUY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum SchedulePeriodType
DO $$ BEGIN
  CREATE TYPE "SchedulePeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable ParameterGroup - Update color field to use enum
ALTER TABLE "parameter_groups"
  ALTER COLUMN "color" TYPE "ParameterColor" USING CASE
    WHEN color = 'primary' THEN 'PRIMARY'::"ParameterColor"
    WHEN color = 'secondary' THEN 'SECONDARY'::"ParameterColor"
    WHEN color = 'success' THEN 'SUCCESS'::"ParameterColor"
    WHEN color = 'danger' THEN 'DANGER'::"ParameterColor"
    WHEN color = 'warning' THEN 'WARNING'::"ParameterColor"
    WHEN color = 'info' THEN 'INFO'::"ParameterColor"
    WHEN color = 'light' THEN 'LIGHT'::"ParameterColor"
    WHEN color = 'dark' THEN 'DARK'::"ParameterColor"
    ELSE 'PRIMARY'::"ParameterColor"
  END,
  ALTER COLUMN "color" SET DEFAULT 'PRIMARY'::"ParameterColor";

-- AlterTable Part - Update makeOrBuy field to use enum
ALTER TABLE "parts"
  ALTER COLUMN "makeOrBuy" TYPE "MakeOrBuyDecision" USING CASE
    WHEN "makeOrBuy" = 'MAKE' THEN 'MAKE'::"MakeOrBuyDecision"
    WHEN "makeOrBuy" = 'BUY' THEN 'BUY'::"MakeOrBuyDecision"
    WHEN "makeOrBuy" = 'MAKE_OR_BUY' THEN 'MAKE_OR_BUY'::"MakeOrBuyDecision"
    ELSE 'MAKE'::"MakeOrBuyDecision"
  END,
  ALTER COLUMN "makeOrBuy" SET DEFAULT 'MAKE'::"MakeOrBuyDecision";

-- AlterTable ProductionSchedule - Update periodType field to use enum
ALTER TABLE "production_schedules"
  ALTER COLUMN "periodType" TYPE "SchedulePeriodType" USING CASE
    WHEN "periodType" = 'DAILY' THEN 'DAILY'::"SchedulePeriodType"
    WHEN "periodType" = 'WEEKLY' THEN 'WEEKLY'::"SchedulePeriodType"
    WHEN "periodType" = 'MONTHLY' THEN 'MONTHLY'::"SchedulePeriodType"
    WHEN "periodType" = 'QUARTERLY' THEN 'QUARTERLY'::"SchedulePeriodType"
    WHEN "periodType" = 'YEARLY' THEN 'YEARLY'::"SchedulePeriodType"
    ELSE 'MONTHLY'::"SchedulePeriodType"
  END,
  ALTER COLUMN "periodType" SET DEFAULT 'MONTHLY'::"SchedulePeriodType";

-- Add unique constraint to extensionId
ALTER TABLE "extension_compatibility_matrix" ADD CONSTRAINT "extension_compatibility_matrix_extensionId_key" UNIQUE ("extensionId");
