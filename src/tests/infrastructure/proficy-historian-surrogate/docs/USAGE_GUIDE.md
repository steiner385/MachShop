# GE Proficy Historian Surrogate Usage Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation and Setup](#installation-and-setup)
3. [Basic Usage Examples](#basic-usage-examples)
4. [Integration Patterns](#integration-patterns)
5. [Testing Scenarios](#testing-scenarios)
6. [Performance Testing](#performance-testing)
7. [Error Handling](#error-handling)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Start the Surrogate Server

```bash
# Using Docker (recommended)
cd src/tests/infrastructure/proficy-historian-surrogate/docker
./manage.sh build
./manage.sh start

# Using Node.js directly
npm run build
npm run start:surrogate
```

### 2. Verify Connection

```bash
curl -u historian:password http://localhost:8080/historian/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "uptime": 300,
  "version": "1.0.0"
}
```

### 3. Create Your First Tag

```bash
curl -u historian:password -X POST http://localhost:8080/historian/tags \
  -H "Content-Type: application/json" \
  -d '{
    "tagName": "MY_FIRST_TAG",
    "description": "My first historian tag",
    "dataType": "Float",
    "engineeringUnits": "°C"
  }'
```

### 4. Write Data

```bash
curl -u historian:password -X POST http://localhost:8080/historian/data/write \
  -H "Content-Type: application/json" \
  -d '{
    "Data": [
      {
        "TagName": "MY_FIRST_TAG",
        "Value": 25.5,
        "Timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
        "Quality": 100
      }
    ]
  }'
```

### 5. Query Data

```bash
START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S.000Z)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

curl -u historian:password \
  "http://localhost:8080/historian/data/query?tagNames=MY_FIRST_TAG&startTime=${START_TIME}&endTime=${END_TIME}"
```

---

## Installation and Setup

### Prerequisites

- Node.js 18+
- Docker (optional, but recommended)
- TypeScript (for development)

### Option 1: Docker Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd MachShop3/src/tests/infrastructure/proficy-historian-surrogate

# Build and start with Docker
cd docker
cp .env.example .env
# Edit .env file as needed
./manage.sh build
./manage.sh start
```

### Option 2: Direct Node.js Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the surrogate
npm run start:surrogate
```

### Environment Configuration

Create a `.env` file or set environment variables:

```bash
# Server Configuration
SURROGATE_PORT=8080
SURROGATE_HOST=0.0.0.0
SURROGATE_LOG_LEVEL=info

# Authentication
SURROGATE_AUTH_ENABLED=true
SURROGATE_AUTH_USERNAME=historian
SURROGATE_AUTH_PASSWORD=password

# Storage
SURROGATE_MAX_DATA_POINTS=1000000
SURROGATE_RETENTION_HOURS=24
SURROGATE_COMPRESSION_ENABLED=true

# Features
SURROGATE_ERROR_SIMULATION=false
SURROGATE_CORS_ENABLED=true
```

---

## Basic Usage Examples

### Tag Management

#### Create Multiple Tags

```javascript
const axios = require('axios');

const auth = {
  username: 'historian',
  password: 'password'
};

const baseURL = 'http://localhost:8080/historian';

async function createTags() {
  const tags = [
    {
      tagName: 'TEMP_SENSOR_01',
      description: 'Temperature sensor 1',
      dataType: 'Float',
      engineeringUnits: '°C',
      collector: 'SENSORS'
    },
    {
      tagName: 'PRESSURE_SENSOR_01',
      description: 'Pressure sensor 1',
      dataType: 'Float',
      engineeringUnits: 'psi',
      collector: 'SENSORS'
    },
    {
      tagName: 'STATUS_VALVE_01',
      description: 'Valve status indicator',
      dataType: 'Boolean',
      engineeringUnits: '',
      collector: 'CONTROLS'
    }
  ];

  for (const tag of tags) {
    try {
      const response = await axios.post(`${baseURL}/tags`, tag, { auth });
      console.log(`Created tag: ${tag.tagName}`);
    } catch (error) {
      console.error(`Failed to create tag ${tag.tagName}:`, error.response?.data);
    }
  }
}

createTags();
```

#### Query Tags with Filtering

```javascript
async function queryTags() {
  try {
    // Get all active tags from SENSORS collector
    const response = await axios.get(`${baseURL}/tags`, {
      auth,
      params: {
        collector: 'SENSORS',
        activeOnly: true
      }
    });

    console.log('Found tags:', response.data.tags.length);
    response.data.tags.forEach(tag => {
      console.log(`- ${tag.tagName} (${tag.dataType})`);
    });
  } catch (error) {
    console.error('Failed to query tags:', error.response?.data);
  }
}
```

### Data Collection

#### Write Real-time Data

```javascript
async function writeRealtimeData() {
  const dataPoints = [
    {
      TagName: 'TEMP_SENSOR_01',
      Value: 25.5 + Math.random() * 5, // Simulate sensor readings
      Timestamp: new Date().toISOString(),
      Quality: 100
    },
    {
      TagName: 'PRESSURE_SENSOR_01',
      Value: 150 + Math.random() * 10,
      Timestamp: new Date().toISOString(),
      Quality: 100
    },
    {
      TagName: 'STATUS_VALVE_01',
      Value: Math.random() > 0.5 ? 1 : 0, // Random on/off
      Timestamp: new Date().toISOString(),
      Quality: 100
    }
  ];

  try {
    const response = await axios.post(`${baseURL}/data/write`, {
      Data: dataPoints
    }, { auth });

    console.log(`Written ${response.data.PointsWritten} data points`);
  } catch (error) {
    console.error('Failed to write data:', error.response?.data);
  }
}

// Write data every 5 seconds
setInterval(writeRealtimeData, 5000);
```

#### Batch Data Loading

```javascript
async function loadHistoricalData() {
  const batchSize = 1000;
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const dataPoints = [];

  // Generate 24 hours of data at 1-minute intervals
  for (let i = 0; i < 24 * 60; i++) {
    const timestamp = new Date(startTime.getTime() + i * 60 * 1000);

    dataPoints.push({
      TagName: 'TEMP_SENSOR_01',
      Value: 25 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
      Timestamp: timestamp.toISOString(),
      Quality: 100
    });
  }

  // Write data in batches
  for (let i = 0; i < dataPoints.length; i += batchSize) {
    const batch = dataPoints.slice(i, i + batchSize);

    try {
      const response = await axios.post(`${baseURL}/data/write`, {
        Data: batch
      }, { auth });

      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${response.data.PointsWritten} points written`);
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error.response?.data);
    }
  }
}
```

### Data Retrieval

#### Query Historical Data

```javascript
async function queryHistoricalData() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago

  try {
    const response = await axios.get(`${baseURL}/data/query`, {
      auth,
      params: {
        tagNames: 'TEMP_SENSOR_01,PRESSURE_SENSOR_01',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        maxResults: 1000,
        qualityFilter: 90
      }
    });

    console.log(`Found ${response.data.Data.length} data points`);

    // Group by tag
    const groupedData = response.data.Data.reduce((acc, point) => {
      if (!acc[point.TagName]) acc[point.TagName] = [];
      acc[point.TagName].push(point);
      return acc;
    }, {});

    Object.entries(groupedData).forEach(([tagName, points]) => {
      console.log(`\n${tagName}: ${points.length} points`);
      const avgValue = points.reduce((sum, p) => sum + p.Value, 0) / points.length;
      console.log(`  Average value: ${avgValue.toFixed(2)}`);
    });
  } catch (error) {
    console.error('Failed to query data:', error.response?.data);
  }
}
```

#### Calculate Aggregations

```javascript
async function calculateAggregations() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  const aggregationTypes = ['Average', 'Minimum', 'Maximum', 'StandardDeviation'];

  for (const aggType of aggregationTypes) {
    try {
      const response = await axios.post(`${baseURL}/data/aggregate`, {
        TagName: 'TEMP_SENSOR_01',
        AggregationType: aggType,
        StartTime: startTime.toISOString(),
        EndTime: endTime.toISOString()
      }, { auth });

      console.log(`${aggType}: ${response.data.Value.toFixed(2)} (${response.data.Count} points)`);
    } catch (error) {
      console.error(`Failed to calculate ${aggType}:`, error.response?.data);
    }
  }
}
```

---

## Integration Patterns

### Python Integration

```python
import requests
import json
import time
from datetime import datetime, timedelta

class ProficyHistorianClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth

    def create_tag(self, tag_config):
        """Create a new tag"""
        response = self.session.post(f"{self.base_url}/tags", json=tag_config)
        response.raise_for_status()
        return response.json()

    def write_data(self, data_points):
        """Write data points"""
        payload = {"Data": data_points}
        response = self.session.post(f"{self.base_url}/data/write", json=payload)
        response.raise_for_status()
        return response.json()

    def query_data(self, tag_names, start_time, end_time, max_results=1000):
        """Query historical data"""
        params = {
            "tagNames": ",".join(tag_names) if isinstance(tag_names, list) else tag_names,
            "startTime": start_time.isoformat() + "Z",
            "endTime": end_time.isoformat() + "Z",
            "maxResults": max_results
        }
        response = self.session.get(f"{self.base_url}/data/query", params=params)
        response.raise_for_status()
        return response.json()

    def get_recent_data(self, tag_name, count=10):
        """Get recent data points"""
        params = {"tagName": tag_name, "count": count}
        response = self.session.get(f"{self.base_url}/data/recent", params=params)
        response.raise_for_status()
        return response.json()

# Usage example
client = ProficyHistorianClient("http://localhost:8080/historian", "historian", "password")

# Create tag
tag_config = {
    "tagName": "PYTHON_TEST_TAG",
    "description": "Test tag from Python",
    "dataType": "Float",
    "engineeringUnits": "units"
}
client.create_tag(tag_config)

# Write data
data_points = [
    {
        "TagName": "PYTHON_TEST_TAG",
        "Value": 42.5,
        "Timestamp": datetime.utcnow().isoformat() + "Z",
        "Quality": 100
    }
]
result = client.write_data(data_points)
print(f"Written {result['PointsWritten']} points")

# Query data
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=1)
data = client.query_data(["PYTHON_TEST_TAG"], start_time, end_time)
print(f"Found {len(data['Data'])} data points")
```

### C# Integration

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class ProficyHistorianClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public ProficyHistorianClient(string baseUrl, string username, string password)
    {
        _baseUrl = baseUrl;
        _httpClient = new HttpClient();

        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{username}:{password}"));
        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
    }

    public async Task<dynamic> CreateTagAsync(object tagConfig)
    {
        var json = JsonConvert.SerializeObject(tagConfig);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/tags", content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject(responseContent);
    }

    public async Task<dynamic> WriteDataAsync(object[] dataPoints)
    {
        var payload = new { Data = dataPoints };
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_baseUrl}/data/write", content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject(responseContent);
    }

    public async Task<dynamic> QueryDataAsync(string[] tagNames, DateTime startTime, DateTime endTime)
    {
        var tagNamesStr = string.Join(",", tagNames);
        var url = $"{_baseUrl}/data/query?tagNames={tagNamesStr}" +
                  $"&startTime={startTime:yyyy-MM-ddTHH:mm:ss.fffZ}" +
                  $"&endTime={endTime:yyyy-MM-ddTHH:mm:ss.fffZ}";

        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject(responseContent);
    }
}

// Usage example
var client = new ProficyHistorianClient("http://localhost:8080/historian", "historian", "password");

// Create tag
var tagConfig = new
{
    tagName = "CSHARP_TEST_TAG",
    description = "Test tag from C#",
    dataType = "Float",
    engineeringUnits = "units"
};
await client.CreateTagAsync(tagConfig);

// Write data
var dataPoints = new[]
{
    new
    {
        TagName = "CSHARP_TEST_TAG",
        Value = 42.5,
        Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        Quality = 100
    }
};
var result = await client.WriteDataAsync(dataPoints);
Console.WriteLine($"Written {result.PointsWritten} points");
```

---

## Testing Scenarios

### Load Testing Scenarios

The surrogate includes pre-built test scenarios for various manufacturing environments:

#### Manufacturing Line Scenario

```bash
# Load complete manufacturing line scenario
curl -u historian:password -X POST http://localhost:8080/historian/scenarios/manufacturing_line_1/load \
  -H "Content-Type: application/json" \
  -d '{
    "clearExisting": true,
    "options": {
      "batchSize": 100,
      "verbose": true
    }
  }'
```

#### Custom Equipment Scenario

```javascript
async function createCustomScenario() {
  // Create tags for custom equipment
  const equipmentTags = [
    {
      tagName: 'CUSTOM_EQUIP_01.MOTOR_SPEED',
      description: 'Motor speed RPM',
      dataType: 'Float',
      engineeringUnits: 'RPM'
    },
    {
      tagName: 'CUSTOM_EQUIP_01.VIBRATION',
      description: 'Vibration level',
      dataType: 'Float',
      engineeringUnits: 'mm/s'
    },
    {
      tagName: 'CUSTOM_EQUIP_01.STATUS',
      description: 'Equipment status',
      dataType: 'Integer',
      engineeringUnits: ''
    }
  ];

  // Create tags
  for (const tag of equipmentTags) {
    await axios.post(`${baseURL}/tags`, tag, { auth });
  }

  // Generate and write realistic data
  const dataPoints = [];
  const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  for (let i = 0; i < 120; i++) { // 2 hours of 1-minute interval data
    const timestamp = new Date(startTime.getTime() + i * 60 * 1000);

    // Simulate equipment cycles
    const cyclePhase = (i % 20) / 20; // 20-minute cycles
    const isRunning = cyclePhase > 0.1 && cyclePhase < 0.8;

    dataPoints.push(
      {
        TagName: 'CUSTOM_EQUIP_01.MOTOR_SPEED',
        Value: isRunning ? 1750 + Math.sin(cyclePhase * 2 * Math.PI) * 50 : 0,
        Timestamp: timestamp.toISOString(),
        Quality: 100
      },
      {
        TagName: 'CUSTOM_EQUIP_01.VIBRATION',
        Value: isRunning ? 2.5 + Math.random() * 0.5 : 0.1,
        Timestamp: timestamp.toISOString(),
        Quality: 100
      },
      {
        TagName: 'CUSTOM_EQUIP_01.STATUS',
        Value: isRunning ? 1 : 0,
        Timestamp: timestamp.toISOString(),
        Quality: 100
      }
    );
  }

  // Write data in batches
  const batchSize = 50;
  for (let i = 0; i < dataPoints.length; i += batchSize) {
    const batch = dataPoints.slice(i, i + batchSize);
    await axios.post(`${baseURL}/data/write`, { Data: batch }, { auth });
  }

  console.log(`Created custom scenario with ${dataPoints.length} data points`);
}
```

---

## Performance Testing

### High-Throughput Data Writing

```javascript
async function performanceTest() {
  const tagCount = 100;
  const pointsPerTag = 1000;
  const batchSize = 100;

  console.log(`Performance test: ${tagCount} tags × ${pointsPerTag} points = ${tagCount * pointsPerTag} total points`);

  // Create test tags
  const tags = [];
  for (let i = 1; i <= tagCount; i++) {
    tags.push({
      tagName: `PERF_TEST_TAG_${i.toString().padStart(3, '0')}`,
      description: `Performance test tag ${i}`,
      dataType: 'Float',
      engineeringUnits: 'units'
    });
  }

  console.log('Creating tags...');
  for (const tag of tags) {
    await axios.post(`${baseURL}/tags`, tag, { auth });
  }

  // Generate test data
  console.log('Generating test data...');
  const allDataPoints = [];
  const baseTime = new Date(Date.now() - pointsPerTag * 1000);

  for (let tagIndex = 0; tagIndex < tagCount; tagIndex++) {
    for (let pointIndex = 0; pointIndex < pointsPerTag; pointIndex++) {
      allDataPoints.push({
        TagName: `PERF_TEST_TAG_${(tagIndex + 1).toString().padStart(3, '0')}`,
        Value: Math.random() * 100,
        Timestamp: new Date(baseTime.getTime() + pointIndex * 1000).toISOString(),
        Quality: 100
      });
    }
  }

  // Write data in batches and measure performance
  console.log('Writing data...');
  const startTime = Date.now();
  let totalWritten = 0;

  for (let i = 0; i < allDataPoints.length; i += batchSize) {
    const batch = allDataPoints.slice(i, i + batchSize);

    const response = await axios.post(`${baseURL}/data/write`, { Data: batch }, { auth });
    totalWritten += response.data.PointsWritten;

    if ((i / batchSize) % 100 === 0) {
      const elapsed = Date.now() - startTime;
      const rate = totalWritten / (elapsed / 1000);
      console.log(`Progress: ${totalWritten}/${allDataPoints.length} points (${rate.toFixed(0)} points/sec)`);
    }
  }

  const totalTime = Date.now() - startTime;
  const overallRate = totalWritten / (totalTime / 1000);

  console.log(`\nPerformance Results:`);
  console.log(`Total points written: ${totalWritten}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average rate: ${overallRate.toFixed(0)} points/second`);
}
```

### Query Performance Testing

```javascript
async function queryPerformanceTest() {
  const queries = [
    { tagCount: 1, timeRange: '1h', maxResults: 1000 },
    { tagCount: 10, timeRange: '4h', maxResults: 5000 },
    { tagCount: 50, timeRange: '24h', maxResults: 10000 }
  ];

  for (const query of queries) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - parseTimeRange(query.timeRange));

    const tagNames = [];
    for (let i = 1; i <= query.tagCount; i++) {
      tagNames.push(`PERF_TEST_TAG_${i.toString().padStart(3, '0')}`);
    }

    console.log(`\nQuery test: ${query.tagCount} tags, ${query.timeRange} range`);

    const queryStart = Date.now();
    const response = await axios.get(`${baseURL}/data/query`, {
      auth,
      params: {
        tagNames: tagNames.join(','),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        maxResults: query.maxResults
      }
    });
    const queryTime = Date.now() - queryStart;

    console.log(`  Results: ${response.data.Data.length} points in ${queryTime}ms`);
    console.log(`  Rate: ${(response.data.Data.length / (queryTime / 1000)).toFixed(0)} points/sec`);
  }
}

function parseTimeRange(range) {
  const match = range.match(/^(\d+)([hmd])$/);
  if (!match) throw new Error('Invalid time range format');

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error('Invalid time unit');
  }
}
```

---

## Error Handling

### Implementing Retry Logic

```javascript
class HistorianClientWithRetry {
  constructor(baseURL, auth, options = {}) {
    this.baseURL = baseURL;
    this.auth = auth;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
  }

  async request(config, retryCount = 0) {
    try {
      return await axios(config);
    } catch (error) {
      if (retryCount >= this.maxRetries) {
        throw error;
      }

      const shouldRetry = this.shouldRetry(error);
      if (!shouldRetry) {
        throw error;
      }

      const delay = this.retryDelay * Math.pow(this.backoffMultiplier, retryCount);
      console.log(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);

      await this.sleep(delay);
      return this.request(config, retryCount + 1);
    }
  }

  shouldRetry(error) {
    if (!error.response) return true; // Network errors

    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors or rate limits
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async writeData(dataPoints) {
    const config = {
      method: 'post',
      url: `${this.baseURL}/data/write`,
      auth: this.auth,
      data: { Data: dataPoints }
    };

    const response = await this.request(config);
    return response.data;
  }
}

// Usage
const client = new HistorianClientWithRetry(
  'http://localhost:8080/historian',
  { username: 'historian', password: 'password' },
  { maxRetries: 5, retryDelay: 2000 }
);
```

### Error Monitoring and Alerting

```javascript
class HistorianMonitor {
  constructor(client) {
    this.client = client;
    this.errorCounts = new Map();
    this.lastSuccessTime = new Map();
    this.alertThresholds = {
      errorRate: 0.1, // 10% error rate
      maxSilenceMinutes: 5
    };
  }

  async monitoredWrite(tagName, dataPoints) {
    const operation = 'write';
    const key = `${operation}:${tagName}`;

    try {
      const result = await this.client.writeData(dataPoints);
      this.recordSuccess(key);
      return result;
    } catch (error) {
      this.recordError(key, error);
      this.checkAlerts(key);
      throw error;
    }
  }

  recordSuccess(key) {
    this.lastSuccessTime.set(key, new Date());
    // Reset error count on success
    this.errorCounts.delete(key);
  }

  recordError(key, error) {
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);

    console.error(`Error in ${key}:`, error.message);
  }

  checkAlerts(key) {
    const errorCount = this.errorCounts.get(key) || 0;
    const lastSuccess = this.lastSuccessTime.get(key);

    // Check error rate
    if (errorCount >= 10) {
      this.sendAlert(`High error count for ${key}: ${errorCount} errors`);
    }

    // Check silence period
    if (lastSuccess) {
      const silenceMinutes = (new Date() - lastSuccess) / (1000 * 60);
      if (silenceMinutes > this.alertThresholds.maxSilenceMinutes) {
        this.sendAlert(`No successful operations for ${key} in ${silenceMinutes.toFixed(1)} minutes`);
      }
    }
  }

  sendAlert(message) {
    console.error(`ALERT: ${message}`);
    // Implement your alerting mechanism here (email, Slack, etc.)
  }

  getHealthStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      operations: {}
    };

    for (const [key, lastSuccess] of this.lastSuccessTime.entries()) {
      const errorCount = this.errorCounts.get(key) || 0;
      const silenceMinutes = (new Date() - lastSuccess) / (1000 * 60);

      status.operations[key] = {
        lastSuccess: lastSuccess.toISOString(),
        silenceMinutes: parseFloat(silenceMinutes.toFixed(1)),
        errorCount,
        healthy: errorCount < 5 && silenceMinutes < this.alertThresholds.maxSilenceMinutes
      };
    }

    return status;
  }
}
```

---

## Advanced Features

### Using Error Simulation for Testing

```javascript
// Enable error simulation for robustness testing
await axios.post(`${baseURL}/simulation/errors/activate`, {
  scenario: 'null_values',
  enabled: true
}, { auth });

// Your application should handle these errors gracefully
try {
  const result = await writeData(dataPoints);
  console.log('Write successful despite error simulation');
} catch (error) {
  console.log('Handling simulated error:', error.message);
}

// Disable error simulation
await axios.post(`${baseURL}/simulation/errors/activate`, {
  scenario: 'null_values',
  enabled: false
}, { auth });
```

### Custom Data Compression

```javascript
// Enable compression for high-frequency numeric data
const tagConfig = {
  tagName: 'HIGH_FREQ_SENSOR',
  description: 'High frequency sensor data',
  dataType: 'Float',
  engineeringUnits: 'Hz',
  compressionType: 'Swinging Door',
  compressionDeviation: 0.1 // Only store points that deviate by more than 0.1
};

await axios.post(`${baseURL}/tags`, tagConfig, { auth });
```

### Real-time Data Streaming Simulation

```javascript
class RealTimeDataSimulator {
  constructor(client) {
    this.client = client;
    this.intervals = new Map();
  }

  startStreaming(tagName, intervalMs, valueGenerator) {
    if (this.intervals.has(tagName)) {
      this.stopStreaming(tagName);
    }

    const interval = setInterval(async () => {
      try {
        const dataPoint = {
          TagName: tagName,
          Value: valueGenerator(),
          Timestamp: new Date().toISOString(),
          Quality: 100
        };

        await this.client.writeData([dataPoint]);
      } catch (error) {
        console.error(`Failed to stream data for ${tagName}:`, error.message);
      }
    }, intervalMs);

    this.intervals.set(tagName, interval);
    console.log(`Started streaming for ${tagName} every ${intervalMs}ms`);
  }

  stopStreaming(tagName) {
    const interval = this.intervals.get(tagName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(tagName);
      console.log(`Stopped streaming for ${tagName}`);
    }
  }

  stopAllStreaming() {
    for (const tagName of this.intervals.keys()) {
      this.stopStreaming(tagName);
    }
  }
}

// Usage
const simulator = new RealTimeDataSimulator(client);

// Simulate temperature sensor with sinusoidal pattern
simulator.startStreaming('TEMP_SENSOR_01', 1000, () => {
  return 25 + Math.sin(Date.now() / 10000) * 5 + Math.random() * 2;
});

// Simulate pressure sensor with step changes
let pressureLevel = 100;
simulator.startStreaming('PRESSURE_SENSOR_01', 5000, () => {
  if (Math.random() < 0.1) pressureLevel += (Math.random() - 0.5) * 20;
  return Math.max(0, pressureLevel + Math.random() * 5);
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Connection Issues

**Problem**: Cannot connect to surrogate server
```bash
curl: (7) Failed to connect to localhost port 8080: Connection refused
```

**Solutions**:
1. Check if server is running: `./manage.sh status`
2. Verify port configuration: Check `SURROGATE_PORT` in `.env`
3. Check firewall settings
4. Review server logs: `./manage.sh logs`

#### Authentication Failures

**Problem**: 401 Unauthorized responses
```json
{
  "Success": false,
  "Error": "Unauthorized access"
}
```

**Solutions**:
1. Verify credentials in `.env` file
2. Check authentication headers
3. Test with curl: `curl -u username:password http://localhost:8080/historian/health`

#### Data Write Failures

**Problem**: Data points not being written
```json
{
  "Success": false,
  "PointsWritten": 0,
  "PointsFailed": 5,
  "Errors": ["Tag not found: MISSING_TAG"]
}
```

**Solutions**:
1. Ensure tags exist before writing data
2. Check tag names for typos
3. Verify data format matches tag data type
4. Check quality values (0-100 range)

#### Query Performance Issues

**Problem**: Slow query responses

**Solutions**:
1. Limit time ranges: Use smaller date ranges
2. Reduce result count: Set appropriate `maxResults`
3. Use quality filtering: Filter out low-quality data
4. Check server resources: Monitor memory and CPU usage

### Debugging Tools

#### Enable Debug Logging

```bash
# Set detailed logging
export SURROGATE_LOG_LEVEL=debug
./manage.sh restart
```

#### Health Check Script

```bash
#!/bin/bash
# health-check.sh

BASE_URL="http://localhost:8080/historian"
AUTH="historian:password"

echo "=== Historian Surrogate Health Check ==="

# Check basic connectivity
echo "1. Testing connectivity..."
if curl -s -u $AUTH $BASE_URL/health > /dev/null; then
  echo "   ✓ Server is reachable"
else
  echo "   ✗ Server is not reachable"
  exit 1
fi

# Check server status
echo "2. Checking server status..."
STATUS=$(curl -s -u $AUTH $BASE_URL/server/status | jq -r '.server.status')
if [ "$STATUS" = "running" ]; then
  echo "   ✓ Server status: $STATUS"
else
  echo "   ✗ Server status: $STATUS"
fi

# Check storage
echo "3. Checking storage..."
STORAGE=$(curl -s -u $AUTH $BASE_URL/server/status | jq '.storage')
TAGS=$(echo $STORAGE | jq -r '.totalTags')
POINTS=$(echo $STORAGE | jq -r '.totalDataPoints')
echo "   Tags: $TAGS, Data Points: $POINTS"

# Check performance
echo "4. Checking performance..."
PERF=$(curl -s -u $AUTH $BASE_URL/performance/metrics | jq '.Metrics')
RPS=$(echo $PERF | jq -r '.requestsPerSecond')
RESP_TIME=$(echo $PERF | jq -r '.averageResponseTime')
echo "   Requests/sec: $RPS, Avg response time: ${RESP_TIME}ms"

echo "=== Health Check Complete ==="
```

#### Load Test Script

```bash
#!/bin/bash
# load-test.sh

BASE_URL="http://localhost:8080/historian"
AUTH="historian:password"
CONCURRENT_USERS=10
REQUESTS_PER_USER=100

echo "=== Load Test: $CONCURRENT_USERS users × $REQUESTS_PER_USER requests ==="

# Function to run user simulation
run_user() {
  USER_ID=$1
  for i in $(seq 1 $REQUESTS_PER_USER); do
    # Create random data point
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    VALUE=$(echo "scale=2; $RANDOM/327.68" | bc)

    curl -s -u $AUTH -X POST $BASE_URL/data/write \
      -H "Content-Type: application/json" \
      -d "{\"Data\":[{\"TagName\":\"LOAD_TEST_TAG_$USER_ID\",\"Value\":$VALUE,\"Timestamp\":\"$TIMESTAMP\",\"Quality\":100}]}" \
      > /dev/null

    if [ $((i % 10)) -eq 0 ]; then
      echo "User $USER_ID: $i/$REQUESTS_PER_USER requests completed"
    fi
  done
}

# Create test tags
echo "Creating test tags..."
for i in $(seq 1 $CONCURRENT_USERS); do
  curl -s -u $AUTH -X POST $BASE_URL/tags \
    -H "Content-Type: application/json" \
    -d "{\"tagName\":\"LOAD_TEST_TAG_$i\",\"description\":\"Load test tag $i\",\"dataType\":\"Float\"}" \
    > /dev/null
done

# Run concurrent users
echo "Starting load test..."
START_TIME=$(date +%s)

for i in $(seq 1 $CONCURRENT_USERS); do
  run_user $i &
done

wait # Wait for all background jobs to complete

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TOTAL_REQUESTS=$((CONCURRENT_USERS * REQUESTS_PER_USER))
RPS=$(echo "scale=2; $TOTAL_REQUESTS / $DURATION" | bc)

echo "=== Load Test Results ==="
echo "Total requests: $TOTAL_REQUESTS"
echo "Duration: ${DURATION}s"
echo "Requests per second: $RPS"
```

---

For more detailed information, see the [API Documentation](API_DOCUMENTATION.md) and [Architecture Overview](ARCHITECTURE.md).