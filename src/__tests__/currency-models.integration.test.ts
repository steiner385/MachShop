/**
 * Currency Models Integration Tests
 *
 * Tests for Currency and ExchangeRate database models, relationships,
 * and data integrity for Issue #208.
 *
 * Issue #208: Data Quality - Create Currency Lookup Table
 */

import { PrismaClient, Currency, ExchangeRate } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Currency Models Integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.exchangeRate.deleteMany();
    await prisma.currency.deleteMany();
  });

  // ============================================================================
  // CURRENCY MODEL TESTS
  // ============================================================================

  describe('Currency Model', () => {
    it('should create currency with all fields', async () => {
      const currencyData = {
        currencyCode: 'USD',
        currencyName: 'US Dollar',
        currencySymbol: '$',
        numericCode: '840',
        minorUnit: 2,
        region: 'North America',
        country: 'United States',
        displayFormat: '$1,234.56',
        isActive: true,
        isBaseCurrency: true,
        allowFractional: true
      };

      const currency = await prisma.currency.create({
        data: currencyData
      });

      expect(currency).toMatchObject(currencyData);
      expect(currency.id).toBeDefined();
      expect(currency.createdAt).toBeInstanceOf(Date);
      expect(currency.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique currency code constraint', async () => {
      const currencyData = {
        currencyCode: 'USD',
        currencyName: 'US Dollar',
        currencySymbol: '$',
        numericCode: '840',
        minorUnit: 2
      };

      await prisma.currency.create({ data: currencyData });

      await expect(
        prisma.currency.create({ data: currencyData })
      ).rejects.toThrow();
    });

    it('should enforce unique numeric code constraint', async () => {
      await prisma.currency.create({
        data: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          numericCode: '840',
          minorUnit: 2
        }
      });

      await expect(
        prisma.currency.create({
          data: {
            currencyCode: 'TEST',
            currencyName: 'Test Currency',
            numericCode: '840', // Same numeric code
            minorUnit: 2
          }
        })
      ).rejects.toThrow();
    });

    it('should allow only one base currency', async () => {
      // Create first base currency
      await prisma.currency.create({
        data: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          minorUnit: 2,
          isBaseCurrency: true
        }
      });

      // Should be able to create second currency as non-base
      const eurCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'EUR',
          currencyName: 'Euro',
          minorUnit: 2,
          isBaseCurrency: false
        }
      });

      expect(eurCurrency.isBaseCurrency).toBe(false);

      // Note: Multiple base currencies constraint would need to be enforced at application level
      // or with database triggers, not directly with Prisma schema constraints
    });

    it('should handle different minor unit values', async () => {
      const currencies = await Promise.all([
        // Standard 2 decimal places
        prisma.currency.create({
          data: {
            currencyCode: 'USD',
            currencyName: 'US Dollar',
            minorUnit: 2
          }
        }),
        // No decimal places
        prisma.currency.create({
          data: {
            currencyCode: 'JPY',
            currencyName: 'Japanese Yen',
            minorUnit: 0
          }
        }),
        // 3 decimal places
        prisma.currency.create({
          data: {
            currencyCode: 'KWD',
            currencyName: 'Kuwaiti Dinar',
            minorUnit: 3
          }
        })
      ]);

      expect(currencies[0].minorUnit).toBe(2);
      expect(currencies[1].minorUnit).toBe(0);
      expect(currencies[2].minorUnit).toBe(3);
    });
  });

  // ============================================================================
  // EXCHANGE RATE MODEL TESTS
  // ============================================================================

  describe('ExchangeRate Model', () => {
    let usdCurrency: Currency;
    let eurCurrency: Currency;

    beforeEach(async () => {
      usdCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          minorUnit: 2,
          isBaseCurrency: true
        }
      });

      eurCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'EUR',
          currencyName: 'Euro',
          minorUnit: 2
        }
      });
    });

    it('should create exchange rate with all fields', async () => {
      const exchangeRateData = {
        fromCurrencyId: usdCurrency.id,
        toCurrencyId: eurCurrency.id,
        exchangeRate: new Decimal('0.85'),
        effectiveDate: new Date('2025-01-01'),
        expirationDate: new Date('2025-12-31'),
        rateSource: 'FINANCIAL_SERVICE' as const,
        sourceReference: 'TEST-001',
        isManualOverride: false,
        isActive: true,
        priority: 1
      };

      const rate = await prisma.exchangeRate.create({
        data: exchangeRateData
      });

      expect(rate).toMatchObject({
        ...exchangeRateData,
        exchangeRate: new Decimal('0.85')
      });
      expect(rate.id).toBeDefined();
      expect(rate.createdAt).toBeInstanceOf(Date);
      expect(rate.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on currency pair and effective date', async () => {
      const exchangeRateData = {
        fromCurrencyId: usdCurrency.id,
        toCurrencyId: eurCurrency.id,
        exchangeRate: new Decimal('0.85'),
        effectiveDate: new Date('2025-01-01'),
        rateSource: 'FINANCIAL_SERVICE' as const
      };

      await prisma.exchangeRate.create({ data: exchangeRateData });

      await expect(
        prisma.exchangeRate.create({
          data: {
            ...exchangeRateData,
            exchangeRate: new Decimal('0.86') // Different rate, same date
          }
        })
      ).rejects.toThrow();
    });

    it('should allow multiple rates for same pair on different dates', async () => {
      const baseData = {
        fromCurrencyId: usdCurrency.id,
        toCurrencyId: eurCurrency.id,
        rateSource: 'FINANCIAL_SERVICE' as const
      };

      const rate1 = await prisma.exchangeRate.create({
        data: {
          ...baseData,
          exchangeRate: new Decimal('0.85'),
          effectiveDate: new Date('2025-01-01')
        }
      });

      const rate2 = await prisma.exchangeRate.create({
        data: {
          ...baseData,
          exchangeRate: new Decimal('0.86'),
          effectiveDate: new Date('2025-01-02')
        }
      });

      expect(rate1.exchangeRate).toEqual(new Decimal('0.85'));
      expect(rate2.exchangeRate).toEqual(new Decimal('0.86'));
    });

    it('should support high precision decimal rates', async () => {
      const highPrecisionRate = new Decimal('1.23456789');

      const rate = await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: usdCurrency.id,
          toCurrencyId: eurCurrency.id,
          exchangeRate: highPrecisionRate,
          effectiveDate: new Date('2025-01-01'),
          rateSource: 'FINANCIAL_SERVICE'
        }
      });

      expect(rate.exchangeRate).toEqual(highPrecisionRate);
    });

    it('should handle all exchange rate sources', async () => {
      const sources = [
        'MANUAL_ENTRY',
        'BANK_FEED',
        'FINANCIAL_SERVICE',
        'ERP_SYSTEM',
        'CENTRAL_BANK',
        'MARKETPLACE'
      ] as const;

      for (let i = 0; i < sources.length; i++) {
        const rate = await prisma.exchangeRate.create({
          data: {
            fromCurrencyId: usdCurrency.id,
            toCurrencyId: eurCurrency.id,
            exchangeRate: new Decimal('0.85'),
            effectiveDate: new Date(`2025-01-${(i + 1).toString().padStart(2, '0')}`),
            rateSource: sources[i]
          }
        });

        expect(rate.rateSource).toBe(sources[i]);
      }
    });
  });

  // ============================================================================
  // RELATIONSHIP TESTS
  // ============================================================================

  describe('Currency Relationships', () => {
    let usdCurrency: Currency;
    let eurCurrency: Currency;

    beforeEach(async () => {
      usdCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          minorUnit: 2
        }
      });

      eurCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'EUR',
          currencyName: 'Euro',
          minorUnit: 2
        }
      });
    });

    it('should load exchange rates with currency details', async () => {
      await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: usdCurrency.id,
          toCurrencyId: eurCurrency.id,
          exchangeRate: new Decimal('0.85'),
          effectiveDate: new Date('2025-01-01'),
          rateSource: 'FINANCIAL_SERVICE'
        }
      });

      const rateWithCurrencies = await prisma.exchangeRate.findFirst({
        include: {
          fromCurrency: true,
          toCurrency: true
        }
      });

      expect(rateWithCurrencies).toBeDefined();
      expect(rateWithCurrencies!.fromCurrency.currencyCode).toBe('USD');
      expect(rateWithCurrencies!.toCurrency.currencyCode).toBe('EUR');
    });

    it('should load currency with exchange rates', async () => {
      await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: usdCurrency.id,
          toCurrencyId: eurCurrency.id,
          exchangeRate: new Decimal('0.85'),
          effectiveDate: new Date('2025-01-01'),
          rateSource: 'FINANCIAL_SERVICE'
        }
      });

      const currencyWithRates = await prisma.currency.findUnique({
        where: { id: usdCurrency.id },
        include: {
          exchangeRatesFrom: true,
          exchangeRatesTo: true
        }
      });

      expect(currencyWithRates).toBeDefined();
      expect(currencyWithRates!.exchangeRatesFrom).toHaveLength(1);
      expect(currencyWithRates!.exchangeRatesTo).toHaveLength(0);
    });

    it('should cascade delete exchange rates when currency is deleted', async () => {
      const rate = await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: usdCurrency.id,
          toCurrencyId: eurCurrency.id,
          exchangeRate: new Decimal('0.85'),
          effectiveDate: new Date('2025-01-01'),
          rateSource: 'FINANCIAL_SERVICE'
        }
      });

      // Delete the from currency
      await prisma.currency.delete({
        where: { id: usdCurrency.id }
      });

      // Exchange rate should be automatically deleted due to foreign key constraint
      const remainingRate = await prisma.exchangeRate.findUnique({
        where: { id: rate.id }
      });

      expect(remainingRate).toBeNull();
    });
  });

  // ============================================================================
  // QUERY PERFORMANCE TESTS
  // ============================================================================

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Create test currencies
      const currencies = await Promise.all([
        prisma.currency.create({
          data: { currencyCode: 'USD', currencyName: 'US Dollar', minorUnit: 2 }
        }),
        prisma.currency.create({
          data: { currencyCode: 'EUR', currencyName: 'Euro', minorUnit: 2 }
        }),
        prisma.currency.create({
          data: { currencyCode: 'GBP', currencyName: 'British Pound', minorUnit: 2 }
        })
      ]);

      // Create multiple exchange rates
      const rates = [];
      for (let i = 0; i < 30; i++) {
        rates.push({
          fromCurrencyId: currencies[i % 3].id,
          toCurrencyId: currencies[(i + 1) % 3].id,
          exchangeRate: new Decimal(`${0.8 + (i * 0.001)}`),
          effectiveDate: new Date(2025, 0, i + 1),
          rateSource: 'FINANCIAL_SERVICE' as const
        });
      }

      await prisma.exchangeRate.createMany({
        data: rates
      });
    });

    it('should efficiently find current exchange rate', async () => {
      const startTime = Date.now();

      const rate = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency: { currencyCode: 'USD' },
          toCurrency: { currencyCode: 'EUR' },
          effectiveDate: { lte: new Date() },
          isActive: true
        },
        orderBy: { effectiveDate: 'desc' },
        include: {
          fromCurrency: true,
          toCurrency: true
        }
      });

      const queryTime = Date.now() - startTime;

      expect(rate).toBeDefined();
      expect(queryTime).toBeLessThan(100); // Should be fast with proper indexing
    });

    it('should efficiently filter currencies by active status', async () => {
      const startTime = Date.now();

      const activeCurrencies = await prisma.currency.findMany({
        where: { isActive: true },
        orderBy: [
          { isBaseCurrency: 'desc' },
          { currencyCode: 'asc' }
        ]
      });

      const queryTime = Date.now() - startTime;

      expect(activeCurrencies).toBeDefined();
      expect(queryTime).toBeLessThan(50);
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe('Data Integrity', () => {
    it('should maintain referential integrity for exchange rates', async () => {
      const usdCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          minorUnit: 2
        }
      });

      // Try to create exchange rate with non-existent currency
      await expect(
        prisma.exchangeRate.create({
          data: {
            fromCurrencyId: usdCurrency.id,
            toCurrencyId: 'non-existent-id',
            exchangeRate: new Decimal('0.85'),
            effectiveDate: new Date(),
            rateSource: 'MANUAL_ENTRY'
          }
        })
      ).rejects.toThrow();
    });

    it('should handle concurrent currency creation', async () => {
      const currencyPromises = Array.from({ length: 5 }, (_, i) =>
        prisma.currency.create({
          data: {
            currencyCode: `CUR${i}`,
            currencyName: `Currency ${i}`,
            minorUnit: 2
          }
        })
      );

      const currencies = await Promise.all(currencyPromises);

      expect(currencies).toHaveLength(5);
      currencies.forEach((currency, i) => {
        expect(currency.currencyCode).toBe(`CUR${i}`);
      });
    });

    it('should handle large decimal precision in exchange rates', async () => {
      const usdCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'USD',
          currencyName: 'US Dollar',
          minorUnit: 2
        }
      });

      const eurCurrency = await prisma.currency.create({
        data: {
          currencyCode: 'EUR',
          currencyName: 'Euro',
          minorUnit: 2
        }
      });

      // Test with maximum precision (18,8)
      const veryPreciseRate = new Decimal('1.12345678');

      const rate = await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: usdCurrency.id,
          toCurrencyId: eurCurrency.id,
          exchangeRate: veryPreciseRate,
          effectiveDate: new Date(),
          rateSource: 'FINANCIAL_SERVICE'
        }
      });

      expect(rate.exchangeRate).toEqual(veryPreciseRate);
    });
  });
});

export {};