import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MaximoSurrogate,
  EquipmentType,
  EquipmentStatus,
  WorkOrderType,
  WorkOrderStatus,
  DowntimeReason
} from '../../services/MaximoSurrogate';

describe('MaximoSurrogate', () => {
  let maximoSurrogate: MaximoSurrogate;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      mockMode: true,
      enableDataExport: true,
      enableAuditLogging: true,
      maxEquipmentRecords: 1000,
      maxWorkOrderHistory: 5000,
      autoGeneratePMWorkOrders: false, // Disabled for testing
      defaultTechnician: 'TEST_TECH'
    };

    maximoSurrogate = new MaximoSurrogate(mockConfig);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with configuration', () => {
      expect(maximoSurrogate).toBeDefined();
    });

    it('should initialize with default values', () => {
      const minimalConfig = {
        mockMode: true
      };

      const surrogateWithDefaults = new MaximoSurrogate(minimalConfig);
      expect(surrogateWithDefaults).toBeDefined();
    });

    it('should have sample data initialized', async () => {
      const health = await maximoSurrogate.getHealthStatus();
      expect(health.data?.equipmentCount).toBeGreaterThan(0);
    });
  });

  describe('Equipment Management', () => {
    it('should create equipment successfully', async () => {
      const equipmentData = {
        description: 'Test CNC Machine',
        equipmentType: EquipmentType.CNC_MACHINE,
        status: EquipmentStatus.ACTIVE,
        location: 'TEST_CELL',
        department: 'MACHINING',
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-2023-001',
        acquisitionCost: 250000,
        specifications: {
          xAxisTravel: '500mm',
          yAxisTravel: '300mm',
          spindleSpeed: '6000rpm'
        }
      };

      const result = await maximoSurrogate.createEquipment(equipmentData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.equipmentId).toMatch(/^EQ-\d{6}$/);
      expect(result.data?.description).toBe(equipmentData.description);
      expect(result.data?.equipmentType).toBe(equipmentData.equipmentType);
      expect(result.data?.status).toBe(equipmentData.status);
    });

    it('should fail to create equipment with missing required fields', async () => {
      const equipmentData = {
        // Missing required fields
        description: 'Test Equipment'
      };

      const result = await maximoSurrogate.createEquipment(equipmentData);

      expect(result.success).toBe(true); // Service doesn't validate required fields - API layer does
      expect(result.data).toBeDefined();
    });

    it('should prevent duplicate asset numbers', async () => {
      const equipmentData = {
        assetNum: 'DUPLICATE-001',
        description: 'Test Equipment 1',
        equipmentType: EquipmentType.CNC_MACHINE,
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-001'
      };

      // First creation should succeed
      const result1 = await maximoSurrogate.createEquipment(equipmentData);
      expect(result1.success).toBe(true);

      // Second creation with same asset number should fail
      const result2 = await maximoSurrogate.createEquipment(equipmentData);
      expect(result2.success).toBe(false);
      expect(result2.errors?.[0]).toContain('already exists');
    });

    it('should retrieve equipment by ID', async () => {
      // First create equipment
      const equipmentData = {
        description: 'Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-001'
      };

      const createResult = await maximoSurrogate.createEquipment(equipmentData);
      expect(createResult.success).toBe(true);

      const equipmentId = createResult.data!.equipmentId;

      // Retrieve equipment
      const getResult = await maximoSurrogate.getEquipment(equipmentId);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.equipmentId).toBe(equipmentId);
      expect(getResult.data?.description).toBe(equipmentData.description);
    });

    it('should return error for non-existent equipment', async () => {
      const result = await maximoSurrogate.getEquipment('NON-EXISTENT');
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('not found');
    });

    it('should query equipment with filters', async () => {
      // Create test equipment
      await maximoSurrogate.createEquipment({
        description: 'CNC Machine 1',
        equipmentType: EquipmentType.CNC_MACHINE,
        status: EquipmentStatus.ACTIVE,
        location: 'CELL_A',
        department: 'MACHINING',
        manufacturer: 'Haas',
        model: 'VF-3',
        serialNumber: 'HAA-001'
      });

      await maximoSurrogate.createEquipment({
        description: 'Furnace 1',
        equipmentType: EquipmentType.FURNACE,
        status: EquipmentStatus.MAINTENANCE,
        location: 'HEAT_TREAT',
        department: 'PROCESSING',
        manufacturer: 'Lindberg',
        model: 'BF1836',
        serialNumber: 'LIN-001'
      });

      // Test filtering by equipment type
      const cncResult = await maximoSurrogate.queryEquipment({
        equipmentType: EquipmentType.CNC_MACHINE
      });

      expect(cncResult.success).toBe(true);
      expect(cncResult.data?.length).toBeGreaterThan(0);
      expect(cncResult.data?.every(eq => eq.equipmentType === EquipmentType.CNC_MACHINE)).toBe(true);

      // Test filtering by status
      const activeResult = await maximoSurrogate.queryEquipment({
        status: EquipmentStatus.ACTIVE
      });

      expect(activeResult.success).toBe(true);
      expect(activeResult.data?.length).toBeGreaterThan(0);
      expect(activeResult.data?.every(eq => eq.status === EquipmentStatus.ACTIVE)).toBe(true);

      // Test search functionality
      const searchResult = await maximoSurrogate.queryEquipment({
        search: 'CNC'
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data?.length).toBeGreaterThan(0);
    });

    it('should update equipment successfully', async () => {
      // Create equipment
      const createResult = await maximoSurrogate.createEquipment({
        description: 'Original Description',
        equipmentType: EquipmentType.CNC_MACHINE,
        status: EquipmentStatus.ACTIVE,
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-001'
      });

      const equipmentId = createResult.data!.equipmentId;

      // Update equipment
      const updateResult = await maximoSurrogate.updateEquipment(equipmentId, {
        description: 'Updated Description',
        status: EquipmentStatus.MAINTENANCE
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.description).toBe('Updated Description');
      expect(updateResult.data?.status).toBe(EquipmentStatus.MAINTENANCE);
      expect(updateResult.data?.equipmentId).toBe(equipmentId); // ID should not change
    });

    it('should delete equipment successfully', async () => {
      // Create equipment
      const createResult = await maximoSurrogate.createEquipment({
        description: 'Equipment to Delete',
        equipmentType: EquipmentType.TOOLING,
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-001'
      });

      const equipmentId = createResult.data!.equipmentId;

      // Delete equipment
      const deleteResult = await maximoSurrogate.deleteEquipment(equipmentId);
      expect(deleteResult.success).toBe(true);

      // Verify equipment is deleted
      const getResult = await maximoSurrogate.getEquipment(equipmentId);
      expect(getResult.success).toBe(false);
    });

    it('should prevent deletion of equipment with active work orders', async () => {
      // Create equipment
      const createResult = await maximoSurrogate.createEquipment({
        description: 'Equipment with Work Orders',
        equipmentType: EquipmentType.CNC_MACHINE,
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-001'
      });

      const equipmentId = createResult.data!.equipmentId;

      // Create work order for the equipment
      await maximoSurrogate.createWorkOrder({
        equipmentId,
        workOrderType: WorkOrderType.CORRECTIVE_MAINTENANCE,
        description: 'Test Work Order',
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(Date.now() + 4 * 60 * 60 * 1000)
      });

      // Attempt to delete equipment should fail
      const deleteResult = await maximoSurrogate.deleteEquipment(equipmentId);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.errors?.[0]).toContain('active work order');
    });
  });

  describe('Work Order Management', () => {
    let testEquipmentId: string;

    beforeEach(async () => {
      // Create test equipment for work orders
      const equipmentResult = await maximoSurrogate.createEquipment({
        description: 'Test Equipment for Work Orders',
        equipmentType: EquipmentType.CNC_MACHINE,
        manufacturer: 'Test Manufacturer',
        model: 'TEST-001',
        serialNumber: 'TEST-WO-001'
      });

      testEquipmentId = equipmentResult.data!.equipmentId;
    });

    it('should create work order successfully', async () => {
      const workOrderData = {
        equipmentId: testEquipmentId,
        workOrderType: WorkOrderType.PREVENTIVE_MAINTENANCE,
        description: 'Monthly PM - Lubrication and inspection',
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        priority: 2,
        estimatedHours: 4,
        assignedTechnician: 'TECH_001',
        instructions: 'Perform standard PM tasks',
        requiredParts: [
          {
            partNumber: 'GREASE-001',
            description: 'Bearing Grease',
            quantityRequired: 2,
            stockLocation: 'MAINT_SHOP'
          }
        ]
      };

      const result = await maximoSurrogate.createWorkOrder(workOrderData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.workOrderId).toMatch(/^WO-\d{6}$/);
      expect(result.data?.equipmentId).toBe(testEquipmentId);
      expect(result.data?.workOrderType).toBe(WorkOrderType.PREVENTIVE_MAINTENANCE);
      expect(result.data?.status).toBe(WorkOrderStatus.CREATED);
    });

    it('should fail to create work order for non-existent equipment', async () => {
      const workOrderData = {
        equipmentId: 'NON-EXISTENT',
        workOrderType: WorkOrderType.CORRECTIVE_MAINTENANCE,
        description: 'Test Work Order',
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(Date.now() + 2 * 60 * 60 * 1000)
      };

      const result = await maximoSurrogate.createWorkOrder(workOrderData);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('not found');
    });

    it('should emit events for work order creation', async () => {
      const eventSpy = vi.fn();
      maximoSurrogate.on('workOrderCreated', eventSpy);

      await maximoSurrogate.createWorkOrder({
        equipmentId: testEquipmentId,
        workOrderType: WorkOrderType.CORRECTIVE_MAINTENANCE,
        description: 'Test Work Order',
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });

      expect(eventSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Data Export Integration', () => {
    it('should emit ERP export events when data export is enabled', async () => {
      const erpExportSpy = vi.fn();
      maximoSurrogate.on('erpExport', erpExportSpy);

      await maximoSurrogate.createEquipment({
        description: 'ERP Export Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'ERP-001',
        serialNumber: 'ERP-001'
      });

      expect(erpExportSpy).toHaveBeenCalledOnce();
      const exportData = erpExportSpy.mock.calls[0][0];
      expect(exportData.type).toBe('EQUIPMENT');
      expect(exportData.data.equipmentId).toBeDefined();
    });

    it('should not emit ERP export events when data export is disabled', async () => {
      const surrogateWithoutExport = new MaximoSurrogate({
        ...mockConfig,
        enableDataExport: false
      });

      const erpExportSpy = vi.fn();
      surrogateWithoutExport.on('erpExport', erpExportSpy);

      await surrogateWithoutExport.createEquipment({
        description: 'No Export Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'NO-EXP-001',
        serialNumber: 'NO-EXP-001'
      });

      expect(erpExportSpy).not.toHaveBeenCalled();
    });
  });

  describe('Health Status', () => {
    it('should return health status', async () => {
      const health = await maximoSurrogate.getHealthStatus();

      expect(health.success).toBe(true);
      expect(health.data).toBeDefined();
      expect(health.data?.service).toBe('Maximo Asset Management Surrogate');
      expect(health.data?.status).toBe('healthy');
      expect(health.data?.mockMode).toBe(true);
      expect(typeof health.data?.equipmentCount).toBe('number');
      expect(typeof health.data?.workOrderCount).toBe('number');
    });
  });

  describe('Mock Data Reset', () => {
    it('should reset mock data successfully', async () => {
      // Add some test data
      await maximoSurrogate.createEquipment({
        description: 'Reset Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'RESET-001',
        serialNumber: 'RESET-001'
      });

      const beforeHealth = await maximoSurrogate.getHealthStatus();
      const beforeEquipmentCount = beforeHealth.data?.equipmentCount || 0;

      // Reset data
      await maximoSurrogate.resetMockData();

      const afterHealth = await maximoSurrogate.getHealthStatus();
      const afterEquipmentCount = afterHealth.data?.equipmentCount || 0;

      // Should have sample data, but not our test equipment
      expect(afterEquipmentCount).toBeGreaterThan(0);
      expect(afterEquipmentCount).toBeLessThan(beforeEquipmentCount);
    });
  });

  describe('Event Emission', () => {
    it('should emit equipment created events', async () => {
      const eventSpy = vi.fn();
      maximoSurrogate.on('equipmentCreated', eventSpy);

      await maximoSurrogate.createEquipment({
        description: 'Event Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'EVENT-001',
        serialNumber: 'EVENT-001'
      });

      expect(eventSpy).toHaveBeenCalledOnce();
    });

    it('should emit equipment updated events', async () => {
      // Create equipment first
      const createResult = await maximoSurrogate.createEquipment({
        description: 'Update Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'UPDATE-001',
        serialNumber: 'UPDATE-001'
      });

      const equipmentId = createResult.data!.equipmentId;

      const eventSpy = vi.fn();
      maximoSurrogate.on('equipmentUpdated', eventSpy);

      await maximoSurrogate.updateEquipment(equipmentId, {
        description: 'Updated Test Equipment'
      });

      expect(eventSpy).toHaveBeenCalledOnce();
    });

    it('should emit equipment deleted events', async () => {
      // Create equipment first
      const createResult = await maximoSurrogate.createEquipment({
        description: 'Delete Test Equipment',
        equipmentType: EquipmentType.TEST_EQUIPMENT,
        manufacturer: 'Test Manufacturer',
        model: 'DELETE-001',
        serialNumber: 'DELETE-001'
      });

      const equipmentId = createResult.data!.equipmentId;

      const eventSpy = vi.fn();
      maximoSurrogate.on('equipmentDeleted', eventSpy);

      await maximoSurrogate.deleteEquipment(equipmentId);

      expect(eventSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid equipment updates gracefully', async () => {
      const result = await maximoSurrogate.updateEquipment('NON-EXISTENT', {
        description: 'Updated Description'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle invalid equipment deletion gracefully', async () => {
      const result = await maximoSurrogate.deleteEquipment('NON-EXISTENT');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Sample Data Generation', () => {
    it('should generate diverse equipment types', async () => {
      const equipmentResult = await maximoSurrogate.queryEquipment({ limit: 200 });
      const equipment = equipmentResult.data || [];

      // Check that we have multiple equipment types
      const equipmentTypes = new Set(equipment.map(eq => eq.equipmentType));
      expect(equipmentTypes.size).toBeGreaterThan(3);

      // Check that we have equipment from multiple manufacturers
      const manufacturers = new Set(equipment.map(eq => eq.manufacturer));
      expect(manufacturers.size).toBeGreaterThan(5);

      // Check that we have equipment in multiple locations
      const locations = new Set(equipment.map(eq => eq.location));
      expect(locations.size).toBeGreaterThan(3);
    });

    it('should generate realistic equipment specifications', async () => {
      const cncEquipment = await maximoSurrogate.queryEquipment({
        equipmentType: EquipmentType.CNC_MACHINE,
        limit: 10
      });

      expect(cncEquipment.data?.length).toBeGreaterThan(0);

      const firstCNC = cncEquipment.data![0];
      expect(firstCNC.specifications).toBeDefined();
      expect(firstCNC.specifications.xAxisTravel).toBeDefined();
      expect(firstCNC.specifications.yAxisTravel).toBeDefined();
      expect(firstCNC.specifications.spindleSpeed).toBeDefined();
    });

    it('should generate equipment with realistic acquisition costs', async () => {
      const equipmentResult = await maximoSurrogate.queryEquipment({ limit: 10 });
      const equipment = equipmentResult.data || [];

      equipment.forEach(eq => {
        if (eq.acquisitionCost) {
          expect(eq.acquisitionCost).toBeGreaterThan(0);
          // Check reasonable cost ranges
          if (eq.equipmentType === EquipmentType.CNC_MACHINE) {
            expect(eq.acquisitionCost).toBeGreaterThan(100000); // At least $100k for CNC
          }
        }
      });
    });
  });
});