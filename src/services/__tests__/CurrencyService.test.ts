/**
 * CurrencyService Test Suite
 *
 * Comprehensive testing for multi-currency operations, exchange rates,
 * and ISO 4217 compliance functionality.
 *
 * Issue #208: Data Quality - Create Currency Lookup Table
 */

import { PrismaClient, Currency, ExchangeRate, ExchangeRateSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CurrencyService } from '../CurrencyService';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('CurrencyService', () => {
  let currencyService: CurrencyService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  // Mock currency data
  const mockUSD: Currency = {
    id: 'currency-usd-1',
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
    allowFractional: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  };

  const mockEUR: Currency = {
    id: 'currency-eur-1',
    currencyCode: 'EUR',
    currencyName: 'Euro',
    currencySymbol: '€',
    numericCode: '978',
    minorUnit: 2,
    region: 'Europe',
    country: 'European Union',
    displayFormat: '€1.234,56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  };

  const mockJPY: Currency = {
    id: 'currency-jpy-1',
    currencyCode: 'JPY',
    currencyName: 'Japanese Yen',
    currencySymbol: '¥',
    numericCode: '392',
    minorUnit: 0,
    region: 'Asia-Pacific',
    country: 'Japan',
    displayFormat: '¥1,234',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  };

  const mockExchangeRate: ExchangeRate & { fromCurrency: Currency; toCurrency: Currency } = {
    id: 'rate-usd-eur-1',
    fromCurrencyId: mockUSD.id,
    toCurrencyId: mockEUR.id,
    fromCurrency: mockUSD,
    toCurrency: mockEUR,
    exchangeRate: new Decimal('0.85'),
    effectiveDate: new Date('2025-01-01'),
    expirationDate: null,
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'TEST-001',
    isManualOverride: false,
    isActive: true,
    priority: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: null
  };

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    currencyService = new CurrencyService(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
    currencyService.clearCache();
  });

  // ============================================================================
  // CURRENCY MANAGEMENT TESTS
  // ============================================================================

  describe('Currency Management', () => {
    describe('getCurrencies', () => {
      it('should return all active currencies', async () => {
        const mockCurrencies = [mockUSD, mockEUR, mockJPY];
        prismaMock.currency.findMany.mockResolvedValue(mockCurrencies);

        const result = await currencyService.getCurrencies({ isActive: true });

        expect(result).toEqual(mockCurrencies);
        expect(prismaMock.currency.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [
            { isBaseCurrency: 'desc' },
            { currencyCode: 'asc' }
          ]
        });
      });

      it('should filter currencies by region', async () => {
        const europeanCurrencies = [mockEUR];
        prismaMock.currency.findMany.mockResolvedValue(europeanCurrencies);

        const result = await currencyService.getCurrencies({ region: 'Europe' });

        expect(result).toEqual(europeanCurrencies);
        expect(prismaMock.currency.findMany).toHaveBeenCalledWith({
          where: { region: 'Europe' },
          orderBy: [
            { isBaseCurrency: 'desc' },
            { currencyCode: 'asc' }
          ]
        });
      });

      it('should filter currencies by currency codes', async () => {
        const specificCurrencies = [mockUSD, mockEUR];
        prismaMock.currency.findMany.mockResolvedValue(specificCurrencies);

        const result = await currencyService.getCurrencies({
          currencyCodes: ['USD', 'EUR']
        });

        expect(result).toEqual(specificCurrencies);
        expect(prismaMock.currency.findMany).toHaveBeenCalledWith({
          where: { currencyCode: { in: ['USD', 'EUR'] } },
          orderBy: [
            { isBaseCurrency: 'desc' },
            { currencyCode: 'asc' }
          ]
        });
      });
    });

    describe('getCurrencyByCode', () => {
      it('should return currency for valid code', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(mockUSD);

        const result = await currencyService.getCurrencyByCode('USD');

        expect(result).toEqual(mockUSD);
        expect(prismaMock.currency.findUnique).toHaveBeenCalledWith({
          where: { currencyCode: 'USD' }
        });
      });

      it('should convert code to uppercase', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(mockUSD);

        await currencyService.getCurrencyByCode('usd');

        expect(prismaMock.currency.findUnique).toHaveBeenCalledWith({
          where: { currencyCode: 'USD' }
        });
      });

      it('should return null for invalid code', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(null);

        const result = await currencyService.getCurrencyByCode('XXX');

        expect(result).toBeNull();
      });
    });

    describe('getBaseCurrency', () => {
      it('should return base currency', async () => {
        prismaMock.currency.findFirst.mockResolvedValue(mockUSD);

        const result = await currencyService.getBaseCurrency();

        expect(result).toEqual(mockUSD);
        expect(prismaMock.currency.findFirst).toHaveBeenCalledWith({
          where: { isBaseCurrency: true }
        });
      });

      it('should throw error when no base currency configured', async () => {
        prismaMock.currency.findFirst.mockResolvedValue(null);

        await expect(currencyService.getBaseCurrency()).rejects.toThrow(
          'No base currency configured in system'
        );
      });
    });

    describe('validateCurrencyCode', () => {
      it('should return true for valid active currency', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(mockUSD);

        const result = await currencyService.validateCurrencyCode('USD');

        expect(result).toBe(true);
      });

      it('should return false for inactive currency', async () => {
        const inactiveCurrency = { ...mockUSD, isActive: false };
        prismaMock.currency.findUnique.mockResolvedValue(inactiveCurrency);

        const result = await currencyService.validateCurrencyCode('USD');

        expect(result).toBe(false);
      });

      it('should return false for non-existent currency', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(null);

        const result = await currencyService.validateCurrencyCode('XXX');

        expect(result).toBe(false);
      });
    });
  });

  // ============================================================================
  // CURRENCY CONVERSION TESTS
  // ============================================================================

  describe('Currency Conversion', () => {
    beforeEach(() => {
      // Mock currency lookups
      prismaMock.currency.findUnique
        .mockImplementation(({ where }: any) => {
          if (where.currencyCode === 'USD') return Promise.resolve(mockUSD);
          if (where.currencyCode === 'EUR') return Promise.resolve(mockEUR);
          if (where.currencyCode === 'JPY') return Promise.resolve(mockJPY);
          return Promise.resolve(null);
        });
    });

    describe('convertCurrency', () => {
      it('should convert USD to EUR correctly', async () => {
        prismaMock.exchangeRate.findFirst.mockResolvedValue(mockExchangeRate);

        const result = await currencyService.convertCurrency({
          amount: new Decimal('100.00'),
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'EUR'
        });

        expect(result.originalAmount).toEqual(new Decimal('100.00'));
        expect(result.convertedAmount).toEqual(new Decimal('85.00'));
        expect(result.exchangeRate).toEqual(new Decimal('0.85'));
        expect(result.fromCurrency).toEqual(mockUSD);
        expect(result.toCurrency).toEqual(mockEUR);
      });

      it('should handle same currency conversion', async () => {
        const result = await currencyService.convertCurrency({
          amount: new Decimal('100.00'),
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'USD'
        });

        expect(result.originalAmount).toEqual(new Decimal('100.00'));
        expect(result.convertedAmount).toEqual(new Decimal('100.00'));
        expect(result.exchangeRate).toEqual(new Decimal('1'));
        expect(result.fromCurrency).toEqual(mockUSD);
        expect(result.toCurrency).toEqual(mockUSD);
      });

      it('should throw error for invalid source currency', async () => {
        await expect(currencyService.convertCurrency({
          amount: new Decimal('100.00'),
          fromCurrencyCode: 'XXX',
          toCurrencyCode: 'USD'
        })).rejects.toThrow('Invalid source currency code: XXX');
      });

      it('should throw error for invalid target currency', async () => {
        await expect(currencyService.convertCurrency({
          amount: new Decimal('100.00'),
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'XXX'
        })).rejects.toThrow('Invalid target currency code: XXX');
      });

      it('should throw error for inactive currencies', async () => {
        const inactiveCurrency = { ...mockEUR, isActive: false };
        prismaMock.currency.findUnique
          .mockImplementation(({ where }: any) => {
            if (where.currencyCode === 'USD') return Promise.resolve(mockUSD);
            if (where.currencyCode === 'EUR') return Promise.resolve(inactiveCurrency);
            return Promise.resolve(null);
          });

        await expect(currencyService.convertCurrency({
          amount: new Decimal('100.00'),
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'EUR'
        })).rejects.toThrow('Cannot convert using inactive currencies');
      });

      it('should round to target currency precision', async () => {
        // Mock JPY (0 decimal places)
        const usdToJpyRate = {
          ...mockExchangeRate,
          toCurrency: mockJPY,
          toCurrencyId: mockJPY.id,
          exchangeRate: new Decimal('150.256')
        };
        prismaMock.exchangeRate.findFirst.mockResolvedValue(usdToJpyRate);

        const result = await currencyService.convertCurrency({
          amount: new Decimal('100.00'),
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'JPY'
        });

        expect(result.convertedAmount).toEqual(new Decimal('15026')); // Rounded to 0 decimal places
      });
    });

    describe('convertMultipleCurrencies', () => {
      it('should convert multiple amounts to target currency', async () => {
        prismaMock.exchangeRate.findFirst
          .mockResolvedValueOnce(mockExchangeRate) // USD to EUR
          .mockResolvedValueOnce({ // EUR to EUR (same currency)
            ...mockExchangeRate,
            fromCurrency: mockEUR,
            toCurrency: mockEUR,
            exchangeRate: new Decimal('1')
          });

        const amounts = [
          { amount: new Decimal('100.00'), currencyCode: 'USD' },
          { amount: new Decimal('50.00'), currencyCode: 'EUR' }
        ];

        const results = await currencyService.convertMultipleCurrencies(amounts, 'EUR');

        expect(results).toHaveLength(2);
        expect(results[0].convertedAmount).toEqual(new Decimal('85.00'));
        expect(results[1].convertedAmount).toEqual(new Decimal('50.00'));
      });
    });
  });

  // ============================================================================
  // EXCHANGE RATE TESTS
  // ============================================================================

  describe('Exchange Rate Management', () => {
    describe('getExchangeRate', () => {
      it('should return exchange rate for currency pair', async () => {
        prismaMock.exchangeRate.findFirst.mockResolvedValue(mockExchangeRate);

        const result = await currencyService.getExchangeRate('USD', 'EUR');

        expect(result).toEqual(mockExchangeRate);
        expect(prismaMock.exchangeRate.findFirst).toHaveBeenCalledWith({
          where: {
            fromCurrency: { currencyCode: 'USD' },
            toCurrency: { currencyCode: 'EUR' },
            effectiveDate: { lte: expect.any(Date) },
            OR: [
              { expirationDate: null },
              { expirationDate: { gte: expect.any(Date) } }
            ],
            isActive: true
          },
          include: {
            fromCurrency: true,
            toCurrency: true
          },
          orderBy: [
            { priority: 'desc' },
            { effectiveDate: 'desc' }
          ]
        });
      });

      it('should throw error when exchange rate not found', async () => {
        prismaMock.exchangeRate.findFirst.mockResolvedValue(null);

        await expect(currencyService.getExchangeRate('USD', 'EUR')).rejects.toThrow(
          /Exchange rate not found for USD\/EUR/
        );
      });

      it('should try reverse rate calculation', async () => {
        // No direct rate found
        prismaMock.exchangeRate.findFirst
          .mockResolvedValueOnce(null) // Direct rate
          .mockResolvedValueOnce({ // Reverse rate
            ...mockExchangeRate,
            fromCurrency: mockEUR,
            toCurrency: mockUSD,
            exchangeRate: new Decimal('1.176') // 1 / 0.85
          });

        const result = await currencyService.getExchangeRate('USD', 'EUR');

        expect(result.fromCurrency).toEqual(mockEUR);
        expect(result.toCurrency).toEqual(mockUSD);
        expect(result.exchangeRate).toEqual(new Decimal('0.8503401360544218')); // 1 / 1.176
      });
    });

    describe('setExchangeRate', () => {
      beforeEach(() => {
        prismaMock.currency.findUnique
          .mockImplementation(({ where }: any) => {
            if (where.currencyCode === 'USD') return Promise.resolve(mockUSD);
            if (where.currencyCode === 'EUR') return Promise.resolve(mockEUR);
            return Promise.resolve(null);
          });
      });

      it('should create new exchange rate', async () => {
        const newRate = { ...mockExchangeRate };
        prismaMock.exchangeRate.create.mockResolvedValue(newRate);

        const result = await currencyService.setExchangeRate({
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'EUR',
          exchangeRate: new Decimal('0.85'),
          rateSource: 'FINANCIAL_SERVICE'
        });

        expect(result).toEqual(newRate);
        expect(prismaMock.exchangeRate.create).toHaveBeenCalledWith({
          data: {
            fromCurrencyId: mockUSD.id,
            toCurrencyId: mockEUR.id,
            exchangeRate: new Decimal('0.85'),
            effectiveDate: expect.any(Date),
            expirationDate: undefined,
            rateSource: 'FINANCIAL_SERVICE',
            sourceReference: undefined,
            isManualOverride: false,
            createdBy: undefined,
            isActive: true
          }
        });
      });

      it('should throw error for invalid currencies', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(null);

        await expect(currencyService.setExchangeRate({
          fromCurrencyCode: 'XXX',
          toCurrencyCode: 'EUR',
          exchangeRate: new Decimal('0.85'),
          rateSource: 'MANUAL_ENTRY'
        })).rejects.toThrow('Invalid currency codes provided');
      });

      it('should throw error for negative exchange rate', async () => {
        await expect(currencyService.setExchangeRate({
          fromCurrencyCode: 'USD',
          toCurrencyCode: 'EUR',
          exchangeRate: new Decimal('-0.85'),
          rateSource: 'MANUAL_ENTRY'
        })).rejects.toThrow('Exchange rate must be positive');
      });
    });

    describe('getExchangeRateHistory', () => {
      it('should return exchange rate history', async () => {
        const mockHistory = [mockExchangeRate];
        prismaMock.exchangeRate.findMany.mockResolvedValue(mockHistory);

        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');

        const result = await currencyService.getExchangeRateHistory('USD', 'EUR', startDate, endDate);

        expect(result).toEqual(mockHistory);
        expect(prismaMock.exchangeRate.findMany).toHaveBeenCalledWith({
          where: {
            fromCurrency: { currencyCode: 'USD' },
            toCurrency: { currencyCode: 'EUR' },
            effectiveDate: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: { effectiveDate: 'desc' }
        });
      });
    });
  });

  // ============================================================================
  // CURRENCY FORMATTING TESTS
  // ============================================================================

  describe('Currency Formatting', () => {
    describe('formatCurrency', () => {
      it('should format USD currency with symbol', () => {
        const result = currencyService.formatCurrency(
          new Decimal('1234.56'),
          mockUSD,
          { showSymbol: true, showCode: false }
        );

        expect(result).toBe('$1,234.56');
      });

      it('should format EUR currency with code', () => {
        const result = currencyService.formatCurrency(
          new Decimal('1234.56'),
          mockEUR,
          { showSymbol: false, showCode: true }
        );

        expect(result).toBe('1,234.56 EUR');
      });

      it('should format JPY currency (no decimals)', () => {
        const result = currencyService.formatCurrency(
          new Decimal('1234.56'),
          mockJPY,
          { showSymbol: true, showCode: false }
        );

        expect(result).toBe('¥1,235'); // Rounded to 0 decimal places
      });

      it('should format with custom precision', () => {
        const result = currencyService.formatCurrency(
          new Decimal('1234.567'),
          mockUSD,
          { showSymbol: true, precision: 3 }
        );

        expect(result).toBe('$1,234.567');
      });

      it('should format without grouping', () => {
        const result = currencyService.formatCurrency(
          new Decimal('1234.56'),
          mockUSD,
          { showSymbol: true, useGrouping: false }
        );

        expect(result).toBe('$1234.56');
      });
    });

    describe('parseCurrencyString', () => {
      it('should parse USD currency string', () => {
        const result = currencyService.parseCurrencyString('$1,234.56 USD');

        expect(result.amount).toEqual(new Decimal('1234.56'));
        expect(result.currencyCode).toBe('USD');
      });

      it('should parse currency string without code', () => {
        const result = currencyService.parseCurrencyString('€1,234.56');

        expect(result.amount).toEqual(new Decimal('1234.56'));
        expect(result.currencyCode).toBeUndefined();
      });

      it('should parse plain number string', () => {
        const result = currencyService.parseCurrencyString('1234.56');

        expect(result.amount).toEqual(new Decimal('1234.56'));
        expect(result.currencyCode).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // UTILITY TESTS
  // ============================================================================

  describe('Utility Methods', () => {
    describe('validateAmount', () => {
      it('should validate positive amount for USD', () => {
        const result = currencyService.validateAmount(new Decimal('100.50'), mockUSD);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject negative amount', () => {
        const result = currencyService.validateAmount(new Decimal('-100.50'), mockUSD);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Amount must be positive');
      });

      it('should reject fractional amount for JPY', () => {
        const result = currencyService.validateAmount(new Decimal('100.50'), mockJPY);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('JPY does not allow fractional amounts');
      });

      it('should reject excessive precision', () => {
        const result = currencyService.validateAmount(new Decimal('100.567'), mockUSD);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Amount precision exceeds USD minor unit (2 decimal places)'
        );
      });
    });

    describe('getCurrencyStats', () => {
      it('should return currency statistics', async () => {
        prismaMock.currency.count
          .mockResolvedValueOnce(25) // total
          .mockResolvedValueOnce(23); // active

        prismaMock.currency.findFirst.mockResolvedValue(mockUSD);
        prismaMock.exchangeRate.count.mockResolvedValue(150);
        prismaMock.exchangeRate.findFirst.mockResolvedValue({
          createdAt: new Date('2025-01-15')
        } as any);

        const result = await currencyService.getCurrencyStats();

        expect(result).toEqual({
          totalCurrencies: 25,
          activeCurrencies: 23,
          baseCurrency: 'USD',
          exchangeRatesCount: 150,
          lastRateUpdate: new Date('2025-01-15')
        });
      });
    });

    describe('Cache Management', () => {
      it('should cache currency lookups', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(mockUSD);

        // First call
        await currencyService.getCurrencyByCode('USD');
        // Second call (should use cache)
        await currencyService.getCurrencyByCode('USD');

        expect(prismaMock.currency.findUnique).toHaveBeenCalledTimes(1);
      });

      it('should clear cache', async () => {
        prismaMock.currency.findUnique.mockResolvedValue(mockUSD);

        await currencyService.getCurrencyByCode('USD');
        currencyService.clearCache();
        await currencyService.getCurrencyByCode('USD');

        expect(prismaMock.currency.findUnique).toHaveBeenCalledTimes(2);
      });

      it('should refresh cache', async () => {
        const currencies = [mockUSD, mockEUR, mockJPY];
        prismaMock.currency.findMany.mockResolvedValue(currencies);

        await currencyService.refreshCache();

        expect(prismaMock.currency.findMany).toHaveBeenCalledWith({
          where: { isActive: true }
        });
      });
    });
  });
});

export {};