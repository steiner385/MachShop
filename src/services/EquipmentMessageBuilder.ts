/**
 * Equipment Message Builder Service
 *
 * Builds and validates equipment integration messages for:
 * - OPC UA protocol
 * - MTConnect protocol
 * - MQTT protocol
 */

import {
  CommandType,
  DataCollectionType,
} from '@prisma/client';
import {
  OPCUACommandMessage,
  OPCUACommandResponse,
  MTConnectCommandMessage,
  MTConnectCommandResponse,
  MQTTCommandMessage,
  MQTTCommandResponse,
  OPCUADataPoint,
  MTConnectDataItem,
  MQTTDataMessage,
} from '../types/l2equipment';

export class EquipmentMessageBuilder {
  // ============================================================================
  // OPC UA Message Builders
  // ============================================================================

  /**
   * Build OPC UA command message
   */
  static buildOPCUACommand(params: {
    commandType: CommandType;
    methodId: string;
    objectId?: string;
    inputArguments?: any[];
  }): OPCUACommandMessage {
    const { methodId, objectId, inputArguments } = params;

    return {
      methodId,
      objectId,
      inputArguments: inputArguments || [],
    };
  }

  /**
   * Build OPC UA START command
   */
  static buildOPCUAStartCommand(params: {
    methodId: string;
    objectId?: string;
    programId?: string;
  }): OPCUACommandMessage {
    return this.buildOPCUACommand({
      commandType: 'START',
      methodId: params.methodId,
      objectId: params.objectId,
      inputArguments: params.programId ? [params.programId] : [],
    });
  }

  /**
   * Build OPC UA STOP command
   */
  static buildOPCUAStopCommand(params: {
    methodId: string;
    objectId?: string;
  }): OPCUACommandMessage {
    return this.buildOPCUACommand({
      commandType: 'STOP',
      methodId: params.methodId,
      objectId: params.objectId,
    });
  }

  /**
   * Build OPC UA CONFIGURE command
   */
  static buildOPCUAConfigureCommand(params: {
    methodId: string;
    objectId?: string;
    configurationData: Record<string, any>;
  }): OPCUACommandMessage {
    return this.buildOPCUACommand({
      commandType: 'CONFIGURE',
      methodId: params.methodId,
      objectId: params.objectId,
      inputArguments: [params.configurationData],
    });
  }

  /**
   * Parse OPC UA command response
   */
  static parseOPCUAResponse(response: OPCUACommandResponse): {
    success: boolean;
    message: string;
    outputArguments?: any[];
  } {
    // OPC UA status codes: 0 = Good, anything else is an error
    const success = response.statusCode === 0;

    return {
      success,
      message: success
        ? 'Command executed successfully'
        : `Command failed with status code: ${response.statusCode}`,
      outputArguments: response.outputArguments,
    };
  }

  /**
   * Format OPC UA data point for storage
   */
  static formatOPCUADataPoint(dataPoint: OPCUADataPoint): {
    dataPointName: string;
    dataPointId: string;
    value: number | string | boolean | object;
    quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
    timestamp: Date;
  } {
    // Map OPC UA status codes to quality
    let quality: 'GOOD' | 'BAD' | 'UNCERTAIN' = 'GOOD';
    if (dataPoint.statusCode !== 0) {
      quality = dataPoint.statusCode >= 0x80000000 ? 'BAD' : 'UNCERTAIN';
    }

    return {
      dataPointName: dataPoint.displayName,
      dataPointId: dataPoint.nodeId,
      value: dataPoint.value,
      quality,
      timestamp: dataPoint.sourceTimestamp,
    };
  }

  // ============================================================================
  // MTConnect Message Builders
  // ============================================================================

  /**
   * Build MTConnect command message
   */
  static buildMTConnectCommand(params: {
    commandType: CommandType;
    deviceName: string;
    commandName: string;
    parameters?: Record<string, any>;
  }): MTConnectCommandMessage {
    const { deviceName, commandName, parameters } = params;

    return {
      deviceName,
      commandName,
      parameters: parameters || {},
    };
  }

  /**
   * Build MTConnect START command
   */
  static buildMTConnectStartCommand(params: {
    deviceName: string;
    programName?: string;
  }): MTConnectCommandMessage {
    return this.buildMTConnectCommand({
      commandType: 'START',
      deviceName: params.deviceName,
      commandName: 'START_EXECUTION',
      parameters: params.programName ? { program: params.programName } : {},
    });
  }

  /**
   * Build MTConnect STOP command
   */
  static buildMTConnectStopCommand(params: {
    deviceName: string;
  }): MTConnectCommandMessage {
    return this.buildMTConnectCommand({
      commandType: 'STOP',
      deviceName: params.deviceName,
      commandName: 'STOP_EXECUTION',
    });
  }

  /**
   * Build MTConnect LOAD_PROGRAM command
   */
  static buildMTConnectLoadProgramCommand(params: {
    deviceName: string;
    programName: string;
    programContent?: string;
  }): MTConnectCommandMessage {
    return this.buildMTConnectCommand({
      commandType: 'LOAD_PROGRAM',
      deviceName: params.deviceName,
      commandName: 'LOAD_PROGRAM',
      parameters: {
        programName: params.programName,
        programContent: params.programContent,
      },
    });
  }

  /**
   * Parse MTConnect command response
   */
  static parseMTConnectResponse(response: MTConnectCommandResponse): {
    success: boolean;
    message: string;
    commandId?: string;
  } {
    return {
      success: response.result === 'SUCCESS',
      message: response.message || (response.result === 'SUCCESS'
        ? 'Command executed successfully'
        : 'Command failed'),
      commandId: response.commandId,
    };
  }

  /**
   * Format MTConnect data item for storage
   */
  static formatMTConnectDataItem(dataItem: MTConnectDataItem): {
    dataPointName: string;
    dataPointId: string;
    value: number | string | boolean | object;
    dataCollectionType: DataCollectionType;
    timestamp: Date;
  } {
    // Map MTConnect category to DataCollectionType
    let dataCollectionType: DataCollectionType;
    switch (dataItem.category) {
      case 'SAMPLE':
        dataCollectionType = 'SENSOR';
        break;
      case 'EVENT':
        dataCollectionType = 'EVENT';
        break;
      case 'CONDITION':
        dataCollectionType = 'ALARM';
        break;
      default:
        dataCollectionType = 'STATUS';
    }

    return {
      dataPointName: dataItem.name,
      dataPointId: dataItem.dataItemId,
      value: dataItem.value,
      dataCollectionType,
      timestamp: dataItem.timestamp,
    };
  }

  // ============================================================================
  // MQTT Message Builders
  // ============================================================================

  /**
   * Build MQTT command message
   */
  static buildMQTTCommand(params: {
    commandType: CommandType;
    equipmentId: string;
    commandName: string;
    payload: any;
    qos?: 0 | 1 | 2;
    retain?: boolean;
  }): MQTTCommandMessage {
    const { equipmentId, commandName, payload, qos, retain } = params;

    // Build topic based on equipment ID and command
    const topic = `mes/equipment/${equipmentId}/command/${commandName}`;

    return {
      topic,
      payload,
      qos: qos || 1,
      retain: retain || false,
    };
  }

  /**
   * Build MQTT START command
   */
  static buildMQTTStartCommand(params: {
    equipmentId: string;
    workOrderId?: string;
    parameters?: Record<string, any>;
  }): MQTTCommandMessage {
    return this.buildMQTTCommand({
      commandType: 'START',
      equipmentId: params.equipmentId,
      commandName: 'start',
      payload: {
        action: 'START',
        workOrderId: params.workOrderId,
        parameters: params.parameters || {},
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Build MQTT STOP command
   */
  static buildMQTTStopCommand(params: {
    equipmentId: string;
    reason?: string;
  }): MQTTCommandMessage {
    return this.buildMQTTCommand({
      commandType: 'STOP',
      equipmentId: params.equipmentId,
      commandName: 'stop',
      payload: {
        action: 'STOP',
        reason: params.reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Build MQTT CONFIGURE command
   */
  static buildMQTTConfigureCommand(params: {
    equipmentId: string;
    configuration: Record<string, any>;
  }): MQTTCommandMessage {
    return this.buildMQTTCommand({
      commandType: 'CONFIGURE',
      equipmentId: params.equipmentId,
      commandName: 'configure',
      payload: {
        action: 'CONFIGURE',
        configuration: params.configuration,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Parse MQTT command response
   */
  static parseMQTTResponse(response: MQTTCommandResponse): {
    success: boolean;
    message: string;
    messageId?: string;
  } {
    return {
      success: response.acknowledged,
      message: response.acknowledged
        ? 'Command acknowledged by equipment'
        : 'Command not acknowledged',
      messageId: response.messageId,
    };
  }

  /**
   * Format MQTT data message for storage
   */
  static formatMQTTDataMessage(message: MQTTDataMessage): {
    dataPointName: string;
    dataPointId: string;
    value: number | string | boolean | object;
    timestamp: Date;
  } {
    // Extract data point name from topic
    // Example: mes/equipment/EQ-001/sensor/temperature -> temperature
    const topicParts = message.topic.split('/');
    const dataPointName = topicParts[topicParts.length - 1];

    return {
      dataPointName,
      dataPointId: message.topic,
      value: message.payload,
      timestamp: message.timestamp,
    };
  }

  // ============================================================================
  // Message Validation
  // ============================================================================

  /**
   * Validate OPC UA command message
   */
  static validateOPCUACommand(message: OPCUACommandMessage): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!message.methodId || message.methodId.trim() === '') {
      errors.push('methodId is required');
    }

    if (message.inputArguments && !Array.isArray(message.inputArguments)) {
      errors.push('inputArguments must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate MTConnect command message
   */
  static validateMTConnectCommand(message: MTConnectCommandMessage): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!message.deviceName || message.deviceName.trim() === '') {
      errors.push('deviceName is required');
    }

    if (!message.commandName || message.commandName.trim() === '') {
      errors.push('commandName is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate MQTT command message
   */
  static validateMQTTCommand(message: MQTTCommandMessage): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!message.topic || message.topic.trim() === '') {
      errors.push('topic is required');
    }

    if (message.payload === undefined || message.payload === null) {
      errors.push('payload is required');
    }

    if (message.qos !== undefined && ![0, 1, 2].includes(message.qos)) {
      errors.push('qos must be 0, 1, or 2');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate data collection value based on type
   */
  static validateDataValue(
    value: any,
    dataCollectionType: DataCollectionType
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (value === undefined || value === null) {
      errors.push('Value is required');
      return { valid: false, errors };
    }

    // Type-specific validation
    switch (dataCollectionType) {
      case 'SENSOR':
      case 'MEASUREMENT':
      case 'PERFORMANCE':
        if (typeof value !== 'number') {
          errors.push(`${dataCollectionType} value must be a number`);
        }
        break;

      case 'STATUS':
        if (typeof value !== 'boolean' && typeof value !== 'string') {
          errors.push('STATUS value must be a boolean or string');
        }
        break;

      case 'ALARM':
      case 'EVENT':
        if (typeof value !== 'string' && typeof value !== 'object') {
          errors.push(`${dataCollectionType} value must be a string or object`);
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Build equipment data topic for MQTT subscription
   */
  static buildEquipmentDataTopic(equipmentId: string, dataType?: string): string {
    if (dataType) {
      return `mes/equipment/${equipmentId}/${dataType}/#`;
    }
    return `mes/equipment/${equipmentId}/#`;
  }

  /**
   * Build equipment command topic for MQTT subscription
   */
  static buildEquipmentCommandTopic(equipmentId: string): string {
    return `mes/equipment/${equipmentId}/command/#`;
  }

  /**
   * Build equipment status topic for MQTT subscription
   */
  static buildEquipmentStatusTopic(equipmentId: string): string {
    return `mes/equipment/${equipmentId}/status`;
  }

  /**
   * Extract equipment ID from MQTT topic
   */
  static extractEquipmentIdFromTopic(topic: string): string | null {
    // Example: mes/equipment/EQ-001/sensor/temperature
    const match = topic.match(/^mes\/equipment\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine data collection type from value type
   */
  static inferDataCollectionType(value: any): DataCollectionType {
    if (typeof value === 'number') {
      return 'SENSOR';
    } else if (typeof value === 'boolean') {
      return 'STATUS';
    } else if (typeof value === 'string') {
      return 'EVENT';
    } else if (typeof value === 'object') {
      return 'MEASUREMENT';
    }
    return 'STATUS';
  }

  /**
   * Format timestamp to ISO string
   */
  static formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse timestamp from various formats
   */
  static parseTimestamp(timestamp: string | number | Date): Date {
    if (timestamp instanceof Date) {
      return timestamp;
    }

    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }

    return new Date(timestamp);
  }
}
