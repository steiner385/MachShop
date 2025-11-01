# Currency Lookup Table - Migration Strategy

**Issue #208: Data Quality - Create Currency Lookup Table & Migrate String Fields**

## 🎯 **Migration Overview**

This document outlines the comprehensive strategy for migrating from **7 String currency fields** to a standardized **ISO 4217 compliant Currency lookup table** across the MachShop manufacturing system.

### **Affected Models & Fields**

| Model | Legacy String Field | New FK Field | Status |
|-------|---------------------|--------------|--------|
| MaterialDefinition | `currency` | `currencyId` | ✅ Ready |
| MaterialLot | `currency` | `currencyId` | ✅ Ready |
| Part | `currency` | `currencyId` | ✅ Ready |
| ERPMaterialTransaction | `currency` | `currencyId` | ✅ Ready |
| ToolDrawing | `costCurrency` | `costCurrencyId` | ✅ Ready |
| EngineeringChangeOrder | `costCurrency` | `costCurrencyId` | ✅ Ready |
| VendorKit | `currency` | `currencyId` | ✅ Ready |

---

## 🚀 **Migration Phases**

### **Phase 1: Foundation Setup** ⏳ *Duration: 1-2 hours*

#### **1.1 Database Schema Deployment**
```bash
# Generate and apply Prisma migrations
npx prisma migrate dev --name "add-currency-lookup-tables"

# Verify migration success
npx prisma validate
npx prisma db pull  # Confirm schema sync
```

#### **1.2 Currency Seed Data**
```bash
# Deploy ISO 4217 compliant currency data
npx ts-node prisma/seeds/seed-currencies.ts

# Verify currency data
npx prisma studio  # Check currencies table
```

**Expected Results:**
- ✅ Currency table with 23+ ISO 4217 currencies
- ✅ ExchangeRate table with major currency pairs
- ✅ All FK fields added to affected models
- ✅ Schema validation passes

---

### **Phase 2: Data Analysis & Mapping** ⏳ *Duration: 2-3 hours*

#### **2.1 Legacy Currency Data Analysis**

```sql
-- Analyze existing currency usage across all models
SELECT 'MaterialDefinition' as model, currency, COUNT(*) as count
FROM material_definitions
WHERE currency IS NOT NULL
GROUP BY currency

UNION ALL

SELECT 'MaterialLot' as model, currency, COUNT(*) as count
FROM material_lots
WHERE currency IS NOT NULL
GROUP BY currency

UNION ALL

SELECT 'Part' as model, currency, COUNT(*) as count
FROM parts
WHERE currency IS NOT NULL
GROUP BY currency

UNION ALL

SELECT 'ERPMaterialTransaction' as model, currency, COUNT(*) as count
FROM erp_material_transactions
WHERE currency IS NOT NULL
GROUP BY currency

UNION ALL

SELECT 'ToolDrawing' as model, cost_currency as currency, COUNT(*) as count
FROM tool_drawings
WHERE cost_currency IS NOT NULL
GROUP BY cost_currency

UNION ALL

SELECT 'EngineeringChangeOrder' as model, cost_currency as currency, COUNT(*) as count
FROM engineering_change_orders
WHERE cost_currency IS NOT NULL
GROUP BY cost_currency

UNION ALL

SELECT 'VendorKit' as model, currency, COUNT(*) as count
FROM vendor_kits
WHERE currency IS NOT NULL
GROUP BY currency

ORDER BY model, currency;
```

#### **2.2 Currency Mapping Rules**

Create mapping rules for non-standard currency values:

```typescript
// Currency mapping for data cleanup
const currencyMappingRules = {
  // Standard mappings
  'USD': 'USD',
  'US Dollar': 'USD',
  'dollars': 'USD',
  'usd': 'USD',
  '$': 'USD',

  'EUR': 'EUR',
  'Euro': 'EUR',
  'euros': 'EUR',
  '€': 'EUR',

  'GBP': 'GBP',
  'British Pound': 'GBP',
  'Pound Sterling': 'GBP',
  '£': 'GBP',

  // Add mappings for any non-standard values found
  // Example: 'US$' -> 'USD', 'Yen' -> 'JPY', etc.
};
```

#### **2.3 Data Quality Assessment**

```sql
-- Find unmappable currency values
SELECT DISTINCT currency as unmappable_currency, COUNT(*) as frequency
FROM (
  SELECT currency FROM material_definitions WHERE currency IS NOT NULL
  UNION ALL
  SELECT currency FROM material_lots WHERE currency IS NOT NULL
  UNION ALL
  SELECT currency FROM parts WHERE currency IS NOT NULL
  UNION ALL
  SELECT currency FROM erp_material_transactions WHERE currency IS NOT NULL
  UNION ALL
  SELECT cost_currency as currency FROM tool_drawings WHERE cost_currency IS NOT NULL
  UNION ALL
  SELECT cost_currency as currency FROM engineering_change_orders WHERE cost_currency IS NOT NULL
  UNION ALL
  SELECT currency FROM vendor_kits WHERE currency IS NOT NULL
) all_currencies
WHERE currency NOT IN ('USD', 'EUR', 'GBP', 'CAD', 'JPY', 'CNY', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK')
GROUP BY currency
ORDER BY frequency DESC;
```

---

### **Phase 3: Data Migration Execution** ⏳ *Duration: 4-6 hours*

#### **3.1 Currency Reference Population**

Execute in **TRANSACTION BLOCKS** for safety:

```sql
-- MaterialDefinition currency migration
BEGIN;

UPDATE material_definitions
SET currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE material_definitions.currency
      WHEN 'US Dollar' THEN 'USD'
      WHEN 'dollars' THEN 'USD'
      WHEN '$' THEN 'USD'
      WHEN 'Euro' THEN 'EUR'
      WHEN '€' THEN 'EUR'
      -- Add more mappings as discovered
      ELSE UPPER(material_definitions.currency)
    END,
    'USD'  -- Default fallback
  )
)
WHERE currency_id IS NULL
  AND currency IS NOT NULL;

-- Verify results before commit
SELECT COUNT(*) as migrated_records
FROM material_definitions
WHERE currency_id IS NOT NULL;

-- COMMIT; -- Only after verification
-- ROLLBACK; -- If issues found
```

#### **3.2 Systematic Model Migration**

**MaterialLot Migration:**
```sql
BEGIN;

UPDATE material_lots
SET currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE material_lots.currency
      WHEN 'US Dollar' THEN 'USD'
      WHEN 'dollars' THEN 'USD'
      -- Apply same mapping rules
      ELSE UPPER(material_lots.currency)
    END,
    'USD'
  )
)
WHERE currency_id IS NULL
  AND currency IS NOT NULL;

-- Verification query
SELECT currency, currency_id, COUNT(*)
FROM material_lots
GROUP BY currency, currency_id
ORDER BY COUNT(*) DESC;

COMMIT;
```

**Part Migration:**
```sql
BEGIN;

UPDATE parts
SET currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE parts.currency
      WHEN 'US Dollar' THEN 'USD'
      -- Apply mapping rules
      ELSE UPPER(parts.currency)
    END,
    'USD'
  )
)
WHERE currency_id IS NULL
  AND currency IS NOT NULL;

COMMIT;
```

**ERPMaterialTransaction Migration:**
```sql
BEGIN;

UPDATE erp_material_transactions
SET currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE erp_material_transactions.currency
      WHEN 'US Dollar' THEN 'USD'
      -- Apply mapping rules
      ELSE UPPER(erp_material_transactions.currency)
    END,
    'USD'
  )
)
WHERE currency_id IS NULL
  AND currency IS NOT NULL;

COMMIT;
```

**ToolDrawing Migration:**
```sql
BEGIN;

UPDATE tool_drawings
SET cost_currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE tool_drawings.cost_currency
      WHEN 'US Dollar' THEN 'USD'
      -- Apply mapping rules
      ELSE UPPER(tool_drawings.cost_currency)
    END,
    'USD'
  )
)
WHERE cost_currency_id IS NULL
  AND cost_currency IS NOT NULL;

COMMIT;
```

**EngineeringChangeOrder Migration:**
```sql
BEGIN;

UPDATE engineering_change_orders
SET cost_currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE engineering_change_orders.cost_currency
      WHEN 'US Dollar' THEN 'USD'
      -- Apply mapping rules
      ELSE UPPER(engineering_change_orders.cost_currency)
    END,
    'USD'
  )
)
WHERE cost_currency_id IS NULL
  AND cost_currency IS NOT NULL;

COMMIT;
```

**VendorKit Migration:**
```sql
BEGIN;

UPDATE vendor_kits
SET currency_id = (
  SELECT id FROM currencies
  WHERE currency_code = COALESCE(
    CASE vendor_kits.currency
      WHEN 'US Dollar' THEN 'USD'
      -- Apply mapping rules
      ELSE UPPER(vendor_kits.currency)
    END,
    'USD'
  )
)
WHERE currency_id IS NULL
  AND currency IS NOT NULL;

COMMIT;
```

#### **3.3 Migration Verification**

```sql
-- Comprehensive migration verification
SELECT
  'MaterialDefinition' as model,
  COUNT(*) as total_records,
  COUNT(currency_id) as migrated_records,
  COUNT(currency) as legacy_records,
  ROUND(COUNT(currency_id) * 100.0 / COUNT(*), 2) as migration_percentage
FROM material_definitions

UNION ALL

SELECT
  'MaterialLot' as model,
  COUNT(*) as total_records,
  COUNT(currency_id) as migrated_records,
  COUNT(currency) as legacy_records,
  ROUND(COUNT(currency_id) * 100.0 / COUNT(*), 2) as migration_percentage
FROM material_lots

-- ... repeat for all models ...

ORDER BY model;
```

---

### **Phase 4: Application Updates** ⏳ *Duration: 6-8 hours*

#### **4.1 API Endpoint Updates**

**Dual Field Support:**
```typescript
// Material Definition API example
interface MaterialDefinitionUpdate {
  // Legacy support (deprecated but functional)
  currency?: string;

  // New currency reference
  currencyId?: string;

  // ... other fields
}

// API handler with backward compatibility
async function updateMaterialDefinition(id: string, data: MaterialDefinitionUpdate) {
  const updateData: any = { ...data };

  // Handle legacy currency field
  if (data.currency && !data.currencyId) {
    const currency = await prisma.currency.findUnique({
      where: { currencyCode: data.currency.toUpperCase() }
    });
    if (currency) {
      updateData.currencyId = currency.id;
    }
  }

  return prisma.materialDefinition.update({
    where: { id },
    data: updateData,
    include: {
      currencyRef: true, // Include currency details in response
    }
  });
}
```

#### **4.2 Frontend Component Updates**

**Currency Picker Component:**
```typescript
interface CurrencyPickerProps {
  value?: string;  // Currency ID
  onChange: (currencyId: string) => void;
  allowedCurrencies?: string[];  // Filter by currency codes
  showSymbol?: boolean;
  placeholder?: string;
}

const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  value,
  onChange,
  allowedCurrencies,
  showSymbol = true,
  placeholder = "Select currency..."
}) => {
  const { data: currencies } = useCurrencies({
    where: allowedCurrencies ? { currencyCode: { in: allowedCurrencies } } : undefined
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currencies?.map((currency) => (
          <SelectItem key={currency.id} value={currency.id}>
            {showSymbol && currency.currencySymbol} {currency.currencyCode} - {currency.currencyName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

#### **4.3 Business Logic Updates**

**Currency Service Implementation:**
```typescript
class CurrencyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async convertCurrency(params: {
    amount: Decimal;
    fromCurrencyCode: string;
    toCurrencyCode: string;
    effectiveDate?: Date;
  }): Promise<Decimal> {
    const { amount, fromCurrencyCode, toCurrencyCode, effectiveDate = new Date() } = params;

    if (fromCurrencyCode === toCurrencyCode) {
      return amount;
    }

    const exchangeRate = await this.getExchangeRate(fromCurrencyCode, toCurrencyCode, effectiveDate);
    return amount.mul(exchangeRate);
  }

  private async getExchangeRate(
    fromCode: string,
    toCode: string,
    effectiveDate: Date
  ): Promise<Decimal> {
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: { currencyCode: fromCode },
        toCurrency: { currencyCode: toCode },
        effectiveDate: { lte: effectiveDate },
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: effectiveDate } }
        ],
        isActive: true
      },
      orderBy: {
        effectiveDate: 'desc'
      }
    });

    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCode}/${toCode}`);
    }

    return rate.exchangeRate;
  }
}
```

---

### **Phase 5: Testing & Validation** ⏳ *Duration: 3-4 hours*

#### **5.1 Data Integrity Tests**

```sql
-- Test 1: Verify all currency references are valid
SELECT model, invalid_references FROM (
  SELECT 'MaterialDefinition' as model, COUNT(*) as invalid_references
  FROM material_definitions md
  LEFT JOIN currencies c ON md.currency_id = c.id
  WHERE md.currency_id IS NOT NULL AND c.id IS NULL

  UNION ALL

  SELECT 'MaterialLot' as model, COUNT(*) as invalid_references
  FROM material_lots ml
  LEFT JOIN currencies c ON ml.currency_id = c.id
  WHERE ml.currency_id IS NOT NULL AND c.id IS NULL

  -- ... repeat for all models
) results
WHERE invalid_references > 0;

-- Test 2: Verify currency codes are ISO 4217 compliant
SELECT currency_code, is_valid_iso4217
FROM currencies c
LEFT JOIN (
  SELECT 'USD' as code UNION SELECT 'EUR' UNION SELECT 'GBP'
  -- ... all valid ISO 4217 codes
) valid_codes ON c.currency_code = valid_codes.code
WHERE valid_codes.code IS NULL;
```

#### **5.2 API Testing**

```typescript
// Integration tests for currency API endpoints
describe('Currency API Integration', () => {
  test('should create material with currency reference', async () => {
    const usdCurrency = await prisma.currency.findUnique({
      where: { currencyCode: 'USD' }
    });

    const material = await request(app)
      .post('/api/materials')
      .send({
        materialNumber: 'TEST-001',
        description: 'Test Material',
        standardCost: 100.00,
        currencyId: usdCurrency.id
      })
      .expect(201);

    expect(material.body.currencyRef.currencyCode).toBe('USD');
  });

  test('should handle legacy currency field', async () => {
    const material = await request(app)
      .post('/api/materials')
      .send({
        materialNumber: 'TEST-002',
        description: 'Test Material Legacy',
        standardCost: 100.00,
        currency: 'USD'  // Legacy field
      })
      .expect(201);

    expect(material.body.currencyRef.currencyCode).toBe('USD');
  });
});
```

#### **5.3 Performance Testing**

```sql
-- Test query performance with currency joins
EXPLAIN ANALYZE
SELECT
  md.material_number,
  md.description,
  md.standard_cost,
  c.currency_code,
  c.currency_symbol
FROM material_definitions md
LEFT JOIN currencies c ON md.currency_id = c.id
WHERE md.is_active = true
ORDER BY md.material_number
LIMIT 1000;
```

---

### **Phase 6: Production Deployment** ⏳ *Duration: 2-3 hours*

#### **6.1 Pre-Deployment Checklist**

- [ ] **Database Backup**: Full backup completed
- [ ] **Schema Migration**: Tested in staging environment
- [ ] **Seed Data**: Currency data populated and verified
- [ ] **API Tests**: All endpoints pass integration tests
- [ ] **Frontend Tests**: Currency picker components tested
- [ ] **Performance**: Query performance meets requirements
- [ ] **Rollback Plan**: Prepared and tested

#### **6.2 Deployment Steps**

```bash
# 1. Apply database migrations
npx prisma migrate deploy

# 2. Seed currency data
npx ts-node prisma/seeds/seed-currencies.ts

# 3. Execute data migration scripts
psql -d production_db -f migration-scripts/migrate-currencies.sql

# 4. Verify migration
npx ts-node scripts/verify-currency-migration.ts

# 5. Deploy application with dual-field support
kubectl apply -f k8s/deployment.yaml

# 6. Monitor application health
kubectl logs -f deployment/machshop-api
```

#### **6.3 Post-Deployment Verification**

```sql
-- Verify migration completeness
SELECT
  COUNT(*) as total_models,
  SUM(CASE WHEN migration_complete THEN 1 ELSE 0 END) as migrated_models
FROM (
  SELECT 'MaterialDefinition' as model,
         (COUNT(currency_id) = COUNT(*)) as migration_complete
  FROM material_definitions

  UNION ALL

  SELECT 'MaterialLot' as model,
         (COUNT(currency_id) = COUNT(*)) as migration_complete
  FROM material_lots

  -- ... repeat for all models
) migration_status;
```

---

### **Phase 7: Legacy Field Deprecation** ⏳ *Duration: 4-6 weeks*

#### **7.1 Deprecation Warnings** (Week 1-2)

```typescript
// Add deprecation warnings to API
interface MaterialDefinitionUpdate {
  /** @deprecated Use currencyId instead. Will be removed in v3.0 */
  currency?: string;

  currencyId?: string;
}

// API handler with warnings
if (data.currency && !data.currencyId) {
  logger.warn('Using deprecated currency field', {
    endpoint: 'POST /api/materials',
    userId: req.user.id,
    deprecatedField: 'currency'
  });
}
```

#### **7.2 Frontend Migration** (Week 3-4)

- Replace all String currency inputs with Currency picker components
- Update forms to use `currencyId` instead of `currency`
- Add migration notices in UI for users

#### **7.3 Database Cleanup** (Week 5-6)

```sql
-- After confirming all applications use new fields
BEGIN;

-- Remove legacy currency columns
ALTER TABLE material_definitions DROP COLUMN currency;
ALTER TABLE material_lots DROP COLUMN currency;
ALTER TABLE parts DROP COLUMN currency;
ALTER TABLE erp_material_transactions DROP COLUMN currency;
ALTER TABLE tool_drawings DROP COLUMN cost_currency;
ALTER TABLE engineering_change_orders DROP COLUMN cost_currency;
ALTER TABLE vendor_kits DROP COLUMN currency;

COMMIT;
```

---

## 🔒 **Risk Mitigation**

### **High Risk Factors**

1. **Data Loss During Migration**
   - **Mitigation**: Full database backup before migration
   - **Rollback**: Restore from backup if issues occur

2. **Invalid Currency Mappings**
   - **Mitigation**: Comprehensive data analysis and mapping rules
   - **Fallback**: Default to USD for unmappable values

3. **Application Downtime**
   - **Mitigation**: Dual-field approach allows gradual transition
   - **Zero-downtime**: Rolling deployment with feature flags

4. **Performance Degradation**
   - **Mitigation**: Proper indexing on currency foreign keys
   - **Monitoring**: Query performance tracking

### **Rollback Procedures**

```sql
-- Emergency rollback (if needed within 24 hours)
BEGIN;

-- Restore currency fields from currencyRef relationship
UPDATE material_definitions
SET currency = (SELECT currency_code FROM currencies WHERE id = currency_id)
WHERE currency_id IS NOT NULL;

-- Clear foreign key references
UPDATE material_definitions SET currency_id = NULL;

-- Repeat for all models...

COMMIT;
```

---

## 📊 **Success Metrics**

### **Migration KPIs**

- **Data Integrity**: 100% of currency references valid
- **Migration Coverage**: 100% of legacy currency fields migrated
- **Performance**: <5% increase in query response time
- **Zero Data Loss**: All historical currency data preserved
- **API Compatibility**: All existing integrations continue working

### **Business Value Metrics**

- **Multi-Currency Support**: Enable international operations
- **Data Consistency**: Eliminate currency naming variations
- **Exchange Rate Tracking**: Enable accurate cost conversions
- **Reporting Accuracy**: Consistent currency formatting across reports
- **Compliance**: ISO 4217 standard compliance

---

## 🚀 **Post-Migration Enhancements**

### **Immediate Opportunities**

1. **Multi-Currency Reporting**: Reports in any supported currency
2. **Exchange Rate Analytics**: Historical rate analysis and trends
3. **Cost Center Dashboards**: Multi-currency cost tracking
4. **Automated Rate Updates**: Integration with financial services APIs

### **Future Capabilities**

1. **Currency Hedging**: Risk management for exchange rate fluctuations
2. **Regional Pricing**: Automatic currency selection by geography
3. **Budget Controls**: Multi-currency budget management
4. **ERP Integration**: Enhanced multi-currency ERP synchronization

---

**Migration Status**: Ready for execution with comprehensive safety measures and rollback procedures.

**Priority Score**: High value, moderate effort - delivers immediate operational benefits with international expansion capabilities.