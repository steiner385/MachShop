# Equipment Signal Integration Guide

## Overview

The Equipment Signal Processor provides comprehensive integration with industrial automation systems, enabling automatic machine time tracking based on real-time equipment signals. This guide covers integration with various protocols and systems commonly used in manufacturing environments.

## Supported Integration Protocols

### Protocol Comparison

| Protocol | Use Case | Typical Equipment | Latency | Reliability |
|----------|----------|-------------------|---------|-------------|
| OPC-UA | Modern automation | PLCs, SCADA, HMI | < 100ms | Very High |
| Modbus TCP | Ethernet-based controls | PLCs, RTUs, Sensors | < 50ms | High |
| Modbus RTU | Serial communications | Legacy PLCs, Meters | < 200ms | Medium |
| MTConnect | CNC machines | Machine tools, CNCs | < 500ms | High |
| MQTT | IoT devices | Sensors, Edge devices | < 100ms | High |
| Historian | Historical data | GE Proficy, OSIsoft PI | 1-5s | Very High |

## Signal Types and Handling

### Standard Signal Types

```typescript
enum SignalType {
  START = 'START',           // Machine started operation
  STOP = 'STOP',             // Machine stopped operation
  RUNNING = 'RUNNING',       // Machine running (heartbeat)
  IDLE = 'IDLE',             // Machine idle/waiting
  ERROR = 'ERROR',           // Machine fault/alarm
  PAUSE = 'PAUSE',           // Operation paused
  RESUME = 'RESUME',         // Operation resumed
  CYCLE_COMPLETE = 'CYCLE_COMPLETE', // Single cycle completed
  PART_COMPLETE = 'PART_COMPLETE'    // Part production completed
}
```

### Signal Processing Flow

```
Equipment → Protocol Adapter → Signal Processor → Debouncing → Validation → Machine Time Service
                                       ↓
                                Signal History
                                       ↓
                                Health Monitor
```

## OPC-UA Server Integration

### Configuration

```json
{
  "sourceType": "OPC_UA",
  "name": "Main_Production_OPC",
  "enabled": true,
  "config": {
    "endpoint": "opc.tcp://192.168.1.100:4840",
    "securityMode": "SignAndEncrypt",
    "securityPolicy": "Basic256Sha256",
    "authentication": {
      "type": "UserPassword",
      "username": "machshop_client",
      "password": "encrypted_password"
    },
    "certificate": {
      "clientCert": "/certs/client.pem",
      "clientKey": "/certs/client.key",
      "serverCert": "/certs/server.pem"
    },
    "subscriptions": [
      {
        "nodeId": "ns=2;s=CNC_01.Status",
        "equipmentId": "equip-cnc-001",
        "signalMapping": {
          "0": "IDLE",
          "1": "RUNNING",
          "2": "STOP",
          "99": "ERROR"
        }
      },
      {
        "nodeId": "ns=2;s=CNC_01.CycleCount",
        "equipmentId": "equip-cnc-001",
        "dataType": "cycleCount"
      },
      {
        "nodeId": "ns=2;s=CNC_01.CurrentProgram",
        "equipmentId": "equip-cnc-001",
        "dataType": "programNumber"
      }
    ],
    "publishingInterval": 1000,
    "samplingInterval": 500,
    "queueSize": 10
  }
}
```

### Implementation Example

```javascript
// OPC-UA Client Setup
const opcua = require('node-opcua');

class OPCUASignalAdapter {
  constructor(config) {
    this.config = config;
    this.client = new opcua.OPCUAClient({
      endpoint_must_exist: false,
      connectionStrategy: {
        maxRetry: 10,
        initialDelay: 2000,
        maxDelay: 10000
      }
    });
  }

  async connect() {
    await this.client.connect(this.config.endpoint);

    // Create session
    this.session = await this.client.createSession({
      userName: this.config.authentication.username,
      password: this.config.authentication.password
    });

    // Setup subscriptions
    await this.setupSubscriptions();
  }

  async setupSubscriptions() {
    const subscription = await this.session.createSubscription({
      requestedPublishingInterval: this.config.publishingInterval,
      requestedLifetimeCount: 1000,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10
    });

    for (const sub of this.config.subscriptions) {
      const monitoredItem = await subscription.monitor(
        {
          nodeId: sub.nodeId,
          attributeId: opcua.AttributeIds.Value
        },
        {
          samplingInterval: this.config.samplingInterval,
          queueSize: this.config.queueSize,
          discardOldest: true
        },
        opcua.TimestampsToReturn.Both
      );

      monitoredItem.on("changed", (dataValue) => {
        this.processSignal(sub, dataValue);
      });
    }
  }

  async processSignal(subscription, dataValue) {
    const signal = {
      equipmentId: subscription.equipmentId,
      signalType: this.mapSignalType(subscription, dataValue.value.value),
      sourceType: 'OPC_UA',
      timestamp: dataValue.serverTimestamp,
      value: dataValue.value.value,
      quality: this.mapQuality(dataValue.statusCode)
    };

    await this.sendToProcessor(signal);
  }

  mapQuality(statusCode) {
    if (statusCode.isGood()) return 'GOOD';
    if (statusCode.isBad()) return 'BAD';
    return 'UNCERTAIN';
  }
}
```

### Common OPC-UA Node Patterns

```javascript
// Siemens S7-1500 PLC
const siemensNodes = {
  status: 'ns=3;s="DB_Production"."Machine_Status"',
  cycleTime: 'ns=3;s="DB_Production"."Cycle_Time"',
  partCount: 'ns=3;s="DB_Production"."Part_Counter"',
  alarms: 'ns=3;s="DB_Alarms"."Active_Alarms"'
};

// Allen-Bradley ControlLogix
const abNodes = {
  status: 'ns=2;s=[PLC]Machine.Status',
  running: 'ns=2;s=[PLC]Machine.Running',
  fault: 'ns=2;s=[PLC]Machine.Fault',
  production: 'ns=2;s=[PLC]Production.Count'
};

// FANUC CNC
const fanucNodes = {
  mode: 'ns=2;i=1001',     // AUTO/MANUAL/MDI
  status: 'ns=2;i=1002',   // RUN/STOP/ALARM
  program: 'ns=2;i=2001',  // Active program
  feedrate: 'ns=2;i=3001'  // Feed override
};
```

## Modbus TCP/RTU Integration

### Modbus TCP Configuration

```json
{
  "sourceType": "MODBUS_TCP",
  "name": "Modbus_Production_Line",
  "enabled": true,
  "config": {
    "host": "192.168.1.150",
    "port": 502,
    "unitId": 1,
    "timeout": 5000,
    "retries": 3,
    "registers": [
      {
        "address": 40001,
        "type": "HOLDING",
        "equipmentId": "equip-press-001",
        "signalType": "status",
        "valueMapping": {
          "0": "IDLE",
          "1": "RUNNING",
          "2": "STOP",
          "255": "ERROR"
        }
      },
      {
        "address": 40010,
        "type": "HOLDING",
        "equipmentId": "equip-press-001",
        "dataType": "cycleCount",
        "dataFormat": "UINT32",
        "byteOrder": "BIG_ENDIAN"
      }
    ],
    "pollingInterval": 1000
  }
}
```

### Modbus RTU Configuration

```json
{
  "sourceType": "MODBUS_RTU",
  "name": "Legacy_Equipment_Serial",
  "enabled": true,
  "config": {
    "port": "/dev/ttyUSB0",
    "baudRate": 19200,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "even",
    "timeout": 3000,
    "devices": [
      {
        "slaveId": 1,
        "equipmentId": "equip-lathe-001",
        "registers": [
          {
            "address": 1,
            "type": "COIL",
            "signalType": "running"
          },
          {
            "address": 100,
            "type": "INPUT",
            "dataType": "temperature"
          }
        ]
      }
    ],
    "pollingInterval": 2000
  }
}
```

### Modbus Implementation Example

```javascript
const ModbusRTU = require('modbus-serial');

class ModbusSignalAdapter {
  constructor(config) {
    this.config = config;
    this.client = new ModbusRTU();
  }

  async connectTCP() {
    await this.client.connectTCP(this.config.host, {
      port: this.config.port
    });
    this.client.setID(this.config.unitId);
    this.client.setTimeout(this.config.timeout);
  }

  async connectRTU() {
    await this.client.connectRTUBuffered(this.config.port, {
      baudRate: this.config.baudRate,
      dataBits: this.config.dataBits,
      stopBits: this.config.stopBits,
      parity: this.config.parity
    });
  }

  async startPolling() {
    setInterval(async () => {
      for (const register of this.config.registers) {
        try {
          const value = await this.readRegister(register);
          await this.processRegisterValue(register, value);
        } catch (error) {
          console.error(`Failed to read register ${register.address}:`, error);
        }
      }
    }, this.config.pollingInterval);
  }

  async readRegister(register) {
    switch (register.type) {
      case 'COIL':
        const coils = await this.client.readCoils(register.address, 1);
        return coils.data[0];

      case 'INPUT':
        const inputs = await this.client.readDiscreteInputs(register.address, 1);
        return inputs.data[0];

      case 'HOLDING':
        const holdings = await this.client.readHoldingRegisters(register.address,
          register.dataFormat === 'UINT32' ? 2 : 1);
        return this.parseRegisterValue(holdings.data, register);

      case 'INPUT_REGISTER':
        const inputRegs = await this.client.readInputRegisters(register.address, 1);
        return inputRegs.data[0];
    }
  }

  parseRegisterValue(data, register) {
    if (register.dataFormat === 'UINT32') {
      if (register.byteOrder === 'BIG_ENDIAN') {
        return (data[0] << 16) | data[1];
      } else {
        return (data[1] << 16) | data[0];
      }
    }
    return data[0];
  }
}
```

## MTConnect Integration

### MTConnect Agent Configuration

```json
{
  "sourceType": "MTCONNECT",
  "name": "CNC_MTConnect_Adapter",
  "enabled": true,
  "config": {
    "agentUrl": "http://192.168.1.200:5000",
    "devices": [
      {
        "deviceName": "VMC-3Axis",
        "equipmentId": "equip-vmc-001",
        "dataItems": [
          {
            "id": "avail",
            "type": "AVAILABILITY",
            "signalMapping": {
              "AVAILABLE": "IDLE",
              "UNAVAILABLE": "STOP"
            }
          },
          {
            "id": "execution",
            "type": "EXECUTION",
            "signalMapping": {
              "ACTIVE": "RUNNING",
              "READY": "IDLE",
              "INTERRUPTED": "PAUSE",
              "STOPPED": "STOP"
            }
          },
          {
            "id": "program",
            "type": "PROGRAM",
            "dataType": "programNumber"
          },
          {
            "id": "part_count",
            "type": "PART_COUNT",
            "dataType": "partCount"
          }
        ]
      }
    ],
    "pollingInterval": 500,
    "streamingEnabled": true
  }
}
```

### MTConnect Stream Processing

```javascript
class MTConnectAdapter {
  constructor(config) {
    this.config = config;
  }

  async startStreaming() {
    const currentUrl = `${this.config.agentUrl}/current`;
    const response = await fetch(currentUrl);
    const data = await this.parseXMLResponse(response);

    const nextSequence = data.header.nextSequence;

    // Start streaming from current sequence
    this.streamData(nextSequence);
  }

  async streamData(sequence) {
    const streamUrl = `${this.config.agentUrl}/sample?from=${sequence}&interval=500`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      this.processMTConnectData(event.data);
    };

    eventSource.onerror = (error) => {
      console.error('MTConnect stream error:', error);
      // Implement reconnection logic
    };
  }

  processMTConnectData(xmlData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, 'text/xml');

    for (const device of this.config.devices) {
      const deviceElement = doc.querySelector(`Device[name="${device.deviceName}"]`);

      if (deviceElement) {
        for (const dataItem of device.dataItems) {
          const element = deviceElement.querySelector(`[dataItemId="${dataItem.id}"]`);

          if (element) {
            const value = element.textContent;
            const signal = this.mapToSignal(device, dataItem, value);
            this.sendSignal(signal);
          }
        }
      }
    }
  }
}
```

### MTConnect Data Items Reference

```xml
<!-- Example MTConnect response -->
<MTConnectStreams>
  <Header creationTime="2024-10-31T10:30:00Z" nextSequence="1234"/>
  <Streams>
    <DeviceStream name="VMC-3Axis" uuid="vmc-001">
      <ComponentStream component="Controller">
        <Events>
          <Availability dataItemId="avail">AVAILABLE</Availability>
          <Execution dataItemId="execution">ACTIVE</Execution>
          <Program dataItemId="program">O0001</Program>
        </Events>
        <Samples>
          <PartCount dataItemId="part_count">1250</PartCount>
          <SpindleSpeed dataItemId="spindle_speed">3500</SpindleSpeed>
        </Samples>
      </ComponentStream>
    </DeviceStream>
  </Streams>
</MTConnectStreams>
```

## MQTT Broker Integration

### MQTT Configuration

```json
{
  "sourceType": "MQTT",
  "name": "IoT_Sensor_Network",
  "enabled": true,
  "config": {
    "broker": "mqtt://192.168.1.50:1883",
    "clientId": "machshop_mqtt_client",
    "username": "mqtt_user",
    "password": "encrypted_password",
    "clean": true,
    "reconnectPeriod": 5000,
    "qos": 1,
    "topics": [
      {
        "topic": "factory/machine/+/status",
        "equipmentIdFromTopic": true,
        "equipmentIdPosition": 2,
        "signalType": "status"
      },
      {
        "topic": "factory/cnc/001/telemetry",
        "equipmentId": "equip-cnc-001",
        "dataType": "telemetry",
        "jsonParse": true
      }
    ],
    "ssl": {
      "enabled": true,
      "ca": "/certs/ca.pem",
      "cert": "/certs/client-cert.pem",
      "key": "/certs/client-key.pem"
    }
  }
}
```

### MQTT Implementation

```javascript
const mqtt = require('mqtt');

class MQTTSignalAdapter {
  constructor(config) {
    this.config = config;
  }

  connect() {
    const options = {
      clientId: this.config.clientId,
      username: this.config.username,
      password: this.config.password,
      clean: this.config.clean,
      reconnectPeriod: this.config.reconnectPeriod
    };

    if (this.config.ssl.enabled) {
      options.ca = fs.readFileSync(this.config.ssl.ca);
      options.cert = fs.readFileSync(this.config.ssl.cert);
      options.key = fs.readFileSync(this.config.ssl.key);
    }

    this.client = mqtt.connect(this.config.broker, options);

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('message', (topic, message) => {
      this.processMessage(topic, message);
    });

    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
    });
  }

  subscribeToTopics() {
    for (const topicConfig of this.config.topics) {
      this.client.subscribe(topicConfig.topic, { qos: this.config.qos });
    }
  }

  processMessage(topic, message) {
    const topicConfig = this.findTopicConfig(topic);

    if (!topicConfig) return;

    let equipmentId = topicConfig.equipmentId;

    if (topicConfig.equipmentIdFromTopic) {
      const topicParts = topic.split('/');
      equipmentId = `equip-${topicParts[topicConfig.equipmentIdPosition]}`;
    }

    let value = message.toString();

    if (topicConfig.jsonParse) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return;
      }
    }

    const signal = {
      equipmentId: equipmentId,
      signalType: this.extractSignalType(value, topicConfig),
      sourceType: 'MQTT',
      timestamp: new Date(),
      value: value,
      quality: 'GOOD'
    };

    this.sendSignal(signal);
  }

  extractSignalType(value, config) {
    if (config.signalType === 'status') {
      // Map status values to signal types
      const statusMap = {
        'running': 'RUNNING',
        'idle': 'IDLE',
        'stopped': 'STOP',
        'error': 'ERROR'
      };
      return statusMap[value.toLowerCase()] || 'IDLE';
    }
    return config.signalType;
  }
}
```

### MQTT Message Examples

```javascript
// Status message
{
  "topic": "factory/machine/cnc-001/status",
  "payload": "running"
}

// Telemetry message
{
  "topic": "factory/cnc/001/telemetry",
  "payload": {
    "status": "RUNNING",
    "programNumber": "O0001",
    "cycleCount": 1250,
    "spindleSpeed": 3500,
    "feedRate": 150,
    "toolNumber": 5,
    "timestamp": "2024-10-31T10:30:00Z"
  }
}

// Error message
{
  "topic": "factory/machine/cnc-001/alarm",
  "payload": {
    "alarmCode": "E-STOP",
    "severity": "CRITICAL",
    "message": "Emergency stop activated",
    "timestamp": "2024-10-31T10:35:00Z"
  }
}
```

## Historian System Integration

### GE Proficy Historian Configuration

```json
{
  "sourceType": "HISTORIAN",
  "name": "GE_Proficy_Historian",
  "enabled": true,
  "config": {
    "type": "GE_PROFICY",
    "server": "historian.factory.local",
    "port": 8443,
    "username": "historian_reader",
    "password": "encrypted_password",
    "tags": [
      {
        "tagName": "CNC01.Status",
        "equipmentId": "equip-cnc-001",
        "signalType": "status",
        "pollingMode": "CURRENT"
      },
      {
        "tagName": "CNC01.CycleCount",
        "equipmentId": "equip-cnc-001",
        "dataType": "cycleCount",
        "pollingMode": "INTERPOLATED",
        "interval": 60000
      }
    ],
    "pollingInterval": 5000,
    "useCompression": true
  }
}
```

### OSIsoft PI System Configuration

```json
{
  "sourceType": "HISTORIAN",
  "name": "OSIsoft_PI_System",
  "enabled": true,
  "config": {
    "type": "OSISOFT_PI",
    "dataServer": "pi-server.factory.local",
    "afServer": "pi-af.factory.local",
    "authentication": {
      "type": "Windows",
      "domain": "FACTORY",
      "username": "pi_reader",
      "password": "encrypted_password"
    },
    "points": [
      {
        "pointName": "MACHINE.CNC01.STATUS",
        "equipmentId": "equip-cnc-001",
        "signalType": "status"
      },
      {
        "afPath": "\\\\Factory\\Production\\CNC01|Runtime",
        "equipmentId": "equip-cnc-001",
        "dataType": "runtime"
      }
    ],
    "updateMethod": "SNAPSHOT",
    "bufferSize": 1000
  }
}
```

### Historian Query Implementation

```javascript
class HistorianAdapter {
  constructor(config) {
    this.config = config;
  }

  async queryGEProficy(tag, startTime, endTime) {
    const query = {
      tagName: tag.tagName,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      calculationMode: tag.pollingMode,
      interval: tag.interval
    };

    const response = await fetch(`https://${this.config.server}:${this.config.port}/api/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    return await response.json();
  }

  async queryOSIsoftPI(point) {
    const piWebAPI = `https://${this.config.dataServer}/piwebapi`;

    // Get point WebID
    const searchResponse = await fetch(
      `${piWebAPI}/points?path=\\\\${this.config.dataServer}\\${point.pointName}`,
      {
        headers: {
          'Authorization': `Basic ${this.getAuthToken()}`
        }
      }
    );

    const pointData = await searchResponse.json();
    const webId = pointData.WebId;

    // Get current value
    const valueResponse = await fetch(
      `${piWebAPI}/streams/${webId}/value`,
      {
        headers: {
          'Authorization': `Basic ${this.getAuthToken()}`
        }
      }
    );

    return await valueResponse.json();
  }
}
```

## Signal Debouncing and Validation

### Debouncing Configuration

```javascript
const debouncingConfig = {
  windowMs: 2000,           // 2 second window
  minStableReadings: 3,     // Require 3 consistent readings
  ignoreTransients: true,   // Ignore brief signal changes
  rules: [
    {
      signalType: 'RUNNING',
      requiredDuration: 1000  // Must be stable for 1 second
    },
    {
      signalType: 'STOP',
      requiredDuration: 500   // Must be stable for 0.5 seconds
    },
    {
      signalType: 'ERROR',
      requiredDuration: 0     // Process immediately
    }
  ]
};
```

### Signal Validation Rules

```javascript
class SignalValidator {
  validate(signal) {
    const errors = [];

    // Validate equipment exists
    if (!this.equipmentExists(signal.equipmentId)) {
      errors.push(`Unknown equipment: ${signal.equipmentId}`);
    }

    // Validate signal type
    if (!this.isValidSignalType(signal.signalType)) {
      errors.push(`Invalid signal type: ${signal.signalType}`);
    }

    // Validate timestamp
    if (this.isFutureTimestamp(signal.timestamp)) {
      errors.push('Signal timestamp is in the future');
    }

    if (this.isStaleSignal(signal.timestamp)) {
      errors.push('Signal is stale (> 5 minutes old)');
    }

    // Validate signal quality
    if (signal.quality === 'BAD') {
      errors.push('Signal quality is BAD');
    }

    // Validate state transitions
    if (!this.isValidTransition(signal)) {
      errors.push(`Invalid state transition: ${this.lastState} -> ${signal.signalType}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  isValidTransition(signal) {
    const validTransitions = {
      'IDLE': ['RUNNING', 'STOP', 'ERROR'],
      'RUNNING': ['IDLE', 'STOP', 'PAUSE', 'ERROR', 'CYCLE_COMPLETE'],
      'PAUSE': ['RESUME', 'STOP', 'ERROR'],
      'STOP': ['IDLE', 'RUNNING'],
      'ERROR': ['IDLE', 'STOP']
    };

    const lastState = this.getLastState(signal.equipmentId);
    const allowedTransitions = validTransitions[lastState] || [];

    return allowedTransitions.includes(signal.signalType);
  }
}
```

## Health Checking and Monitoring

### Health Check Configuration

```javascript
const healthCheckConfig = {
  checkInterval: 30000,      // Check every 30 seconds
  timeout: 5000,             // 5 second timeout per check
  maxFailures: 3,            // Mark unhealthy after 3 failures
  recoveryThreshold: 2,      // Require 2 successful checks to recover

  checks: [
    {
      type: 'CONNECTION',
      critical: true
    },
    {
      type: 'LATENCY',
      threshold: 1000,        // Max 1 second latency
      critical: false
    },
    {
      type: 'SIGNAL_RATE',
      minRate: 0.1,           // At least 1 signal per 10 seconds
      critical: false
    }
  ]
};
```

### Health Monitoring Implementation

```javascript
class HealthMonitor {
  constructor(config) {
    this.config = config;
    this.healthStatus = new Map();
    this.failureCount = new Map();
  }

  startMonitoring() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);
  }

  async performHealthChecks() {
    for (const source of this.signalSources) {
      const health = await this.checkSourceHealth(source);

      if (!health.healthy) {
        this.handleUnhealthySource(source, health);
      } else {
        this.handleHealthySource(source);
      }
    }
  }

  async checkSourceHealth(source) {
    const results = {
      healthy: true,
      checks: {}
    };

    // Connection check
    try {
      await this.checkConnection(source);
      results.checks.connection = 'PASS';
    } catch (error) {
      results.checks.connection = 'FAIL';
      results.healthy = false;
    }

    // Latency check
    const latency = await this.measureLatency(source);
    if (latency > this.config.checks.find(c => c.type === 'LATENCY').threshold) {
      results.checks.latency = `FAIL (${latency}ms)`;
      results.healthy = false;
    } else {
      results.checks.latency = `PASS (${latency}ms)`;
    }

    // Signal rate check
    const signalRate = this.getSignalRate(source);
    const minRate = this.config.checks.find(c => c.type === 'SIGNAL_RATE').minRate;
    if (signalRate < minRate) {
      results.checks.signalRate = `FAIL (${signalRate} signals/sec)`;
    } else {
      results.checks.signalRate = `PASS (${signalRate} signals/sec)`;
    }

    return results;
  }
}
```

## Troubleshooting Common Integration Issues

### Issue: No signals received from OPC-UA server

**Symptoms:**
- Connection successful but no data received
- Subscription created but no notifications

**Resolution Steps:**
1. Verify node IDs are correct:
   ```javascript
   // List all available nodes
   const browseResult = await session.browse("RootFolder");
   console.log(browseResult.references);
   ```

2. Check security settings:
   ```bash
   # Test connection with OPC UA Expert or UAExpert tool
   opc-ua-client -e opc.tcp://server:4840 -s none
   ```

3. Verify subscription permissions:
   ```javascript
   // Check user permissions
   const userIdentity = await session.readVariableValue("ns=0;i=12504");
   ```

### Issue: Modbus timeout errors

**Symptoms:**
- Frequent timeout errors
- Intermittent data loss

**Resolution:**
1. Increase timeout values:
   ```javascript
   client.setTimeout(10000); // 10 seconds
   ```

2. Check network latency:
   ```bash
   ping -c 100 modbus-device.local
   ```

3. Reduce polling frequency:
   ```javascript
   pollingInterval: 5000  // Increase from 1000ms to 5000ms
   ```

### Issue: MQTT messages not processed

**Symptoms:**
- Messages received but not processed
- Signal processor not triggered

**Resolution:**
1. Verify topic subscription:
   ```javascript
   client.on('subscribe', (topics) => {
     console.log('Subscribed to:', topics);
   });
   ```

2. Check message format:
   ```javascript
   client.on('message', (topic, message) => {
     console.log('Raw message:', message.toString());
   });
   ```

3. Validate JSON parsing:
   ```javascript
   try {
     const parsed = JSON.parse(message);
     console.log('Parsed:', parsed);
   } catch (e) {
     console.error('Parse error:', e);
   }
   ```

### Issue: MTConnect stream interruptions

**Symptoms:**
- Stream disconnects frequently
- Missing data segments

**Resolution:**
1. Implement automatic reconnection:
   ```javascript
   eventSource.onerror = () => {
     setTimeout(() => {
       this.reconnect(lastSequence);
     }, 5000);
   };
   ```

2. Buffer data locally:
   ```javascript
   const buffer = [];
   buffer.push(data);
   if (buffer.length > 100) {
     processBatch(buffer);
     buffer.length = 0;
   }
   ```

### Issue: Historian query performance

**Symptoms:**
- Slow query responses
- Timeout on large datasets

**Resolution:**
1. Use data compression:
   ```javascript
   query.compressionMode = 'AVERAGE';
   query.compressionInterval = 60; // 1 minute intervals
   ```

2. Implement pagination:
   ```javascript
   query.maxResults = 1000;
   query.continuationToken = previousToken;
   ```

3. Query specific time ranges:
   ```javascript
   // Query last hour only
   query.startTime = new Date(Date.now() - 3600000);
   query.endTime = new Date();
   ```

## Best Practices

1. **Always implement retry logic** with exponential backoff
2. **Use connection pooling** for database connections
3. **Implement circuit breakers** for failing sources
4. **Log all signal state changes** for debugging
5. **Use SSL/TLS encryption** for all network communications
6. **Implement data validation** before processing
7. **Monitor signal latency** and alert on degradation
8. **Use buffering** for high-frequency signals
9. **Implement graceful degradation** when sources fail
10. **Regular health checks** on all integration points

## Security Considerations

### Network Security
- Use VLANs to isolate industrial networks
- Implement firewall rules for each protocol
- Use VPN for remote connections
- Enable protocol-specific security features

### Authentication
- Use certificate-based authentication where possible
- Rotate credentials regularly
- Implement role-based access control
- Audit all authentication attempts

### Data Protection
- Encrypt data in transit using TLS
- Validate all incoming signals
- Implement rate limiting per source
- Log suspicious activity patterns

### Protocol-Specific Security

**OPC-UA:**
- Use SignAndEncrypt security mode
- Implement application certificates
- Use user authentication tokens
- Enable audit logging

**Modbus:**
- Use Modbus Security Protocol where supported
- Implement IP whitelisting
- Use read-only access where possible
- Monitor for unauthorized write attempts

**MQTT:**
- Use TLS with certificate validation
- Implement topic-based ACLs
- Use unique client IDs
- Enable persistent sessions carefully

**MTConnect:**
- Use HTTPS for agent connections
- Implement API key authentication
- Validate XML schemas
- Limit streaming buffer sizes