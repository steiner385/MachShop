/**
 * Currency Service - Multi-Currency Operations with ISO 4217 Compliance
 *
 * Provides comprehensive currency management including conversions, exchange rates,
 * validation, and formatting for the manufacturing system.
 *
 * Issue #208: Data Quality - Create Currency Lookup Table
 */

import { PrismaClient, Currency, ExchangeRate, ExchangeRateSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

export interface CurrencyConversionParams {
  amount: Decimal;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  effectiveDate?: Date;
}

export interface CurrencyConversionResult {
  originalAmount: Decimal;
  convertedAmount: Decimal;
  fromCurrency: Currency;
  toCurrency: Currency;
  exchangeRate: Decimal;
  effectiveDate: Date;
  rateSource: ExchangeRateSource;
}

export interface ExchangeRateCreateParams {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  exchangeRate: Decimal;
  effectiveDate?: Date;
  expirationDate?: Date;
  rateSource: ExchangeRateSource;
  sourceReference?: string;
  isManualOverride?: boolean;
  createdBy?: string;
}

export interface CurrencyFilterParams {
  isActive?: boolean;
  region?: string;
  allowFractional?: boolean;
  currencyCodes?: string[];
}

export interface CurrencyFormatOptions {
  showSymbol?: boolean;
  showCode?: boolean;
  precision?: number;
  useGrouping?: boolean;
  locale?: string;
}

/**
 * Currency Service for multi-currency operations
 */
export class CurrencyService {
  private prisma: PrismaClient;
  private cachedCurrencies: Map<string, Currency> = new Map();
  private cacheExpiry: Date = new Date();
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // CURRENCY MANAGEMENT
  // ============================================================================

  /**
   * Get all currencies with optional filtering
   */
  async getCurrencies(filters: CurrencyFilterParams = {}): Promise<Currency[]> {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.region) {
      where.region = filters.region;
    }

    if (filters.allowFractional !== undefined) {
      where.allowFractional = filters.allowFractional;
    }

    if (filters.currencyCodes?.length) {
      where.currencyCode = { in: filters.currencyCodes };
    }

    const currencies = await this.prisma.currency.findMany({
      where,
      orderBy: [
        { isBaseCurrency: 'desc' },
        { currencyCode: 'asc' }
      ]
    });

    logger.debug('Retrieved currencies', {
      count: currencies.length,
      filters
    });

    return currencies;
  }

  /**
   * Get currency by code with caching
   */
  async getCurrencyByCode(currencyCode: string): Promise<Currency | null> {
    // Check cache first
    if (this.isCacheValid() && this.cachedCurrencies.has(currencyCode)) {
      return this.cachedCurrencies.get(currencyCode)!;
    }

    const currency = await this.prisma.currency.findUnique({
      where: { currencyCode: currencyCode.toUpperCase() }
    });

    if (currency) {
      this.cachedCurrencies.set(currencyCode.toUpperCase(), currency);
    }

    return currency;
  }

  /**
   * Get system base currency
   */
  async getBaseCurrency(): Promise<Currency> {
    const baseCurrency = await this.prisma.currency.findFirst({
      where: { isBaseCurrency: true }
    });

    if (!baseCurrency) {
      throw new Error('No base currency configured in system');
    }

    return baseCurrency;
  }

  /**
   * Validate currency code against ISO 4217 standards
   */
  async validateCurrencyCode(currencyCode: string): Promise<boolean> {
    const currency = await this.getCurrencyByCode(currencyCode);
    return currency !== null && currency.isActive;
  }

  // ============================================================================
  // CURRENCY CONVERSION
  // ============================================================================

  /**
   * Convert amount between currencies using current exchange rates
   */
  async convertCurrency(params: CurrencyConversionParams): Promise<CurrencyConversionResult> {
    const {
      amount,
      fromCurrencyCode,
      toCurrencyCode,
      effectiveDate = new Date()
    } = params;

    logger.info('Currency conversion requested', {
      amount: amount.toString(),
      fromCurrencyCode,
      toCurrencyCode,
      effectiveDate
    });

    // Validate currencies exist and are active
    const fromCurrency = await this.getCurrencyByCode(fromCurrencyCode);
    const toCurrency = await this.getCurrencyByCode(toCurrencyCode);

    if (!fromCurrency) {
      throw new Error(`Invalid source currency code: ${fromCurrencyCode}`);
    }

    if (!toCurrency) {
      throw new Error(`Invalid target currency code: ${toCurrencyCode}`);
    }

    if (!fromCurrency.isActive || !toCurrency.isActive) {
      throw new Error('Cannot convert using inactive currencies');
    }

    // Same currency conversion
    if (fromCurrencyCode === toCurrencyCode) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: new Decimal(1),
        effectiveDate,
        rateSource: 'MANUAL_ENTRY' as ExchangeRateSource
      };
    }

    // Get exchange rate
    const exchangeRateRecord = await this.getExchangeRate(
      fromCurrencyCode,
      toCurrencyCode,
      effectiveDate
    );

    // Perform conversion with proper decimal precision
    const convertedAmount = amount.mul(exchangeRateRecord.exchangeRate);

    // Round to target currency's minor unit precision
    const finalAmount = this.roundToCurrencyPrecision(convertedAmount, toCurrency);

    logger.info('Currency conversion completed', {
      originalAmount: amount.toString(),
      convertedAmount: finalAmount.toString(),
      exchangeRate: exchangeRateRecord.exchangeRate.toString(),
      rateSource: exchangeRateRecord.rateSource
    });

    return {
      originalAmount: amount,
      convertedAmount: finalAmount,
      fromCurrency,
      toCurrency,
      exchangeRate: exchangeRateRecord.exchangeRate,
      effectiveDate,
      rateSource: exchangeRateRecord.rateSource
    };
  }

  /**
   * Convert multiple amounts to a target currency
   */
  async convertMultipleCurrencies(
    amounts: Array<{ amount: Decimal; currencyCode: string }>,
    targetCurrencyCode: string,
    effectiveDate: Date = new Date()
  ): Promise<Array<CurrencyConversionResult>> {
    const results: CurrencyConversionResult[] = [];

    for (const item of amounts) {
      const result = await this.convertCurrency({
        amount: item.amount,
        fromCurrencyCode: item.currencyCode,
        toCurrencyCode: targetCurrencyCode,
        effectiveDate
      });
      results.push(result);
    }

    return results;
  }

  // ============================================================================
  // EXCHANGE RATE MANAGEMENT
  // ============================================================================

  /**
   * Get exchange rate for currency pair
   */
  async getExchangeRate(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    effectiveDate: Date = new Date()
  ): Promise<ExchangeRate & { fromCurrency: Currency; toCurrency: Currency }> {
    const exchangeRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: { currencyCode: fromCurrencyCode.toUpperCase() },
        toCurrency: { currencyCode: toCurrencyCode.toUpperCase() },
        effectiveDate: { lte: effectiveDate },
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: effectiveDate } }
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

    if (!exchangeRate) {
      // Try reverse rate calculation
      const reverseRate = await this.getReverseExchangeRate(
        fromCurrencyCode,
        toCurrencyCode,
        effectiveDate
      );

      if (reverseRate) {
        return reverseRate;
      }

      throw new Error(
        `Exchange rate not found for ${fromCurrencyCode}/${toCurrencyCode} on ${effectiveDate.toISOString()}`
      );
    }

    return exchangeRate;
  }

  /**
   * Calculate reverse exchange rate if direct rate not available
   */
  private async getReverseExchangeRate(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    effectiveDate: Date
  ): Promise<(ExchangeRate & { fromCurrency: Currency; toCurrency: Currency }) | null> {
    const reverseRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: { currencyCode: toCurrencyCode.toUpperCase() },
        toCurrency: { currencyCode: fromCurrencyCode.toUpperCase() },
        effectiveDate: { lte: effectiveDate },
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: effectiveDate } }
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

    if (!reverseRate) {
      return null;
    }

    // Calculate inverse rate
    const inverseRate = new Decimal(1).div(reverseRate.exchangeRate);

    return {
      ...reverseRate,
      fromCurrency: reverseRate.toCurrency,
      toCurrency: reverseRate.fromCurrency,
      exchangeRate: inverseRate
    };
  }

  /**
   * Create or update exchange rate
   */
  async setExchangeRate(params: ExchangeRateCreateParams): Promise<ExchangeRate> {
    const {
      fromCurrencyCode,
      toCurrencyCode,
      exchangeRate,
      effectiveDate = new Date(),
      expirationDate,
      rateSource,
      sourceReference,
      isManualOverride = false,
      createdBy
    } = params;

    // Validate currencies
    const fromCurrency = await this.getCurrencyByCode(fromCurrencyCode);
    const toCurrency = await this.getCurrencyByCode(toCurrencyCode);

    if (!fromCurrency || !toCurrency) {
      throw new Error('Invalid currency codes provided');
    }

    // Validate exchange rate value
    if (exchangeRate.lte(0)) {
      throw new Error('Exchange rate must be positive');
    }

    const newRate = await this.prisma.exchangeRate.create({
      data: {
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id,
        exchangeRate,
        effectiveDate,
        expirationDate,
        rateSource,
        sourceReference,
        isManualOverride,
        createdBy,
        isActive: true
      }
    });

    logger.info('Exchange rate created', {
      fromCurrencyCode,
      toCurrencyCode,
      exchangeRate: exchangeRate.toString(),
      effectiveDate,
      rateSource
    });

    return newRate;
  }

  /**
   * Get exchange rate history for currency pair
   */
  async getExchangeRateHistory(
    fromCurrencyCode: string,
    toCurrencyCode: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<ExchangeRate[]> {
    return this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: { currencyCode: fromCurrencyCode.toUpperCase() },
        toCurrency: { currencyCode: toCurrencyCode.toUpperCase() },
        effectiveDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { effectiveDate: 'desc' }
    });
  }

  // ============================================================================
  // CURRENCY FORMATTING
  // ============================================================================

  /**
   * Format amount according to currency standards
   */
  formatCurrency(
    amount: Decimal,
    currency: Currency,
    options: CurrencyFormatOptions = {}
  ): string {
    const {
      showSymbol = true,
      showCode = false,
      precision = currency.minorUnit,
      useGrouping = true,
      locale = 'en-US'
    } = options;

    // Round to currency precision
    const roundedAmount = this.roundToCurrencyPrecision(amount, currency);

    // Format number
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
      useGrouping
    });

    const formattedNumber = formatter.format(roundedAmount.toNumber());

    // Build display string
    let result = formattedNumber;

    if (showSymbol && currency.currencySymbol) {
      result = `${currency.currencySymbol}${result}`;
    }

    if (showCode) {
      result = showSymbol
        ? `${result} ${currency.currencyCode}`
        : `${result} ${currency.currencyCode}`;
    }

    return result;
  }

  /**
   * Parse currency string to amount and currency code
   */
  parseCurrencyString(currencyString: string): { amount: Decimal; currencyCode?: string } {
    // Remove common currency symbols and extract number
    const cleanString = currencyString.replace(/[$€£¥₹₩]/g, '').trim();

    // Extract currency code (3 uppercase letters)
    const currencyCodeMatch = cleanString.match(/\b([A-Z]{3})\b/);
    const currencyCode = currencyCodeMatch ? currencyCodeMatch[1] : undefined;

    // Extract number (remove currency code if found)
    const numberString = currencyCode
      ? cleanString.replace(currencyCode, '').trim()
      : cleanString;

    // Parse number (handle commas as thousand separators)
    const cleanNumber = numberString.replace(/,/g, '');
    const amount = new Decimal(cleanNumber);

    return { amount, currencyCode };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Round amount to currency's minor unit precision
   */
  private roundToCurrencyPrecision(amount: Decimal, currency: Currency): Decimal {
    if (currency.minorUnit === 0) {
      return amount.round();
    }

    const factor = new Decimal(10).pow(currency.minorUnit);
    return amount.mul(factor).round().div(factor);
  }

  /**
   * Check if currency cache is valid
   */
  private isCacheValid(): boolean {
    return new Date() < this.cacheExpiry;
  }

  /**
   * Clear currency cache
   */
  clearCache(): void {
    this.cachedCurrencies.clear();
    this.cacheExpiry = new Date();
  }

  /**
   * Refresh currency cache
   */
  async refreshCache(): Promise<void> {
    const currencies = await this.prisma.currency.findMany({
      where: { isActive: true }
    });

    this.cachedCurrencies.clear();
    currencies.forEach(currency => {
      this.cachedCurrencies.set(currency.currencyCode, currency);
    });

    this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);

    logger.debug('Currency cache refreshed', {
      cachedCount: currencies.length
    });
  }

  /**
   * Get currency statistics
   */
  async getCurrencyStats(): Promise<{
    totalCurrencies: number;
    activeCurrencies: number;
    baseCurrency: string;
    exchangeRatesCount: number;
    lastRateUpdate: Date | null;
  }> {
    const [
      totalCurrencies,
      activeCurrencies,
      baseCurrency,
      exchangeRatesCount,
      lastRateUpdate
    ] = await Promise.all([
      this.prisma.currency.count(),
      this.prisma.currency.count({ where: { isActive: true } }),
      this.prisma.currency.findFirst({ where: { isBaseCurrency: true } }),
      this.prisma.exchangeRate.count({ where: { isActive: true } }),
      this.prisma.exchangeRate.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    return {
      totalCurrencies,
      activeCurrencies,
      baseCurrency: baseCurrency?.currencyCode || 'Not Set',
      exchangeRatesCount,
      lastRateUpdate: lastRateUpdate?.createdAt || null
    };
  }

  /**
   * Validate currency amount for business rules
   */
  validateAmount(amount: Decimal, currency: Currency): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if amount is positive
    if (amount.lte(0)) {
      errors.push('Amount must be positive');
    }

    // Check fractional restrictions
    if (!currency.allowFractional && !amount.equals(amount.round())) {
      errors.push(`${currency.currencyCode} does not allow fractional amounts`);
    }

    // Check precision limits
    const decimalPlaces = amount.decimalPlaces();
    if (decimalPlaces > currency.minorUnit) {
      errors.push(
        `Amount precision exceeds ${currency.currencyCode} minor unit (${currency.minorUnit} decimal places)`
      );
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default CurrencyService;