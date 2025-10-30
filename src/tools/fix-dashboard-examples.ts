#!/usr/bin/env tsx

/**
 * Dashboard Examples Fix
 * Manually updates dashboard endpoints with realistic examples from the actual code
 */

import * as fs from 'fs';

async function fixDashboardExamples(): Promise<void> {
  console.log('🔧 Fixing dashboard API examples...\n');

  const specPath = './docs/api/openapi-spec.json';
  const spec = JSON.parse(await fs.promises.readFile(specPath, 'utf8'));

  // Dashboard KPIs endpoint
  if (spec.paths['/dashboard/kpis']?.get) {
    spec.paths['/dashboard/kpis'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'object',
        properties: {
          activeWorkOrders: {
            type: 'integer',
            description: 'Number of work orders currently active (RELEASED or IN_PROGRESS)'
          },
          workOrdersChange: {
            type: 'number',
            description: 'Percentage change in active work orders from yesterday'
          },
          completedToday: {
            type: 'integer',
            description: 'Number of work orders completed today'
          },
          completedChange: {
            type: 'number',
            description: 'Percentage change in completed work orders from yesterday'
          },
          qualityYield: {
            type: 'number',
            description: 'Quality yield percentage (passed inspections / total inspections)'
          },
          yieldChange: {
            type: 'number',
            description: 'Change in quality yield from last week'
          },
          equipmentUtilization: {
            type: 'number',
            description: 'Average equipment utilization rate percentage'
          },
          utilizationChange: {
            type: 'number',
            description: 'Change in equipment utilization from last week'
          }
        },
        required: ['activeWorkOrders', 'workOrdersChange', 'completedToday', 'completedChange', 'qualityYield', 'yieldChange', 'equipmentUtilization', 'utilizationChange']
      },
      example: {
        activeWorkOrders: 15,
        workOrdersChange: 12.5,
        completedToday: 8,
        completedChange: -5.2,
        qualityYield: 94.8,
        yieldChange: 2.1,
        equipmentUtilization: 87.3,
        utilizationChange: -1.5
      }
    };

    // Remove pagination parameters for KPI endpoint (it doesn't use pagination)
    if (spec.paths['/dashboard/kpis'].get.parameters) {
      spec.paths['/dashboard/kpis'].get.parameters = spec.paths['/dashboard/kpis'].get.parameters.filter(
        (p: any) => !['page', 'limit'].includes(p.name)
      );
    }

    console.log('✅ Fixed /dashboard/kpis endpoint');
  }

  // Dashboard recent work orders endpoint
  if (spec.paths['/dashboard/recent-work-orders']?.get) {
    spec.paths['/dashboard/recent-work-orders'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Work order ID'
            },
            workOrderNumber: {
              type: 'string',
              description: 'Work order number'
            },
            partNumber: {
              type: 'string',
              description: 'Part number being manufactured'
            },
            status: {
              type: 'string',
              enum: ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
              description: 'Current work order status'
            },
            progress: {
              type: 'number',
              description: 'Completion progress percentage'
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
              description: 'Work order priority'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Due date for completion'
            }
          }
        }
      },
      example: [
        {
          id: 'wo-12345',
          workOrderNumber: 'WO-2024-001',
          partNumber: 'ENGINE-BLADE-A380',
          status: 'IN_PROGRESS',
          progress: 65.5,
          priority: 'HIGH',
          dueDate: '2024-11-15T10:00:00Z'
        },
        {
          id: 'wo-12346',
          workOrderNumber: 'WO-2024-002',
          partNumber: 'TURBINE-DISC-777',
          status: 'RELEASED',
          progress: 0.0,
          priority: 'NORMAL',
          dueDate: '2024-11-20T16:00:00Z'
        }
      ]
    };

    console.log('✅ Fixed /dashboard/recent-work-orders endpoint');
  }

  // Dashboard alerts endpoint
  if (spec.paths['/dashboard/alerts']?.get) {
    spec.paths['/dashboard/alerts'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Alert ID'
            },
            type: {
              type: 'string',
              enum: ['error', 'warning', 'info'],
              description: 'Alert severity type'
            },
            title: {
              type: 'string',
              description: 'Alert title'
            },
            description: {
              type: 'string',
              description: 'Alert description'
            },
            time: {
              type: 'string',
              format: 'date-time',
              description: 'Alert timestamp'
            },
            relatedId: {
              type: 'string',
              description: 'ID of related entity'
            },
            relatedType: {
              type: 'string',
              enum: ['work_order', 'equipment', 'quality'],
              description: 'Type of related entity'
            }
          }
        }
      },
      example: [
        {
          id: 'alert-001',
          type: 'error',
          title: 'Work Order Overdue',
          description: 'Work Order WO-2024-001 is past due date',
          time: '2024-10-30T14:30:00Z',
          relatedId: 'wo-12345',
          relatedType: 'work_order'
        },
        {
          id: 'alert-002',
          type: 'warning',
          title: 'Equipment Maintenance',
          description: 'CNC Machine #3 requires scheduled maintenance',
          time: '2024-10-30T13:15:00Z',
          relatedId: 'eq-003',
          relatedType: 'equipment'
        }
      ]
    };

    console.log('✅ Fixed /dashboard/alerts endpoint');
  }

  // Dashboard efficiency endpoint
  if (spec.paths['/dashboard/efficiency']?.get) {
    spec.paths['/dashboard/efficiency'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'object',
        properties: {
          oee: {
            type: 'number',
            description: 'Overall Equipment Effectiveness percentage'
          },
          fpy: {
            type: 'number',
            description: 'First Pass Yield percentage'
          },
          onTimeDelivery: {
            type: 'number',
            description: 'On-time delivery percentage'
          }
        },
        required: ['oee', 'fpy', 'onTimeDelivery']
      },
      example: {
        oee: 85.4,
        fpy: 96.2,
        onTimeDelivery: 89.7
      }
    };

    // Remove pagination parameters
    if (spec.paths['/dashboard/efficiency'].get.parameters) {
      spec.paths['/dashboard/efficiency'].get.parameters = spec.paths['/dashboard/efficiency'].get.parameters.filter(
        (p: any) => !['page', 'limit'].includes(p.name)
      );
    }

    console.log('✅ Fixed /dashboard/efficiency endpoint');
  }

  // Dashboard quality trends endpoint
  if (spec.paths['/dashboard/quality-trends']?.get) {
    spec.paths['/dashboard/quality-trends'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'object',
        properties: {
          defectRate: {
            type: 'number',
            description: 'Defect rate percentage (last 30 days)'
          },
          defectRateTrend: {
            type: 'number',
            description: 'Change in defect rate from previous period'
          },
          complaintRate: {
            type: 'number',
            description: 'Customer complaint rate percentage'
          },
          complaintRateTrend: {
            type: 'number',
            description: 'Change in complaint rate from previous period'
          },
          ncrRate: {
            type: 'number',
            description: 'Non-conformance report rate percentage'
          },
          ncrRateTrend: {
            type: 'number',
            description: 'Change in NCR rate from previous period'
          }
        },
        required: ['defectRate', 'defectRateTrend', 'complaintRate', 'complaintRateTrend', 'ncrRate', 'ncrRateTrend']
      },
      example: {
        defectRate: 2.3,
        defectRateTrend: -0.5,
        complaintRate: 0.8,
        complaintRateTrend: -0.2,
        ncrRate: 1.2,
        ncrRateTrend: 0.1
      }
    };

    // Remove pagination parameters
    if (spec.paths['/dashboard/quality-trends'].get.parameters) {
      spec.paths['/dashboard/quality-trends'].get.parameters = spec.paths['/dashboard/quality-trends'].get.parameters.filter(
        (p: any) => !['page', 'limit'].includes(p.name)
      );
    }

    console.log('✅ Fixed /dashboard/quality-trends endpoint');
  }

  // Fix a few other important endpoints with realistic examples

  // Work Orders list endpoint
  if (spec.paths['/workorders']?.get) {
    spec.paths['/workorders'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Work order ID' },
                workOrderNumber: { type: 'string', description: 'Work order number' },
                partNumber: { type: 'string', description: 'Part number' },
                status: {
                  type: 'string',
                  enum: ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                  description: 'Work order status'
                },
                priority: {
                  type: 'string',
                  enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
                  description: 'Priority level'
                },
                quantityOrdered: { type: 'integer', description: 'Quantity to manufacture' },
                quantityCompleted: { type: 'integer', description: 'Quantity completed' },
                dueDate: { type: 'string', format: 'date-time', description: 'Due date' },
                createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' }
            }
          }
        }
      },
      example: {
        data: [
          {
            id: 'wo-12345',
            workOrderNumber: 'WO-2024-001',
            partNumber: 'ENGINE-BLADE-A380',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            quantityOrdered: 10,
            quantityCompleted: 6,
            dueDate: '2024-11-15T10:00:00Z',
            createdAt: '2024-10-20T08:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 150,
          totalPages: 8
        }
      }
    };

    console.log('✅ Fixed /workorders endpoint');
  }

  // Materials endpoint
  if (spec.paths['/materials/classes']?.get) {
    spec.paths['/materials/classes'].get.responses['200'].content['application/json'] = {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Material class ID' },
            name: { type: 'string', description: 'Material class name' },
            description: { type: 'string', description: 'Material class description' },
            parentClassId: { type: 'string', nullable: true, description: 'Parent class ID' },
            properties: { type: 'array', items: { type: 'string' }, description: 'Material properties' },
            createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
          }
        }
      },
      example: [
        {
          id: 'class-001',
          name: 'RAW_MATERIAL',
          description: 'Raw materials for aerospace manufacturing',
          parentClassId: null,
          properties: ['density', 'tensileStrength', 'yieldStrength'],
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'class-002',
          name: 'TITANIUM_ALLOYS',
          description: 'Titanium alloy materials',
          parentClassId: 'class-001',
          properties: ['density', 'tensileStrength', 'yieldStrength', 'corrosionResistance'],
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]
    };

    console.log('✅ Fixed /materials/classes endpoint');
  }

  // Write the updated spec
  await fs.promises.writeFile(specPath, JSON.stringify(spec, null, 2), 'utf8');

  console.log('\n✅ Dashboard examples successfully fixed!');
  console.log('🎯 Updated endpoints:');
  console.log('   • /dashboard/kpis - Real manufacturing KPI metrics');
  console.log('   • /dashboard/recent-work-orders - Actual work order data');
  console.log('   • /dashboard/alerts - Manufacturing alerts and notifications');
  console.log('   • /dashboard/efficiency - OEE and performance metrics');
  console.log('   • /dashboard/quality-trends - Quality trend analysis');
  console.log('   • /workorders - Complete work order structure');
  console.log('   • /materials/classes - Material classification data');
}

async function main() {
  try {
    await fixDashboardExamples();
    console.log('\n🎉 All dashboard examples are now realistic and useful!');
  } catch (error) {
    console.error('❌ Error fixing dashboard examples:', error);
    process.exit(1);
  }
}

main().catch(console.error);