/**
 * Staging Location Optimization Service
 *
 * Handles intelligent assignment of staging locations for kits based on:
 * - Work cell proximity and optimization
 * - Capacity and availability constraints
 * - Security and environmental requirements
 * - Material handling efficiency
 */

import { PrismaClient, StagingLocation, Kit, StagingLocationType, SecurityLevel, KitPriority } from '@prisma/client';
import { logger } from '../utils/logger';

export interface StagingAssignmentOptions {
  kitId: string;
  workCellId?: string;
  priority?: KitPriority;
  requiresCleanRoom?: boolean;
  requiresHazmatHandling?: boolean;
  requiresHighSecurity?: boolean;
  preferredLocationId?: string;
  maxDistance?: number; // Maximum distance from work cell (meters)
  environmentalRequirements?: EnvironmentalRequirements;
}

export interface EnvironmentalRequirements {
  temperatureMin?: number;
  temperatureMax?: number;
  humidityMax?: number;
  esdProtection?: boolean;
  climateControl?: boolean;
}

export interface LocationScore {
  locationId: string;
  score: number;
  proximityScore: number;
  capacityScore: number;
  environmentalScore: number;
  securityScore: number;
  availabilityScore: number;
  reasonings: string[];
}

export interface StagingOptimizationResult {
  recommendedLocation: StagingLocation;
  score: LocationScore;
  alternativeLocations: LocationScore[];
  estimatedAssignmentTime: number;
  warnings: string[];
}

export interface LocationUtilization {
  locationId: string;
  capacity: number;
  occupied: number;
  utilizationPercent: number;
  projectedUtilization: number;
  bottleneckRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class StagingLocationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find optimal staging location for a kit
   */
  async findOptimalLocation(options: StagingAssignmentOptions): Promise<StagingOptimizationResult> {
    logger.info(`Finding optimal staging location for kit ${options.kitId}`, { options });

    try {
      // Get kit details
      const kit = await this.getKitWithDetails(options.kitId);
      if (!kit) {
        throw new Error(`Kit ${options.kitId} not found`);
      }

      // Get available staging locations
      const availableLocations = await this.getAvailableLocations(options);

      // Score each location
      const locationScores = await this.scoreLocations(kit, availableLocations, options);

      // Sort by score (highest first)
      locationScores.sort((a, b) => b.score - a.score);

      if (locationScores.length === 0) {
        throw new Error('No suitable staging locations available');
      }

      // Get the best location details
      const bestLocation = await this.prisma.stagingLocation.findUnique({
        where: { id: locationScores[0].locationId },
        include: { area: true }
      });

      // Generate warnings
      const warnings = this.generateLocationWarnings(locationScores[0], kit);

      // Estimate assignment time
      const estimatedAssignmentTime = this.calculateAssignmentTime(kit, bestLocation!);

      return {
        recommendedLocation: bestLocation!,
        score: locationScores[0],
        alternativeLocations: locationScores.slice(1, 4), // Top 3 alternatives
        estimatedAssignmentTime,
        warnings
      };

    } catch (error) {
      logger.error(`Error finding optimal staging location for kit ${options.kitId}`, { error });
      throw new Error(`Location optimization failed: ${error.message}`);
    }
  }

  /**
   * Assign kit to staging location
   */
  async assignKitToLocation(kitId: string, locationId: string, assignedById: string): Promise<void> {
    logger.info(`Assigning kit ${kitId} to staging location ${locationId}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Update kit with staging location
        await tx.kit.update({
          where: { id: kitId },
          data: {
            stagingLocationId: locationId,
            stagedAt: new Date(),
            stagedById: assignedById,
            status: 'STAGED'
          }
        });

        // Update location occupancy
        await tx.stagingLocation.update({
          where: { id: locationId },
          data: {
            currentOccupancy: {
              increment: 1
            }
          }
        });

        // Create status history record
        await tx.kitStatusHistory.create({
          data: {
            kitId,
            fromStatus: 'STAGING',
            toStatus: 'STAGED',
            changedById: assignedById,
            reason: 'Kit assigned to staging location',
            notes: `Assigned to location ${locationId}`
          }
        });
      });

      logger.info(`Successfully assigned kit ${kitId} to staging location ${locationId}`);

    } catch (error) {
      logger.error(`Error assigning kit ${kitId} to staging location ${locationId}`, { error });
      throw new Error(`Kit assignment failed: ${error.message}`);
    }
  }

  /**
   * Get location utilization analytics
   */
  async getLocationUtilization(areaId?: string): Promise<LocationUtilization[]> {
    const whereClause = areaId ? { areaId, isActive: true } : { isActive: true };

    const locations = await this.prisma.stagingLocation.findMany({
      where: whereClause,
      include: {
        kits: {
          where: {
            status: { in: ['STAGING', 'STAGED'] }
          }
        }
      }
    });

    return locations.map(location => {
      const occupied = location.currentOccupancy;
      const capacity = location.maxCapacity || 10; // Default capacity
      const utilizationPercent = (occupied / capacity) * 100;

      // Calculate projected utilization based on pending kits
      const pendingKits = location.kits.filter(kit => kit.status === 'STAGING').length;
      const projectedUtilization = ((occupied + pendingKits) / capacity) * 100;

      // Determine bottleneck risk
      let bottleneckRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (projectedUtilization > 90) bottleneckRisk = 'HIGH';
      else if (projectedUtilization > 70) bottleneckRisk = 'MEDIUM';

      return {
        locationId: location.id,
        capacity,
        occupied,
        utilizationPercent,
        projectedUtilization,
        bottleneckRisk
      };
    });
  }

  /**
   * Optimize location assignments across all kits
   */
  async optimizeAllAssignments(areaId?: string): Promise<{ reassignments: number; improvements: string[] }> {
    logger.info('Starting global staging location optimization', { areaId });

    const improvements: string[] = [];
    let reassignments = 0;

    try {
      // Get all staged kits in the area
      const stagedKits = await this.getStagedKits(areaId);

      // Get current utilization
      const currentUtilization = await this.getLocationUtilization(areaId);

      // Identify optimization opportunities
      for (const kit of stagedKits) {
        const currentScore = await this.scoreLocation(kit, kit.stagingLocationId!);
        const optimalResult = await this.findOptimalLocation({ kitId: kit.id });

        // If optimal location is significantly better, suggest reassignment
        if (optimalResult.score.score > currentScore.score * 1.2) {
          // Simulate reassignment
          improvements.push(
            `Kit ${kit.kitNumber}: Move from ${kit.stagingLocation?.locationCode} to ${optimalResult.recommendedLocation.locationCode} (Score improvement: ${currentScore.score.toFixed(1)} → ${optimalResult.score.score.toFixed(1)})`
          );
          reassignments++;
        }
      }

      logger.info(`Optimization complete: ${reassignments} potential reassignments identified`, {
        reassignments,
        improvements: improvements.length
      });

      return { reassignments, improvements };

    } catch (error) {
      logger.error('Error during global staging optimization', { error });
      throw new Error(`Global optimization failed: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */

  private async getKitWithDetails(kitId: string) {
    return await this.prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        workOrder: {
          include: {
            part: true
          }
        },
        operation: true,
        kitItems: {
          include: {
            part: true
          }
        }
      }
    });
  }

  private async getAvailableLocations(options: StagingAssignmentOptions): Promise<StagingLocation[]> {
    const whereConditions: any = {
      isActive: true,
      isAvailable: true,
      maintenanceMode: false,
      currentOccupancy: {
        lt: this.prisma.stagingLocation.fields.maxCapacity
      }
    };

    // Apply environmental filters
    if (options.requiresCleanRoom) {
      whereConditions.isCleanRoom = true;
    }

    if (options.requiresHazmatHandling) {
      whereConditions.locationType = StagingLocationType.HAZMAT;
    }

    if (options.requiresHighSecurity) {
      whereConditions.securityLevel = { in: [SecurityLevel.RESTRICTED, SecurityLevel.CLASSIFIED] };
    }

    if (options.environmentalRequirements?.esdProtection) {
      whereConditions.esdProtected = true;
    }

    if (options.environmentalRequirements?.climateControl) {
      whereConditions.hasClimateControl = true;
    }

    return await this.prisma.stagingLocation.findMany({
      where: whereConditions,
      include: {
        area: true,
        kits: {
          where: {
            status: { in: ['STAGING', 'STAGED'] }
          }
        }
      }
    });
  }

  private async scoreLocations(kit: any, locations: StagingLocation[], options: StagingAssignmentOptions): Promise<LocationScore[]> {
    const scores: LocationScore[] = [];

    for (const location of locations) {
      const score = await this.scoreLocation(kit, location.id, options);
      scores.push(score);
    }

    return scores;
  }

  private async scoreLocation(kit: any, locationId: string, options?: StagingAssignmentOptions): Promise<LocationScore> {
    const location = await this.prisma.stagingLocation.findUnique({
      where: { id: locationId },
      include: {
        area: true,
        kits: true
      }
    });

    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const reasonings: string[] = [];

    // 1. Proximity Score (40% weight)
    const proximityScore = this.calculateProximityScore(kit, location, options);
    reasonings.push(`Proximity: ${proximityScore.toFixed(1)}/100`);

    // 2. Capacity Score (25% weight)
    const capacityScore = this.calculateCapacityScore(location);
    reasonings.push(`Capacity: ${capacityScore.toFixed(1)}/100`);

    // 3. Environmental Score (15% weight)
    const environmentalScore = this.calculateEnvironmentalScore(kit, location, options);
    reasonings.push(`Environment: ${environmentalScore.toFixed(1)}/100`);

    // 4. Security Score (10% weight)
    const securityScore = this.calculateSecurityScore(kit, location);
    reasonings.push(`Security: ${securityScore.toFixed(1)}/100`);

    // 5. Availability Score (10% weight)
    const availabilityScore = this.calculateAvailabilityScore(location);
    reasonings.push(`Availability: ${availabilityScore.toFixed(1)}/100`);

    // Calculate weighted total score
    const totalScore = (
      proximityScore * 0.40 +
      capacityScore * 0.25 +
      environmentalScore * 0.15 +
      securityScore * 0.10 +
      availabilityScore * 0.10
    );

    return {
      locationId: location.id,
      score: totalScore,
      proximityScore,
      capacityScore,
      environmentalScore,
      securityScore,
      availabilityScore,
      reasonings
    };
  }

  private calculateProximityScore(kit: any, location: StagingLocation, options?: StagingAssignmentOptions): number {
    // If work cell is specified, calculate proximity score
    if (options?.workCellId || kit.workCellId) {
      const targetWorkCell = options?.workCellId || kit.workCellId;

      // Check if this work cell is in the location's preferred work cells
      if (location.nearWorkCells.includes(targetWorkCell)) {
        return location.proximityScore || 90; // Use stored proximity score or default high
      }

      // If not in preferred list but same area, give moderate score
      if (location.area && kit.operation?.siteId === location.area.siteId) {
        return 60;
      }

      // Different area/site gets low score
      return 20;
    }

    // No work cell specified, use location's general proximity score
    return location.proximityScore || 50;
  }

  private calculateCapacityScore(location: StagingLocation): number {
    const maxCapacity = location.maxCapacity || 10;
    const currentOccupancy = location.currentOccupancy;
    const utilizationPercent = (currentOccupancy / maxCapacity) * 100;

    // Optimal utilization is around 60-80%
    if (utilizationPercent < 40) return 70; // Under-utilized
    if (utilizationPercent <= 80) return 100; // Optimal range
    if (utilizationPercent <= 95) return 50; // High utilization
    return 10; // Near capacity
  }

  private calculateEnvironmentalScore(kit: any, location: StagingLocation, options?: StagingAssignmentOptions): number {
    let score = 100;

    // Check if required environmental conditions are met
    if (options?.requiresCleanRoom && !location.isCleanRoom) score -= 50;
    if (options?.environmentalRequirements?.esdProtection && !location.esdProtected) score -= 30;
    if (options?.environmentalRequirements?.climateControl && !location.hasClimateControl) score -= 20;

    // Check temperature requirements
    if (options?.environmentalRequirements?.temperatureMin && location.temperatureMin) {
      if (location.temperatureMin > options.environmentalRequirements.temperatureMin) score -= 20;
    }

    if (options?.environmentalRequirements?.temperatureMax && location.temperatureMax) {
      if (location.temperatureMax < options.environmentalRequirements.temperatureMax) score -= 20;
    }

    // Bonus for clean room capabilities when dealing with precision parts
    if (location.isCleanRoom && this.requiresPrecisionHandling(kit)) {
      score += 10;
    }

    return Math.max(0, score);
  }

  private calculateSecurityScore(kit: any, location: StagingLocation): number {
    // Determine required security level based on kit contents
    const requiredSecurity = this.determineRequiredSecurity(kit);

    const securityLevels = {
      [SecurityLevel.OPEN]: 1,
      [SecurityLevel.STANDARD]: 2,
      [SecurityLevel.RESTRICTED]: 3,
      [SecurityLevel.CLASSIFIED]: 4
    };

    const required = securityLevels[requiredSecurity];
    const provided = securityLevels[location.securityLevel];

    // Perfect match gets 100
    if (provided === required) return 100;

    // Over-secured is ok but not optimal
    if (provided > required) return 80;

    // Under-secured is penalized heavily
    return Math.max(0, 100 - (required - provided) * 30);
  }

  private calculateAvailabilityScore(location: StagingLocation): number {
    let score = 100;

    if (!location.isAvailable) score -= 60;
    if (location.maintenanceMode) score -= 40;

    // Bonus for locations with monitoring capabilities
    if (location.hasSecurityCamera) score += 5;
    if (location.hasAccessControl) score += 5;

    return Math.max(0, score);
  }

  private requiresPrecisionHandling(kit: any): boolean {
    // Check if kit contains precision parts that require clean room handling
    return kit.kitItems?.some((item: any) =>
      item.part?.partType?.includes('PRECISION') ||
      item.part?.partName?.toLowerCase().includes('bearing') ||
      item.part?.partName?.toLowerCase().includes('seal')
    ) || false;
  }

  private determineRequiredSecurity(kit: any): SecurityLevel {
    // Determine security level based on kit contents and value
    const hasHighValueParts = kit.kitItems?.some((item: any) =>
      (item.part?.standardCost || 0) > 10000
    );

    const hasCriticalParts = kit.kitItems?.some((item: any) =>
      item.isCritical || item.part?.requiresFAI
    );

    if (hasHighValueParts || hasCriticalParts) {
      return SecurityLevel.RESTRICTED;
    }

    return SecurityLevel.STANDARD;
  }

  private generateLocationWarnings(score: LocationScore, kit: any): string[] {
    const warnings: string[] = [];

    if (score.score < 70) {
      warnings.push('Suboptimal location assignment. Consider reviewing location criteria.');
    }

    if (score.capacityScore < 50) {
      warnings.push('Assigned location is near capacity. Monitor for potential bottlenecks.');
    }

    if (score.proximityScore < 60) {
      warnings.push('Location is not optimal for work cell proximity. May increase material handling time.');
    }

    if (score.environmentalScore < 80 && this.requiresPrecisionHandling(kit)) {
      warnings.push('Environmental conditions may not be optimal for precision parts handling.');
    }

    return warnings;
  }

  private calculateAssignmentTime(kit: any, location: StagingLocation): number {
    // Base time for kit staging
    let baseTime = 15; // 15 minutes base

    // Add time based on kit complexity
    const itemCount = kit.kitItems?.length || 0;
    const itemTime = itemCount * 1.5; // 1.5 minutes per item

    // Add time for special handling
    let specialHandlingTime = 0;
    if (location.locationType === StagingLocationType.HAZMAT) specialHandlingTime += 10;
    if (location.isCleanRoom) specialHandlingTime += 5;
    if (location.securityLevel === SecurityLevel.RESTRICTED) specialHandlingTime += 5;

    return baseTime + itemTime + specialHandlingTime;
  }

  private async getStagedKits(areaId?: string) {
    const whereClause: any = {
      status: { in: ['STAGING', 'STAGED'] },
      stagingLocationId: { not: null }
    };

    if (areaId) {
      whereClause.stagingLocation = {
        areaId: areaId
      };
    }

    return await this.prisma.kit.findMany({
      where: whereClause,
      include: {
        stagingLocation: true,
        workOrder: true,
        operation: true,
        kitItems: {
          include: {
            part: true
          }
        }
      }
    });
  }
}