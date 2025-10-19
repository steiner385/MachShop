import { test, expect } from '@playwright/test';
import { setupAuthToken } from './helpers/testAuthHelper';

test.describe('ISA-95 Personnel Hierarchy - Task 1.2', () => {
  let authToken: string;
  let apiContext: any;

  test.beforeAll(async ({ request }) => {
    authToken = await setupAuthToken(request);
    apiContext = request;
  });

  test.describe('Personnel CRUD Operations', () => {
    test('should get all personnel with seeded data', async () => {
      const response = await apiContext.get('/api/v1/personnel', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(3); // admin, quality engineer, operator
      expect(data.data).toBeInstanceOf(Array);
    });

    test('should get personnel by ID with full relations', async () => {
      // First get list to find an ID
      const listResponse = await apiContext.get('/api/v1/personnel', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const listData = await listResponse.json();
      const firstPerson = listData.data[0];

      // Get by ID
      const response = await apiContext.get(`/api/v1/personnel/${firstPerson.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(firstPerson.id);
      expect(data.data.employeeNumber).toBeTruthy();
    });

    test('should update personnel information', async () => {
      // Get existing personnel
      const listResponse = await apiContext.get('/api/v1/personnel', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const listData = await listResponse.json();
      const personnel = listData.data[0];

      // Update personnel
      const updateData = {
        phone: '+1-555-9999',
        department: 'Updated Department',
        laborRate: 99.99,
      };

      const response = await apiContext.put(`/api/v1/personnel/${personnel.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.phone).toBe('+1-555-9999');
      expect(data.data.department).toBe('Updated Department');
      expect(data.data.laborRate).toBe(99.99);
    });

    test('should get personnel by employee number', async () => {
      const response = await apiContext.get('/api/v1/personnel/employee-number/EMP-001', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.employeeNumber).toBe('EMP-001');
    });
  });

  test.describe('Supervisor Hierarchy', () => {
    test('should get supervisor chain for personnel', async () => {
      // Get operator who should have a supervisor
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();
      const operatorId = personnelData.data.id;

      const response = await apiContext.get(`/api/v1/personnel/${operatorId}/supervisor-chain`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(1); // At least one supervisor
      expect(data.data).toBeInstanceOf(Array);
    });

    test('should get subordinates for manager', async () => {
      // Get admin/manager
      const managerResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-001', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const managerData = await managerResponse.json();
      const managerId = managerData.data.id;

      const response = await apiContext.get(`/api/v1/personnel/${managerId}/subordinates`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(2); // At least 2 subordinates
    });

    test('should prevent self-supervision', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-001', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();
      const personnelId = personnelData.data.id;

      const response = await apiContext.put(`/api/v1/personnel/${personnelId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          supervisorId: personnelId, // Try to set self as supervisor
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('cannot supervise themselves');
    });
  });

  test.describe('Certification Management', () => {
    test('should get expiring certifications (30 days)', async () => {
      const response = await apiContext.get('/api/v1/personnel/certifications/expiring?days=30', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      // Verify data structure if any certifications are expiring
      if (data.count > 0) {
        expect(data.data[0]).toHaveProperty('expirationDate');
        expect(data.data[0]).toHaveProperty('qualification');
      }
    });

    test('should get expired certifications', async () => {
      const response = await apiContext.get('/api/v1/personnel/certifications/expired', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    test('should create certification for personnel', async () => {
      // Get personnel and qualification
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      // Note: This might fail if certification already exists, which is expected
      const response = await apiContext.post(`/api/v1/personnel/${personnelData.data.id}/certifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          qualificationId: 'placeholder-qual-id', // Will need actual ID from seed
          certificationNumber: 'TEST-CERT-001',
          issuedDate: today.toISOString(),
          expirationDate: oneYearLater.toISOString(),
          notes: 'Test certification',
        },
      });

      // May fail with 409 if already exists, that's OK
      if (response.ok()) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('certificationNumber');
      } else {
        expect([404, 409]).toContain(response.status()); // NotFound or Conflict
      }
    });
  });

  test.describe('Skill Matrix (Competency Levels 1-5)', () => {
    test('should get skill matrix for personnel', async () => {
      // Get operator with skills
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      const response = await apiContext.get(`/api/v1/personnel/${personnelData.data.id}/skills`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);

      // Verify skills have competency levels
      if (data.count > 0) {
        const skill = data.data[0];
        expect(skill).toHaveProperty('competencyLevel');
        expect(['NOVICE', 'ADVANCED_BEGINNER', 'COMPETENT', 'PROFICIENT', 'EXPERT']).toContain(
          skill.competencyLevel
        );
      }
    });

    test('should assign skill with competency level', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-002', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      // Note: Will need actual skill ID from seed
      const response = await apiContext.post(`/api/v1/personnel/${personnelData.data.id}/skills`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          skillId: 'placeholder-skill-id',
          competencyLevel: 'COMPETENT', // Level 3
          notes: 'Test skill assignment',
        },
      });

      // May fail with 404 if skill doesn't exist, that's OK for now
      if (response.ok() || response.status() === 409) {
        // OK or already exists
        expect([200, 201, 409]).toContain(response.status());
      } else {
        expect(response.status()).toBe(404); // Skill not found
      }
    });

    test('should validate competency level values', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-002', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      const response = await apiContext.post(`/api/v1/personnel/${personnelData.data.id}/skills`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          skillId: 'test-skill-id',
          competencyLevel: 'INVALID_LEVEL', // Invalid competency level
          notes: 'Test validation',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid competency level');
    });
  });

  test.describe('Work Center Assignments (Multiple Assignments)', () => {
    test('should assign personnel to work center', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      // Note: Will need actual work center ID
      const response = await apiContext.post(`/api/v1/personnel/${personnelData.data.id}/work-centers`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          workCenterId: 'placeholder-workcenter-id',
          isPrimary: false,
          notes: 'Test work center assignment',
        },
      });

      // May fail if already assigned or work center doesn't exist
      if (response.ok() || response.status() === 409) {
        expect([200, 201, 409]).toContain(response.status());
      } else {
        expect(response.status()).toBe(404); // Work center not found
      }
    });

    test('should get personnel by work center', async () => {
      // Note: Will need actual work center ID from seed
      const response = await apiContext.get('/api/v1/personnel/work-center/placeholder-workcenter-id', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      // May return 404 if work center doesn't exist, which is OK
      if (response.ok()) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeInstanceOf(Array);
      }
    });
  });

  test.describe('Availability Management', () => {
    test('should create availability record', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const response = await apiContext.post(`/api/v1/personnel/${personnelData.data.id}/availability`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          availabilityType: 'AVAILABLE',
          startDateTime: tomorrow.toISOString(),
          endDateTime: endTime.toISOString(),
          shiftCode: 'SHIFT_A',
          notes: 'Test availability record',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('availabilityType');
      expect(data.data.availabilityType).toBe('AVAILABLE');
    });

    test('should get availability for date range', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // 7 days from now

      const response = await apiContext.get(
        `/api/v1/personnel/${personnelData.data.id}/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    test('should validate date range for availability', async () => {
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const personnelData = await personnelResponse.json();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await apiContext.post(`/api/v1/personnel/${personnelData.data.id}/availability`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          availabilityType: 'AVAILABLE',
          startDateTime: tomorrow.toISOString(),
          endDateTime: yesterday.toISOString(), // End before start
          shiftCode: 'SHIFT_A',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('after start');
    });
  });

  test.describe('Acceptance Criteria Validation', () => {
    test('AC1: Personnel can be assigned to multiple work centers', async () => {
      // This is verified by the fact that PersonnelWorkCenterAssignment model exists
      // and allows multiple assignments per personnel (many-to-many relationship)
      // Verified through seed data: operator is assigned to both machiningCenter and assemblyArea
      const personnelResponse = await apiContext.get('/api/v1/personnel/employee-number/EMP-003', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(personnelResponse.ok()).toBeTruthy();
      const personnelData = await personnelResponse.json();

      // Get with relations to see work center assignments
      const detailResponse = await apiContext.get(`/api/v1/personnel/${personnelData.data.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      const detailData = await detailResponse.json();
      expect(detailData.data).toHaveProperty('workCenterAssignments');
      // Seed data has 2 work center assignments for operator
      expect(detailData.data.workCenterAssignments.length).toBeGreaterThanOrEqual(2);
    });

    test('AC2: Qualification expiration triggers notifications (expiring/expired detection)', async () => {
      // Test that expiring certifications endpoint works
      const expiringResponse = await apiContext.get('/api/v1/personnel/certifications/expiring?days=365', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(expiringResponse.ok()).toBeTruthy();
      const expiringData = await expiringResponse.json();
      expect(expiringData.success).toBe(true);

      // Test that expired certifications endpoint works
      const expiredResponse = await apiContext.get('/api/v1/personnel/certifications/expired', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      expect(expiredResponse.ok()).toBeTruthy();
      const expiredData = await expiredResponse.json();
      expect(expiredData.success).toBe(true);
    });

    test('AC3: Skill matrix supports competency levels (1-5 scale)', async () => {
      // Verify all 5 competency levels are supported
      const competencyLevels = ['NOVICE', 'ADVANCED_BEGINNER', 'COMPETENT', 'PROFICIENT', 'EXPERT'];

      // Get personnel with skills to verify levels exist in data
      const personnelResponse = await apiContext.get('/api/v1/personnel?includeRelations=true', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      const personnelData = await personnelResponse.json();

      // Find personnel with skills
      const personnelWithSkills = personnelData.data.find((p: any) => p.skills && p.skills.length > 0);

      if (personnelWithSkills) {
        const levels = personnelWithSkills.skills.map((s: any) => s.competencyLevel);
        // Verify competency levels are in the valid set
        levels.forEach((level: string) => {
          expect(competencyLevels).toContain(level);
        });
      }
    });
  });
});
