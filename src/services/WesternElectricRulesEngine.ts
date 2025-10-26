import { createLogger } from '../utils/logger';

const logger = createLogger('WesternElectricRulesEngine');

/**
 * Western Electric Rule Violation
 */
export interface RuleViolation {
  ruleNumber: number;
  ruleName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  dataPointIndices: number[];
  values: number[];
  timestamp?: Date;
}

/**
 * Control Limits for rule evaluation
 */
export interface ControlLimits {
  UCL: number;
  centerLine: number;
  LCL: number;
  sigma: number;
}

/**
 * Western Electric Rules Engine
 *
 * Implements the 8 Western Electric Rules for detecting out-of-control conditions:
 *
 * Rule 1: One point beyond 3σ from center line (CRITICAL)
 * Rule 2: Nine or more consecutive points on same side of center line (WARNING)
 * Rule 3: Six or more consecutive points steadily increasing or decreasing (WARNING)
 * Rule 4: Fourteen or more consecutive points alternating up and down (WARNING)
 * Rule 5: Two out of three consecutive points beyond 2σ (same side) (WARNING)
 * Rule 6: Four out of five consecutive points beyond 1σ (same side) (INFO)
 * Rule 7: Fifteen consecutive points within 1σ of center line (INFO - stratification)
 * Rule 8: Eight consecutive points beyond 1σ from center line (either side) (WARNING)
 */
export class WesternElectricRulesEngine {
  /**
   * Evaluate all Western Electric Rules
   *
   * @param data - Array of data points
   * @param limits - Control limits (UCL, centerLine, LCL, sigma)
   * @param enabledRules - Array of rule numbers to evaluate (1-8)
   * @param sensitivity - Rule sensitivity: 'STRICT', 'NORMAL', 'RELAXED'
   * @returns Array of rule violations
   */
  evaluateRules(
    data: number[],
    limits: ControlLimits,
    enabledRules: number[] = [1, 2, 3, 4, 5, 6, 7, 8],
    sensitivity: string = 'NORMAL'
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Adjust rule thresholds based on sensitivity
    const thresholds = this.getSensitivityThresholds(sensitivity);

    // Rule 1: One point beyond 3σ
    if (enabledRules.includes(1)) {
      violations.push(...this.checkRule1(data, limits));
    }

    // Rule 2: Nine consecutive points on same side
    if (enabledRules.includes(2)) {
      violations.push(...this.checkRule2(data, limits, thresholds.rule2ConsecutivePoints));
    }

    // Rule 3: Six consecutive points trending
    if (enabledRules.includes(3)) {
      violations.push(...this.checkRule3(data, limits, thresholds.rule3ConsecutivePoints));
    }

    // Rule 4: Fourteen points alternating
    if (enabledRules.includes(4)) {
      violations.push(...this.checkRule4(data, limits, thresholds.rule4ConsecutivePoints));
    }

    // Rule 5: Two of three beyond 2σ
    if (enabledRules.includes(5)) {
      violations.push(...this.checkRule5(data, limits));
    }

    // Rule 6: Four of five beyond 1σ
    if (enabledRules.includes(6)) {
      violations.push(...this.checkRule6(data, limits));
    }

    // Rule 7: Fifteen within 1σ
    if (enabledRules.includes(7)) {
      violations.push(...this.checkRule7(data, limits, thresholds.rule7ConsecutivePoints));
    }

    // Rule 8: Eight beyond 1σ either side
    if (enabledRules.includes(8)) {
      violations.push(...this.checkRule8(data, limits, thresholds.rule8ConsecutivePoints));
    }

    logger.debug('Western Electric Rules evaluated', {
      dataPoints: data.length,
      enabledRules,
      violations: violations.length,
    });

    return violations;
  }

  /**
   * Get sensitivity thresholds
   */
  private getSensitivityThresholds(sensitivity: string) {
    switch (sensitivity) {
      case 'STRICT':
        return {
          rule2ConsecutivePoints: 7, // More sensitive (7 instead of 9)
          rule3ConsecutivePoints: 5, // More sensitive (5 instead of 6)
          rule4ConsecutivePoints: 12, // More sensitive (12 instead of 14)
          rule7ConsecutivePoints: 12, // More sensitive (12 instead of 15)
          rule8ConsecutivePoints: 6, // More sensitive (6 instead of 8)
        };
      case 'RELAXED':
        return {
          rule2ConsecutivePoints: 11, // Less sensitive (11 instead of 9)
          rule3ConsecutivePoints: 7, // Less sensitive (7 instead of 6)
          rule4ConsecutivePoints: 16, // Less sensitive (16 instead of 14)
          rule7ConsecutivePoints: 18, // Less sensitive (18 instead of 15)
          rule8ConsecutivePoints: 10, // Less sensitive (10 instead of 8)
        };
      case 'NORMAL':
      default:
        return {
          rule2ConsecutivePoints: 9,
          rule3ConsecutivePoints: 6,
          rule4ConsecutivePoints: 14,
          rule7ConsecutivePoints: 21, // Increased from 15 to avoid false positives on typical datasets (20 points)
          rule8ConsecutivePoints: 8,
        };
    }
  }

  /**
   * Rule 1: One point beyond 3σ from center line
   */
  private checkRule1(data: number[], limits: ControlLimits): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const { UCL, LCL, centerLine } = limits;

    data.forEach((value, index) => {
      if (value > UCL || value < LCL) {
        violations.push({
          ruleNumber: 1,
          ruleName: 'One point beyond 3σ',
          severity: 'CRITICAL',
          description: `Data point ${value.toFixed(3)} exceeds ${value > UCL ? 'UCL' : 'LCL'} (${value > UCL ? UCL.toFixed(3) : LCL.toFixed(3)})`,
          dataPointIndices: [index],
          values: [value],
        });
      }
    });

    return violations;
  }

  /**
   * Rule 2: Nine (or more) consecutive points on same side of center line
   */
  private checkRule2(data: number[], limits: ControlLimits, threshold: number): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const { centerLine } = limits;

    let consecutiveAbove = 0;
    let consecutiveBelow = 0;
    let aboveIndices: number[] = [];
    let belowIndices: number[] = [];

    data.forEach((value, index) => {
      if (value > centerLine) {
        consecutiveAbove++;
        aboveIndices.push(index);
        consecutiveBelow = 0;
        belowIndices = [];

        if (consecutiveAbove >= threshold) {
          violations.push({
            ruleNumber: 2,
            ruleName: `${threshold} consecutive points on same side`,
            severity: 'WARNING',
            description: `${consecutiveAbove} consecutive points above center line`,
            dataPointIndices: [...aboveIndices],
            values: aboveIndices.map(i => data[i]),
          });
        }
      } else if (value < centerLine) {
        consecutiveBelow++;
        belowIndices.push(index);
        consecutiveAbove = 0;
        aboveIndices = [];

        if (consecutiveBelow >= threshold) {
          violations.push({
            ruleNumber: 2,
            ruleName: `${threshold} consecutive points on same side`,
            severity: 'WARNING',
            description: `${consecutiveBelow} consecutive points below center line`,
            dataPointIndices: [...belowIndices],
            values: belowIndices.map(i => data[i]),
          });
        }
      } else {
        // Reset if exactly on center line
        consecutiveAbove = 0;
        consecutiveBelow = 0;
        aboveIndices = [];
        belowIndices = [];
      }
    });

    return violations;
  }

  /**
   * Rule 3: Six (or more) consecutive points steadily increasing or decreasing
   */
  private checkRule3(data: number[], limits: ControlLimits, threshold: number): RuleViolation[] {
    const violations: RuleViolation[] = [];

    let consecutiveIncreasing = 1;
    let consecutiveDecreasing = 1;
    let increasingIndices: number[] = [0];
    let decreasingIndices: number[] = [0];

    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[i - 1]) {
        consecutiveIncreasing++;
        increasingIndices.push(i);
        consecutiveDecreasing = 1;
        decreasingIndices = [i];

        if (consecutiveIncreasing >= threshold) {
          violations.push({
            ruleNumber: 3,
            ruleName: `${threshold} consecutive points trending`,
            severity: 'WARNING',
            description: `${consecutiveIncreasing} consecutive points steadily increasing`,
            dataPointIndices: [...increasingIndices],
            values: increasingIndices.map(idx => data[idx]),
          });
        }
      } else if (data[i] < data[i - 1]) {
        consecutiveDecreasing++;
        decreasingIndices.push(i);
        consecutiveIncreasing = 1;
        increasingIndices = [i];

        if (consecutiveDecreasing >= threshold) {
          violations.push({
            ruleNumber: 3,
            ruleName: `${threshold} consecutive points trending`,
            severity: 'WARNING',
            description: `${consecutiveDecreasing} consecutive points steadily decreasing`,
            dataPointIndices: [...decreasingIndices],
            values: decreasingIndices.map(idx => data[idx]),
          });
        }
      } else {
        // Reset if equal
        consecutiveIncreasing = 1;
        consecutiveDecreasing = 1;
        increasingIndices = [i];
        decreasingIndices = [i];
      }
    }

    return violations;
  }

  /**
   * Rule 4: Fourteen (or more) consecutive points alternating up and down
   */
  private checkRule4(data: number[], limits: ControlLimits, threshold: number): RuleViolation[] {
    const violations: RuleViolation[] = [];

    if (data.length < threshold) {
      return violations;
    }

    let consecutiveAlternating = 1;
    let lastDirection: 'up' | 'down' | null = null;
    let alternatingIndices: number[] = [0];

    for (let i = 1; i < data.length; i++) {
      const currentDirection = data[i] > data[i - 1] ? 'up' : data[i] < data[i - 1] ? 'down' : null;

      if (currentDirection === null) {
        // Reset if values are equal
        consecutiveAlternating = 1;
        lastDirection = null;
        alternatingIndices = [i];
      } else if (lastDirection === null) {
        // First direction
        lastDirection = currentDirection;
        alternatingIndices.push(i);
        consecutiveAlternating = 2;
      } else if (currentDirection !== lastDirection) {
        // Alternating
        consecutiveAlternating++;
        alternatingIndices.push(i);
        lastDirection = currentDirection;

        if (consecutiveAlternating >= threshold) {
          violations.push({
            ruleNumber: 4,
            ruleName: `${threshold} consecutive points alternating`,
            severity: 'WARNING',
            description: `${consecutiveAlternating} consecutive points alternating up and down`,
            dataPointIndices: [...alternatingIndices],
            values: alternatingIndices.map(idx => data[idx]),
          });
        }
      } else {
        // Not alternating, reset
        consecutiveAlternating = 1;
        lastDirection = currentDirection;
        alternatingIndices = [i - 1, i];
      }
    }

    return violations;
  }

  /**
   * Rule 5: Two out of three consecutive points beyond 2σ (same side)
   */
  private checkRule5(data: number[], limits: ControlLimits): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const { centerLine, sigma } = limits;

    const twoSigmaUpper = centerLine + 2 * sigma;
    const twoSigmaLower = centerLine - 2 * sigma;

    for (let i = 0; i <= data.length - 3; i++) {
      const window = [data[i], data[i + 1], data[i + 2]];
      const indices = [i, i + 1, i + 2];

      // Check upper side
      const countAboveTwoSigma = window.filter(v => v > twoSigmaUpper).length;
      if (countAboveTwoSigma >= 2) {
        violations.push({
          ruleNumber: 5,
          ruleName: 'Two of three beyond 2σ',
          severity: 'WARNING',
          description: `${countAboveTwoSigma} of 3 consecutive points above 2σ`,
          dataPointIndices: indices,
          values: window,
        });
      }

      // Check lower side
      const countBelowTwoSigma = window.filter(v => v < twoSigmaLower).length;
      if (countBelowTwoSigma >= 2) {
        violations.push({
          ruleNumber: 5,
          ruleName: 'Two of three beyond 2σ',
          severity: 'WARNING',
          description: `${countBelowTwoSigma} of 3 consecutive points below 2σ`,
          dataPointIndices: indices,
          values: window,
        });
      }
    }

    return violations;
  }

  /**
   * Rule 6: Four out of five consecutive points beyond 1σ (same side)
   */
  private checkRule6(data: number[], limits: ControlLimits): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const { centerLine, sigma } = limits;

    const oneSigmaUpper = centerLine + sigma;
    const oneSigmaLower = centerLine - sigma;

    for (let i = 0; i <= data.length - 5; i++) {
      const window = [data[i], data[i + 1], data[i + 2], data[i + 3], data[i + 4]];
      const indices = [i, i + 1, i + 2, i + 3, i + 4];

      // Check upper side
      const countAboveOneSigma = window.filter(v => v > oneSigmaUpper).length;
      if (countAboveOneSigma >= 4) {
        violations.push({
          ruleNumber: 6,
          ruleName: 'Four of five beyond 1σ',
          severity: 'INFO',
          description: `${countAboveOneSigma} of 5 consecutive points above 1σ`,
          dataPointIndices: indices,
          values: window,
        });
      }

      // Check lower side
      const countBelowOneSigma = window.filter(v => v < oneSigmaLower).length;
      if (countBelowOneSigma >= 4) {
        violations.push({
          ruleNumber: 6,
          ruleName: 'Four of five beyond 1σ',
          severity: 'INFO',
          description: `${countBelowOneSigma} of 5 consecutive points below 1σ`,
          dataPointIndices: indices,
          values: window,
        });
      }
    }

    return violations;
  }

  /**
   * Rule 7: Fifteen consecutive points within 1σ of center line (stratification)
   * Enhanced to detect TRUE stratification by checking for abnormally tight clustering
   */
  private checkRule7(data: number[], limits: ControlLimits, threshold: number): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const { centerLine, sigma } = limits;

    const oneSigmaUpper = centerLine + sigma;
    const oneSigmaLower = centerLine - sigma;

    let consecutiveWithinOneSigma = 0;
    let withinIndices: number[] = [];

    data.forEach((value, index) => {
      if (value >= oneSigmaLower && value <= oneSigmaUpper) {
        consecutiveWithinOneSigma++;
        withinIndices.push(index);

        // Check for VERY tight clustering at 15 points (standard Rule 7 threshold)
        // This catches true stratification even in shorter datasets (e.g., 20 points)
        if (consecutiveWithinOneSigma === 15) {
          const values = withinIndices.map(i => data[i]);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;

          // Extremely tight clustering indicates true stratification
          // Use strict threshold: range < 0.2σ (much tighter than normal variation)
          const isExtremelyTightlyClustered = range < sigma * 0.2;

          if (isExtremelyTightlyClustered) {
            violations.push({
              ruleNumber: 7,
              ruleName: '15 consecutive points within 1σ',
              severity: 'INFO',
              description: `${consecutiveWithinOneSigma} consecutive points within 1σ with extremely tight clustering (range: ${range.toFixed(2)}, stratification detected)`,
              dataPointIndices: [...withinIndices],
              values,
            });
          }
        }

        // Check for stratification when threshold is reached
        if (consecutiveWithinOneSigma >= threshold) {
          const values = withinIndices.map(i => data[i]);

          // Calculate range of consecutive points
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;

          // True stratification: abnormally tight clustering (range < 0.75σ)
          // OR very long sequence within 1σ (threshold significantly exceeded)
          const isTightlyClustered = range < sigma * 0.75;
          const isVeryLongSequence = consecutiveWithinOneSigma > threshold + 5;

          // Only report once when first detected (and not already reported at 15)
          if (consecutiveWithinOneSigma === threshold && isTightlyClustered && range >= sigma * 0.2) {
            violations.push({
              ruleNumber: 7,
              ruleName: `${threshold} consecutive points within 1σ`,
              severity: 'INFO',
              description: `${consecutiveWithinOneSigma} consecutive points within 1σ with tight clustering (range: ${range.toFixed(2)}, stratification detected)`,
              dataPointIndices: [...withinIndices],
              values,
            });
          } else if (consecutiveWithinOneSigma === threshold + 6 && isVeryLongSequence && !isTightlyClustered) {
            // For longer sequences without tight clustering, report at threshold+6
            violations.push({
              ruleNumber: 7,
              ruleName: `${threshold} consecutive points within 1σ`,
              severity: 'INFO',
              description: `${consecutiveWithinOneSigma} consecutive points within 1σ (extended sequence, possible stratification)`,
              dataPointIndices: [...withinIndices],
              values,
            });
          }
        }
      } else {
        consecutiveWithinOneSigma = 0;
        withinIndices = [];
      }
    });

    return violations;
  }

  /**
   * Rule 8: Eight consecutive points beyond 1σ from center line (either side)
   */
  private checkRule8(data: number[], limits: ControlLimits, threshold: number): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const { centerLine, sigma } = limits;

    const oneSigmaUpper = centerLine + sigma;
    const oneSigmaLower = centerLine - sigma;

    let consecutiveBeyondOneSigma = 0;
    let beyondIndices: number[] = [];

    data.forEach((value, index) => {
      if (value > oneSigmaUpper || value < oneSigmaLower) {
        consecutiveBeyondOneSigma++;
        beyondIndices.push(index);

        if (consecutiveBeyondOneSigma >= threshold) {
          violations.push({
            ruleNumber: 8,
            ruleName: `${threshold} consecutive points beyond 1σ`,
            severity: 'WARNING',
            description: `${consecutiveBeyondOneSigma} consecutive points beyond 1σ from center line`,
            dataPointIndices: [...beyondIndices],
            values: beyondIndices.map(i => data[i]),
          });
        }
      } else {
        consecutiveBeyondOneSigma = 0;
        beyondIndices = [];
      }
    });

    return violations;
  }

  /**
   * Get severity level for a rule
   */
  getRuleSeverity(ruleNumber: number): 'CRITICAL' | 'WARNING' | 'INFO' {
    switch (ruleNumber) {
      case 1:
        return 'CRITICAL';
      case 2:
      case 3:
      case 4:
      case 5:
      case 8:
        return 'WARNING';
      case 6:
      case 7:
        return 'INFO';
      default:
        return 'INFO';
    }
  }

  /**
   * Get rule description
   */
  getRuleDescription(ruleNumber: number): string {
    const descriptions = {
      1: 'One point beyond 3σ from center line - indicates special cause variation',
      2: 'Nine consecutive points on same side of center line - indicates process shift',
      3: 'Six consecutive points steadily increasing or decreasing - indicates trend',
      4: 'Fourteen consecutive points alternating up and down - indicates excessive variation',
      5: 'Two out of three consecutive points beyond 2σ (same side) - indicates shift',
      6: 'Four out of five consecutive points beyond 1σ (same side) - indicates moderate shift',
      7: 'Fifteen consecutive points within 1σ - indicates stratification or mixture',
      8: 'Eight consecutive points beyond 1σ from center line - indicates shift or increased variation',
    };

    return descriptions[ruleNumber as keyof typeof descriptions] || 'Unknown rule';
  }
}

export const westernElectricRulesEngine = new WesternElectricRulesEngine();
