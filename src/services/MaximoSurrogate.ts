import { EventEmitter } from 'events';
import { ErrorSimulationService } from './ErrorSimulationService';

/**
 * IBM Maximo Asset Management Surrogate
 *
 * Comprehensive mock implementation of IBM Maximo APIs for equipment management,
 * work orders, preventive maintenance, and asset tracking. Designed for integration
 * testing without requiring live Maximo system access.
 */

// Equipment Types and Enums
export enum EquipmentStatus {
  ACTIVE = 'ACTIVE',
  DOWN = 'DOWN',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  PLANNED = 'PLANNED'
}

export enum EquipmentType {
  CNC_MACHINE = 'CNC_MACHINE',
  FURNACE = 'FURNACE',
  PRESS = 'PRESS',
  TEST_EQUIPMENT = 'TEST_EQUIPMENT',
  ASSEMBLY_STATION = 'ASSEMBLY_STATION',
  INSPECTION_STATION = 'INSPECTION_STATION',
  TOOLING = 'TOOLING',
  FIXTURE = 'FIXTURE'
}

export enum WorkOrderStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum WorkOrderType {
  PREVENTIVE_MAINTENANCE = 'PM',
  CORRECTIVE_MAINTENANCE = 'CM',
  CALIBRATION = 'CAL',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION'
}

export enum DowntimeReason {
  PLANNED_MAINTENANCE = 'PLANNED_MAINTENANCE',
  UNPLANNED_MAINTENANCE = 'UNPLANNED_MAINTENANCE',
  BREAKDOWN = 'BREAKDOWN',
  SETUP_CHANGEOVER = 'SETUP_CHANGEOVER',
  MATERIAL_SHORTAGE = 'MATERIAL_SHORTAGE',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  OPERATOR_ABSENCE = 'OPERATOR_ABSENCE'
}

// Data Models
export interface Equipment {
  equipmentId: string;
  assetNum: string;
  description: string;
  equipmentType: EquipmentType;
  status: EquipmentStatus;
  location: string;
  department: string;
  workCell?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installDate: Date;
  acquisitionCost?: number;
  specifications: Record<string, any>;
  customAttributes: Record<string, any>;
  createdDate: Date;
  lastModified: Date;
  createdBy: string;
  lastModifiedBy: string;
}

export interface WorkOrder {
  workOrderId: string;
  workOrderNum: string;
  equipmentId: string;
  workOrderType: WorkOrderType;
  status: WorkOrderStatus;
  priority: number; // 1-5 (1 = highest)
  description: string;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  assignedTechnician?: string;
  estimatedHours: number;
  actualHours?: number;
  pmScheduleId?: string;
  instructions: string;
  safetyNotes?: string;
  requiredParts: WorkOrderPart[];
  laborRecords: LaborRecord[];
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
  lastModifiedBy: string;
}

export interface WorkOrderPart {
  partNumber: string;
  description: string;
  quantityRequired: number;
  quantityUsed?: number;
  unitCost?: number;
  stockLocation: string;
}

export interface LaborRecord {
  laborId: string;
  technician: string;
  startDateTime: Date;
  endDateTime?: Date;
  hoursWorked: number;
  laborType: string;
  description: string;
  craftSkill: string;
}

export interface PMSchedule {
  pmScheduleId: string;
  equipmentId: string;
  scheduleDescription: string;
  frequency: number; // in days
  frequencyType: 'DAYS' | 'WEEKS' | 'MONTHS' | 'RUNTIME_HOURS' | 'CYCLES';
  frequencyValue: number;
  lastPerformedDate?: Date;
  nextDueDate: Date;
  isActive: boolean;
  pmTasks: PMTask[];
  estimatedDuration: number; // in hours
  assignedCraft: string;
  priority: number;
  createdDate: Date;
  createdBy: string;
}

export interface PMTask {
  taskId: string;
  taskDescription: string;
  sequence: number;
  estimatedTime: number; // in minutes
  skillRequired: string;
  safetyNotes?: string;
  toolsRequired: string[];
  partsRequired: WorkOrderPart[];
}

export interface DowntimeEvent {
  downtimeId: string;
  equipmentId: string;
  startDateTime: Date;
  endDateTime?: Date;
  duration?: number; // in minutes
  reason: DowntimeReason;
  description: string;
  rootCause?: string;
  reportedBy: string;
  resolvedBy?: string;
  workOrderId?: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cost?: number;
  createdDate: Date;
}

export interface EquipmentMetrics {
  equipmentId: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: Date;
  endDate: Date;
  totalOperatingTime: number; // in hours
  totalDowntime: number; // in hours
  plannedDowntime: number; // in hours
  unplannedDowntime: number; // in hours
  availability: number; // percentage
  mtbf: number; // Mean Time Between Failures (hours)
  mttr: number; // Mean Time To Repair (hours)
  totalMaintenanceCost: number;
  energyConsumption?: number;
  productionOutput?: number;
  qualityMetrics?: Record<string, number>;
}

export interface SparePart {
  partNumber: string;
  description: string;
  equipmentIds: string[];
  stockLocation: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  unitCost: number;
  leadTime: number; // in days
  supplier: string;
  partCategory: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastOrderDate?: Date;
  usageHistory: PartUsage[];
}

export interface PartUsage {
  usageDate: Date;
  workOrderId: string;
  quantityUsed: number;
  unitCost: number;
  technician: string;
}

// Configuration
export interface MaximoSurrogateConfig {
  mockMode: boolean;
  enableDataExport: boolean;
  erpEndpoint?: string;
  enableAuditLogging: boolean;
  maxEquipmentRecords: number;
  maxWorkOrderHistory: number;
  autoGeneratePMWorkOrders: boolean;
  defaultTechnician: string;
  enableErrorSimulation?: boolean;
}

// API Response Types
export interface MaximoResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  metadata?: {
    totalCount?: number;
    pageSize?: number;
    currentPage?: number;
    hasMore?: boolean;
  };
  timestamp: Date;
}

export interface EquipmentQueryFilter {
  equipmentType?: EquipmentType;
  status?: EquipmentStatus;
  location?: string;
  department?: string;
  manufacturer?: string;
  installedAfter?: Date;
  installedBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface WorkOrderQueryFilter {
  equipmentId?: string;
  workOrderType?: WorkOrderType;
  status?: WorkOrderStatus;
  priority?: number;
  assignedTechnician?: string;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

/**
 * IBM Maximo Asset Management Surrogate Service
 *
 * Provides comprehensive mock implementation of Maximo APIs including:
 * - Equipment master data management
 * - Work order lifecycle management
 * - Preventive maintenance scheduling
 * - Downtime tracking and metrics
 * - Spare parts inventory
 * - Integration with ERP systems
 */
export class MaximoSurrogate extends EventEmitter {
  private config: MaximoSurrogateConfig;
  private equipmentStore: Map<string, Equipment> = new Map();
  private workOrderStore: Map<string, WorkOrder> = new Map();
  private pmScheduleStore: Map<string, PMSchedule> = new Map();
  private downtimeStore: Map<string, DowntimeEvent> = new Map();
  private sparePartsStore: Map<string, SparePart> = new Map();
  private metricsStore: Map<string, EquipmentMetrics[]> = new Map();
  private errorSimulation: ErrorSimulationService;

  // Counters for generating IDs
  private equipmentCounter = 1;
  private workOrderCounter = 1;
  private downtimeCounter = 1;
  private pmScheduleCounter = 1;

  constructor(config: Partial<MaximoSurrogateConfig> = {}) {
    super();
    this.config = {
      mockMode: true,
      enableDataExport: true,
      enableAuditLogging: true,
      maxEquipmentRecords: 1000,
      maxWorkOrderHistory: 5000,
      autoGeneratePMWorkOrders: true,
      defaultTechnician: 'SYSTEM',
      erpEndpoint: 'http://localhost:3000/api/testing/erp',
      enableErrorSimulation: true,
      ...config
    };

    // Initialize error simulation service
    this.errorSimulation = new ErrorSimulationService({
      enableSimulation: this.config.enableErrorSimulation,
      globalProbability: 0.8, // Reduced for normal operation
      maxConcurrentScenarios: 3,
      logAllSimulations: false
    });

    // Initialize with sample data
    this.initializeSampleData();

    // Set up automatic PM work order generation
    if (this.config.autoGeneratePMWorkOrders) {
      this.setupPMGeneration();
    }
  }

  // Equipment Management APIs
  async createEquipment(equipmentData: Partial<Equipment>): Promise<MaximoResponse<Equipment>> {
    // Check for error simulation
    const simulationResult = this.errorSimulation.simulateRequest('MAXIMO', 'createEquipment', equipmentData);
    if (simulationResult.shouldFail) {
      if (simulationResult.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, simulationResult.delay));
      }
      return {
        success: false,
        error: {
          code: `SIM_ERROR_${simulationResult.httpStatusCode}`,
          message: simulationResult.errorMessage
        },
        timestamp: new Date()
      };
    }

    try {
      const equipmentId = `EQ-${String(this.equipmentCounter++).padStart(6, '0')}`;
      const assetNum = equipmentData.assetNum || equipmentId;

      // Check for duplicate asset number
      const existingEquipment = Array.from(this.equipmentStore.values())
        .find(eq => eq.assetNum === assetNum);

      if (existingEquipment) {
        return {
          success: false,
          errors: [`Equipment with asset number ${assetNum} already exists`],
          timestamp: new Date()
        };
      }

      const equipment: Equipment = {
        equipmentId,
        assetNum,
        description: equipmentData.description || '',
        equipmentType: equipmentData.equipmentType || EquipmentType.CNC_MACHINE,
        status: equipmentData.status || EquipmentStatus.PLANNED,
        location: equipmentData.location || 'MAIN_FLOOR',
        department: equipmentData.department || 'PRODUCTION',
        workCell: equipmentData.workCell,
        manufacturer: equipmentData.manufacturer || 'Unknown',
        model: equipmentData.model || 'Standard',
        serialNumber: equipmentData.serialNumber || `SN-${Date.now()}`,
        installDate: equipmentData.installDate || new Date(),
        acquisitionCost: equipmentData.acquisitionCost,
        specifications: equipmentData.specifications || {},
        customAttributes: equipmentData.customAttributes || {},
        createdDate: new Date(),
        lastModified: new Date(),
        createdBy: this.config.defaultTechnician,
        lastModifiedBy: this.config.defaultTechnician
      };

      this.equipmentStore.set(equipmentId, equipment);
      this.emit('equipmentCreated', equipment);

      // Export to ERP if enabled
      if (this.config.enableDataExport) {
        await this.exportEquipmentToERP(equipment);
      }

      return {
        success: true,
        data: equipment,
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

  async getEquipment(equipmentId: string): Promise<MaximoResponse<Equipment>> {
    const equipment = this.equipmentStore.get(equipmentId);

    if (!equipment) {
      return {
        success: false,
        errors: [`Equipment ${equipmentId} not found`],
        timestamp: new Date()
      };
    }

    return {
      success: true,
      data: equipment,
      timestamp: new Date()
    };
  }

  async queryEquipment(filter: EquipmentQueryFilter = {}): Promise<MaximoResponse<Equipment[]>> {
    let equipment = Array.from(this.equipmentStore.values());

    // Apply filters
    if (filter.equipmentType) {
      equipment = equipment.filter(eq => eq.equipmentType === filter.equipmentType);
    }
    if (filter.status) {
      equipment = equipment.filter(eq => eq.status === filter.status);
    }
    if (filter.location) {
      equipment = equipment.filter(eq => eq.location === filter.location);
    }
    if (filter.department) {
      equipment = equipment.filter(eq => eq.department === filter.department);
    }
    if (filter.manufacturer) {
      equipment = equipment.filter(eq =>
        eq.manufacturer.toLowerCase().includes(filter.manufacturer!.toLowerCase())
      );
    }
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      equipment = equipment.filter(eq =>
        eq.description.toLowerCase().includes(searchTerm) ||
        eq.assetNum.toLowerCase().includes(searchTerm) ||
        eq.serialNumber.toLowerCase().includes(searchTerm)
      );
    }
    if (filter.installedAfter) {
      equipment = equipment.filter(eq => eq.installDate >= filter.installedAfter!);
    }
    if (filter.installedBefore) {
      equipment = equipment.filter(eq => eq.installDate <= filter.installedBefore!);
    }

    // Apply pagination
    const totalCount = equipment.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    equipment = equipment.slice(offset, offset + limit);

    return {
      success: true,
      data: equipment,
      metadata: {
        totalCount,
        pageSize: limit,
        currentPage: Math.floor(offset / limit) + 1,
        hasMore: offset + limit < totalCount
      },
      timestamp: new Date()
    };
  }

  async updateEquipment(equipmentId: string, updates: Partial<Equipment>): Promise<MaximoResponse<Equipment>> {
    const equipment = this.equipmentStore.get(equipmentId);

    if (!equipment) {
      return {
        success: false,
        errors: [`Equipment ${equipmentId} not found`],
        timestamp: new Date()
      };
    }

    const updatedEquipment: Equipment = {
      ...equipment,
      ...updates,
      equipmentId, // Ensure ID cannot be changed
      lastModified: new Date(),
      lastModifiedBy: this.config.defaultTechnician
    };

    this.equipmentStore.set(equipmentId, updatedEquipment);
    this.emit('equipmentUpdated', updatedEquipment, equipment);

    // Export updated data to ERP if enabled
    if (this.config.enableDataExport) {
      await this.exportEquipmentToERP(updatedEquipment);
    }

    return {
      success: true,
      data: updatedEquipment,
      timestamp: new Date()
    };
  }

  async deleteEquipment(equipmentId: string): Promise<MaximoResponse<void>> {
    const equipment = this.equipmentStore.get(equipmentId);

    if (!equipment) {
      return {
        success: false,
        errors: [`Equipment ${equipmentId} not found`],
        timestamp: new Date()
      };
    }

    // Check for active work orders
    const activeWorkOrders = Array.from(this.workOrderStore.values())
      .filter(wo => wo.equipmentId === equipmentId &&
        wo.status !== WorkOrderStatus.CLOSED &&
        wo.status !== WorkOrderStatus.CANCELLED);

    if (activeWorkOrders.length > 0) {
      return {
        success: false,
        errors: [`Cannot delete equipment ${equipmentId}: ${activeWorkOrders.length} active work order(s) exist`],
        timestamp: new Date()
      };
    }

    this.equipmentStore.delete(equipmentId);
    this.emit('equipmentDeleted', equipment);

    return {
      success: true,
      timestamp: new Date()
    };
  }

  // Work Order Management APIs
  async createWorkOrder(workOrderData: Partial<WorkOrder>): Promise<MaximoResponse<WorkOrder>> {
    try {
      const workOrderId = `WO-${String(this.workOrderCounter++).padStart(6, '0')}`;
      const workOrderNum = workOrderData.workOrderNum || workOrderId;

      // Validate equipment exists
      if (!this.equipmentStore.has(workOrderData.equipmentId!)) {
        return {
          success: false,
          errors: [`Equipment ${workOrderData.equipmentId} not found`],
          timestamp: new Date()
        };
      }

      const workOrder: WorkOrder = {
        workOrderId,
        workOrderNum,
        equipmentId: workOrderData.equipmentId!,
        workOrderType: workOrderData.workOrderType || WorkOrderType.CORRECTIVE_MAINTENANCE,
        status: workOrderData.status || WorkOrderStatus.CREATED,
        priority: workOrderData.priority || 3,
        description: workOrderData.description || '',
        scheduledStartDate: workOrderData.scheduledStartDate || new Date(),
        scheduledEndDate: workOrderData.scheduledEndDate || new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours later
        assignedTechnician: workOrderData.assignedTechnician,
        estimatedHours: workOrderData.estimatedHours || 2,
        pmScheduleId: workOrderData.pmScheduleId,
        instructions: workOrderData.instructions || '',
        safetyNotes: workOrderData.safetyNotes,
        requiredParts: workOrderData.requiredParts || [],
        laborRecords: [],
        createdDate: new Date(),
        createdBy: this.config.defaultTechnician,
        lastModified: new Date(),
        lastModifiedBy: this.config.defaultTechnician
      };

      this.workOrderStore.set(workOrderId, workOrder);
      this.emit('workOrderCreated', workOrder);

      return {
        success: true,
        data: workOrder,
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
  private async exportEquipmentToERP(equipment: Equipment): Promise<void> {
    if (!this.config.erpEndpoint) return;

    // Check for error simulation
    const simulationResult = this.errorSimulation.simulateRequest('MAXIMO', 'exportToERP', equipment);
    if (simulationResult.shouldFail) {
      if (simulationResult.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, simulationResult.delay));
      }

      // Emit error event
      this.emit('erpExportError', {
        type: 'EQUIPMENT',
        equipmentId: equipment.equipmentId,
        error: `Simulation: ${simulationResult.errorMessage}`,
        simulationScenario: simulationResult.scenario?.name,
        timestamp: new Date()
      });

      throw new Error(`Simulated error: ${simulationResult.errorMessage}`);
    }

    try {
      // Make actual HTTP call to ERP surrogate
      const exportData = {
        sourceSystem: 'MAXIMO' as const,
        importType: 'INCREMENTAL' as const,
        data: [{
          equipmentId: equipment.equipmentId,
          assetNum: equipment.assetNum,
          description: equipment.description,
          equipmentType: equipment.equipmentType,
          status: equipment.status,
          location: equipment.location,
          department: equipment.department,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          serialNumber: equipment.serialNumber,
          installDate: equipment.installDate,
          acquisitionCost: equipment.acquisitionCost,
          costCenter: equipment.costCenter,
          id: equipment.equipmentId
        }],
        requestedBy: 'MAXIMO_SURROGATE'
      };

      const response = await fetch(`${this.config.erpEndpoint}/import/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        throw new Error(`ERP export failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Emit event for monitoring
      this.emit('erpExport', {
        type: 'EQUIPMENT',
        status: 'SUCCESS',
        equipmentId: equipment.equipmentId,
        result,
        timestamp: new Date()
      });

      console.log(`[Maximo] Successfully exported equipment ${equipment.assetNum} to ERP`);
    } catch (error) {
      console.error('Failed to export equipment to ERP:', error);

      // Emit error event
      this.emit('erpExportError', {
        type: 'EQUIPMENT',
        equipmentId: equipment.equipmentId,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  private initializeSampleData(): void {
    // Generate comprehensive sample equipment data (100+ records)
    const manufacturers = {
      [EquipmentType.CNC_MACHINE]: ['Haas Automation', 'Mazak', 'DMG Mori', 'Okuma', 'Makino'],
      [EquipmentType.FURNACE]: ['Lindberg', 'Despatch', 'Thermal Product Solutions', 'Nabertherm', 'Carbolite'],
      [EquipmentType.PRESS]: ['Greenerd', 'Schuler', 'Komatsu', 'Aida', 'Minster'],
      [EquipmentType.TEST_EQUIPMENT]: ['Instron', 'MTS', 'Shimadzu', 'Zwick', 'Tinius Olsen'],
      [EquipmentType.ASSEMBLY_STATION]: ['Bosch Rexroth', 'Festo', 'SMC', 'Parker', 'Pneumadyne'],
      [EquipmentType.INSPECTION_STATION]: ['Zeiss', 'Hexagon', 'Mitutoyo', 'Keyence', 'Cognex'],
      [EquipmentType.TOOLING]: ['Sandvik', 'Kennametal', 'Iscar', 'Seco', 'Kyocera'],
      [EquipmentType.FIXTURE]: ['Carr Lane', 'Jergens', 'Bluco', 'AME', 'Schunk']
    };

    const locations = ['CELL_A', 'CELL_B', 'CELL_C', 'CELL_D', 'HEAT_TREAT', 'FORMING', 'ASSEMBLY', 'INSPECTION', 'TOOLROOM', 'MAINTENANCE_SHOP'];
    const departments = ['MACHINING', 'PROCESSING', 'FORMING', 'ASSEMBLY', 'QUALITY', 'MAINTENANCE', 'TOOLING'];
    const statuses = [EquipmentStatus.ACTIVE, EquipmentStatus.ACTIVE, EquipmentStatus.ACTIVE, EquipmentStatus.MAINTENANCE, EquipmentStatus.DOWN];

    let equipmentCount = 0;

    // Generate equipment for each type
    Object.values(EquipmentType).forEach(equipmentType => {
      const manufacturerList = manufacturers[equipmentType];
      const equipmentPerType = Math.floor(120 / Object.values(EquipmentType).length) + 1;

      for (let i = 1; i <= equipmentPerType && equipmentCount < 120; i++) {
        const manufacturer = manufacturerList[Math.floor(Math.random() * manufacturerList.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const department = departments[Math.floor(Math.random() * departments.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const installYear = 2018 + Math.floor(Math.random() * 6); // 2018-2023

        const equipment = {
          description: `${equipmentType.replace('_', ' ').toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase())} #${i.toString().padStart(3, '0')}`,
          equipmentType,
          status,
          location,
          department,
          manufacturer,
          model: this.generateModelNumber(manufacturer, equipmentType),
          serialNumber: `${manufacturer.substring(0, 3).toUpperCase()}-${installYear}-${i.toString().padStart(3, '0')}`,
          installDate: new Date(installYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          acquisitionCost: this.generateAcquisitionCost(equipmentType),
          specifications: this.generateSpecifications(equipmentType),
          customAttributes: {
            criticality: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
            operatorRequired: Math.random() > 0.3,
            shiftOperation: ['DAY', 'ALL', 'NIGHT'][Math.floor(Math.random() * 3)]
          }
        };

        this.createEquipment(equipment);
        equipmentCount++;
      }
    });

    // Generate some PM schedules for a subset of equipment
    const equipmentIds = Array.from(this.equipmentStore.keys());
    const sampleSize = Math.min(30, equipmentIds.length);

    for (let i = 0; i < sampleSize; i++) {
      const equipmentId = equipmentIds[i];
      this.generatePMScheduleForEquipment(equipmentId);
    }

    console.log(`[Maximo] Initialized with ${this.equipmentStore.size} equipment records`);
  }

  private generateModelNumber(manufacturer: string, equipmentType: EquipmentType): string {
    const prefixes = {
      'Haas Automation': ['VF', 'UMC', 'ST', 'EC'],
      'Mazak': ['VTC', 'HCN', 'QTN', 'FH'],
      'DMG Mori': ['NHX', 'NLX', 'CMX', 'CTX'],
      'Lindberg': ['BF', 'CF', 'RF', 'VF'],
      'Greenerd': ['HP', 'AP', 'SP', 'TP'],
      'Instron': ['5900', '3300', '8800', '1200']
    };

    const manufacturerPrefixes = prefixes[manufacturer] || ['MOD'];
    const prefix = manufacturerPrefixes[Math.floor(Math.random() * manufacturerPrefixes.length)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    const suffix = ['', 'SS', 'CNC', 'AUTO', 'X'][Math.floor(Math.random() * 5)];

    return `${prefix}-${number}${suffix}`;
  }

  private generateAcquisitionCost(equipmentType: EquipmentType): number {
    const baseCosts = {
      [EquipmentType.CNC_MACHINE]: 250000,
      [EquipmentType.FURNACE]: 150000,
      [EquipmentType.PRESS]: 300000,
      [EquipmentType.TEST_EQUIPMENT]: 180000,
      [EquipmentType.ASSEMBLY_STATION]: 75000,
      [EquipmentType.INSPECTION_STATION]: 120000,
      [EquipmentType.TOOLING]: 5000,
      [EquipmentType.FIXTURE]: 15000
    };

    const baseCost = baseCosts[equipmentType] || 50000;
    const variation = 0.5; // ±50% variation
    return Math.floor(baseCost * (1 + (Math.random() - 0.5) * variation));
  }

  private generateSpecifications(equipmentType: EquipmentType): Record<string, any> {
    switch (equipmentType) {
      case EquipmentType.CNC_MACHINE:
        return {
          xAxisTravel: `${Math.floor(Math.random() * 500) + 300}mm`,
          yAxisTravel: `${Math.floor(Math.random() * 400) + 200}mm`,
          zAxisTravel: `${Math.floor(Math.random() * 300) + 150}mm`,
          spindleSpeed: `${Math.floor(Math.random() * 8000) + 2000}rpm`,
          toolCapacity: Math.floor(Math.random() * 20) + 10,
          powerRequirement: `${Math.floor(Math.random() * 30) + 10}kW`
        };
      case EquipmentType.FURNACE:
        return {
          maxTemperature: `${Math.floor(Math.random() * 800) + 200}°C`,
          chamberSize: `${Math.floor(Math.random() * 500) + 100}L`,
          heatingRate: `${Math.floor(Math.random() * 50) + 10}°C/min`,
          atmosphere: ['Air', 'Nitrogen', 'Argon', 'Vacuum'][Math.floor(Math.random() * 4)]
        };
      case EquipmentType.PRESS:
        return {
          maxForce: `${Math.floor(Math.random() * 800) + 100}T`,
          bedSize: `${Math.floor(Math.random() * 1000) + 500}mm x ${Math.floor(Math.random() * 800) + 400}mm`,
          strokeLength: `${Math.floor(Math.random() * 300) + 50}mm`,
          cycleRate: `${Math.floor(Math.random() * 20) + 5}spm`
        };
      default:
        return {
          powerRating: `${Math.floor(Math.random() * 10) + 1}kW`,
          weight: `${Math.floor(Math.random() * 5000) + 500}kg`,
          dimensions: `${Math.floor(Math.random() * 200) + 100}cm x ${Math.floor(Math.random() * 150) + 80}cm x ${Math.floor(Math.random() * 180) + 120}cm`
        };
    }
  }

  private generatePMScheduleForEquipment(equipmentId: string): void {
    const equipment = this.equipmentStore.get(equipmentId);
    if (!equipment) return;

    const pmScheduleId = `PM-${String(this.pmScheduleCounter++).padStart(6, '0')}`;
    const frequencies = [30, 90, 180, 365]; // days
    const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + Math.floor(Math.random() * frequency));

    const pmSchedule: PMSchedule = {
      pmScheduleId,
      equipmentId,
      scheduleDescription: `${frequency}-day PM for ${equipment.description}`,
      frequency,
      frequencyType: 'DAYS',
      frequencyValue: frequency,
      lastPerformedDate: new Date(Date.now() - (frequency * 24 * 60 * 60 * 1000)),
      nextDueDate,
      isActive: true,
      pmTasks: this.generatePMTasks(equipment.equipmentType),
      estimatedDuration: Math.floor(Math.random() * 6) + 2, // 2-8 hours
      assignedCraft: 'MAINTENANCE',
      priority: Math.floor(Math.random() * 3) + 2, // Priority 2-4
      createdDate: new Date(),
      createdBy: this.config.defaultTechnician
    };

    this.pmScheduleStore.set(pmScheduleId, pmSchedule);
  }

  private generatePMTasks(equipmentType: EquipmentType): PMTask[] {
    const commonTasks = [
      { description: 'Visual inspection', estimatedTime: 15, skillRequired: 'BASIC' },
      { description: 'Lubrication check', estimatedTime: 20, skillRequired: 'BASIC' },
      { description: 'Safety systems test', estimatedTime: 30, skillRequired: 'INTERMEDIATE' },
      { description: 'Electrical connections inspection', estimatedTime: 25, skillRequired: 'ELECTRICAL' }
    ];

    const specificTasks = {
      [EquipmentType.CNC_MACHINE]: [
        { description: 'Spindle alignment check', estimatedTime: 45, skillRequired: 'ADVANCED' },
        { description: 'Tool changer calibration', estimatedTime: 60, skillRequired: 'ADVANCED' },
        { description: 'Coolant system maintenance', estimatedTime: 30, skillRequired: 'INTERMEDIATE' }
      ],
      [EquipmentType.FURNACE]: [
        { description: 'Temperature calibration', estimatedTime: 90, skillRequired: 'ADVANCED' },
        { description: 'Atmosphere system check', estimatedTime: 45, skillRequired: 'INTERMEDIATE' },
        { description: 'Insulation inspection', estimatedTime: 30, skillRequired: 'BASIC' }
      ],
      [EquipmentType.PRESS]: [
        { description: 'Hydraulic pressure test', estimatedTime: 60, skillRequired: 'HYDRAULIC' },
        { description: 'Die clearance check', estimatedTime: 45, skillRequired: 'INTERMEDIATE' },
        { description: 'Safety guards inspection', estimatedTime: 20, skillRequired: 'SAFETY' }
      ]
    };

    const typeSpecificTasks = specificTasks[equipmentType] || [];
    const allTasks = [...commonTasks, ...typeSpecificTasks];

    return allTasks.map((task, index) => ({
      taskId: `TASK-${String(index + 1).padStart(3, '0')}`,
      taskDescription: task.description,
      sequence: index + 1,
      estimatedTime: task.estimatedTime,
      skillRequired: task.skillRequired,
      toolsRequired: this.generateRequiredTools(task.description),
      partsRequired: []
    }));
  }

  private generateRequiredTools(taskDescription: string): string[] {
    const toolMappings: Record<string, string[]> = {
      'Visual inspection': ['Flashlight', 'Inspection mirror'],
      'Lubrication check': ['Grease gun', 'Oil dispenser'],
      'Safety systems test': ['Multimeter', 'Function tester'],
      'Electrical connections': ['Multimeter', 'Torque wrench', 'Wire strippers'],
      'Spindle alignment': ['Dial indicator', 'Test bar', 'Alignment tools'],
      'Tool changer': ['Calibration tools', 'Test tools'],
      'Coolant system': ['pH strips', 'Refractometer', 'Cleaning supplies'],
      'Temperature calibration': ['Thermocouple', 'Calibrator', 'Reference thermometer'],
      'Hydraulic pressure': ['Pressure gauge', 'Hydraulic tester']
    };

    for (const [key, tools] of Object.entries(toolMappings)) {
      if (taskDescription.toLowerCase().includes(key.toLowerCase())) {
        return tools;
      }
    }

    return ['Standard tools'];
  }

  private setupPMGeneration(): void {
    // Set up periodic PM work order generation
    setInterval(() => {
      this.generateDuePMWorkOrders();
    }, 60000); // Check every minute for demo purposes
  }

  private generateDuePMWorkOrders(): void {
    const now = new Date();

    Array.from(this.pmScheduleStore.values()).forEach(schedule => {
      if (schedule.isActive && schedule.nextDueDate <= now) {
        // Check if PM work order already exists
        const existingPM = Array.from(this.workOrderStore.values())
          .find(wo => wo.pmScheduleId === schedule.pmScheduleId &&
            (wo.status === WorkOrderStatus.CREATED || wo.status === WorkOrderStatus.ASSIGNED));

        if (!existingPM) {
          this.createWorkOrder({
            equipmentId: schedule.equipmentId,
            workOrderType: WorkOrderType.PREVENTIVE_MAINTENANCE,
            description: `Preventive Maintenance: ${schedule.scheduleDescription}`,
            pmScheduleId: schedule.pmScheduleId,
            estimatedHours: schedule.estimatedDuration,
            priority: schedule.priority,
            instructions: schedule.pmTasks.map(task => task.taskDescription).join('\n')
          });

          // Update next due date
          const nextDue = new Date(schedule.nextDueDate);
          switch (schedule.frequencyType) {
            case 'DAYS':
              nextDue.setDate(nextDue.getDate() + schedule.frequencyValue);
              break;
            case 'WEEKS':
              nextDue.setDate(nextDue.getDate() + (schedule.frequencyValue * 7));
              break;
            case 'MONTHS':
              nextDue.setMonth(nextDue.getMonth() + schedule.frequencyValue);
              break;
          }
          schedule.nextDueDate = nextDue;
        }
      }
    });
  }

  // Health check method
  async getHealthStatus(): Promise<MaximoResponse<any>> {
    return {
      success: true,
      data: {
        service: 'Maximo Asset Management Surrogate',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date(),
        mockMode: this.config.mockMode,
        equipmentCount: this.equipmentStore.size,
        workOrderCount: this.workOrderStore.size,
        pmScheduleCount: this.pmScheduleStore.size,
        downtimeEventCount: this.downtimeStore.size,
        sparePartsCount: this.sparePartsStore.size
      },
      timestamp: new Date()
    };
  }

  // Reset mock data for testing
  async resetMockData(): Promise<MaximoResponse<void>> {
    this.equipmentStore.clear();
    this.workOrderStore.clear();
    this.pmScheduleStore.clear();
    this.downtimeStore.clear();
    this.sparePartsStore.clear();
    this.metricsStore.clear();

    this.equipmentCounter = 1;
    this.workOrderCounter = 1;
    this.downtimeCounter = 1;
    this.pmScheduleCounter = 1;

    // Reinitialize sample data
    this.initializeSampleData();

    return {
      success: true,
      timestamp: new Date()
    };
  }
}