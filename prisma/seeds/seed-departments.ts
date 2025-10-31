/**
 * Department Seed Data
 *
 * Creates standard departments for organizational structure in manufacturing environments.
 * Supports hierarchical organization with parent-child relationships.
 *
 * Created for Issue #209: Department Lookup Table Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DepartmentSeedData {
  departmentCode: string;
  departmentName: string;
  description?: string;
  parentDepartmentCode?: string;
  costCenter?: string;
  budgetCode?: string;
  isActive?: boolean;
}

/**
 * Standard manufacturing departments with hierarchical structure
 */
export const STANDARD_DEPARTMENTS: DepartmentSeedData[] = [
  // Executive Level
  {
    departmentCode: 'EXEC',
    departmentName: 'Executive',
    description: 'Executive leadership and strategic management',
    costCenter: 'CC-1000',
    budgetCode: 'BG-EXEC',
    isActive: true
  },

  // Operations Division
  {
    departmentCode: 'OPS',
    departmentName: 'Operations',
    description: 'Manufacturing operations and production management',
    parentDepartmentCode: 'EXEC',
    costCenter: 'CC-2000',
    budgetCode: 'BG-OPS',
    isActive: true
  },

  // Engineering Division
  {
    departmentCode: 'ENG',
    departmentName: 'Engineering',
    description: 'Product design, development, and engineering services',
    parentDepartmentCode: 'EXEC',
    costCenter: 'CC-3000',
    budgetCode: 'BG-ENG',
    isActive: true
  },

  // Quality Division
  {
    departmentCode: 'QA',
    departmentName: 'Quality Assurance',
    description: 'Quality control, testing, and compliance',
    parentDepartmentCode: 'EXEC',
    costCenter: 'CC-4000',
    budgetCode: 'BG-QA',
    isActive: true
  },

  // Support Services Division
  {
    departmentCode: 'SUPPORT',
    departmentName: 'Support Services',
    description: 'Administrative and support functions',
    parentDepartmentCode: 'EXEC',
    costCenter: 'CC-5000',
    budgetCode: 'BG-SUPPORT',
    isActive: true
  },

  // === OPERATIONS DEPARTMENTS ===

  // Manufacturing
  {
    departmentCode: 'MFG',
    departmentName: 'Manufacturing',
    description: 'Production floor operations and manufacturing processes',
    parentDepartmentCode: 'OPS',
    costCenter: 'CC-2100',
    budgetCode: 'BG-MFG',
    isActive: true
  },

  // Production Planning & Scheduling
  {
    departmentCode: 'PLAN',
    departmentName: 'Production Planning',
    description: 'Production scheduling, capacity planning, and MRP',
    parentDepartmentCode: 'OPS',
    costCenter: 'CC-2200',
    budgetCode: 'BG-PLAN',
    isActive: true
  },

  // Materials Management
  {
    departmentCode: 'MAT',
    departmentName: 'Materials Management',
    description: 'Inventory control, purchasing, and materials handling',
    parentDepartmentCode: 'OPS',
    costCenter: 'CC-2300',
    budgetCode: 'BG-MAT',
    isActive: true
  },

  // Maintenance
  {
    departmentCode: 'MAINT',
    departmentName: 'Maintenance',
    description: 'Equipment maintenance, calibration, and facility management',
    parentDepartmentCode: 'OPS',
    costCenter: 'CC-2400',
    budgetCode: 'BG-MAINT',
    isActive: true
  },

  // Shipping & Receiving
  {
    departmentCode: 'SHIP',
    departmentName: 'Shipping & Receiving',
    description: 'Inbound/outbound logistics and warehouse operations',
    parentDepartmentCode: 'OPS',
    costCenter: 'CC-2500',
    budgetCode: 'BG-SHIP',
    isActive: true
  },

  // === ENGINEERING DEPARTMENTS ===

  // Design Engineering
  {
    departmentCode: 'DESIGN',
    departmentName: 'Design Engineering',
    description: 'Product design, CAD modeling, and design documentation',
    parentDepartmentCode: 'ENG',
    costCenter: 'CC-3100',
    budgetCode: 'BG-DESIGN',
    isActive: true
  },

  // Process Engineering
  {
    departmentCode: 'PROC',
    departmentName: 'Process Engineering',
    description: 'Manufacturing process development and optimization',
    parentDepartmentCode: 'ENG',
    costCenter: 'CC-3200',
    budgetCode: 'BG-PROC',
    isActive: true
  },

  // Industrial Engineering
  {
    departmentCode: 'IE',
    departmentName: 'Industrial Engineering',
    description: 'Work study, process improvement, and efficiency optimization',
    parentDepartmentCode: 'ENG',
    costCenter: 'CC-3300',
    budgetCode: 'BG-IE',
    isActive: true
  },

  // Test Engineering
  {
    departmentCode: 'TEST',
    departmentName: 'Test Engineering',
    description: 'Product testing, validation, and verification',
    parentDepartmentCode: 'ENG',
    costCenter: 'CC-3400',
    budgetCode: 'BG-TEST',
    isActive: true
  },

  // === QUALITY DEPARTMENTS ===

  // Quality Control
  {
    departmentCode: 'QC',
    departmentName: 'Quality Control',
    description: 'Inspection, testing, and quality verification',
    parentDepartmentCode: 'QA',
    costCenter: 'CC-4100',
    budgetCode: 'BG-QC',
    isActive: true
  },

  // Quality Engineering
  {
    departmentCode: 'QE',
    departmentName: 'Quality Engineering',
    description: 'Quality systems, SPC, and process capability analysis',
    parentDepartmentCode: 'QA',
    costCenter: 'CC-4200',
    budgetCode: 'BG-QE',
    isActive: true
  },

  // Compliance & Regulatory
  {
    departmentCode: 'COMP',
    departmentName: 'Compliance & Regulatory',
    description: 'Regulatory compliance, audits, and certification management',
    parentDepartmentCode: 'QA',
    costCenter: 'CC-4300',
    budgetCode: 'BG-COMP',
    isActive: true
  },

  // Metrology
  {
    departmentCode: 'METRO',
    departmentName: 'Metrology',
    description: 'Measurement systems, calibration, and standards',
    parentDepartmentCode: 'QA',
    costCenter: 'CC-4400',
    budgetCode: 'BG-METRO',
    isActive: true
  },

  // === SUPPORT DEPARTMENTS ===

  // Human Resources
  {
    departmentCode: 'HR',
    departmentName: 'Human Resources',
    description: 'Personnel management, training, and organizational development',
    parentDepartmentCode: 'SUPPORT',
    costCenter: 'CC-5100',
    budgetCode: 'BG-HR',
    isActive: true
  },

  // Finance & Accounting
  {
    departmentCode: 'FIN',
    departmentName: 'Finance & Accounting',
    description: 'Financial management, accounting, and cost control',
    parentDepartmentCode: 'SUPPORT',
    costCenter: 'CC-5200',
    budgetCode: 'BG-FIN',
    isActive: true
  },

  // Information Technology
  {
    departmentCode: 'IT',
    departmentName: 'Information Technology',
    description: 'IT infrastructure, software development, and technical support',
    parentDepartmentCode: 'SUPPORT',
    costCenter: 'CC-5300',
    budgetCode: 'BG-IT',
    isActive: true
  },

  // Procurement
  {
    departmentCode: 'PROC_DEPT',
    departmentName: 'Procurement',
    description: 'Purchasing, vendor management, and supply chain',
    parentDepartmentCode: 'SUPPORT',
    costCenter: 'CC-5400',
    budgetCode: 'BG-PROC',
    isActive: true
  },

  // Safety & Environment
  {
    departmentCode: 'SAFETY',
    departmentName: 'Safety & Environment',
    description: 'Workplace safety, environmental compliance, and risk management',
    parentDepartmentCode: 'SUPPORT',
    costCenter: 'CC-5500',
    budgetCode: 'BG-SAFETY',
    isActive: true
  },

  // Customer Service
  {
    departmentCode: 'CS',
    departmentName: 'Customer Service',
    description: 'Customer support, order management, and client relations',
    parentDepartmentCode: 'SUPPORT',
    costCenter: 'CC-5600',
    budgetCode: 'BG-CS',
    isActive: true
  },

  // === SPECIALIZED MANUFACTURING DEPARTMENTS ===

  // CNC Machining
  {
    departmentCode: 'CNC',
    departmentName: 'CNC Machining',
    description: 'Computer numerical control machining operations',
    parentDepartmentCode: 'MFG',
    costCenter: 'CC-2110',
    budgetCode: 'BG-CNC',
    isActive: true
  },

  // Assembly
  {
    departmentCode: 'ASSY',
    departmentName: 'Assembly',
    description: 'Product assembly and sub-assembly operations',
    parentDepartmentCode: 'MFG',
    costCenter: 'CC-2120',
    budgetCode: 'BG-ASSY',
    isActive: true
  },

  // Heat Treatment
  {
    departmentCode: 'HEAT',
    departmentName: 'Heat Treatment',
    description: 'Thermal processing and metallurgical operations',
    parentDepartmentCode: 'MFG',
    costCenter: 'CC-2130',
    budgetCode: 'BG-HEAT',
    isActive: true
  },

  // Surface Treatment
  {
    departmentCode: 'SURF',
    departmentName: 'Surface Treatment',
    description: 'Coating, plating, and surface finishing operations',
    parentDepartmentCode: 'MFG',
    costCenter: 'CC-2140',
    budgetCode: 'BG-SURF',
    isActive: true
  },

  // Welding & Fabrication
  {
    departmentCode: 'WELD',
    departmentName: 'Welding & Fabrication',
    description: 'Welding, forming, and metal fabrication processes',
    parentDepartmentCode: 'MFG',
    costCenter: 'CC-2150',
    budgetCode: 'BG-WELD',
    isActive: true
  }
];

/**
 * Site-specific departments (examples)
 */
export const SITE_SPECIFIC_DEPARTMENTS: DepartmentSeedData[] = [
  // Plant Management
  {
    departmentCode: 'PLANT_MGR',
    departmentName: 'Plant Management',
    description: 'Site-level management and coordination',
    costCenter: 'CC-1100',
    budgetCode: 'BG-PLANT',
    isActive: true
  },

  // Security
  {
    departmentCode: 'SEC',
    departmentName: 'Security',
    description: 'Facility security and access control',
    costCenter: 'CC-1200',
    budgetCode: 'BG-SEC',
    isActive: true
  },

  // Facilities
  {
    departmentCode: 'FAC',
    departmentName: 'Facilities',
    description: 'Building maintenance and facility management',
    costCenter: 'CC-1300',
    budgetCode: 'BG-FAC',
    isActive: true
  }
];

/**
 * Creates or updates department records in the database
 */
export async function seedDepartments(
  departments: DepartmentSeedData[] = STANDARD_DEPARTMENTS,
  siteId?: string
): Promise<void> {
  console.log('🏢 Seeding departments...');

  // Create departments in dependency order (parents first)
  const departmentMap = new Map<string, string>(); // code -> id mapping
  const processed = new Set<string>();

  const createDepartment = async (dept: DepartmentSeedData): Promise<void> => {
    if (processed.has(dept.departmentCode)) return;

    // If this department has a parent, ensure parent is created first
    if (dept.parentDepartmentCode && !processed.has(dept.parentDepartmentCode)) {
      const parentDept = departments.find(d => d.departmentCode === dept.parentDepartmentCode);
      if (parentDept) {
        await createDepartment(parentDept);
      }
    }

    try {
      const parentDepartmentId = dept.parentDepartmentCode ?
        departmentMap.get(dept.parentDepartmentCode) : undefined;

      const department = await prisma.department.upsert({
        where: { departmentCode: dept.departmentCode },
        update: {
          departmentName: dept.departmentName,
          description: dept.description || null,
          parentDepartmentId: parentDepartmentId || null,
          costCenter: dept.costCenter || null,
          budgetCode: dept.budgetCode || null,
          isActive: dept.isActive ?? true,
          siteId: siteId || null,
          updatedAt: new Date()
        },
        create: {
          departmentCode: dept.departmentCode,
          departmentName: dept.departmentName,
          description: dept.description || null,
          parentDepartmentId: parentDepartmentId || null,
          costCenter: dept.costCenter || null,
          budgetCode: dept.budgetCode || null,
          isActive: dept.isActive ?? true,
          siteId: siteId || null
        }
      });

      departmentMap.set(dept.departmentCode, department.id);
      processed.add(dept.departmentCode);

      console.log(`  ✅ ${dept.departmentCode}: ${dept.departmentName}`);
    } catch (error) {
      console.error(`  ❌ Failed to create department ${dept.departmentCode}:`, error);
      throw error;
    }
  };

  // Process all departments
  for (const dept of departments) {
    await createDepartment(dept);
  }

  console.log(`✅ Successfully seeded ${departments.length} departments`);
}

/**
 * Seeds all standard departments
 */
export async function seedAllDepartments(siteId?: string): Promise<void> {
  const allDepartments = [
    ...STANDARD_DEPARTMENTS,
    ...SITE_SPECIFIC_DEPARTMENTS
  ];

  await seedDepartments(allDepartments, siteId);
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting department seeding...');

    await seedAllDepartments();

    // Verify the results
    const departmentCount = await prisma.department.count();
    console.log(`📊 Total departments in database: ${departmentCount}`);

    // Show hierarchy
    const rootDepartments = await prisma.department.findMany({
      where: { parentDepartmentId: null },
      include: {
        childDepartments: {
          include: {
            childDepartments: true
          }
        }
      },
      orderBy: { departmentCode: 'asc' }
    });

    console.log('\n📋 Department Hierarchy:');
    rootDepartments.forEach(dept => {
      console.log(`${dept.departmentCode}: ${dept.departmentName}`);
      dept.childDepartments.forEach(child => {
        console.log(`  └─ ${child.departmentCode}: ${child.departmentName}`);
        child.childDepartments.forEach(grandchild => {
          console.log(`     └─ ${grandchild.departmentCode}: ${grandchild.departmentName}`);
        });
      });
    });

  } catch (error) {
    console.error('❌ Department seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}