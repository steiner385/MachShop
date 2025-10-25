import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('Parameter Groups API', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    // Login as manufacturing engineer
    authHeaders = await loginAsTestUser(request, 'manufacturingEngineer');
  });

  test.describe('Group CRUD Operations', () => {
    test('should create a root parameter group', async ({ request }) => {
      const groupData = {
        groupName: 'Temperature Controls',
        groupType: 'PROCESS',
        description: 'Temperature control parameters',
        tags: ['temperature', 'control'],
        displayOrder: 1,
        icon: 'thermometer',
        color: '#FF5722',
      };

      const response = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: groupData,
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.groupName).toBe('Temperature Controls');
      expect(data.groupType).toBe('PROCESS');
      expect(data.parentGroupId).toBeNull();
      expect(data.tags).toEqual(['temperature', 'control']);
    });

    test('should create a child group with valid parent', async ({ request }) => {
      // Create parent
      const parentResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Parent Group',
          groupType: 'PROCESS',
        },
      });

      const parent = await parentResponse.json();

      // Create child
      const childResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child Group',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });

      expect(childResponse.status()).toBe(201);
      const child = await childResponse.json();
      expect(child.parentGroupId).toBe(parent.id);
    });

    test('should reject child group with non-existent parent', async ({ request }) => {
      const response = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Orphan Group',
          parentGroupId: 'nonexistent-parent-id',
          groupType: 'PROCESS',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    test('should retrieve group by ID', async ({ request }) => {
      const createResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Test Group',
          groupType: 'QUALITY',
          description: 'Quality parameters',
        },
      });

      const created = await createResponse.json();

      const getResponse = await request.get(`/api/v1/parameter-groups/${created.id}`, {
      headers: authHeaders,
    });

      expect(getResponse.status()).toBe(200);
      const data = await getResponse.json();
      expect(data.id).toBe(created.id);
      expect(data.groupName).toBe('Test Group');
      expect(data._count).toBeDefined();
    });

    test('should retrieve group with children', async ({ request }) => {
      // Create parent
      const parentResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Parent With Children',
          groupType: 'PROCESS',
        },
      });

      const parent = await parentResponse.json();

      // Create children
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child 1',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });

      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child 2',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });

      // Retrieve with children
      const response = await request.get(
        `/api/v1/parameter-groups/${parent.id}?includeChildren=true`, {
      headers: authHeaders,
    }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.childGroups).toBeDefined();
      expect(data.childGroups.length).toBe(2);
    });

    test('should update group properties', async ({ request }) => {
      const createResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Original Name',
          groupType: 'PROCESS',
        },
      });

      const created = await createResponse.json();

      const updateResponse = await request.put(`/api/v1/parameter-groups/${created.id}`, {
        headers: authHeaders,
        data: {
          groupName: 'Updated Name',
          description: 'New description',
          displayOrder: 10,
        },
      });

      expect(updateResponse.status()).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.groupName).toBe('Updated Name');
      expect(updated.description).toBe('New description');
      expect(updated.displayOrder).toBe(10);
    });

    test('should delete empty group', async ({ request }) => {
      const createResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Group To Delete',
          groupType: 'PROCESS',
        },
      });

      const created = await createResponse.json();

      const deleteResponse = await request.delete(`/api/v1/parameter-groups/${created.id}`, {
      headers: authHeaders,
    });

      expect(deleteResponse.status()).toBe(204);

      // Verify deletion
      const getResponse = await request.get(`/api/v1/parameter-groups/${created.id}`, {
      headers: authHeaders,
    });
      expect(getResponse.status()).toBe(404);
    });

    test('should reject deleting group with children without force', async ({ request }) => {
      // Create parent
      const parentResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Parent To Delete',
          groupType: 'PROCESS',
        },
      });

      const parent = await parentResponse.json();

      // Create child
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });

      // Try to delete without force
      const deleteResponse = await request.delete(`/api/v1/parameter-groups/${parent.id}`, {
      headers: authHeaders,
    });

      expect(deleteResponse.status()).toBe(400);
      const data = await deleteResponse.json();
      expect(data.error).toContain('child groups');
    });

    test('should force delete group with children', async ({ request }) => {
      // Create parent
      const parentResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Parent For Force Delete',
          groupType: 'PROCESS',
        },
      });

      const parent = await parentResponse.json();

      // Create child
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });

      // Force delete
      const deleteResponse = await request.delete(
        `/api/v1/parameter-groups/${parent.id}?force=true`, {
      headers: authHeaders,
    }
      );

      expect(deleteResponse.status()).toBe(204);
    });
  });

  test.describe('Hierarchy Operations', () => {
    test('should retrieve root groups', async ({ request }) => {
      // Create some root groups
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Root 1', groupType: 'PROCESS' },
      });

      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Root 2', groupType: 'QUALITY' },
      });

      const response = await request.get('/api/v1/parameter-groups', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data.every((g: any) => g.parentGroupId === null)).toBe(true);
    });

    test('should retrieve complete group tree', async ({ request }) => {
      const response = await request.get('/api/v1/parameter-groups?tree=true', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      // Each group should have childGroups array
      expect(data.every((g: any) => 'childGroups' in g)).toBe(true);
    });

    test('should move group to new parent', async ({ request }) => {
      // Create groups
      const parent1Response = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Parent 1', groupType: 'PROCESS' },
      });
      const parent1 = await parent1Response.json();

      const parent2Response = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Parent 2', groupType: 'PROCESS' },
      });
      const parent2 = await parent2Response.json();

      const childResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Movable Child',
          parentGroupId: parent1.id,
          groupType: 'PROCESS',
        },
      });
      const child = await childResponse.json();

      // Move child from parent1 to parent2
      const moveResponse = await request.post(`/api/v1/parameter-groups/${child.id}/move`, {
        headers: authHeaders,
        data: { newParentId: parent2.id },
      });

      expect(moveResponse.status()).toBe(200);
      const moved = await moveResponse.json();
      expect(moved.parentGroupId).toBe(parent2.id);
    });

    test('should move group to root level', async ({ request }) => {
      // Create parent and child
      const parentResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Parent', groupType: 'PROCESS' },
      });
      const parent = await parentResponse.json();

      const childResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child To Root',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });
      const child = await childResponse.json();

      // Move to root
      const moveResponse = await request.post(`/api/v1/parameter-groups/${child.id}/move`, {
        headers: authHeaders,
        data: { newParentId: null },
      });

      expect(moveResponse.status()).toBe(200);
      const moved = await moveResponse.json();
      expect(moved.parentGroupId).toBeNull();
    });

    test('should prevent circular reference when moving', async ({ request }) => {
      // Create parent and child
      const parentResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Parent', groupType: 'PROCESS' },
      });
      const parent = await parentResponse.json();

      const childResponse = await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Child',
          parentGroupId: parent.id,
          groupType: 'PROCESS',
        },
      });
      const child = await childResponse.json();

      // Try to move parent under child (circular)
      const moveResponse = await request.post(`/api/v1/parameter-groups/${parent.id}/move`, {
        headers: authHeaders,
        data: { newParentId: child.id },
      });

      expect(moveResponse.status()).toBe(400);
      const data = await moveResponse.json();
      expect(data.error).toContain('circular');
    });
  });

  test.describe('Group Filtering', () => {
    test('should filter groups by type', async ({ request }) => {
      // Create groups of different types
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Process Group', groupType: 'PROCESS' },
      });

      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: { groupName: 'Quality Group', groupType: 'QUALITY' },
      });

      const response = await request.get('/api/v1/parameter-groups?groupType=PROCESS', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((g: any) => g.groupType === 'PROCESS')).toBe(true);
    });
  });

  test.describe('Search Operations', () => {
    test('should search groups by name', async ({ request }) => {
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Searchable Temperature Group',
          groupType: 'PROCESS',
        },
      });

      const response = await request.get(
        '/api/v1/parameter-groups/search/query?q=Temperature'
      , {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('should search groups by description', async ({ request }) => {
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Special Group',
          groupType: 'PROCESS',
          description: 'Controls the unique process',
        },
      });

      const response = await request.get('/api/v1/parameter-groups/search/query?q=unique', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.some((g: any) => g.description?.includes('unique'))).toBe(true);
    });

    test('should search groups by tags', async ({ request }) => {
      await request.post('/api/v1/parameter-groups', {
        headers: authHeaders,
        data: {
          groupName: 'Tagged Group',
          groupType: 'PROCESS',
          tags: ['critical', 'monitored'],
        },
      });

      const response = await request.get('/api/v1/parameter-groups/search/query?q=critical', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.some((g: any) => g.tags?.includes('critical'))).toBe(true);
    });

    test('should require search query', async ({ request }) => {
      const response = await request.get('/api/v1/parameter-groups/search/query', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/v1/parameter-groups', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status()).toBe(401);
    });
  });
});
