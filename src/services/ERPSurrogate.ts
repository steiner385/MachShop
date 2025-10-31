/**
 * ERP Surrogate Service
 *
 * Comprehensive mock implementation of Enterprise Resource Planning (ERP) system
 * for receiving and processing data exports from Maximo and IndySoft surrogates.
 * Supports asset management, calibration tracking, financial integration, and reporting.
 */

import { EventEmitter } from 'events';

// ERP Data Models
export interface ERPAsset {
  erpAssetId: string;
  sourceSystem: 'MAXIMO' | 'INDYSOFT';
  sourceId: string;
  assetNumber: string;
  description: string;
  assetType: 'EQUIPMENT' | 'GAUGE' | 'TOOL';
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'MAINTENANCE';
  location: string;
  department: string;
  costCenter: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  acquisitionDate: Date;
  acquisitionCost?: number;
  currentValue?: number;
  depreciation?: DepreciationInfo;
  customFields: Record<string, any>;
  lastSyncDate: Date;
  syncStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdDate: Date;
  lastModified: Date;
}

export interface DepreciationInfo {
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
  usefulLife: number; // years
  residualValue: number;
  depreciationRate: number;
  currentBookValue: number;
  yearToDateDepreciation: number;
  accumulatedDepreciation: number;
}

export interface ERPMaintenanceRecord {
  maintenanceId: string;
  erpAssetId: string;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION' | 'INSPECTION';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: Date;
  completedDate?: Date;
  technician?: string;
  description: string;
  laborHours?: number;
  laborCost?: number;
  materialCost?: number;
  totalCost?: number;
  workOrderNumber?: string;
  notes?: string;
  attachments: ERPAttachment[];
  createdDate: Date;
  createdBy: string;
}

export interface ERPCalibrationRecord {
  calibrationId: string;
  erpAssetId: string;
  calibrationDate: Date;
  dueDate: Date;
  status: 'CURRENT' | 'DUE' | 'OVERDUE' | 'OUT_OF_TOLERANCE';
  result: 'PASS' | 'FAIL' | 'LIMITED_USE';
  certificateNumber?: string;
  technician: string;
  standardUsed: string;
  cost?: number;
  nextCalibrationDate: Date;
  notes?: string;
  attachments: ERPAttachment[];
  sourceCalibrationId?: string;
  createdDate: Date;
}

export interface ERPAttachment {
  attachmentId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadDate: Date;
  uploadedBy: string;
}

export interface ERPFinancialTransaction {
  transactionId: string;
  erpAssetId: string;
  transactionType: 'ACQUISITION' | 'DEPRECIATION' | 'MAINTENANCE' | 'DISPOSAL' | 'CALIBRATION';
  amount: number;
  currency: string;
  accountCode: string;
  description: string;
  transactionDate: Date;
  fiscalPeriod: string;
  approvedBy?: string;
  reference?: string;
  createdDate: Date;
  createdBy: string;
}

export interface ERPComplianceRecord {
  complianceId: string;
  erpAssetId: string;
  regulatoryStandard: string; // ISO, FDA, OSHA, etc.
  complianceType: 'CALIBRATION' | 'SAFETY' | 'ENVIRONMENTAL' | 'QUALITY';
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  findings?: string;
  correctiveActions?: string;
  auditor?: string;
  createdDate: Date;
}

// Configuration
export interface ERPSurrogateConfig {
  mockMode: boolean;
  enableFinancialIntegration: boolean;
  enableComplianceTracking: boolean;
  enableDepreciation: boolean;
  defaultCurrency: string;
  fiscalYearStart: number; // month (1-12)
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  autoProcessImports: boolean;
  batchProcessingEnabled: boolean;
  maxBatchSize: number;
  dataRetentionYears: number;
}

// API Response Types
export interface ERPResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    totalCount?: number;
    processed?: number;
    failed?: number;
    batchId?: string;
  };
  timestamp: Date;
}

export interface DataImportRequest {
  sourceSystem: 'MAXIMO' | 'INDYSOFT';
  importType: 'FULL' | 'INCREMENTAL' | 'DELTA';
  data: any[];
  batchId?: string;
  requestedBy: string;
}

export interface ERPReportData {
  reportType: 'ASSET_SUMMARY' | 'MAINTENANCE_COSTS' | 'CALIBRATION_STATUS' | 'COMPLIANCE_OVERVIEW';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  data: any[];
  totalRecords: number;
  generatedDate: Date;
  generatedBy: string;
}

/**
 * ERP Surrogate Service
 *
 * Provides comprehensive mock implementation of ERP functionality including:
 * - Asset master data management
 * - Financial transaction processing
 * - Maintenance cost tracking
 * - Calibration compliance monitoring
 * - Depreciation calculations
 * - Regulatory compliance tracking
 * - Batch data processing
 * - Integration with Maximo and IndySoft surrogates
 */
export class ERPSurrogate extends EventEmitter {
  private config: ERPSurrogateConfig;
  private assetStore: Map<string, ERPAsset> = new Map();
  private maintenanceStore: Map<string, ERPMaintenanceRecord> = new Map();
  private calibrationStore: Map<string, ERPCalibrationRecord> = new Map();
  private financialStore: Map<string, ERPFinancialTransaction> = new Map();
  private complianceStore: Map<string, ERPComplianceRecord> = new Map();
  private attachmentStore: Map<string, ERPAttachment> = new Map();

  // Counters for generating IDs
  private assetCounter = 1;
  private maintenanceCounter = 1;
  private calibrationCounter = 1;
  private financialCounter = 1;
  private complianceCounter = 1;
  private attachmentCounter = 1;

  constructor(config: Partial<ERPSurrogateConfig> = {}) {
    super();
    this.config = {
      mockMode: true,
      enableFinancialIntegration: true,
      enableComplianceTracking: true,
      enableDepreciation: true,
      defaultCurrency: 'USD',
      fiscalYearStart: 1, // January
      depreciationMethod: 'STRAIGHT_LINE',
      autoProcessImports: true,
      batchProcessingEnabled: true,
      maxBatchSize: 1000,
      dataRetentionYears: 7,
      ...config
    };

    // Initialize with sample data
    this.initializeSampleData();

    // Set up automatic processing
    if (this.config.autoProcessImports) {
      this.setupAutomaticProcessing();
    }
  }

  // Asset Management APIs
  async importAssetData(request: DataImportRequest): Promise<ERPResponse<{ imported: number; failed: number }>> {
    try {
      const batchId = request.batchId || `BATCH-${Date.now()}`;
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of request.data) {
        try {
          const asset = await this.processAssetImport(item, request.sourceSystem);
          if (asset) {
            imported++;
            this.emit('assetImported', { asset, sourceSystem: request.sourceSystem, batchId });
          }
        } catch (error) {
          failed++;
          errors.push(`Failed to import asset ${item.id || 'unknown'}: ${(error as Error).message}`);
        }
      }

      // Process financial transactions if enabled
      if (this.config.enableFinancialIntegration && imported > 0) {
        await this.processFinancialTransactions(request.sourceSystem, imported);
      }

      return {
        success: true,
        data: { imported, failed },
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          totalCount: request.data.length,
          processed: imported,
          failed,
          batchId
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  async getAsset(erpAssetId: string): Promise<ERPResponse<ERPAsset>> {
    const asset = this.assetStore.get(erpAssetId);

    if (!asset) {
      return {
        success: false,
        errors: [`Asset ${erpAssetId} not found`],
        timestamp: new Date()
      };
    }

    return {
      success: true,
      data: asset,
      timestamp: new Date()
    };
  }

  async queryAssets(filters: {
    sourceSystem?: 'MAXIMO' | 'INDYSOFT';
    assetType?: 'EQUIPMENT' | 'GAUGE' | 'TOOL';
    status?: string;
    location?: string;
    department?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ERPResponse<ERPAsset[]>> {
    let assets = Array.from(this.assetStore.values());

    // Apply filters
    if (filters.sourceSystem) {
      assets = assets.filter(asset => asset.sourceSystem === filters.sourceSystem);
    }
    if (filters.assetType) {
      assets = assets.filter(asset => asset.assetType === filters.assetType);
    }
    if (filters.status) {
      assets = assets.filter(asset => asset.status === filters.status);
    }
    if (filters.location) {
      assets = assets.filter(asset => asset.location === filters.location);
    }
    if (filters.department) {
      assets = assets.filter(asset => asset.department === filters.department);
    }

    // Apply pagination
    const totalCount = assets.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    assets = assets.slice(offset, offset + limit);

    return {
      success: true,
      data: assets,
      metadata: {
        totalCount,
        processed: assets.length
      },
      timestamp: new Date()
    };
  }

  // Maintenance Management APIs
  async createMaintenanceRecord(maintenanceData: Partial<ERPMaintenanceRecord>): Promise<ERPResponse<ERPMaintenanceRecord>> {
    try {
      const maintenanceId = `MAINT-${String(this.maintenanceCounter++).padStart(8, '0')}`;

      // Validate asset exists
      if (!this.assetStore.has(maintenanceData.erpAssetId!)) {
        return {
          success: false,
          errors: [`Asset ${maintenanceData.erpAssetId} not found`],
          timestamp: new Date()
        };
      }

      const maintenanceRecord: ERPMaintenanceRecord = {
        maintenanceId,
        erpAssetId: maintenanceData.erpAssetId!,
        maintenanceType: maintenanceData.maintenanceType || 'CORRECTIVE',
        status: maintenanceData.status || 'SCHEDULED',
        scheduledDate: maintenanceData.scheduledDate || new Date(),
        completedDate: maintenanceData.completedDate,
        technician: maintenanceData.technician,
        description: maintenanceData.description || '',
        laborHours: maintenanceData.laborHours,
        laborCost: maintenanceData.laborCost,
        materialCost: maintenanceData.materialCost,
        totalCost: (maintenanceData.laborCost || 0) + (maintenanceData.materialCost || 0),
        workOrderNumber: maintenanceData.workOrderNumber,
        notes: maintenanceData.notes,
        attachments: maintenanceData.attachments || [],
        createdDate: new Date(),
        createdBy: maintenanceData.technician || 'SYSTEM'
      };

      this.maintenanceStore.set(maintenanceId, maintenanceRecord);
      this.emit('maintenanceRecordCreated', maintenanceRecord);

      // Create financial transaction if costs involved
      if (this.config.enableFinancialIntegration && maintenanceRecord.totalCost && maintenanceRecord.totalCost > 0) {
        await this.createFinancialTransaction({
          erpAssetId: maintenanceRecord.erpAssetId,
          transactionType: 'MAINTENANCE',
          amount: maintenanceRecord.totalCost,
          description: `Maintenance: ${maintenanceRecord.description}`,
          reference: maintenanceId
        });
      }

      return {
        success: true,
        data: maintenanceRecord,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  // Calibration Management APIs
  async importCalibrationData(calibrationData: any[], sourceSystem: 'INDYSOFT'): Promise<ERPResponse<{ imported: number; failed: number }>> {
    try {
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of calibrationData) {
        try {
          const calibrationRecord = await this.processCalibrationImport(item, sourceSystem);
          if (calibrationRecord) {
            imported++;
            this.emit('calibrationImported', { calibrationRecord, sourceSystem });
          }
        } catch (error) {
          failed++;
          errors.push(`Failed to import calibration ${item.calibrationId || 'unknown'}: ${(error as Error).message}`);
        }
      }

      return {
        success: true,
        data: { imported, failed },
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          totalCount: calibrationData.length,
          processed: imported,
          failed
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  // Financial Management APIs
  async createFinancialTransaction(transactionData: Partial<ERPFinancialTransaction>): Promise<ERPResponse<ERPFinancialTransaction>> {
    try {
      const transactionId = `FIN-${String(this.financialCounter++).padStart(8, '0')}`;

      const transaction: ERPFinancialTransaction = {
        transactionId,
        erpAssetId: transactionData.erpAssetId!,
        transactionType: transactionData.transactionType!,
        amount: transactionData.amount!,
        currency: transactionData.currency || this.config.defaultCurrency,
        accountCode: transactionData.accountCode || this.getDefaultAccountCode(transactionData.transactionType!),
        description: transactionData.description!,
        transactionDate: transactionData.transactionDate || new Date(),
        fiscalPeriod: this.getFiscalPeriod(transactionData.transactionDate || new Date()),
        approvedBy: transactionData.approvedBy,
        reference: transactionData.reference,
        createdDate: new Date(),
        createdBy: 'ERP_SYSTEM'
      };

      this.financialStore.set(transactionId, transaction);
      this.emit('financialTransactionCreated', transaction);

      return {
        success: true,
        data: transaction,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  // Reporting APIs
  async generateReport(reportType: 'ASSET_SUMMARY' | 'MAINTENANCE_COSTS' | 'CALIBRATION_STATUS' | 'COMPLIANCE_OVERVIEW',
                      filters: any = {}): Promise<ERPResponse<ERPReportData>> {
    try {
      const startDate = filters.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      const endDate = filters.endDate || new Date();

      let data: any[] = [];
      let totalRecords = 0;

      switch (reportType) {
        case 'ASSET_SUMMARY':
          data = this.generateAssetSummaryReport(filters);
          break;
        case 'MAINTENANCE_COSTS':
          data = this.generateMaintenanceCostReport(startDate, endDate, filters);
          break;
        case 'CALIBRATION_STATUS':
          data = this.generateCalibrationStatusReport(filters);
          break;
        case 'COMPLIANCE_OVERVIEW':
          data = this.generateComplianceOverviewReport(filters);
          break;
      }

      totalRecords = data.length;

      const reportData: ERPReportData = {
        reportType,
        dateRange: { startDate, endDate },
        filters,
        data,
        totalRecords,
        generatedDate: new Date(),
        generatedBy: 'ERP_SYSTEM'
      };

      return {
        success: true,
        data: reportData,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  // Private helper methods
  private async processAssetImport(item: any, sourceSystem: 'MAXIMO' | 'INDYSOFT'): Promise<ERPAsset | null> {
    const erpAssetId = `ERP-${String(this.assetCounter++).padStart(8, '0')}`;

    const asset: ERPAsset = {
      erpAssetId,
      sourceSystem,
      sourceId: item.equipmentId || item.gaugeId || item.id,
      assetNumber: item.assetNum || item.assetTag || item.sourceId,
      description: item.description,
      assetType: sourceSystem === 'MAXIMO' ? 'EQUIPMENT' : 'GAUGE',
      status: this.mapStatus(item.status),
      location: item.location,
      department: item.department,
      costCenter: item.costCenter || 'UNASSIGNED',
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      acquisitionDate: item.acquisitionDate || item.installDate || new Date(),
      acquisitionCost: item.acquisitionCost,
      currentValue: item.acquisitionCost,
      customFields: {
        sourceData: item
      },
      lastSyncDate: new Date(),
      syncStatus: 'SUCCESS',
      createdDate: new Date(),
      lastModified: new Date()
    };

    // Add depreciation if enabled
    if (this.config.enableDepreciation && asset.acquisitionCost) {
      asset.depreciation = this.calculateDepreciation(asset);
    }

    this.assetStore.set(erpAssetId, asset);

    // Create financial transaction for acquisition if cost is available
    if (this.config.enableFinancialIntegration && asset.acquisitionCost) {
      await this.createFinancialTransaction({
        erpAssetId,
        transactionType: 'ACQUISITION',
        amount: asset.acquisitionCost,
        description: `Asset acquisition: ${asset.description}`,
        transactionDate: asset.acquisitionDate
      });
    }

    return asset;
  }

  private async processCalibrationImport(item: any, sourceSystem: 'INDYSOFT'): Promise<ERPCalibrationRecord | null> {
    const calibrationId = `CAL-${String(this.calibrationCounter++).padStart(8, '0')}`;

    // Find corresponding ERP asset
    const erpAsset = Array.from(this.assetStore.values())
      .find(asset => asset.sourceId === item.gaugeId && asset.sourceSystem === sourceSystem);

    if (!erpAsset) {
      throw new Error(`No ERP asset found for gauge ${item.gaugeId}`);
    }

    const calibrationRecord: ERPCalibrationRecord = {
      calibrationId,
      erpAssetId: erpAsset.erpAssetId,
      calibrationDate: item.calibrationDate,
      dueDate: item.nextCalibrationDate,
      status: this.mapCalibrationStatus(item.overallResult),
      result: item.overallResult,
      certificateNumber: item.certificateNumber,
      technician: item.technician,
      standardUsed: item.calibrationStandard,
      cost: this.estimateCalibrationCost(erpAsset.assetType),
      nextCalibrationDate: item.nextCalibrationDate,
      notes: item.comments,
      attachments: [],
      sourceCalibrationId: item.calibrationId,
      createdDate: new Date()
    };

    this.calibrationStore.set(calibrationId, calibrationRecord);

    // Create financial transaction for calibration cost
    if (this.config.enableFinancialIntegration && calibrationRecord.cost) {
      await this.createFinancialTransaction({
        erpAssetId: erpAsset.erpAssetId,
        transactionType: 'CALIBRATION',
        amount: calibrationRecord.cost,
        description: `Calibration: ${erpAsset.description}`,
        reference: calibrationId
      });
    }

    return calibrationRecord;
  }

  private mapStatus(status: string): 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'MAINTENANCE' {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'OPERATIONAL':
        return 'ACTIVE';
      case 'MAINTENANCE':
      case 'REPAIR':
        return 'MAINTENANCE';
      case 'RETIRED':
      case 'DECOMMISSIONED':
        return 'RETIRED';
      default:
        return 'INACTIVE';
    }
  }

  private mapCalibrationStatus(result: string): 'CURRENT' | 'DUE' | 'OVERDUE' | 'OUT_OF_TOLERANCE' {
    switch (result?.toUpperCase()) {
      case 'PASS':
        return 'CURRENT';
      case 'FAIL':
        return 'OUT_OF_TOLERANCE';
      case 'LIMITED_USE':
        return 'DUE';
      default:
        return 'OVERDUE';
    }
  }

  private calculateDepreciation(asset: ERPAsset): DepreciationInfo {
    const usefulLife = this.getUsefulLife(asset.assetType);
    const acquisitionCost = asset.acquisitionCost || 0;
    const residualValue = acquisitionCost * 0.1; // 10% residual value
    const depreciationRate = (acquisitionCost - residualValue) / usefulLife;

    const yearsInService = (new Date().getFullYear() - asset.acquisitionDate.getFullYear());
    const accumulatedDepreciation = Math.min(depreciationRate * yearsInService, acquisitionCost - residualValue);
    const currentBookValue = acquisitionCost - accumulatedDepreciation;

    return {
      method: this.config.depreciationMethod,
      usefulLife,
      residualValue,
      depreciationRate,
      currentBookValue,
      yearToDateDepreciation: depreciationRate,
      accumulatedDepreciation
    };
  }

  private getUsefulLife(assetType: string): number {
    switch (assetType) {
      case 'EQUIPMENT': return 10;
      case 'GAUGE': return 7;
      case 'TOOL': return 5;
      default: return 8;
    }
  }

  private estimateCalibrationCost(assetType: string): number {
    switch (assetType) {
      case 'GAUGE': return 150 + Math.random() * 100; // $150-250
      case 'EQUIPMENT': return 300 + Math.random() * 200; // $300-500
      default: return 200;
    }
  }

  private getDefaultAccountCode(transactionType: string): string {
    switch (transactionType) {
      case 'ACQUISITION': return '1500'; // Fixed Assets
      case 'DEPRECIATION': return '6100'; // Depreciation Expense
      case 'MAINTENANCE': return '6200'; // Maintenance Expense
      case 'CALIBRATION': return '6300'; // Calibration Expense
      case 'DISPOSAL': return '1599'; // Asset Disposal
      default: return '6000'; // General Expense
    }
  }

  private getFiscalPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const fiscalYear = month >= this.config.fiscalYearStart ? year : year - 1;
    return `FY${fiscalYear}-${month.toString().padStart(2, '0')}`;
  }

  private generateAssetSummaryReport(filters: any): any[] {
    const assets = Array.from(this.assetStore.values());

    const summary = {
      totalAssets: assets.length,
      bySourceSystem: {} as Record<string, number>,
      byAssetType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalValue: 0,
      totalDepreciation: 0
    };

    assets.forEach(asset => {
      summary.bySourceSystem[asset.sourceSystem] = (summary.bySourceSystem[asset.sourceSystem] || 0) + 1;
      summary.byAssetType[asset.assetType] = (summary.byAssetType[asset.assetType] || 0) + 1;
      summary.byStatus[asset.status] = (summary.byStatus[asset.status] || 0) + 1;
      summary.totalValue += asset.currentValue || 0;
      summary.totalDepreciation += asset.depreciation?.accumulatedDepreciation || 0;
    });

    return [summary];
  }

  private generateMaintenanceCostReport(startDate: Date, endDate: Date, filters: any): any[] {
    const maintenance = Array.from(this.maintenanceStore.values())
      .filter(record => record.scheduledDate >= startDate && record.scheduledDate <= endDate);

    const summary = {
      totalRecords: maintenance.length,
      totalCost: maintenance.reduce((sum, record) => sum + (record.totalCost || 0), 0),
      averageCost: 0,
      byType: {} as Record<string, { count: number; cost: number }>,
      byStatus: {} as Record<string, { count: number; cost: number }>
    };

    maintenance.forEach(record => {
      const type = record.maintenanceType;
      const status = record.status;
      const cost = record.totalCost || 0;

      if (!summary.byType[type]) summary.byType[type] = { count: 0, cost: 0 };
      if (!summary.byStatus[status]) summary.byStatus[status] = { count: 0, cost: 0 };

      summary.byType[type].count++;
      summary.byType[type].cost += cost;
      summary.byStatus[status].count++;
      summary.byStatus[status].cost += cost;
    });

    summary.averageCost = summary.totalCost / Math.max(summary.totalRecords, 1);

    return [summary];
  }

  private generateCalibrationStatusReport(filters: any): any[] {
    const calibrations = Array.from(this.calibrationStore.values());

    const summary = {
      totalCalibrations: calibrations.length,
      byStatus: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      upcoming: calibrations.filter(cal => cal.dueDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length,
      overdue: calibrations.filter(cal => cal.dueDate < new Date() && cal.status !== 'CURRENT').length
    };

    calibrations.forEach(calibration => {
      summary.byStatus[calibration.status] = (summary.byStatus[calibration.status] || 0) + 1;
      summary.byResult[calibration.result] = (summary.byResult[calibration.result] || 0) + 1;
    });

    return [summary];
  }

  private generateComplianceOverviewReport(filters: any): any[] {
    const compliance = Array.from(this.complianceStore.values());

    const summary = {
      totalRecords: compliance.length,
      compliant: compliance.filter(record => record.status === 'COMPLIANT').length,
      nonCompliant: compliance.filter(record => record.status === 'NON_COMPLIANT').length,
      pendingReview: compliance.filter(record => record.status === 'PENDING_REVIEW').length,
      byStandard: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    compliance.forEach(record => {
      summary.byStandard[record.regulatoryStandard] = (summary.byStandard[record.regulatoryStandard] || 0) + 1;
      summary.byType[record.complianceType] = (summary.byType[record.complianceType] || 0) + 1;
    });

    return [summary];
  }

  private async processFinancialTransactions(sourceSystem: string, count: number): Promise<void> {
    // Create summary financial entry for batch import
    await this.createFinancialTransaction({
      erpAssetId: 'BATCH_IMPORT',
      transactionType: 'ACQUISITION',
      amount: count * 1000, // Estimated value
      description: `Batch import from ${sourceSystem}: ${count} assets`,
      transactionDate: new Date()
    });
  }

  private initializeSampleData(): void {
    // Generate some sample ERP data
    console.log('[ERP] Initializing with sample asset and financial data');
  }

  private setupAutomaticProcessing(): void {
    // Set up event listeners for automatic processing
    this.on('assetImported', (data) => {
      console.log(`[ERP] Asset imported: ${data.asset.assetNumber} from ${data.sourceSystem}`);
    });

    this.on('calibrationImported', (data) => {
      console.log(`[ERP] Calibration imported: ${data.calibrationRecord.calibrationId}`);
    });

    this.on('financialTransactionCreated', (transaction) => {
      console.log(`[ERP] Financial transaction created: ${transaction.transactionId} - ${transaction.amount} ${transaction.currency}`);
    });
  }

  // Health check and utility methods
  async getHealthStatus(): Promise<ERPResponse<any>> {
    return {
      success: true,
      data: {
        service: 'ERP Surrogate',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date(),
        mockMode: this.config.mockMode,
        assetCount: this.assetStore.size,
        maintenanceRecordCount: this.maintenanceStore.size,
        calibrationRecordCount: this.calibrationStore.size,
        financialTransactionCount: this.financialStore.size,
        complianceRecordCount: this.complianceStore.size
      },
      timestamp: new Date()
    };
  }

  async resetMockData(): Promise<ERPResponse<void>> {
    this.assetStore.clear();
    this.maintenanceStore.clear();
    this.calibrationStore.clear();
    this.financialStore.clear();
    this.complianceStore.clear();
    this.attachmentStore.clear();

    this.assetCounter = 1;
    this.maintenanceCounter = 1;
    this.calibrationCounter = 1;
    this.financialCounter = 1;
    this.complianceCounter = 1;
    this.attachmentCounter = 1;

    this.initializeSampleData();

    return {
      success: true,
      timestamp: new Date()
    };
  }
}