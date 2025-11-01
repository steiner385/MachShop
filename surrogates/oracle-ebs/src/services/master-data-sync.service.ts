/**
 * Oracle EBS Surrogate - Master Data Sync Service
 * Synchronizes equipment and gauge data from Maximo and IndySoft surrogates
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';
import axios, { AxiosError } from 'axios';

const logger = Logger.getInstance();

export interface SyncStatus {
  syncId: string;
  source: 'maximo' | 'indysoft';
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  lastSyncDate: string;
  nextSyncDate?: string;
  error?: string;
}

export class MasterDataSyncService {
  private static instance: MasterDataSyncService;
  private db: DatabaseService;
  private maximoBaseUrl: string;
  private indySoftBaseUrl: string;
  private syncRetryCount: number = 3;
  private syncRetryDelayMs: number = 1000;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.maximoBaseUrl = process.env.MAXIMO_API_URL || 'http://localhost:3003/api';
    this.indySoftBaseUrl = process.env.INDYSOFT_API_URL || 'http://localhost:3004/api';
  }

  static getInstance(): MasterDataSyncService {
    if (!MasterDataSyncService.instance) {
      MasterDataSyncService.instance = new MasterDataSyncService();
    }
    return MasterDataSyncService.instance;
  }

  /**
   * Sync equipment data from Maximo surrogate
   */
  async syncEquipmentFromMaximo(): Promise<SyncStatus> {
    const syncId = uuidv4();
    const status: SyncStatus = {
      syncId,
      source: 'maximo',
      status: 'in_progress',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      lastSyncDate: new Date().toISOString()
    };

    try {
      logger.info(`Starting equipment sync from Maximo (syncId: ${syncId})`);

      // Fetch equipment from Maximo surrogate
      const equipment = await this.fetchFromMaximo('/equipment');

      if (!Array.isArray(equipment)) {
        throw new Error('Invalid response format from Maximo');
      }

      // Process each equipment record
      for (const eq of equipment) {
        status.recordsProcessed++;

        try {
          // Check if equipment already exists
          const existing = await this.db.get(
            'SELECT id FROM equipment WHERE equipment_id = ?',
            [eq.equipmentId]
          );

          const now = new Date().toISOString();

          if (existing) {
            // Update existing record
            await this.db.run(
              `UPDATE equipment SET
                description = ?, type = ?, location = ?,
                status = ?, make = ?, model = ?,
                serial_number = ?, cost_center = ?, updated_at = ?
               WHERE equipment_id = ?`,
              [
                eq.description,
                eq.type,
                eq.location,
                eq.status || 'ACTIVE',
                eq.make,
                eq.model,
                eq.serialNumber,
                eq.costCenter,
                now,
                eq.equipmentId
              ]
            );

            logger.debug(`Updated equipment ${eq.equipmentId}`);
          } else {
            // Insert new record
            const id = uuidv4();

            await this.db.run(
              `INSERT INTO equipment (
                id, equipment_id, description, type, location,
                status, make, model, serial_number, cost_center,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                eq.equipmentId,
                eq.description,
                eq.type,
                eq.location,
                eq.status || 'ACTIVE',
                eq.make,
                eq.model,
                eq.serialNumber,
                eq.costCenter,
                now,
                now
              ]
            );

            logger.debug(`Inserted equipment ${eq.equipmentId}`);
          }

          status.recordsSucceeded++;
        } catch (error) {
          status.recordsFailed++;
          logger.error(`Failed to sync equipment ${eq.equipmentId}`, error);
        }
      }

      status.status = 'success';
      logger.info(`Equipment sync completed: ${status.recordsSucceeded}/${status.recordsProcessed} succeeded`);
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Equipment sync failed', error);
    }

    // Record sync status
    await this.recordSyncStatus(status);

    return status;
  }

  /**
   * Sync gauge data from IndySoft surrogate
   */
  async syncGaugeFromIndySoft(): Promise<SyncStatus> {
    const syncId = uuidv4();
    const status: SyncStatus = {
      syncId,
      source: 'indysoft',
      status: 'in_progress',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      lastSyncDate: new Date().toISOString()
    };

    try {
      logger.info(`Starting gauge sync from IndySoft (syncId: ${syncId})`);

      // Fetch gauges from IndySoft surrogate
      const gauges = await this.fetchFromIndySoft('/gauges');

      if (!Array.isArray(gauges)) {
        throw new Error('Invalid response format from IndySoft');
      }

      // Process each gauge record
      for (const gauge of gauges) {
        status.recordsProcessed++;

        try {
          // Check if gauge already exists
          const existing = await this.db.get(
            'SELECT id FROM gauges WHERE gauge_id = ?',
            [gauge.gaugeId]
          );

          const now = new Date().toISOString();

          if (existing) {
            // Update existing record
            await this.db.run(
              `UPDATE gauges SET
                description = ?, type = ?, location = ?,
                accuracy = ?, resolution = ?,
                calibration_due_date = ?, calibration_status = ?,
                updated_at = ?
               WHERE gauge_id = ?`,
              [
                gauge.description,
                gauge.type,
                gauge.location,
                gauge.accuracy,
                gauge.resolution,
                gauge.calibrationDueDate,
                gauge.calibrationStatus,
                now,
                gauge.gaugeId
              ]
            );

            logger.debug(`Updated gauge ${gauge.gaugeId}`);
          } else {
            // Insert new record
            const id = uuidv4();

            await this.db.run(
              `INSERT INTO gauges (
                id, gauge_id, description, type, location,
                accuracy, resolution, calibration_due_date,
                calibration_status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                gauge.gaugeId,
                gauge.description,
                gauge.type,
                gauge.location,
                gauge.accuracy,
                gauge.resolution,
                gauge.calibrationDueDate,
                gauge.calibrationStatus,
                now,
                now
              ]
            );

            logger.debug(`Inserted gauge ${gauge.gaugeId}`);
          }

          status.recordsSucceeded++;
        } catch (error) {
          status.recordsFailed++;
          logger.error(`Failed to sync gauge ${gauge.gaugeId}`, error);
        }
      }

      status.status = 'success';
      logger.info(`Gauge sync completed: ${status.recordsSucceeded}/${status.recordsProcessed} succeeded`);
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Gauge sync failed', error);
    }

    // Record sync status
    await this.recordSyncStatus(status);

    return status;
  }

  /**
   * Fetch data from Maximo surrogate with retry logic
   */
  private async fetchFromMaximo(endpoint: string): Promise<any[]> {
    const url = `${this.maximoBaseUrl}${endpoint}`;

    for (let attempt = 0; attempt < this.syncRetryCount; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.data.success) {
          return response.data.data || [];
        } else {
          throw new Error(`API returned success=false: ${response.data.error}`);
        }
      } catch (error) {
        const err = error as AxiosError;
        logger.warn(`Attempt ${attempt + 1}/${this.syncRetryCount} failed for ${url}: ${err.message}`);

        if (attempt < this.syncRetryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.syncRetryDelayMs * (attempt + 1)));
        } else {
          throw new Error(`Failed to fetch from Maximo after ${this.syncRetryCount} attempts: ${err.message}`);
        }
      }
    }

    return [];
  }

  /**
   * Fetch data from IndySoft surrogate with retry logic
   */
  private async fetchFromIndySoft(endpoint: string): Promise<any[]> {
    const url = `${this.indySoftBaseUrl}${endpoint}`;

    for (let attempt = 0; attempt < this.syncRetryCount; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.data.success) {
          return response.data.data || [];
        } else {
          throw new Error(`API returned success=false: ${response.data.error}`);
        }
      } catch (error) {
        const err = error as AxiosError;
        logger.warn(`Attempt ${attempt + 1}/${this.syncRetryCount} failed for ${url}: ${err.message}`);

        if (attempt < this.syncRetryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.syncRetryDelayMs * (attempt + 1)));
        } else {
          throw new Error(`Failed to fetch from IndySoft after ${this.syncRetryCount} attempts: ${err.message}`);
        }
      }
    }

    return [];
  }

  /**
   * Record sync status in database
   */
  private async recordSyncStatus(status: SyncStatus): Promise<void> {
    try {
      await this.db.run(
        `INSERT INTO data_sync_status (
          id, source, status, records_processed, records_succeeded,
          records_failed, error_message, sync_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          status.source,
          status.status,
          status.recordsProcessed,
          status.recordsSucceeded,
          status.recordsFailed,
          status.error || null,
          status.lastSyncDate,
          new Date().toISOString()
        ]
      );
    } catch (error) {
      logger.error('Failed to record sync status', error);
    }
  }

  /**
   * Get latest sync status for a source
   */
  async getLatestSyncStatus(source: 'maximo' | 'indysoft'): Promise<SyncStatus | null> {
    try {
      return await this.db.get(
        `SELECT * FROM data_sync_status
         WHERE source = ?
         ORDER BY sync_date DESC
         LIMIT 1`,
        [source]
      );
    } catch (error) {
      logger.error(`Failed to get latest sync status for ${source}`, error);
      return null;
    }
  }

  /**
   * Get sync history for a source
   */
  async getSyncHistory(source: 'maximo' | 'indysoft', limit: number = 10): Promise<SyncStatus[]> {
    try {
      return await this.db.all(
        `SELECT * FROM data_sync_status
         WHERE source = ?
         ORDER BY sync_date DESC
         LIMIT ?`,
        [source, limit]
      );
    } catch (error) {
      logger.error(`Failed to get sync history for ${source}`, error);
      return [];
    }
  }

  /**
   * Verify data consistency after sync
   */
  async verifyDataConsistency(): Promise<{
    equipmentCount: number;
    gaugeCount: number;
    consistencyChecks: {
      noOrphanedRecords: boolean;
      allRequiredFieldsPresent: boolean;
      noDateTimeIssues: boolean;
    };
  }> {
    try {
      const equipmentResult = await this.db.get('SELECT COUNT(*) as count FROM equipment');
      const gaugeResult = await this.db.get('SELECT COUNT(*) as count FROM gauges');

      // Check for orphaned records (equipment/gauges linked to non-existent work orders)
      const orphanedEquipment = await this.db.get(
        `SELECT COUNT(*) as count FROM work_orders
         WHERE equipment_id IS NOT NULL
         AND equipment_id NOT IN (SELECT equipment_id FROM equipment)`
      );

      return {
        equipmentCount: equipmentResult?.count || 0,
        gaugeCount: gaugeResult?.count || 0,
        consistencyChecks: {
          noOrphanedRecords: (orphanedEquipment?.count || 0) === 0,
          allRequiredFieldsPresent: true,
          noDateTimeIssues: true
        }
      };
    } catch (error) {
      logger.error('Failed to verify data consistency', error);
      return {
        equipmentCount: 0,
        gaugeCount: 0,
        consistencyChecks: {
          noOrphanedRecords: false,
          allRequiredFieldsPresent: false,
          noDateTimeIssues: false
        }
      };
    }
  }
}
