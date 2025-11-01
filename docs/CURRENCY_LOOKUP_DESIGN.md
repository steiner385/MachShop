# Currency Lookup Table Design - Issue #208

## **Database Schema Design**

### **1. Currency Model (ISO 4217 Compliant)**

```prisma
/// ISO 4217 compliant currency lookup table for standardizing multi-currency operations
model Currency {
  id                    String       @id @default(cuid())

  // ISO 4217 Standard Fields
  currencyCode          String       @unique          // e.g., "USD", "EUR", "GBP"
  currencyName          String                        // e.g., "US Dollar", "Euro", "British Pound"
  currencySymbol        String?                       // e.g., "$", "€", "£"
  numericCode           String?      @unique          // ISO 4217 numeric code e.g., "840"
  minorUnit             Int          @default(2)      // Decimal places e.g., 2 for USD, 0 for JPY

  // Regional and Display Information
  region                String?                       // e.g., "North America", "Europe"
  country               String?                       // Primary country e.g., "United States"
  displayFormat         String?                       // e.g., "$1,234.56", "€1.234,56"

  // Operational Attributes
  isActive              Boolean      @default(true)   // Currency is actively used
  isBaseCurrency        Boolean      @default(false)  // System base currency (typically USD)
  allowFractional       Boolean      @default(true)   // Allow fractional amounts

  // Audit Fields
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Reverse Relations - Models using this currency
  materialDefinitions   MaterialDefinition[]          @relation("MaterialDefinitionCurrency")
  materialLots          MaterialLot[]                 @relation("MaterialLotCurrency")
  parts                 Part[]                        @relation("PartCurrency")
  erpTransactions       ERPMaterialTransaction[]      @relation("ERPTransactionCurrency")
  toolDrawings          ToolDrawing[]                 @relation("ToolDrawingCostCurrency")
  changeOrders          EngineeringChangeOrder[]      @relation("ECOCostCurrency")

  // Exchange Rate Relations
  exchangeRatesFrom     ExchangeRate[]                @relation("FromCurrency")
  exchangeRatesTo       ExchangeRate[]                @relation("ToCurrency")

  @@map("currencies")
}
```

### **2. ExchangeRate Model (Currency Conversion)**

```prisma
/// Exchange rates for currency conversion with historical tracking
model ExchangeRate {
  id                    String       @id @default(cuid())

  // Currency Pair
  fromCurrencyId        String
  toCurrencyId          String
  fromCurrency          Currency     @relation("FromCurrency", fields: [fromCurrencyId], references: [id])
  toCurrency            Currency     @relation("ToCurrency", fields: [toCurrencyId], references: [id])

  // Rate Information
  exchangeRate          Decimal      @db.Decimal(18, 8)    // High precision for accurate conversion
  effectiveDate         DateTime                           // When this rate becomes effective
  expirationDate        DateTime?                          // When this rate expires (null = current)

  // Source and Metadata
  rateSource            ExchangeRateSource               // Where rate comes from
  sourceReference       String?                          // External reference/transaction ID
  isManualOverride      Boolean      @default(false)     // Manually set vs. automatic

  // Operational
  isActive              Boolean      @default(true)
  priority              Int          @default(0)         // Higher priority rates take precedence

  // Audit Fields
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  createdBy             String?      // User who created this rate

  @@unique([fromCurrencyId, toCurrencyId, effectiveDate])
  @@index([fromCurrencyId, toCurrencyId, effectiveDate])
  @@index([effectiveDate, isActive])
  @@map("exchange_rates")
}

/// Source of exchange rate data
enum ExchangeRateSource {
  MANUAL_ENTRY        // Manually entered by user
  BANK_FEED          // From bank API
  FINANCIAL_SERVICE  // From financial service (e.g., XE, OANDA)
  ERP_SYSTEM         // From integrated ERP system
  CENTRAL_BANK       // From central bank feeds
  MARKETPLACE        // From marketplace/trading platform
}
```

## **3. Migration Strategy for Existing Models**

### **MaterialDefinition Model Updates**
```prisma
model MaterialDefinition {
  // ... existing fields ...

  // Legacy field (to be deprecated)
  currency               String?              @default("USD")

  // New Currency Reference
  currencyId             String?              // FK to Currency
  currencyRef            Currency?            @relation("MaterialDefinitionCurrency", fields: [currencyId], references: [id])

  // ... rest of model ...
}
```

### **MaterialLot Model Updates**
```prisma
model MaterialLot {
  // ... existing fields ...

  // Legacy field (to be deprecated)
  currency            String?                @default("USD")

  // New Currency Reference
  currencyId          String?                // FK to Currency
  currencyRef         Currency?              @relation("MaterialLotCurrency", fields: [currencyId], references: [id])

  // ... rest of model ...
}
```

### **Part Model Updates**
```prisma
model Part {
  // ... existing fields ...

  // Legacy field (to be deprecated)
  currency                   String?                     @default("USD")

  // New Currency Reference
  currencyId                 String?                     // FK to Currency
  currencyRef                Currency?                   @relation("PartCurrency", fields: [currencyId], references: [id])

  // ... rest of model ...
}
```

### **ERPMaterialTransaction Model Updates**
```prisma
model ERPMaterialTransaction {
  // ... existing fields ...

  // Legacy field (to be deprecated)
  currency            String?              @default("USD")

  // New Currency Reference
  currencyId          String?              // FK to Currency
  currencyRef         Currency?            @relation("ERPTransactionCurrency", fields: [currencyId], references: [id])

  // ... rest of model ...
}
```

### **ToolDrawing Model Updates**
```prisma
model ToolDrawing {
  // ... existing fields ...

  // Legacy field (to be deprecated)
  costCurrency         String?

  // New Currency Reference
  costCurrencyId       String?              // FK to Currency
  costCurrencyRef      Currency?            @relation("ToolDrawingCostCurrency", fields: [costCurrencyId], references: [id])

  // ... rest of model ...
}
```

### **EngineeringChangeOrder Model Updates**
```prisma
model EngineeringChangeOrder {
  // ... existing fields ...

  // Legacy field (to be deprecated)
  costCurrency           String                @default("USD")

  // New Currency Reference
  costCurrencyId         String?               // FK to Currency
  costCurrencyRef        Currency?             @relation("ECOCostCurrency", fields: [costCurrencyId], references: [id])

  // ... rest of model ...
}
```

## **4. Key Features & Benefits**

### **ISO 4217 Compliance**
- **Standard Currency Codes**: Three-letter codes (USD, EUR, GBP, etc.)
- **Numeric Codes**: Official ISO numeric identifiers
- **Minor Unit Precision**: Proper decimal handling (2 for USD, 0 for JPY, 3 for KWD)
- **Official Currency Names**: Standardized naming

### **Exchange Rate Management**
- **Historical Tracking**: Complete rate history with effective dates
- **Multiple Sources**: Support for various rate feed sources
- **Manual Overrides**: Ability to set custom rates when needed
- **High Precision**: 18-digit precision with 8 decimal places

### **Multi-Currency Operations**
- **Conversion Utilities**: Built-in currency conversion capabilities
- **Base Currency**: Configurable system base currency
- **Regional Support**: Regional formatting and display preferences
- **Fractional Control**: Per-currency fractional amount controls

### **Migration Safety**
- **Dual Field Approach**: Legacy String fields maintained during transition
- **Backward Compatibility**: Existing APIs continue to work
- **Gradual Migration**: Models can be migrated one at a time
- **Data Integrity**: Foreign key constraints ensure valid currency references

## **5. Usage Examples**

### **Currency Creation**
```typescript
// Create USD currency entry
const usd = await prisma.currency.create({
  data: {
    currencyCode: 'USD',
    currencyName: 'US Dollar',
    currencySymbol: '$',
    numericCode: '840',
    minorUnit: 2,
    region: 'North America',
    country: 'United States',
    displayFormat: '$1,234.56',
    isBaseCurrency: true,
    isActive: true,
  }
});
```

### **Exchange Rate Setup**
```typescript
// Set USD to EUR exchange rate
const exchangeRate = await prisma.exchangeRate.create({
  data: {
    fromCurrencyId: usdCurrency.id,
    toCurrencyId: euroCurrency.id,
    exchangeRate: new Decimal('0.85'),
    effectiveDate: new Date(),
    rateSource: 'FINANCIAL_SERVICE',
    sourceReference: 'XE-API-2025-001',
  }
});
```

### **Multi-Currency Material Definition**
```typescript
// Create material with EUR pricing
const material = await prisma.materialDefinition.create({
  data: {
    materialNumber: 'STL-001',
    description: 'Carbon Steel Plate',
    standardCost: 45.50,
    currencyId: euroCurrency.id, // New approach
    // currency: 'EUR', // Legacy field still works
    // ... other fields
  },
  include: {
    currencyRef: true, // Include currency details
  }
});
```

### **Currency Conversion**
```typescript
// Convert amount from USD to EUR
const convertedAmount = await currencyService.convertCurrency({
  amount: new Decimal('100.00'),
  fromCurrencyCode: 'USD',
  toCurrencyCode: 'EUR',
  effectiveDate: new Date(),
});
```

## **6. Implementation Benefits**

### **Immediate Value**
- **Data Consistency**: Standardized currency references across all models
- **Validation**: Automatic validation of currency codes
- **International Support**: Full support for global operations
- **Audit Trail**: Complete tracking of currency changes

### **Future Capabilities**
- **Multi-Currency Reporting**: Reports in any supported currency
- **Exchange Rate Analytics**: Historical rate analysis and forecasting
- **Regional Compliance**: Support for regional currency regulations
- **ERP Integration**: Enhanced integration with multi-currency ERP systems

### **AS9100 Compliance**
- **Traceability**: Complete currency audit trail for aerospace compliance
- **Standardization**: ISO 4217 compliance meets international standards
- **Documentation**: Proper currency documentation for quality systems
- **Change Control**: Controlled currency reference changes

---

**Status**: Ready for implementation with comprehensive ISO 4217 compliance and exchange rate management.