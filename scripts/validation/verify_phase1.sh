#!/bin/bash

echo "=========================================="
echo "Phase 1 Verification Script"
echo "=========================================="
echo ""

echo "1. Checking Prisma schema validation..."
npx prisma format --check && echo "✅ Schema is valid" || echo "❌ Schema has errors"
echo ""

echo "2. Checking database tables..."
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%operation%' AND table_schema = 'public';" | xargs echo "   Operation tables found:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%process_segment%' AND table_schema = 'public';" | xargs echo "   Process segment tables found (should be 0):"
echo ""

echo "3. Checking data integrity..."
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM operations;" | xargs echo "   Operations:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM operation_parameters;" | xargs echo "   Parameters:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM operation_dependencies;" | xargs echo "   Dependencies:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM personnel_operation_specifications;" | xargs echo "   Personnel specs:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM equipment_operation_specifications;" | xargs echo "   Equipment specs:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM material_operation_specifications;" | xargs echo "   Material specs:"
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT COUNT(*) FROM physical_asset_operation_specifications;" | xargs echo "   Physical asset specs:"
echo ""

echo "4. Checking Prisma Client types..."
grep -q "export type Operation " node_modules/.prisma/client/index.d.ts && echo "✅ Operation type exists" || echo "❌ Operation type missing"
grep -q "export type ProcessSegment " node_modules/.prisma/client/index.d.ts && echo "❌ ProcessSegment type still exists" || echo "✅ ProcessSegment type removed"
grep -q "export const OperationType" node_modules/.prisma/client/index.d.ts && echo "✅ OperationType enum exists" || echo "❌ OperationType enum missing"
echo ""

echo "5. Testing database query..."
PGPASSWORD=mes_password psql -U mes_user -h localhost -d mes_dev_db -t -c "SELECT operationCode, operationName FROM operations LIMIT 1;" | head -1 | xargs echo "   Sample operation:"
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
