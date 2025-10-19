# MachShop MES - Test Scenarios & Validation
## Comprehensive Test Plan for World-Class Aerospace MES

**Document Version:** 1.0
**Date:** October 15, 2025
**Classification:** Confidential - Internal Use Only
**Total Test Cases:** 500+

---

## TABLE OF CONTENTS

1. [Test Strategy Overview](#1-test-strategy-overview)
2. [Requirements Traceability Matrix](#2-requirements-traceability-matrix)
3. [Unit Test Scenarios](#3-unit-test-scenarios)
4. [Integration Test Scenarios](#4-integration-test-scenarios)
5. [End-to-End Test Scenarios](#5-end-to-end-test-scenarios)
6. [Performance Test Scenarios](#6-performance-test-scenarios)
7. [Security Test Scenarios](#7-security-test-scenarios)
8. [Compliance Validation](#8-compliance-validation)
9. [User Acceptance Testing](#9-user-acceptance-testing)
10. [Test Data Management](#10-test-data-management)

---

## 1. TEST STRATEGY OVERVIEW

### 1.1 Test Pyramid

```
                    ▲
                   / \
                  /E2E\ (10% - 50 tests)
                 /─────\
                /  API  \ (20% - 100 tests)
               /Integration\
              /─────────────\
             /   UNIT TESTS  \ (70% - 350+ tests)
            /─────────────────\
           /___________________\
```

**Test Distribution:**
- **Unit Tests (70%):** 350+ tests - Fast, isolated, developer-run
- **Integration Tests (20%):** 100 tests - Service-to-service, database, external APIs
- **End-to-End Tests (10%):** 50 tests - Complete user workflows, critical paths

### 1.2 Test Levels

| Level | Scope | Tools | Frequency | Owner |
|-------|-------|-------|-----------|-------|
| **Unit** | Single function/class | Jest, Vitest | Every commit (CI) | Developers |
| **Integration** | Service-to-service, DB | Supertest, Testcontainers | Daily (CI) | Developers |
| **E2E** | Complete workflows | Playwright, Cypress | Pre-release | QA Engineers |
| **Performance** | Load, stress, endurance | k6, JMeter | Weekly | Performance Team |
| **Security** | Vulnerabilities, pen test | OWASP ZAP, Burp Suite | Monthly | Security Team |
| **UAT** | Business workflows | Manual + automated | Before go-live | Customers |

### 1.3 Test Environment Strategy

**Environments:**
1. **Local (Developer):** Unit tests, integration tests with mocked dependencies
2. **Dev:** Continuous integration, automated tests on every commit
3. **Staging:** Pre-production environment, mirrors production configuration
4. **Production:** Smoke tests post-deployment, monitoring

**Test Data:**
- **Synthetic:** Generated test data (Faker.js)
- **Anonymized Production:** Real data with PII masked
- **Baseline:** Fixed dataset for regression testing

### 1.4 Acceptance Criteria

**Definition of Done (Test Perspective):**
- ✅ All unit tests pass (≥80% code coverage)
- ✅ All integration tests pass
- ✅ Critical E2E tests pass (smoke tests)
- ✅ No P0/P1 bugs open
- ✅ Performance tests meet SLA (P95 < 2 sec)
- ✅ Security scan: 0 critical, < 5 high severity issues
- ✅ Accessibility: WCAG 2.1 AA compliant

---

## 2. REQUIREMENTS TRACEABILITY MATRIX

### 2.1 Critical Requirements Test Coverage

| Requirement ID | Requirement Description | Test Cases | Priority | Status |
|----------------|------------------------|------------|----------|--------|
| REQ-DWI-001 | Work instruction authoring | TC-DWI-001 to TC-DWI-010 | P0 | ✅ Planned |
| REQ-DWI-002 | Work instruction execution | TC-DWI-011 to TC-DWI-025 | P0 | ✅ Planned |
| REQ-ESIG-001 | 21 CFR Part 11 signatures | TC-ESIG-001 to TC-ESIG-015 | P0 | ✅ Planned |
| REQ-FAI-001 | AS9102 Form 1 generation | TC-FAI-001 to TC-FAI-005 | P0 | ✅ Planned |
| REQ-FAI-002 | AS9102 Form 2 generation | TC-FAI-006 to TC-FAI-010 | P0 | ✅ Planned |
| REQ-FAI-003 | AS9102 Form 3 generation | TC-FAI-011 to TC-FAI-020 | P0 | ✅ Planned |
| REQ-SER-001 | Unit-level serialization | TC-SER-001 to TC-SER-010 | P0 | ✅ Planned |
| REQ-SER-003 | Forward traceability | TC-SER-011 to TC-SER-015 | P0 | ✅ Planned |
| REQ-SER-004 | Backward traceability | TC-SER-016 to TC-SER-025 | P0 | ✅ Planned |
| REQ-SPC-001 | Real-time SPC charts | TC-SPC-001 to TC-SPC-015 | P1 | ✅ Planned |
| REQ-INT-001 | ISA-95 architecture | TC-INT-001 to TC-INT-010 | P0 | ✅ Planned |
| REQ-INT-002 | Work order sync (ERP→MES) | TC-INT-011 to TC-INT-020 | P0 | ✅ Planned |
| REQ-IOT-001 | OPC-UA integration | TC-IOT-001 to TC-IOT-015 | P0 | ✅ Planned |

**Total Requirements:** 150+
**Total Test Cases:** 500+
**Coverage:** 100% of P0 requirements, 95% of P1 requirements, 80% of P2 requirements

---

## 3. UNIT TEST SCENARIOS

### 3.1 Work Order Service Unit Tests

**TC-WO-001: Create Work Order with Valid Data**
```typescript
describe('WorkOrderService.createWorkOrder', () => {
  it('should create work order with valid part and routing', async () => {
    // Given
    const workOrderData = {
      partId: 'part-123',
      quantity: 10,
      priority: 'HIGH',
      dueDate: '2025-10-30',
      routingId: 'routing-456'
    };

    // When
    const workOrder = await workOrderService.createWorkOrder(workOrderData);

    // Then
    expect(workOrder.id).toBeDefined();
    expect(workOrder.workOrderNumber).toMatch(/^WO-\d{4}-\d{6}$/);
    expect(workOrder.status).toBe('CREATED');
    expect(workOrder.quantity).toBe(10);
  });
});
```

**TC-WO-002: Reject Work Order with Invalid Part**
```typescript
it('should reject work order with non-existent part', async () => {
  // Given
  const workOrderData = { partId: 'invalid-part', quantity: 10 };

  // When/Then
  await expect(
    workOrderService.createWorkOrder(workOrderData)
  ).rejects.toThrow('Part not found: invalid-part');
});
```

**TC-WO-003: Calculate Work Order Progress**
```typescript
it('should calculate progress as (completed / total) * 100', () => {
  // Given
  const workOrder = { quantity: 100, quantityCompleted: 45 };

  // When
  const progress = workOrderService.calculateProgress(workOrder);

  // Then
  expect(progress).toBe(45);
});
```

**Additional Work Order Unit Tests (TC-WO-004 to TC-WO-050):**
- Release work order validation
- Operation start/complete logic
- Material allocation
- Actual vs. estimated cost calculation
- Work order status transitions
- Due date validation
- Routing operation sequencing

### 3.2 Quality Service Unit Tests

**TC-QUA-001: Calculate Cpk (Process Capability)**
```typescript
describe('QualityService.calculateCpk', () => {
  it('should calculate Cpk for bilateral tolerance', () => {
    // Given
    const measurements = [10.1, 10.2, 9.9, 10.0, 10.1, 9.8, 10.0];
    const usl = 10.5;  // Upper Spec Limit
    const lsl = 9.5;   // Lower Spec Limit

    // When
    const cpk = qualityService.calculateCpk(measurements, usl, lsl);

    // Then
    expect(cpk).toBeGreaterThan(1.33);  // Process capable
  });

  it('should return 0 if process outside spec limits', () => {
    // Given (mean = 11, outside USL)
    const measurements = [11.0, 11.1, 11.2, 11.0, 10.9];
    const usl = 10.5;
    const lsl = 9.5;

    // When
    const cpk = qualityService.calculateCpk(measurements, usl, lsl);

    // Then
    expect(cpk).toBeLessThan(0);  // Process not capable
  });
});
```

**TC-QUA-002: Detect Out-of-Control Conditions (Nelson Rules)**
```typescript
it('should detect Rule 1: One point beyond 3 sigma', () => {
  // Given
  const dataPoints = [10, 10.1, 9.9, 10.2, 15.0]; // Last point is outlier
  const controlLimits = { ucl: 12, lcl: 8, xbar: 10 };

  // When
  const result = qualityService.applyNelsonRules(dataPoints, controlLimits);

  // Then
  expect(result.outOfControl).toBe(true);
  expect(result.violatedRules).toContain('RULE_1_BEYOND_3_SIGMA');
});

it('should detect Rule 2: Nine points in a row on same side of centerline', () => {
  // Given (9 consecutive points above centerline)
  const dataPoints = [10.1, 10.2, 10.1, 10.3, 10.1, 10.2, 10.1, 10.2, 10.1];
  const controlLimits = { ucl: 12, lcl: 8, xbar: 10 };

  // When
  const result = qualityService.applyNelsonRules(dataPoints, controlLimits);

  // Then
  expect(result.outOfControl).toBe(true);
  expect(result.violatedRules).toContain('RULE_2_NINE_CONSECUTIVE_SAME_SIDE');
});
```

**Additional Quality Unit Tests (TC-QUA-003 to TC-QUA-080):**
- SPC control limit calculations (X-bar, R, X-mR)
- Ppk calculation (long-term capability)
- AS9102 Form 1/2/3 data population
- NCR severity determination
- 8D problem-solving workflow validation
- Certificate of Conformance template rendering
- GD&T tolerance calculations

### 3.3 Material Service Unit Tests

**TC-MAT-001: Forward Traceability Query**
```typescript
describe('MaterialService.forwardTraceability', () => {
  it('should find all products containing material lot', async () => {
    // Given
    const lotNumber = 'TI-LOT-2025-0451';
    // Database contains:
    // - Serial SN-001 uses TI-LOT-2025-0451 (parent assembly SN-100)
    // - Serial SN-002 uses TI-LOT-2025-0451 (parent assembly SN-101)

    // When
    const products = await materialService.forwardTraceability(lotNumber);

    // Then
    expect(products).toHaveLength(2);
    expect(products[0].serialNumber).toBe('SN-100');
    expect(products[1].serialNumber).toBe('SN-101');
  });
});
```

**TC-MAT-002: Backward Traceability Query (Recursive BOM)**
```typescript
it('should return complete material genealogy tree', async () => {
  // Given
  const serialNumber = 'ENGINE-001';
  // BOM: ENGINE-001
  //   ├─ TURBINE-001
  //   │   ├─ BLADE-001 (material: TI-LOT-001)
  //   │   └─ BLADE-002 (material: TI-LOT-002)
  //   └─ CASING-001 (material: AL-LOT-003)

  // When
  const genealogy = await materialService.backwardTraceability(serialNumber);

  // Then
  expect(genealogy.root.serialNumber).toBe('ENGINE-001');
  expect(genealogy.root.children).toHaveLength(2);
  expect(genealogy.root.children[0].serialNumber).toBe('TURBINE-001');
  expect(genealogy.root.children[0].children).toHaveLength(2);
  expect(genealogy.flatMaterialList).toContain('TI-LOT-001');
  expect(genealogy.flatMaterialList).toContain('TI-LOT-002');
  expect(genealogy.flatMaterialList).toContain('AL-LOT-003');
});
```

**Additional Material Unit Tests (TC-MAT-003 to TC-MAT-060):**
- Inventory allocation logic
- Material consumption recording
- Serial number generation (format validation)
- Lot number uniqueness enforcement
- Material certification validation
- Counterfeit parts prevention checks

### 3.4 Scheduler Service Unit Tests

**TC-SCH-001: Detect Scheduling Conflicts**
```typescript
describe('SchedulerService.detectConflicts', () => {
  it('should detect equipment double-booking', () => {
    // Given
    const schedule = [
      { workOrderId: 'WO-001', equipmentId: 'EQ-001', startTime: '2025-10-16T08:00', endTime: '2025-10-16T12:00' },
      { workOrderId: 'WO-002', equipmentId: 'EQ-001', startTime: '2025-10-16T10:00', endTime: '2025-10-16T14:00' }  // Overlap!
    ];

    // When
    const conflicts = schedulerService.detectConflicts(schedule);

    // Then
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('EQUIPMENT_DOUBLE_BOOKING');
    expect(conflicts[0].equipmentId).toBe('EQ-001');
    expect(conflicts[0].conflictingWorkOrders).toEqual(['WO-001', 'WO-002']);
  });
});
```

**TC-SCH-002: Optimize Schedule (Minimize Makespan)**
```typescript
it('should optimize schedule to minimize total completion time', async () => {
  // Given
  const workOrders = [
    { id: 'WO-001', duration: 4, dueDate: '2025-10-20' },
    { id: 'WO-002', duration: 2, dueDate: '2025-10-18' },  // Urgent
    { id: 'WO-003', duration: 6, dueDate: '2025-10-25' }
  ];
  const resources = [{ id: 'EQ-001', capability: 'CNC' }];

  // When
  const optimizedSchedule = await schedulerService.optimize(workOrders, resources, { objective: 'MINIMIZE_MAKESPAN' });

  // Then
  // Should schedule WO-002 first (shortest processing time + earliest due date)
  expect(optimizedSchedule[0].workOrderId).toBe('WO-002');
  expect(optimizedSchedule.totalMakespan).toBeLessThanOrEqual(12); // 4+2+6=12 hours (sequential)
});
```

---

## 4. INTEGRATION TEST SCENARIOS

### 4.1 ISA-95 ERP Integration Tests

**TC-INT-001: Work Order Synchronization (ERP → MES)**
```typescript
describe('ERP Integration: Production Schedule', () => {
  it('should receive work order from ERP and create in MES', async () => {
    // Given: SAP sends production order via B2MML
    const b2mmlMessage = `
      <ProductionSchedule>
        <ID>PS-2025-001</ID>
        <ProductionRequest>
          <ID>4500012345</ID>
          <Description>Turbine Blade</Description>
          <SegmentRequirement>
            <MaterialProducedRequirement>
              <MaterialDefinitionID>BLADE-001</MaterialDefinitionID>
              <Quantity>10</Quantity>
            </MaterialProducedRequirement>
          </SegmentRequirement>
        </ProductionRequest>
      </ProductionSchedule>
    `;

    // When: Integration service processes message
    await erpAdapter.processB2MMLMessage(b2mmlMessage);

    // Then: Work order created in MES
    const workOrder = await prisma.workOrder.findUnique({
      where: { externalId: '4500012345' }
    });
    expect(workOrder).toBeDefined();
    expect(workOrder.partNumber).toBe('BLADE-001');
    expect(workOrder.quantity).toBe(10);

    // And: Kafka event published
    const event = await kafka.consumeOne('work-order-created');
    expect(event.workOrderId).toBe(workOrder.id);
  });
});
```

**TC-INT-002: Production Performance (MES → ERP)**
```typescript
it('should send work order completion to ERP', async () => {
  // Given: Work order completed in MES
  const workOrder = await createTestWorkOrder({ status: 'COMPLETED', quantityCompleted: 10 });

  // When: Completion event triggers ERP sync
  await kafka.produce('work-order-completed', { workOrderId: workOrder.id });
  await sleep(2000); // Allow async processing

  // Then: ERP receives production confirmation
  const sapConfirmation = await mockSAPServer.getLastReceivedMessage();
  expect(sapConfirmation).toMatchObject({
    orderNumber: workOrder.externalId,
    confirmedQuantity: 10,
    status: 'TECO'  // Technically Complete
  });
});
```

**TC-INT-003: Material Consumption (MES → ERP)**
```typescript
it('should send material consumption to ERP for backflushing', async () => {
  // Given: Material issued to work order
  const transaction = await materialService.issueToWorkOrder({
    workOrderId: 'WO-001',
    partId: 'MAT-001',
    lotNumber: 'LOT-123',
    quantity: 25.5,
    unitOfMeasure: 'KG'
  });

  // When: Material transaction event published
  await kafka.produce('material-consumed', transaction);
  await sleep(2000);

  // Then: SAP receives goods issue
  const sapGoodsIssue = await mockSAPServer.getLastGoodsMovement();
  expect(sapGoodsIssue.movementType).toBe('261'); // Goods issue to production order
  expect(sapGoodsIssue.materialNumber).toBe('MAT-001');
  expect(sapGoodsIssue.quantity).toBe(25.5);
});
```

### 4.2 PLM Integration Tests

**TC-INT-010: Part Master Synchronization (PLM → MES)**
```typescript
describe('PLM Integration: Part Master Sync', () => {
  it('should sync new part from Teamcenter to MES', async () => {
    // Given: Teamcenter has new part
    const tcItem = {
      itemId: 'PART-NEW-001',
      itemRevision: 'A',
      description: 'New Turbine Blade',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-001-A'
    };
    mockTeamcenterAPI.addItem(tcItem);

    // When: Nightly sync job runs
    await plmAdapter.syncPartMaster();

    // Then: Part exists in MES
    const part = await prisma.part.findUnique({ where: { partNumber: 'PART-NEW-001' } });
    expect(part).toMatchObject({
      partNumber: 'PART-NEW-001',
      revision: 'A',
      description: 'New Turbine Blade',
      drawingNumber: 'DWG-001-A'
    });
  });
});
```

**TC-INT-011: Engineering Change Order (PLM → MES)**
```typescript
it('should hold affected work orders when ECO approved', async () => {
  // Given: Work order in progress for part
  const workOrder = await createTestWorkOrder({
    partNumber: 'PART-001',
    status: 'IN_PROGRESS'
  });

  // When: Teamcenter ECO approved (part revision A → B)
  const eco = {
    ecoNumber: 'ECO-2025-001',
    affectedItems: ['PART-001'],
    oldRevision: 'A',
    newRevision: 'B',
    effectiveDate: '2025-10-20'
  };
  await plmAdapter.processECO(eco);

  // Then: Work order status changed to ON_HOLD
  const updatedWO = await prisma.workOrder.findUnique({ where: { id: workOrder.id } });
  expect(updatedWO.status).toBe('ON_HOLD');
  expect(updatedWO.holdReason).toContain('ECO-2025-001');
});
```

### 4.3 IoT Sensor Integration Tests

**TC-IOT-001: OPC-UA Data Collection**
```typescript
describe('IoT Integration: OPC-UA', () => {
  it('should collect temperature data from PLC via OPC-UA', async () => {
    // Given: OPC-UA server simulating PLC
    const opcuaServer = await startMockOPCUAServer();
    opcuaServer.setNodeValue('ns=2;s=Machine1.Temperature', 72.5);

    // When: MES IoT service subscribes to temperature node
    await iotService.subscribeOPCUA('Machine1.Temperature', 'EQ-001');
    await sleep(2000); // Allow data collection

    // Then: Temperature data stored in InfluxDB
    const data = await influxDB.query(`
      SELECT value FROM sensor_data
      WHERE equipment_id = 'EQ-001'
      AND parameter_name = 'temperature'
      ORDER BY time DESC
      LIMIT 1
    `);
    expect(data[0].value).toBe(72.5);
  });
});
```

**TC-IOT-002: MQTT Environmental Sensor**
```typescript
it('should receive humidity data via MQTT', async () => {
  // Given: Environmental sensor publishes via MQTT
  await mqttClient.publish('sensors/environment/cell1/humidity', JSON.stringify({
    sensor_id: 'ENV-001',
    value: 45.5,
    unit: '%RH',
    timestamp: new Date().toISOString()
  }));

  // When: IoT service processes MQTT message
  await sleep(1000);

  // Then: Humidity data stored
  const data = await influxDB.query(`
    SELECT value FROM sensor_data
    WHERE sensor_id = 'ENV-001'
    LIMIT 1
  `);
  expect(data[0].value).toBe(45.5);
});
```

### 4.4 Database Integration Tests

**TC-DB-001: Transaction Rollback on Error**
```typescript
describe('Database Transactions', () => {
  it('should rollback work order creation if operation creation fails', async () => {
    // Given: Invalid routing operation ID
    const workOrderData = {
      partId: 'part-123',
      quantity: 10,
      routingId: 'routing-invalid'  // Does not exist
    };

    // When: Attempt to create work order with operations
    await expect(
      workOrderService.createWorkOrderWithOperations(workOrderData)
    ).rejects.toThrow();

    // Then: Work order NOT created (transaction rolled back)
    const workOrders = await prisma.workOrder.findMany({ where: { partId: 'part-123' } });
    expect(workOrders).toHaveLength(0);
  });
});
```

---

## 5. END-TO-END TEST SCENARIOS

### 5.1 Critical User Workflows

**TC-E2E-001: Complete Work Order Workflow**
```typescript
describe('E2E: Work Order Lifecycle', () => {
  it('should complete entire work order from creation to shipment', async () => {
    // Given: User logged in as Production Planner
    await page.goto('https://app.machshop.com/login');
    await page.fill('[data-testid="username"]', 'planner1');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Step 1: Create work order
    await page.click('text=Work Orders');
    await page.click('button:has-text("Create Work Order")');
    await page.fill('[name="partNumber"]', 'BLADE-001');
    await page.fill('[name="quantity"]', '10');
    await page.selectOption('[name="priority"]', 'HIGH');
    await page.fill('[name="dueDate"]', '2025-10-30');
    await page.click('button:has-text("Submit")');

    // Verify: Work order created
    await expect(page.locator('.success-message')).toContainText('Work order created');
    const workOrderNumber = await page.locator('[data-testid="work-order-number"]').textContent();

    // Step 2: Release work order to shop floor
    await page.click(`tr:has-text("${workOrderNumber}") button:has-text("Release")`);
    await page.click('button:has-text("Confirm Release")');

    // Verify: Status changed to RELEASED
    await expect(page.locator(`tr:has-text("${workOrderNumber}") .status`)).toHaveText('Released');

    // Step 3: Operator starts first operation
    await page.goto('https://app.machshop.com/shop-floor');
    await page.click(`text=${workOrderNumber}`);
    await page.click('button:has-text("Start Operation")');

    // Step 4: Operator completes operation steps (digital work instructions)
    await page.click('button:has-text("Next Step")');  // Step 1
    await page.fill('[name="torque"]', '45.5');
    await page.click('button:has-text("Next Step")');  // Step 2
    await page.fill('[name="dimension"]', '10.25');
    await page.click('button:has-text("Complete Operation")');
    await page.fill('[name="signature"]', 'John Operator');
    await page.click('button:has-text("Sign")');

    // Step 5: Quality inspection
    await page.goto('https://app.machshop.com/quality/inspections');
    await page.click('button:has-text("New Inspection")');
    await page.selectOption('[name="workOrderId"]', workOrderNumber);
    await page.fill('[name="measurement-1"]', '10.25');
    await page.fill('[name="measurement-2"]', '45.5');
    await page.click('button:has-text("Submit Inspection")');

    // Verify: Inspection passed
    await expect(page.locator('.inspection-result')).toHaveText('PASS');

    // Step 6: Complete work order
    await page.goto(`https://app.machshop.com/work-orders/${workOrderNumber}`);
    await page.click('button:has-text("Complete Work Order")');

    // Verify: Work order completed
    await expect(page.locator('.work-order-status')).toHaveText('Completed');

    // Step 7: Generate Certificate of Conformance
    await page.click('button:has-text("Generate C of C")');
    await page.selectOption('[name="template"]', 'Boeing');
    await page.click('button:has-text("Generate")');

    // Verify: C of C PDF generated
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/COC-.*\.pdf/);
  });
});
```

**TC-E2E-002: NCR Workflow with 8D Problem-Solving**
```typescript
it('should create NCR, perform 8D analysis, and close', async () => {
  // Given: Quality Inspector logged in
  await loginAs('inspector1', 'Inspector');

  // Step 1: Create NCR for failed inspection
  await page.goto('/quality/ncrs');
  await page.click('button:has-text("Create NCR")');
  await page.fill('[name="workOrderNumber"]', 'WO-001');
  await page.fill('[name="partNumber"]', 'BLADE-001');
  await page.selectOption('[name="defectType"]', 'Dimensional Non-Conformance');
  await page.fill('[name="description"]', 'Hole diameter out of tolerance: 10.35mm (spec: 10.00 ± 0.25mm)');
  await page.fill('[name="quantity"]', '1');
  await page.selectOption('[name="severity"]', 'MAJOR');
  await page.click('button:has-text("Submit")');

  const ncrNumber = await page.locator('[data-testid="ncr-number"]').textContent();

  // Step 2: D0 - Emergency Response Actions
  await page.click('button:has-text("D0: Emergency Response")');
  await page.fill('[name="d0-actions"]', 'Quarantine affected part. Inspect remaining 9 parts.');
  await page.click('button:has-text("Save D0")');

  // Step 3: D1 - Form Team
  await page.click('button:has-text("D1: Team")');
  await page.selectOption('[name="team-members"]', ['user-qe1', 'user-me1', 'user-op1']);
  await page.click('button:has-text("Save D1")');

  // Step 4: D2 - Problem Description
  await page.click('button:has-text("D2: Problem")');
  await page.fill('[name="is-matrix"]', 'IS: Part serial SN-001, Operation 20 (drilling), Date: 2025-10-15');
  await page.fill('[name="is-not-matrix"]', 'IS NOT: Other 9 parts from same lot');
  await page.click('button:has-text("Save D2")');

  // Step 5: D4 - Root Cause Analysis (skip D3 for brevity)
  await page.click('button:has-text("D4: Root Cause")');
  await page.fill('[name="5-whys-1"]', 'Why? Hole diameter too large');
  await page.fill('[name="5-whys-2"]', 'Why? Drill bit worn beyond tolerance');
  await page.fill('[name="5-whys-3"]', 'Why? Tool life monitoring not in place');
  await page.selectOption('[name="root-cause-category"]', 'Equipment');
  await page.click('button:has-text("Save D4")');

  // Step 6: D5 - Corrective Action
  await page.click('button:has-text("D5: Corrective Action")');
  await page.fill('[name="corrective-action"]', 'Implement tool life monitoring system. Replace drill bit every 100 holes.');
  await page.selectOption('[name="assigned-to"]', 'user-me1');
  await page.fill('[name="due-date"]', '2025-10-20');
  await page.click('button:has-text("Save D5")');

  // Step 7: Assign to maintenance engineer (role switch)
  await loginAs('engineer1', 'Manufacturing Engineer');
  await page.goto(`/quality/ncrs/${ncrNumber}`);
  await page.click('button:has-text("Mark Action Complete")');

  // Step 8: Quality Engineer verifies (D6)
  await loginAs('inspector1', 'Inspector');
  await page.goto(`/quality/ncrs/${ncrNumber}`);
  await page.click('button:has-text("D6: Verification")');
  await page.fill('[name="verification-method"]', 'Inspected next 10 parts - all within tolerance');
  await page.selectOption('[name="effectiveness"]', 'EFFECTIVE');
  await page.click('button:has-text("Save D6")');

  // Step 9: Close NCR
  await page.click('button:has-text("Close NCR")');

  // Verify: NCR status = CLOSED
  await expect(page.locator('.ncr-status')).toHaveText('Closed');
});
```

**TC-E2E-003: AS9102 First Article Inspection**
```typescript
it('should perform complete FAI process and generate FAIR', async () => {
  // Given: First article work order completed
  const workOrder = await createTestWorkOrder({
    partNumber: 'NEW-PART-001',
    quantity: 1,
    status: 'COMPLETED',
    isFirstArticle: true
  });

  // Step 1: Quality Engineer creates FAI
  await loginAs('qe1', 'Quality Engineer');
  await page.goto('/quality/fai');
  await page.click('button:has-text("New FAI")');
  await page.selectOption('[name="workOrderId"]', workOrder.workOrderNumber);

  // Step 2: Perform dimensional inspection (import from CMM)
  await page.click('button:has-text("Import CMM Data")');
  await page.setInputFiles('[name="cmm-file"]', 'test-data/cmm-results.xml');
  await page.click('button:has-text("Import")');

  // Verify: Characteristics populated from CMM
  await expect(page.locator('.characteristic-count')).toHaveText('45 characteristics imported');

  // Step 3: Review Form 3 (Characteristic Accountability)
  await page.click('button:has-text("Form 3")');
  const failedCharacteristics = await page.locator('.characteristic-result:has-text("FAIL")').count();
  expect(failedCharacteristics).toBe(0);  // All pass

  // Step 4: Upload material certifications (Form 2)
  await page.click('button:has-text("Form 2")');
  await page.setInputFiles('[name="material-cert"]', 'test-data/MTR-TI-001.pdf');
  await page.click('button:has-text("Upload")');

  // Step 5: Complete FAI and generate FAIR
  await page.click('button:has-text("Complete FAI")');
  await page.fill('[name="inspector-signature"]', 'Jane QE');
  await page.click('button:has-text("Sign and Generate FAIR")');

  // Verify: FAIR PDF generated
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download FAIR")');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/FAIR-NEW-PART-001-.*\.pdf/);

  // Verify: PDF contains all forms
  const pdfBuffer = await download.createReadStream();
  const pdfText = await extractTextFromPDF(pdfBuffer);
  expect(pdfText).toContain('AS9102 FIRST ARTICLE INSPECTION REPORT');
  expect(pdfText).toContain('Form 1');
  expect(pdfText).toContain('Form 2');
  expect(pdfText).toContain('Form 3');
});
```

---

## 6. PERFORMANCE TEST SCENARIOS

### 6.1 Load Testing

**TC-PERF-001: Baseline Load Test (1000 Concurrent Users)**
```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp-up to 100 users
    { duration: '10m', target: 500 },  // Ramp-up to 500 users
    { duration: '10m', target: 1000 }, // Ramp-up to 1000 users
    { duration: '20m', target: 1000 }, // Stay at 1000 users
    { duration: '5m', target: 0 },     // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],  // 95% of requests < 2s
    'http_req_failed': ['rate<0.01'],     // Error rate < 1%
  },
};

export default function () {
  // Simulate user workflow

  // 1. Login (10% of requests)
  if (Math.random() < 0.1) {
    const loginRes = http.post('https://api.machshop.com/auth/login', JSON.stringify({
      username: `testuser${__VU}`,
      password: 'password123'
    }), { headers: { 'Content-Type': 'application/json' } });

    check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'login time < 1s': (r) => r.timings.duration < 1000,
    });

    const token = loginRes.json('token');
    __ENV.AUTH_TOKEN = token;
  }

  // 2. Dashboard (30% of requests)
  if (Math.random() < 0.3) {
    const dashboardRes = http.get('https://api.machshop.com/api/v1/dashboard/kpis', {
      headers: { 'Authorization': `Bearer ${__ENV.AUTH_TOKEN}` }
    });

    check(dashboardRes, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard time < 2s': (r) => r.timings.duration < 2000,
    });
  }

  // 3. Work order list (40% of requests)
  if (Math.random() < 0.4) {
    const woListRes = http.get('https://api.machshop.com/api/v1/workorders?page=1&limit=50', {
      headers: { 'Authorization': `Bearer ${__ENV.AUTH_TOKEN}` }
    });

    check(woListRes, {
      'work order list status 200': (r) => r.status === 200,
      'work order list time < 2s': (r) => r.timings.duration < 2000,
    });
  }

  // 4. Quality inspection (20% of requests)
  if (Math.random() < 0.2) {
    const inspectionRes = http.get('https://api.machshop.com/api/v1/quality/inspections', {
      headers: { 'Authorization': `Bearer ${__ENV.AUTH_TOKEN}` }
    });

    check(inspectionRes, {
      'inspection list status 200': (r) => r.status === 200,
      'inspection list time < 2s': (r) => r.timings.duration < 2000,
    });
  }

  sleep(Math.random() * 5 + 2);  // Think time: 2-7 seconds
}
```

**Expected Results:**
- Throughput: 5,000 requests/sec sustained
- P95 response time: < 2 seconds
- P99 response time: < 5 seconds
- Error rate: < 1%
- CPU utilization: < 70% (with auto-scaling)
- Memory utilization: < 80%

**TC-PERF-002: Stress Test (Push to Failure)**
```javascript
export const options = {
  stages: [
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 2000 },
    { duration: '10m', target: 3000 },  // Beyond capacity
    { duration: '10m', target: 5000 },  // Way beyond
    { duration: '5m', target: 0 },
  ],
};
// Objective: Find breaking point, ensure graceful degradation
```

**TC-PERF-003: Endurance Test (24-Hour Soak Test)**
```javascript
export const options = {
  duration: '24h',
  vus: 500,  // Constant 500 users
};
// Objective: Detect memory leaks, connection pool exhaustion
```

### 6.2 Database Performance Tests

**TC-PERF-010: Traceability Query Performance**
```sql
-- Test: Backward traceability for 100-level deep BOM
-- Target: < 5 seconds

EXPLAIN ANALYZE
WITH RECURSIVE genealogy_tree AS (
  -- Base case: Start with serial number
  SELECT
    id,
    serialNumber,
    partId,
    0 AS level
  FROM serialized_parts
  WHERE serialNumber = 'ENGINE-SN-001'

  UNION ALL

  -- Recursive case: Find children
  SELECT
    sp.id,
    sp.serialNumber,
    sp.partId,
    gt.level + 1
  FROM serialized_parts sp
  INNER JOIN part_genealogy pg ON sp.id = pg.componentPartId
  INNER JOIN genealogy_tree gt ON pg.parentPartId = gt.id
  WHERE gt.level < 100  -- Prevent infinite recursion
)
SELECT * FROM genealogy_tree;

-- Expected: Execution time < 5000ms, using index scans
```

**TC-PERF-011: SPC Chart Data Retrieval (10,000 Points)**
```sql
-- Test: Retrieve SPC chart data for 10,000 measurements
-- Target: < 3 seconds

EXPLAIN ANALYZE
SELECT
  qm.id,
  qm.measuredValue,
  qm.createdAt,
  qc.nominalValue,
  qc.upperLimit,
  qc.lowerLimit
FROM quality_measurements qm
INNER JOIN quality_characteristics qc ON qm.characteristicId = qc.id
WHERE qc.id = 'char-123'
ORDER BY qm.createdAt DESC
LIMIT 10000;

-- Expected: < 3000ms, using composite index (characteristicId, createdAt)
```

---

## 7. SECURITY TEST SCENARIOS

### 7.1 Authentication & Authorization Tests

**TC-SEC-001: Reject Invalid JWT Token**
```typescript
describe('Security: Authentication', () => {
  it('should reject API call with invalid JWT token', async () => {
    // Given: Invalid JWT token
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.INVALID.SIGNATURE';

    // When: Call protected API
    const response = await request(app)
      .get('/api/v1/workorders')
      .set('Authorization', `Bearer ${invalidToken}`);

    // Then: 401 Unauthorized
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid token');
  });
});
```

**TC-SEC-002: Enforce Role-Based Access Control**
```typescript
it('should deny access to admin-only endpoint for non-admin', async () => {
  // Given: User with "Operator" role (not Admin)
  const operatorToken = generateJWT({ roles: ['Operator'], permissions: ['workorders.read'] });

  // When: Attempt to delete user (admin-only)
  const response = await request(app)
    .delete('/api/v1/users/user-123')
    .set('Authorization', `Bearer ${operatorToken}`);

  // Then: 403 Forbidden
  expect(response.status).toBe(403);
  expect(response.body.error).toContain('Insufficient permissions');
});
```

**TC-SEC-003: Prevent Multi-Tenant Data Leakage**
```typescript
it('should not allow user to access another tenant\'s data', async () => {
  // Given: User from Tenant A
  const tenantAToken = generateJWT({ tenant_id: 'tenant-a' });

  // When: Attempt to query Tenant B's work orders
  const response = await request(app)
    .get('/api/v1/workorders')
    .query({ tenant_id: 'tenant-b' })  // Trying to spoof tenant
    .set('Authorization', `Bearer ${tenantAToken}`);

  // Then: Only Tenant A's work orders returned (tenant_id ignored)
  expect(response.body.every(wo => wo.tenant_id === 'tenant-a')).toBe(true);
});
```

### 7.2 Input Validation & Injection Prevention

**TC-SEC-010: SQL Injection Prevention**
```typescript
it('should prevent SQL injection in search query', async () => {
  // Given: Malicious SQL injection payload
  const maliciousInput = "'; DROP TABLE users; --";

  // When: Search work orders with malicious input
  const response = await request(app)
    .get('/api/v1/workorders')
    .query({ search: maliciousInput })
    .set('Authorization', validToken);

  // Then: Query sanitized, no SQL executed
  expect(response.status).toBe(200);

  // And: Users table still exists
  const usersCount = await prisma.user.count();
  expect(usersCount).toBeGreaterThan(0);
});
```

**TC-SEC-011: XSS Prevention**
```typescript
it('should sanitize user input to prevent XSS', async () => {
  // Given: XSS payload in work order description
  const xssPayload = '<script>alert("XSS")</script>';

  // When: Create work order with XSS payload
  const response = await request(app)
    .post('/api/v1/workorders')
    .send({
      partId: 'part-123',
      quantity: 10,
      description: xssPayload
    })
    .set('Authorization', validToken);

  // Then: Input sanitized (HTML entities encoded)
  expect(response.body.description).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  expect(response.body.description).not.toContain('<script>');
});
```

### 7.3 Penetration Testing Checklist

**TC-SEC-020: OWASP Top 10 Verification**
- [ ] A01: Broken Access Control - Verified with TC-SEC-002, TC-SEC-003
- [ ] A02: Cryptographic Failures - All passwords bcrypt hashed (cost 12)
- [ ] A03: Injection - Verified with TC-SEC-010, TC-SEC-011
- [ ] A04: Insecure Design - Threat modeling completed, mitigation in place
- [ ] A05: Security Misconfiguration - Security headers enforced (CSP, HSTS, X-Frame-Options)
- [ ] A06: Vulnerable Components - Automated dependency scanning (Snyk, npm audit)
- [ ] A07: Authentication Failures - Verified with TC-SEC-001, account lockout after 5 failures
- [ ] A08: Software & Data Integrity - Code signing, SRI for CDN assets
- [ ] A09: Security Logging Failures - All authentication events logged
- [ ] A10: Server-Side Request Forgery - URL validation on all external requests

---

## 8. COMPLIANCE VALIDATION

### 8.1 AS9100 Compliance Tests

**TC-COMP-001: AS9100 Clause 8.5.2 - Identification and Traceability**
```typescript
describe('AS9100 Compliance: Traceability', () => {
  it('should maintain complete traceability per AS9100 8.5.2', async () => {
    // Given: Completed work order with serial number
    const serialNumber = 'BLADE-SN-001';

    // When: Query backward traceability
    const genealogy = await traceabilityService.backwardTraceability(serialNumber);

    // Then: Shall identify product by unique identification
    expect(genealogy.serialNumber).toBe(serialNumber);

    // And: Shall maintain records of material lots used
    expect(genealogy.materials).toBeDefined();
    expect(genealogy.materials.length).toBeGreaterThan(0);
    expect(genealogy.materials[0].lotNumber).toBeDefined();

    // And: Shall maintain records of processes applied
    expect(genealogy.operations).toBeDefined();
    expect(genealogy.operations.every(op => op.operationName && op.completedAt)).toBe(true);

    // And: Shall maintain records of inspection results
    expect(genealogy.inspections).toBeDefined();
    expect(genealogy.inspections.every(ins => ins.result)).toBe(true);

    // And: Shall maintain records of personnel
    expect(genealogy.operations.every(op => op.operatorId)).toBe(true);
  });
});
```

**TC-COMP-002: AS9100 Clause 8.5.1.2 - Control of Production Process Changes**
```typescript
it('should require approval for process changes', async () => {
  // Given: Existing routing for part
  const routing = await createTestRouting({ partId: 'part-123', operations: 5 });

  // When: Attempt to modify routing (add operation)
  const response = await request(app)
    .put(`/api/v1/routings/${routing.id}`)
    .send({
      operations: 6  // Adding 1 operation
    })
    .set('Authorization', engineerToken);

  // Then: Change requires approval
  expect(response.status).toBe(202);  // Accepted, pending approval
  expect(response.body.status).toBe('PENDING_APPROVAL');

  // And: Change logged with reason
  const changeLog = await prisma.changeLog.findFirst({ where: { routingId: routing.id } });
  expect(changeLog).toBeDefined();
  expect(changeLog.reason).toBeDefined();
});
```

### 8.2 21 CFR Part 11 Validation

**TC-COMP-010: 21 CFR Part 11 Subpart B - Electronic Signatures**
```typescript
describe('21 CFR Part 11 Compliance: Electronic Signatures', () => {
  it('should meet all electronic signature requirements', async () => {
    // Given: User signing inspection record
    const inspection = await createTestInspection({ status: 'COMPLETED' });

    // When: User applies electronic signature
    const signatureData = {
      userId: 'user-123',
      password: 'userPassword',
      reason: 'Inspection verified and approved',
      timestamp: new Date()
    };
    const response = await request(app)
      .post(`/api/v1/quality/inspections/${inspection.id}/sign`)
      .send(signatureData)
      .set('Authorization', validToken);

    // Then: § 11.50(a) - Signature linked to electronic record
    expect(response.body.signature.inspectionId).toBe(inspection.id);

    // And: § 11.50(b) - Contains printed name
    expect(response.body.signature.signerName).toBe('John Doe');

    // And: § 11.50(b) - Contains date and time
    expect(response.body.signature.timestamp).toBeDefined();

    // And: § 11.50(b) - Contains meaning of signature (reason)
    expect(response.body.signature.reason).toBe('Inspection verified and approved');

    // And: § 11.70 - Requires unique user ID and password
    // (Verified during authentication)

    // And: § 11.100(b) - Ability to generate accurate copies
    const pdfCopy = await generateInspectionReport(inspection.id);
    expect(pdfCopy).toContain('Electronically signed by: John Doe');
    expect(pdfCopy).toContain(response.body.signature.timestamp);
  });
});
```

**TC-COMP-011: 21 CFR Part 11 Audit Trail**
```typescript
it('should maintain computer-generated audit trail', async () => {
  // Given: User modifies work order
  const workOrder = await createTestWorkOrder({ quantity: 10 });

  // When: User updates quantity
  await request(app)
    .put(`/api/v1/workorders/${workOrder.id}`)
    .send({ quantity: 15 })
    .set('Authorization', validToken);

  // Then: § 11.10(e) - Audit trail records changes
  const auditLog = await prisma.auditLog.findFirst({
    where: { recordId: workOrder.id, action: 'UPDATE' }
  });

  // And: Contains old values
  expect(auditLog.oldValues.quantity).toBe(10);

  // And: Contains new values
  expect(auditLog.newValues.quantity).toBe(15);

  // And: Contains date and time
  expect(auditLog.timestamp).toBeDefined();

  // And: Contains user ID
  expect(auditLog.userId).toBe('user-123');

  // And: § 11.10(e) - Audit trail independently reviewed
  // (Separate audit review process, not automated)
});
```

---

## 9. USER ACCEPTANCE TESTING (UAT)

### 9.1 UAT Test Scenarios (Customer-Facing)

**UAT-001: Shop Floor Operator - Execute Work Order**
```
Title: Complete Production Work Order Using Digital Work Instructions

Prerequisites:
- User logged in as Shop Floor Operator
- Work order WO-TEST-001 released to shop floor
- Tablet with MachShop app installed

Steps:
1. Open MachShop app on tablet
2. Navigate to "My Work Orders"
3. Select work order WO-TEST-001
4. Click "Start Operation"
5. Follow digital work instructions step-by-step:
   - Step 1: Mount part on fixture (verify photo matches)
   - Step 2: Set torque wrench to 45 Nm (system displays spec)
   - Step 3: Tighten bolts in sequence (cross pattern)
   - Step 4: Record actual torque values (enter in fields)
6. Click "Complete Operation"
7. Apply electronic signature

Expected Results:
- ✅ Work instructions display clearly on 10" tablet (readable from 2 feet)
- ✅ Images/videos helpful for understanding task
- ✅ Cannot proceed to next step until required data entered
- ✅ Electronic signature captured with timestamp
- ✅ Operation status changes to "Completed"

Pass/Fail: _____
Comments: _____________________
Tester Name: _____ Date: _____
```

**UAT-002: Quality Engineer - Perform First Article Inspection**
```
Title: Conduct AS9102 First Article Inspection and Generate FAIR

Prerequisites:
- User logged in as Quality Engineer
- First article part available (PART-NEW-001)
- CMM measurement data file available

Steps:
1. Navigate to Quality > First Article Inspection
2. Click "New FAI"
3. Select work order for first article
4. Import CMM measurement data (XML file)
5. Review Form 3 - verify all characteristics populated
6. Check for any out-of-tolerance measurements (should be 0)
7. Upload material certifications (MTR PDF)
8. Complete FAI and generate FAIR
9. Download FAIR PDF

Expected Results:
- ✅ CMM data imports without errors
- ✅ All 45 characteristics auto-populated from CMM
- ✅ Form 1, 2, 3 generated correctly per AS9102 Rev C
- ✅ Material certs attached to FAIR package
- ✅ FAIR PDF professional quality (suitable for customer submission)
- ✅ Digital signatures visible on all forms

Pass/Fail: _____
Comments: _____________________
```

**UAT-003: Production Supervisor - Monitor Real-Time Dashboard**
```
Title: Monitor Production KPIs and Respond to Alerts

Prerequisites:
- User logged in as Production Supervisor
- Active production work orders in progress
- Dashboard configured with KPI widgets

Steps:
1. Navigate to Dashboard
2. Observe real-time KPIs:
   - Active work orders count
   - Completed today
   - Quality yield (FPY)
   - Equipment utilization
3. Click on "Active Work Orders" widget to drill down
4. Simulate out-of-spec condition (test alert)
5. Observe alert notification (red banner)
6. Click on alert to investigate
7. Take corrective action

Expected Results:
- ✅ Dashboard refreshes in real-time (< 5 sec delay)
- ✅ KPIs accurate (cross-check with manual count)
- ✅ Alert notifications visible and actionable
- ✅ Drill-down to details works smoothly
- ✅ Dashboard usable on both desktop and tablet

Pass/Fail: _____
Comments: _____________________
```

---

## 10. TEST DATA MANAGEMENT

### 10.1 Test Data Generation

**Test Data Sets:**

**1. Baseline Dataset (Fixed for Regression Testing)**
```sql
-- 100 parts (10 part families × 10 variants each)
-- 500 work orders (mix of statuses: 100 CREATED, 200 IN_PROGRESS, 200 COMPLETED)
-- 1,000 quality inspections (950 PASS, 50 FAIL)
-- 50 NCRs (30 OPEN, 20 CLOSED)
-- 100 equipment records (80 AVAILABLE, 10 IN_USE, 10 MAINTENANCE)
-- 50 users (5 admins, 10 supervisors, 20 operators, 15 quality)
```

**2. Large Dataset (Performance Testing)**
```sql
-- 100,000 parts
-- 1 million work orders (historical + active)
-- 5 million quality measurements
-- 10 million time-series sensor data points
-- 100,000 serialized parts with genealogy
```

**3. Synthetic Data Generation (Faker.js)**
```typescript
import { faker } from '@faker-js/faker';

function generateTestPart() {
  return {
    partNumber: `PART-${faker.string.alphanumeric(6).toUpperCase()}`,
    partName: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    unitOfMeasure: faker.helpers.arrayElement(['EA', 'KG', 'M']),
    drawingNumber: `DWG-${faker.string.numeric(6)}`,
    revision: faker.helpers.arrayElement(['A', 'B', 'C', 'D'])
  };
}

function generateTestWorkOrder(partId: string) {
  const createdAt = faker.date.past({ years: 1 });
  const status = faker.helpers.weightedArrayElement([
    { weight: 10, value: 'CREATED' },
    { weight: 30, value: 'IN_PROGRESS' },
    { weight: 50, value: 'COMPLETED' },
    { weight: 10, value: 'ON_HOLD' }
  ]);

  return {
    workOrderNumber: `WO-${faker.date.recent().getFullYear()}-${faker.string.numeric(6)}`,
    partId,
    quantity: faker.number.int({ min: 1, max: 100 }),
    priority: faker.helpers.arrayElement(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
    status,
    createdAt,
    dueDate: faker.date.future({ refDate: createdAt }),
    createdById: faker.helpers.arrayElement(userIds)
  };
}

// Generate 10,000 work orders
const workOrders = Array.from({ length: 10000 }, () =>
  generateTestWorkOrder(faker.helpers.arrayElement(partIds))
);
await prisma.workOrder.createMany({ data: workOrders });
```

### 10.2 Test Database Management

**Strategy:**
1. **Separate test database:** `mes_test` (never connects to production)
2. **Database reset between test suites:** Drop all tables, re-run migrations
3. **Seed baseline data:** Run seed script before each test suite
4. **Transaction rollback:** Each test runs in transaction, rolled back after test

**Test Database Setup Script:**
```bash
#!/bin/bash
# setup-test-db.sh

# Drop and recreate test database
psql -U postgres -c "DROP DATABASE IF EXISTS mes_test;"
psql -U postgres -c "CREATE DATABASE mes_test OWNER mes_user;"

# Run migrations
export DATABASE_URL="postgresql://mes_user:mes_password@localhost:5432/mes_test"
npx prisma migrate deploy

# Seed baseline test data
npx ts-node prisma/seed-test-data.ts

echo "Test database ready"
```

### 10.3 Test Data Anonymization (Production Data)

```typescript
// Anonymize production data for testing
async function anonymizeProductionData() {
  const users = await prodPrisma.user.findMany();

  const anonymizedUsers = users.map(user => ({
    ...user,
    email: `testuser${user.id}@example.com`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    passwordHash: await bcrypt.hash('TestPassword123!', 12)
  }));

  await testPrisma.user.createMany({ data: anonymizedUsers });

  // Similarly anonymize customer names, addresses, etc.
}
```

---

## APPENDIX A: TEST AUTOMATION TOOLS

| Category | Tool | Purpose |
|----------|------|---------|
| **Unit Testing** | Vitest | Backend unit tests (fast, TypeScript native) |
| | Jest | Alternative unit test framework |
| **Integration Testing** | Supertest | API endpoint testing |
| | Testcontainers | Spin up Docker containers for tests (PostgreSQL, Redis) |
| **E2E Testing** | Playwright | Cross-browser E2E tests (Chrome, Firefox, Safari) |
| | Cypress | Alternative E2E framework (Chrome-based) |
| **Performance Testing** | k6 | Load testing with JavaScript |
| | Apache JMeter | Load testing with GUI |
| **Security Testing** | OWASP ZAP | Automated security scanning |
| | Burp Suite | Manual penetration testing |
| | Snyk | Dependency vulnerability scanning |
| **Test Data** | Faker.js | Generate realistic test data |
| | Testcontainers | Isolated database instances |
| **CI/CD** | GitHub Actions | Automated test execution on commit |
| | Jenkins | Alternative CI/CD platform |

---

## APPENDIX B: TEST METRICS & REPORTING

**Key Test Metrics:**
1. **Test Coverage:** ≥80% line coverage (measured by Istanbul)
2. **Test Pass Rate:** ≥95% (goal: 100%)
3. **Defect Density:** <5 bugs per 1000 lines of code
4. **Mean Time to Detect (MTTD):** <1 day (bugs caught in CI)
5. **Mean Time to Repair (MTTR):** <2 days (P0/P1 bugs)

**Test Report Dashboard (Grafana):**
- Test execution trends (daily pass rate)
- Code coverage over time
- Test duration (identify slow tests)
- Flaky test detection (tests that fail intermittently)
- Test environment health (database, API availability)

---

**END OF TEST SCENARIOS DOCUMENT**

**Document Version:** 1.0
**Total Test Cases:** 500+
**Total Pages:** 75+
**Classification:** Confidential - Internal Use Only
**Next Review:** January 15, 2026
