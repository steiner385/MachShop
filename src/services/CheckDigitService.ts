/**
 * Check Digit Service (Issue #149)
 * Implements Luhn, Mod-10, and custom check digit algorithms for serial number validation
 */

import { CheckDigitResult, CheckAlgorithm } from '../types/serialNumberFormat';

export class CheckDigitService {
  /**
   * Calculate check digit using Luhn algorithm
   * Commonly used in: Credit cards, ISBN, UPC
   */
  calculateLuhnCheckDigit(value: string): CheckDigitResult {
    // Remove any non-digits for calculation
    const digits = value.replace(/\D/g, '');

    if (digits.length === 0) {
      return {
        algorithm: 'luhn',
        checkDigit: '0',
        value: value + '0',
      };
    }

    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return {
      algorithm: 'luhn',
      checkDigit: checkDigit.toString(),
      value: value + checkDigit.toString(),
    };
  }

  /**
   * Validate a serial number using Luhn algorithm
   */
  validateLuhnCheckDigit(value: string): boolean {
    const digits = value.replace(/\D/g, '');

    if (digits.length < 2) {
      return false;
    }

    const checkDigit = parseInt(digits[digits.length - 1], 10);
    const withoutCheckDigit = digits.substring(0, digits.length - 1);

    const calculated = this.calculateLuhnCheckDigit(withoutCheckDigit);
    return parseInt(calculated.checkDigit, 10) === checkDigit;
  }

  /**
   * Calculate check digit using Modulo 10 algorithm (Mod-10)
   * Similar to Luhn but without the doubling step
   */
  calculateMod10CheckDigit(value: string): CheckDigitResult {
    const digits = value.replace(/\D/g, '');

    if (digits.length === 0) {
      return {
        algorithm: 'mod10',
        checkDigit: '0',
        value: value + '0',
      };
    }

    let sum = 0;

    // Sum all digits
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i], 10);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return {
      algorithm: 'mod10',
      checkDigit: checkDigit.toString(),
      value: value + checkDigit.toString(),
    };
  }

  /**
   * Validate a serial number using Mod-10 algorithm
   */
  validateMod10CheckDigit(value: string): boolean {
    const digits = value.replace(/\D/g, '');

    if (digits.length < 2) {
      return false;
    }

    const checkDigit = parseInt(digits[digits.length - 1], 10);
    const withoutCheckDigit = digits.substring(0, digits.length - 1);

    const calculated = this.calculateMod10CheckDigit(withoutCheckDigit);
    return parseInt(calculated.checkDigit, 10) === checkDigit;
  }

  /**
   * Calculate check digit using ISO 7064 Mod 37-36 (alphanumeric)
   * Used for serials that include letters
   */
  calculateISO7064CheckDigit(value: string): CheckDigitResult {
    const MOD = 37;
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let checkSum = 0;
    const upperValue = value.toUpperCase();

    for (let i = 0; i < upperValue.length; i++) {
      const char = upperValue[i];
      const charValue = charset.indexOf(char);

      if (charValue === -1) {
        throw new Error(`Invalid character '${char}' for ISO 7064 check digit`);
      }

      checkSum = (checkSum * MOD + charValue) % MOD;
    }

    const checkDigit = (MOD - checkSum) % MOD;
    return {
      algorithm: 'custom',
      checkDigit: charset[checkDigit],
      value: value + charset[checkDigit],
    };
  }

  /**
   * Validate using ISO 7064
   */
  validateISO7064CheckDigit(value: string): boolean {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (value.length < 2) {
      return false;
    }

    const checkDigit = value[value.length - 1];
    const withoutCheckDigit = value.substring(0, value.length - 1);

    const calculated = this.calculateISO7064CheckDigit(withoutCheckDigit);
    return calculated.checkDigit === checkDigit.toUpperCase();
  }

  /**
   * Calculate check digit using Verhoeff algorithm
   * Suitable for high-error detection rates
   */
  calculateVerhoeffCheckDigit(value: string): CheckDigitResult {
    const digits = value.replace(/\D/g, '');

    if (digits.length === 0) {
      return {
        algorithm: 'custom',
        checkDigit: '0',
        value: value + '0',
      };
    }

    const inv = [0, 4, 3, 2, 6, 5, 7, 8, 9, 1];
    const perm = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ];

    let check = 0;
    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i], 10);
      check = perm[(check + i + 1) % 8][digit];
    }

    const checkDigit = inv[check];
    return {
      algorithm: 'custom',
      checkDigit: checkDigit.toString(),
      value: value + checkDigit.toString(),
    };
  }

  /**
   * Validate using Verhoeff algorithm
   */
  validateVerhoeffCheckDigit(value: string): boolean {
    const digits = value.replace(/\D/g, '');

    if (digits.length < 2) {
      return false;
    }

    const checkDigit = parseInt(digits[digits.length - 1], 10);
    const withoutCheckDigit = digits.substring(0, digits.length - 1);

    const calculated = this.calculateVerhoeffCheckDigit(withoutCheckDigit);
    return parseInt(calculated.checkDigit, 10) === checkDigit;
  }

  /**
   * Generic check digit calculation based on algorithm
   */
  calculateCheckDigit(
    value: string,
    algorithm: CheckAlgorithm = 'luhn'
  ): CheckDigitResult {
    switch (algorithm) {
      case 'luhn':
        return this.calculateLuhnCheckDigit(value);
      case 'mod10':
        return this.calculateMod10CheckDigit(value);
      case 'custom':
        // Default to Verhoeff for custom/advanced cases
        return this.calculateVerhoeffCheckDigit(value);
      default:
        return this.calculateLuhnCheckDigit(value);
    }
  }

  /**
   * Generic check digit validation based on algorithm
   */
  validateCheckDigit(
    value: string,
    algorithm: CheckAlgorithm = 'luhn'
  ): boolean {
    switch (algorithm) {
      case 'luhn':
        return this.validateLuhnCheckDigit(value);
      case 'mod10':
        return this.validateMod10CheckDigit(value);
      case 'custom':
        // Try both ISO 7064 and Verhoeff
        return (
          this.validateISO7064CheckDigit(value) ||
          this.validateVerhoeffCheckDigit(value)
        );
      default:
        return this.validateLuhnCheckDigit(value);
    }
  }

  /**
   * Extract and validate just the check digit portion
   */
  extractAndValidateCheckDigit(
    value: string,
    algorithm: CheckAlgorithm = 'luhn'
  ): { isValid: boolean; checkDigit: string; value: string } {
    const isValid = this.validateCheckDigit(value, algorithm);
    const checkDigit = value[value.length - 1];
    return {
      isValid,
      checkDigit,
      value: value.substring(0, value.length - 1),
    };
  }

  /**
   * Append check digit to a value
   */
  appendCheckDigit(
    value: string,
    algorithm: CheckAlgorithm = 'luhn'
  ): string {
    const result = this.calculateCheckDigit(value, algorithm);
    return result.value;
  }

  /**
   * Calculate multiple check digits using different algorithms for comparison
   */
  calculateMultipleCheckDigits(value: string): Record<CheckAlgorithm, CheckDigitResult> {
    return {
      luhn: this.calculateLuhnCheckDigit(value),
      mod10: this.calculateMod10CheckDigit(value),
      custom: this.calculateVerhoeffCheckDigit(value),
    };
  }
}

// Export singleton instance
export const checkDigitService = new CheckDigitService();
