/**
 * ISO 4217 Currency Seed Data
 *
 * Creates standardized currency lookup table with ISO 4217 compliant data
 * for multi-currency operations across the manufacturing system.
 *
 * Issue #208: Data Quality - Create Currency Lookup Table
 */

import { PrismaClient, ExchangeRateSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * ISO 4217 compliant currency seed data
 * Includes major world currencies with official ISO codes, symbols, and precision
 */
export const currencySeedData = [
  // North America
  {
    currencyCode: 'USD',
    currencyName: 'US Dollar',
    currencySymbol: '$',
    numericCode: '840',
    minorUnit: 2,
    region: 'North America',
    country: 'United States',
    displayFormat: '$1,234.56',
    isActive: true,
    isBaseCurrency: true,  // System base currency
    allowFractional: true,
  },
  {
    currencyCode: 'CAD',
    currencyName: 'Canadian Dollar',
    currencySymbol: 'C$',
    numericCode: '124',
    minorUnit: 2,
    region: 'North America',
    country: 'Canada',
    displayFormat: 'C$1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'MXN',
    currencyName: 'Mexican Peso',
    currencySymbol: '$',
    numericCode: '484',
    minorUnit: 2,
    region: 'North America',
    country: 'Mexico',
    displayFormat: '$1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },

  // Europe
  {
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
  },
  {
    currencyCode: 'GBP',
    currencyName: 'British Pound Sterling',
    currencySymbol: '£',
    numericCode: '826',
    minorUnit: 2,
    region: 'Europe',
    country: 'United Kingdom',
    displayFormat: '£1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'CHF',
    currencyName: 'Swiss Franc',
    currencySymbol: 'CHF',
    numericCode: '756',
    minorUnit: 2,
    region: 'Europe',
    country: 'Switzerland',
    displayFormat: 'CHF 1\'234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'SEK',
    currencyName: 'Swedish Krona',
    currencySymbol: 'kr',
    numericCode: '752',
    minorUnit: 2,
    region: 'Europe',
    country: 'Sweden',
    displayFormat: '1 234,56 kr',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'NOK',
    currencyName: 'Norwegian Krone',
    currencySymbol: 'kr',
    numericCode: '578',
    minorUnit: 2,
    region: 'Europe',
    country: 'Norway',
    displayFormat: 'kr 1 234,56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'DKK',
    currencyName: 'Danish Krone',
    currencySymbol: 'kr',
    numericCode: '208',
    minorUnit: 2,
    region: 'Europe',
    country: 'Denmark',
    displayFormat: '1.234,56 kr',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },

  // Asia-Pacific
  {
    currencyCode: 'JPY',
    currencyName: 'Japanese Yen',
    currencySymbol: '¥',
    numericCode: '392',
    minorUnit: 0,  // No fractional units
    region: 'Asia-Pacific',
    country: 'Japan',
    displayFormat: '¥1,234',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: false,
  },
  {
    currencyCode: 'CNY',
    currencyName: 'Chinese Yuan Renminbi',
    currencySymbol: '¥',
    numericCode: '156',
    minorUnit: 2,
    region: 'Asia-Pacific',
    country: 'China',
    displayFormat: '¥1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'KRW',
    currencyName: 'South Korean Won',
    currencySymbol: '₩',
    numericCode: '410',
    minorUnit: 0,  // No fractional units
    region: 'Asia-Pacific',
    country: 'South Korea',
    displayFormat: '₩1,234',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: false,
  },
  {
    currencyCode: 'AUD',
    currencyName: 'Australian Dollar',
    currencySymbol: 'A$',
    numericCode: '036',
    minorUnit: 2,
    region: 'Asia-Pacific',
    country: 'Australia',
    displayFormat: 'A$1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'NZD',
    currencyName: 'New Zealand Dollar',
    currencySymbol: 'NZ$',
    numericCode: '554',
    minorUnit: 2,
    region: 'Asia-Pacific',
    country: 'New Zealand',
    displayFormat: 'NZ$1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'SGD',
    currencyName: 'Singapore Dollar',
    currencySymbol: 'S$',
    numericCode: '702',
    minorUnit: 2,
    region: 'Asia-Pacific',
    country: 'Singapore',
    displayFormat: 'S$1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'HKD',
    currencyName: 'Hong Kong Dollar',
    currencySymbol: 'HK$',
    numericCode: '344',
    minorUnit: 2,
    region: 'Asia-Pacific',
    country: 'Hong Kong',
    displayFormat: 'HK$1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'INR',
    currencyName: 'Indian Rupee',
    currencySymbol: '₹',
    numericCode: '356',
    minorUnit: 2,
    region: 'Asia-Pacific',
    country: 'India',
    displayFormat: '₹1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },

  // South America
  {
    currencyCode: 'BRL',
    currencyName: 'Brazilian Real',
    currencySymbol: 'R$',
    numericCode: '986',
    minorUnit: 2,
    region: 'South America',
    country: 'Brazil',
    displayFormat: 'R$ 1.234,56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'ARS',
    currencyName: 'Argentine Peso',
    currencySymbol: '$',
    numericCode: '032',
    minorUnit: 2,
    region: 'South America',
    country: 'Argentina',
    displayFormat: '$ 1.234,56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },

  // Middle East & Africa
  {
    currencyCode: 'SAR',
    currencyName: 'Saudi Riyal',
    currencySymbol: '﷼',
    numericCode: '682',
    minorUnit: 2,
    region: 'Middle East',
    country: 'Saudi Arabia',
    displayFormat: '﷼1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'AED',
    currencyName: 'UAE Dirham',
    currencySymbol: 'د.إ',
    numericCode: '784',
    minorUnit: 2,
    region: 'Middle East',
    country: 'United Arab Emirates',
    displayFormat: 'د.إ1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'ZAR',
    currencyName: 'South African Rand',
    currencySymbol: 'R',
    numericCode: '710',
    minorUnit: 2,
    region: 'Africa',
    country: 'South Africa',
    displayFormat: 'R1,234.56',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },

  // Special Purpose & High Precision Currencies
  {
    currencyCode: 'KWD',
    currencyName: 'Kuwaiti Dinar',
    currencySymbol: 'د.ك',
    numericCode: '414',
    minorUnit: 3,  // 3 decimal places - highest precision
    region: 'Middle East',
    country: 'Kuwait',
    displayFormat: 'د.ك1,234.567',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
  {
    currencyCode: 'BHD',
    currencyName: 'Bahraini Dinar',
    currencySymbol: '.د.ب',
    numericCode: '048',
    minorUnit: 3,  // 3 decimal places
    region: 'Middle East',
    country: 'Bahrain',
    displayFormat: '.د.ب1,234.567',
    isActive: true,
    isBaseCurrency: false,
    allowFractional: true,
  },
];

/**
 * Sample exchange rates for common currency pairs
 * In production, these would come from financial services APIs
 */
export const exchangeRateSeedData = [
  // Major USD pairs
  {
    fromCurrencyCode: 'USD',
    toCurrencyCode: 'EUR',
    exchangeRate: new Decimal('0.85'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-001',
    isManualOverride: false,
  },
  {
    fromCurrencyCode: 'USD',
    toCurrencyCode: 'GBP',
    exchangeRate: new Decimal('0.78'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-002',
    isManualOverride: false,
  },
  {
    fromCurrencyCode: 'USD',
    toCurrencyCode: 'JPY',
    exchangeRate: new Decimal('150.25'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-003',
    isManualOverride: false,
  },
  {
    fromCurrencyCode: 'USD',
    toCurrencyCode: 'CAD',
    exchangeRate: new Decimal('1.35'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-004',
    isManualOverride: false,
  },
  {
    fromCurrencyCode: 'USD',
    toCurrencyCode: 'AUD',
    exchangeRate: new Decimal('1.52'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-005',
    isManualOverride: false,
  },

  // Reverse pairs for bidirectional conversion
  {
    fromCurrencyCode: 'EUR',
    toCurrencyCode: 'USD',
    exchangeRate: new Decimal('1.176'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-006',
    isManualOverride: false,
  },
  {
    fromCurrencyCode: 'GBP',
    toCurrencyCode: 'USD',
    exchangeRate: new Decimal('1.282'),
    rateSource: 'FINANCIAL_SERVICE' as ExchangeRateSource,
    sourceReference: 'SEED-2025-007',
    isManualOverride: false,
  },
];

/**
 * Seeds currency data with ISO 4217 compliance
 */
async function seedCurrencies() {
  console.log('🌱 Seeding ISO 4217 currency data...');

  try {
    // Create all currencies
    for (const currencyData of currencySeedData) {
      const currency = await prisma.currency.upsert({
        where: { currencyCode: currencyData.currencyCode },
        update: currencyData,
        create: currencyData,
      });

      console.log(`  ✅ Created/Updated currency: ${currency.currencyCode} - ${currency.currencyName}`);
    }

    console.log(`✅ Currency seed data completed successfully!`);
    console.log(`   Created ${currencySeedData.length} ISO 4217 compliant currencies.`);

  } catch (error) {
    console.error('❌ Error seeding currency data:', error);
    throw error;
  }
}

/**
 * Seeds exchange rate data for common currency pairs
 */
async function seedExchangeRates() {
  console.log('🌱 Seeding exchange rate data...');

  try {
    // Get currency IDs for foreign key references
    const currencies = await prisma.currency.findMany({
      select: { id: true, currencyCode: true }
    });

    const currencyMap = new Map(
      currencies.map(c => [c.currencyCode, c.id])
    );

    // Create exchange rates with proper foreign key relationships
    for (const rateData of exchangeRateSeedData) {
      const fromCurrencyId = currencyMap.get(rateData.fromCurrencyCode);
      const toCurrencyId = currencyMap.get(rateData.toCurrencyCode);

      if (!fromCurrencyId || !toCurrencyId) {
        console.warn(`  ⚠️  Skipping rate ${rateData.fromCurrencyCode}/${rateData.toCurrencyCode} - currencies not found`);
        continue;
      }

      const exchangeRate = await prisma.exchangeRate.upsert({
        where: {
          fromCurrencyId_toCurrencyId_effectiveDate: {
            fromCurrencyId,
            toCurrencyId,
            effectiveDate: new Date(),
          }
        },
        update: {
          exchangeRate: rateData.exchangeRate,
          rateSource: rateData.rateSource,
          sourceReference: rateData.sourceReference,
          isManualOverride: rateData.isManualOverride,
        },
        create: {
          fromCurrencyId,
          toCurrencyId,
          exchangeRate: rateData.exchangeRate,
          effectiveDate: new Date(),
          rateSource: rateData.rateSource,
          sourceReference: rateData.sourceReference,
          isManualOverride: rateData.isManualOverride,
          isActive: true,
        },
      });

      console.log(`  ✅ Created/Updated rate: ${rateData.fromCurrencyCode}/${rateData.toCurrencyCode} = ${rateData.exchangeRate}`);
    }

    console.log(`✅ Exchange rate seed data completed successfully!`);
    console.log(`   Created ${exchangeRateSeedData.length} currency exchange rates.`);

  } catch (error) {
    console.error('❌ Error seeding exchange rate data:', error);
    throw error;
  }
}

/**
 * Main seed function
 */
export async function seedCurrencyData() {
  try {
    await seedCurrencies();
    await seedExchangeRates();

    console.log('🚀 Currency and exchange rate seeding completed successfully!');
    console.log('   System ready for multi-currency operations with ISO 4217 compliance.');

  } catch (error) {
    console.error('Failed to seed currency data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedCurrencyData();
}