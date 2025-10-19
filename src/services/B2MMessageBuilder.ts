/**
 * ISA-95 B2M (Business to Manufacturing) Message Builder Service
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Builds and parses ISA-95 Part 3 compliant messages for MES ↔ ERP integration
 * Message format: JSON (XML support can be added later)
 */

import {
  ISA95ProductionScheduleMessage,
  ISA95ProductionPerformanceMessage,
  ISA95MaterialTransactionMessage,
  ISA95PersonnelInfoMessage,
} from '../types/b2m';
import {
  ScheduleType,
  SchedulePriority,
  ERPTransactionType,
  PersonnelActionType,
} from '@prisma/client';

export class B2MMessageBuilder {
  /**
   * Build ISA-95 Production Schedule Request message (ERP → MES)
   */
  static buildProductionScheduleRequest(params: {
    messageId: string;
    sender: string;
    receiver: string;
    scheduleType: ScheduleType;
    priority: SchedulePriority;
    workOrder: {
      externalId: string;
      partNumber: string;
      quantity: number;
      unitOfMeasure: string;
      dueDate: Date;
      startDate: Date;
      endDate: Date;
    };
    resources?: {
      personnel?: Array<{ skillCode: string; quantity: number }>;
      equipment?: Array<{ equipmentClass: string; quantity: number }>;
      materials?: Array<{ partNumber: string; quantity: number }>;
    };
  }): ISA95ProductionScheduleMessage {
    return {
      messageType: 'ProductionSchedule',
      messageId: params.messageId,
      timestamp: new Date().toISOString(),
      sender: params.sender,
      receiver: params.receiver,
      scheduleType: params.scheduleType,
      priority: params.priority,
      workOrder: {
        externalId: params.workOrder.externalId,
        partNumber: params.workOrder.partNumber,
        quantity: params.workOrder.quantity,
        unitOfMeasure: params.workOrder.unitOfMeasure,
        dueDate: params.workOrder.dueDate.toISOString(),
        startDate: params.workOrder.startDate.toISOString(),
        endDate: params.workOrder.endDate.toISOString(),
      },
      resources: params.resources,
    };
  }

  /**
   * Build ISA-95 Production Performance Response message (MES → ERP)
   */
  static buildProductionPerformanceMessage(params: {
    messageId: string;
    sender: string;
    receiver: string;
    workOrder: {
      externalId: string;
      actualStartDate: Date;
      actualEndDate: Date;
    };
    quantities: {
      produced: number;
      good: number;
      scrap: number;
      rework: number;
      yield: number;
    };
    actuals?: {
      labor?: { hours: number; cost: number };
      material?: { cost: number };
      overhead?: { cost: number };
      total?: { cost: number };
    };
    variances?: {
      quantity?: number;
      time?: number;
      cost?: number;
      efficiency?: number;
    };
  }): ISA95ProductionPerformanceMessage {
    return {
      messageType: 'ProductionPerformance',
      messageId: params.messageId,
      timestamp: new Date().toISOString(),
      sender: params.sender,
      receiver: params.receiver,
      workOrder: {
        externalId: params.workOrder.externalId,
        actualStartDate: params.workOrder.actualStartDate.toISOString(),
        actualEndDate: params.workOrder.actualEndDate.toISOString(),
      },
      quantities: params.quantities,
      actuals: params.actuals || {},
      variances: params.variances || {},
    };
  }

  /**
   * Build ISA-95 Material Transaction message (Bidirectional)
   */
  static buildMaterialTransactionMessage(params: {
    messageId: string;
    sender: string;
    receiver: string;
    transactionType: ERPTransactionType;
    material: {
      partNumber: string;
      quantity: number;
      unitOfMeasure: string;
      lotNumber?: string;
      serialNumber?: string;
    };
    locations?: {
      from?: string;
      to?: string;
    };
    cost?: {
      unit: number;
      total: number;
      currency: string;
    };
    workOrderReference?: string;
  }): ISA95MaterialTransactionMessage {
    return {
      messageType: 'MaterialTransaction',
      messageId: params.messageId,
      timestamp: new Date().toISOString(),
      sender: params.sender,
      receiver: params.receiver,
      transactionType: params.transactionType,
      material: params.material,
      locations: params.locations || {},
      cost: params.cost,
      workOrderReference: params.workOrderReference,
    };
  }

  /**
   * Build ISA-95 Personnel Info message (Bidirectional)
   */
  static buildPersonnelInfoMessage(params: {
    messageId: string;
    sender: string;
    receiver: string;
    actionType: PersonnelActionType;
    personnel: {
      externalId: string;
      employeeNumber?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      department?: string;
      jobTitle?: string;
    };
    skills?: Array<{ code: string; level: string }>;
    certifications?: Array<{ code: string; expirationDate?: string }>;
    availability?: {
      shiftCode?: string;
      calendar?: string;
      from?: string;
      to?: string;
    };
  }): ISA95PersonnelInfoMessage {
    return {
      messageType: 'PersonnelInfo',
      messageId: params.messageId,
      timestamp: new Date().toISOString(),
      sender: params.sender,
      receiver: params.receiver,
      actionType: params.actionType,
      personnel: params.personnel,
      skills: params.skills,
      certifications: params.certifications,
      availability: params.availability,
    };
  }

  /**
   * Parse incoming ISA-95 message and validate structure
   */
  static parseMessage(messageJson: string): {
    messageType: 'ProductionSchedule' | 'ProductionPerformance' | 'MaterialTransaction' | 'PersonnelInfo';
    message: any;
    isValid: boolean;
    errors?: string[];
  } {
    try {
      const message = JSON.parse(messageJson);
      const errors: string[] = [];

      // Basic validation
      if (!message.messageType) {
        errors.push('Missing messageType field');
      }
      if (!message.messageId) {
        errors.push('Missing messageId field');
      }
      if (!message.timestamp) {
        errors.push('Missing timestamp field');
      }
      if (!message.sender) {
        errors.push('Missing sender field');
      }
      if (!message.receiver) {
        errors.push('Missing receiver field');
      }

      // Type-specific validation
      if (message.messageType === 'ProductionSchedule') {
        if (!message.workOrder) {
          errors.push('Missing workOrder field for ProductionSchedule');
        }
        if (!message.scheduleType) {
          errors.push('Missing scheduleType field');
        }
        if (!message.priority) {
          errors.push('Missing priority field');
        }
      } else if (message.messageType === 'ProductionPerformance') {
        if (!message.workOrder) {
          errors.push('Missing workOrder field for ProductionPerformance');
        }
        if (!message.quantities) {
          errors.push('Missing quantities field');
        }
      } else if (message.messageType === 'MaterialTransaction') {
        if (!message.material) {
          errors.push('Missing material field');
        }
        if (!message.transactionType) {
          errors.push('Missing transactionType field');
        }
      } else if (message.messageType === 'PersonnelInfo') {
        if (!message.personnel) {
          errors.push('Missing personnel field');
        }
        if (!message.actionType) {
          errors.push('Missing actionType field');
        }
      } else {
        errors.push(`Unknown messageType: ${message.messageType}`);
      }

      return {
        messageType: message.messageType,
        message,
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        messageType: 'ProductionSchedule', // default
        message: null,
        isValid: false,
        errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Validate Production Schedule Request message
   */
  static validateProductionScheduleRequest(message: ISA95ProductionScheduleMessage): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!message.workOrder?.externalId) {
      errors.push('workOrder.externalId is required');
    }
    if (!message.workOrder?.partNumber) {
      errors.push('workOrder.partNumber is required');
    }
    if (typeof message.workOrder?.quantity !== 'number' || message.workOrder.quantity <= 0) {
      errors.push('workOrder.quantity must be a positive number');
    }
    if (!message.workOrder?.unitOfMeasure) {
      errors.push('workOrder.unitOfMeasure is required');
    }
    if (!message.workOrder?.dueDate) {
      errors.push('workOrder.dueDate is required');
    }

    // Validate dates
    try {
      if (message.workOrder?.startDate && message.workOrder?.endDate) {
        const start = new Date(message.workOrder.startDate);
        const end = new Date(message.workOrder.endDate);
        if (start >= end) {
          errors.push('workOrder.startDate must be before endDate');
        }
      }
    } catch (error) {
      errors.push('Invalid date format in workOrder');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate Production Performance message
   */
  static validateProductionPerformanceMessage(message: ISA95ProductionPerformanceMessage): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!message.workOrder?.externalId) {
      errors.push('workOrder.externalId is required');
    }
    if (!message.quantities) {
      errors.push('quantities is required');
    } else {
      if (typeof message.quantities.produced !== 'number') {
        errors.push('quantities.produced must be a number');
      }
      if (typeof message.quantities.good !== 'number') {
        errors.push('quantities.good must be a number');
      }
      if (typeof message.quantities.scrap !== 'number') {
        errors.push('quantities.scrap must be a number');
      }
      if (typeof message.quantities.rework !== 'number') {
        errors.push('quantities.rework must be a number');
      }

      // Validate quantity logic
      const total = message.quantities.good + message.quantities.scrap + message.quantities.rework;
      if (Math.abs(total - message.quantities.produced) > 0.01) {
        errors.push('quantities.produced must equal sum of good + scrap + rework');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate Material Transaction message
   */
  static validateMaterialTransactionMessage(message: ISA95MaterialTransactionMessage): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!message.material?.partNumber) {
      errors.push('material.partNumber is required');
    }
    if (typeof message.material?.quantity !== 'number' || message.material.quantity <= 0) {
      errors.push('material.quantity must be a positive number');
    }
    if (!message.material?.unitOfMeasure) {
      errors.push('material.unitOfMeasure is required');
    }
    if (!message.transactionType) {
      errors.push('transactionType is required');
    }

    // Validate cost if provided
    if (message.cost) {
      if (typeof message.cost.unit !== 'number' || message.cost.unit < 0) {
        errors.push('cost.unit must be a non-negative number');
      }
      if (typeof message.cost.total !== 'number' || message.cost.total < 0) {
        errors.push('cost.total must be a non-negative number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate Personnel Info message
   */
  static validatePersonnelInfoMessage(message: ISA95PersonnelInfoMessage): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!message.personnel?.externalId) {
      errors.push('personnel.externalId is required');
    }
    if (!message.actionType) {
      errors.push('actionType is required');
    }

    // Validate action-specific requirements
    if (message.actionType === 'CREATE') {
      if (!message.personnel?.firstName) {
        errors.push('personnel.firstName is required for CREATE action');
      }
      if (!message.personnel?.lastName) {
        errors.push('personnel.lastName is required for CREATE action');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export default B2MMessageBuilder;
