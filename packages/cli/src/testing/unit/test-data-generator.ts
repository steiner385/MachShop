/**
 * Test Data Generator
 * Generates realistic test data for plugin testing
 */

export interface TestDataOptions {
  count?: number;
  withRelations?: boolean;
  includeId?: boolean;
}

export class TestDataGenerator {
  /**
   * Generate test work order
   */
  static generateWorkOrder(options: TestDataOptions = {}) {
    const { includeId = true } = options;
    return {
      ...(includeId && { id: `WO-${Math.random().toString(36).substr(2, 9)}` }),
      workOrderNumber: `WO-${Date.now()}`,
      title: `Test Work Order ${Math.random()}`,
      description: 'Generated test work order',
      status: 'OPEN',
      priority: 'HIGH',
      scheduledStartDate: new Date(),
      scheduledEndDate: new Date(Date.now() + 86400000),
      assignedToId: `user-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate test material
   */
  static generateMaterial(options: TestDataOptions = {}) {
    const { includeId = true } = options;
    return {
      ...(includeId && { id: `MAT-${Math.random().toString(36).substr(2, 9)}` }),
      partNumber: `PART-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
      description: 'Test Material',
      quantity: Math.floor(Math.random() * 1000),
      unitOfMeasure: 'EA',
      cost: Math.random() * 1000,
      supplier: `Supplier-${Math.floor(Math.random() * 100)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate test equipment
   */
  static generateEquipment(options: TestDataOptions = {}) {
    const { includeId = true } = options;
    const equipmentTypes = ['CNC', 'Lathe', 'Drill Press', '3D Printer', 'Robot Arm'];
    return {
      ...(includeId && { id: `EQ-${Math.random().toString(36).substr(2, 9)}` }),
      equipmentNumber: `EQ-${Date.now()}`,
      name: `${equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)]} ${Math.floor(Math.random() * 100)}`,
      type: equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)],
      status: 'OPERATIONAL',
      location: `Bay-${Math.floor(Math.random() * 10)}`,
      lastMaintenanceDate: new Date(Date.now() - 86400000 * 30),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate test user/personnel
   */
  static generatePersonnel(options: TestDataOptions = {}) {
    const { includeId = true } = options;
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return {
      ...(includeId && { id: `USR-${Math.random().toString(36).substr(2, 9)}` }),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      firstName,
      lastName,
      role: 'Operator',
      department: 'Production',
      skills: ['CNC Operation', 'Quality Inspection', 'Assembly'],
      certifications: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate test quality record
   */
  static generateQualityRecord(options: TestDataOptions = {}) {
    const { includeId = true } = options;
    return {
      ...(includeId && { id: `QC-${Math.random().toString(36).substr(2, 9)}` }),
      workOrderId: `WO-${Math.random().toString(36).substr(2, 9)}`,
      type: 'INSPECTION',
      status: 'PASS',
      inspectedBy: `user-${Math.random().toString(36).substr(2, 5)}`,
      findings: [],
      defects: 0,
      notes: 'Quality record generated for testing',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate batch of test data
   */
  static generateBatch(type: 'workOrder' | 'material' | 'equipment' | 'personnel' | 'quality', count: number = 5) {
    const items = [];
    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'workOrder':
          items.push(this.generateWorkOrder());
          break;
        case 'material':
          items.push(this.generateMaterial());
          break;
        case 'equipment':
          items.push(this.generateEquipment());
          break;
        case 'personnel':
          items.push(this.generatePersonnel());
          break;
        case 'quality':
          items.push(this.generateQualityRecord());
          break;
      }
    }
    return items;
  }

  /**
   * Generate realistic API response
   */
  static generateApiResponse(data: any, statusCode: number = 200) {
    return {
      statusCode,
      body: data,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': Math.random().toString(36).substr(2, 9),
        'X-Timestamp': new Date().toISOString()
      }
    };
  }

  /**
   * Generate error response
   */
  static generateErrorResponse(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500) {
    return {
      statusCode,
      body: {
        error: {
          code,
          message,
          timestamp: new Date().toISOString()
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Generate paginated response
   */
  static generatePaginatedResponse(items: any[], page: number = 1, pageSize: number = 10, total: number = 100) {
    return {
      statusCode: 200,
      body: {
        data: items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page < Math.ceil(total / pageSize),
          hasPrevious: page > 1
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}

export default TestDataGenerator;
