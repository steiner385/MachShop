/**
 * Department String Migration Strategy
 *
 * Migrates existing department string fields to use the new Department lookup table.
 * Analyzes existing data, creates department records, and updates foreign key references.
 *
 * Created for Issue #209: Department Lookup Table Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DepartmentMigrationResult {
  success: boolean;
  migratedFields: {
    users: number;
    personnelInfoExchanges: number;
    engineeringChangeOrders: number;
    ecoTasks: number;
    icdChangeRequests: number;
  };
  createdDepartments: number;
  errors: string[];
  warnings: string[];
}

export interface DepartmentAnalysis {
  field: string;
  table: string;
  uniqueValues: string[];
  totalRecords: number;
  nullRecords: number;
}

/**
 * Department String Migration Service
 */
export class DepartmentMigrationService {
  /**
   * Analyze existing department string data
   */
  static async analyzeDepartmentData(): Promise<DepartmentAnalysis[]> {
    console.log('📊 Analyzing existing department string data...');

    const analyses: DepartmentAnalysis[] = [];

    // Analyze User.department
    const userDepartments = await prisma.user.findMany({
      select: { department: true },
      where: { department: { not: null } }
    });

    const userDepartmentValues = [...new Set(
      userDepartments
        .map(u => u.department)
        .filter(Boolean)
        .map(dept => dept!.trim())
        .filter(dept => dept.length > 0)
    )];

    const totalUsers = await prisma.user.count();
    const nullUserDepartments = await prisma.user.count({
      where: { department: null }
    });

    analyses.push({
      field: 'department',
      table: 'User',
      uniqueValues: userDepartmentValues,
      totalRecords: totalUsers,
      nullRecords: nullUserDepartments
    });

    // Analyze PersonnelInfoExchange.department
    const personnelDepartments = await prisma.personnelInfoExchange.findMany({
      select: { department: true },
      where: { department: { not: null } }
    });

    const personnelDepartmentValues = [...new Set(
      personnelDepartments
        .map(p => p.department)
        .filter(Boolean)
        .map(dept => dept!.trim())
        .filter(dept => dept.length > 0)
    )];

    const totalPersonnel = await prisma.personnelInfoExchange.count();
    const nullPersonnelDepartments = await prisma.personnelInfoExchange.count({
      where: { department: null }
    });

    analyses.push({
      field: 'department',
      table: 'PersonnelInfoExchange',
      uniqueValues: personnelDepartmentValues,
      totalRecords: totalPersonnel,
      nullRecords: nullPersonnelDepartments
    });

    // Analyze EngineeringChangeOrder.requestorDept
    const ecoDepartments = await prisma.engineeringChangeOrder.findMany({
      select: { requestorDept: true },
      where: { requestorDept: { not: null } }
    });

    const ecoDepartmentValues = [...new Set(
      ecoDepartments
        .map(e => e.requestorDept)
        .filter(Boolean)
        .map(dept => dept!.trim())
        .filter(dept => dept.length > 0)
    )];

    const totalECOs = await prisma.engineeringChangeOrder.count();
    const nullECODepartments = await prisma.engineeringChangeOrder.count({
      where: { requestorDept: null }
    });

    analyses.push({
      field: 'requestorDept',
      table: 'EngineeringChangeOrder',
      uniqueValues: ecoDepartmentValues,
      totalRecords: totalECOs,
      nullRecords: nullECODepartments
    });

    // Analyze ECOTask.assignedToDept
    const ecoTaskDepartments = await prisma.eCOTask.findMany({
      select: { assignedToDept: true },
      where: { assignedToDept: { not: null } }
    });

    const ecoTaskDepartmentValues = [...new Set(
      ecoTaskDepartments
        .map(t => t.assignedToDept)
        .filter(Boolean)
        .map(dept => dept!.trim())
        .filter(dept => dept.length > 0)
    )];

    const totalECOTasks = await prisma.eCOTask.count();
    const nullECOTaskDepartments = await prisma.eCOTask.count({
      where: { assignedToDept: null }
    });

    analyses.push({
      field: 'assignedToDept',
      table: 'ECOTask',
      uniqueValues: ecoTaskDepartmentValues,
      totalRecords: totalECOTasks,
      nullRecords: nullECOTaskDepartments
    });

    // Analyze ICDChangeRequest.requestorDept
    const icdDepartments = await prisma.iCDChangeRequest.findMany({
      select: { requestorDept: true },
      where: { requestorDept: { not: null } }
    });

    const icdDepartmentValues = [...new Set(
      icdDepartments
        .map(i => i.requestorDept)
        .filter(Boolean)
        .map(dept => dept!.trim())
        .filter(dept => dept.length > 0)
    )];

    const totalICDs = await prisma.iCDChangeRequest.count();
    const nullICDDepartments = await prisma.iCDChangeRequest.count({
      where: { requestorDept: null }
    });

    analyses.push({
      field: 'requestorDept',
      table: 'ICDChangeRequest',
      uniqueValues: icdDepartmentValues,
      totalRecords: totalICDs,
      nullRecords: nullICDDepartments
    });

    return analyses;
  }

  /**
   * Generate department mapping from string values
   */
  static generateDepartmentMapping(analyses: DepartmentAnalysis[]): Map<string, string> {
    const allDepartmentValues = new Set<string>();

    // Collect all unique department values
    analyses.forEach(analysis => {
      analysis.uniqueValues.forEach(value => {
        allDepartmentValues.add(value);
      });
    });

    // Create standardized mapping
    const mapping = new Map<string, string>();

    for (const value of allDepartmentValues) {
      const standardized = this.standardizeDepartmentName(value);
      mapping.set(value, standardized);
    }

    return mapping;
  }

  /**
   * Standardize department names for consistency
   */
  static standardizeDepartmentName(departmentName: string): string {
    const cleaned = departmentName.trim().toUpperCase();

    // Common standardizations
    const standardizations: Record<string, string> = {
      'ENGINEERING': 'ENG',
      'QUALITY': 'QA',
      'QUALITY ASSURANCE': 'QA',
      'QUALITY CONTROL': 'QC',
      'MANUFACTURING': 'MFG',
      'PRODUCTION': 'PROD',
      'MAINTENANCE': 'MAINT',
      'PLANNING': 'PLAN',
      'MATERIALS': 'MAT',
      'HUMAN RESOURCES': 'HR',
      'INFORMATION TECHNOLOGY': 'IT',
      'FINANCE': 'FIN',
      'PROCUREMENT': 'PROC_DEPT',
      'SHIPPING': 'SHIP',
      'RECEIVING': 'SHIP',
      'SAFETY': 'SAFETY',
      'DESIGN': 'DESIGN',
      'PROCESS': 'PROC',
      'TEST': 'TEST',
      'ASSEMBLY': 'ASSY',
      'MACHINING': 'CNC',
      'CNC': 'CNC',
      'WELDING': 'WELD',
      'HEAT TREATMENT': 'HEAT'
    };

    // Check exact matches
    if (standardizations[cleaned]) {
      return standardizations[cleaned];
    }

    // Check partial matches
    for (const [key, value] of Object.entries(standardizations)) {
      if (cleaned.includes(key)) {
        return value;
      }
    }

    // Generate code from department name
    const words = cleaned.split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 8); // Max 8 characters
    } else if (words.length === 2) {
      return words.map(w => w.substring(0, 4)).join('_');
    } else {
      return words.map(w => w.charAt(0)).join('').substring(0, 8);
    }
  }

  /**
   * Create department records from mapping
   */
  static async createDepartmentRecords(mapping: Map<string, string>): Promise<string[]> {
    console.log('🏢 Creating department records...');

    const createdDepartments: string[] = [];
    const errors: string[] = [];

    for (const [originalName, departmentCode] of mapping) {
      try {
        // Check if department already exists
        const existingDepartment = await prisma.department.findUnique({
          where: { departmentCode }
        });

        if (!existingDepartment) {
          await prisma.department.create({
            data: {
              departmentCode,
              departmentName: originalName,
              description: `Migrated from legacy department: ${originalName}`,
              isActive: true
            }
          });

          createdDepartments.push(departmentCode);
          console.log(`  ✅ Created: ${departmentCode} (${originalName})`);
        } else {
          console.log(`  ⚠️  Exists: ${departmentCode} (${originalName})`);
        }
      } catch (error) {
        const errorMsg = `Failed to create department ${departmentCode}: ${error}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Department creation failed: ${errors.join(', ')}`);
    }

    return createdDepartments;
  }

  /**
   * Migrate User.department field
   */
  static async migrateUserDepartments(mapping: Map<string, string>): Promise<number> {
    console.log('👥 Migrating User departments...');

    let migratedCount = 0;

    for (const [originalName, departmentCode] of mapping) {
      const department = await prisma.department.findUnique({
        where: { departmentCode }
      });

      if (!department) {
        throw new Error(`Department ${departmentCode} not found`);
      }

      const result = await prisma.user.updateMany({
        where: {
          department: originalName,
          departmentId: null
        },
        data: {
          departmentId: department.id
        }
      });

      migratedCount += result.count;
      console.log(`  ✅ Migrated ${result.count} users from '${originalName}' to ${departmentCode}`);
    }

    return migratedCount;
  }

  /**
   * Migrate PersonnelInfoExchange.department field
   */
  static async migratePersonnelDepartments(mapping: Map<string, string>): Promise<number> {
    console.log('📋 Migrating PersonnelInfoExchange departments...');

    let migratedCount = 0;

    for (const [originalName, departmentCode] of mapping) {
      const department = await prisma.department.findUnique({
        where: { departmentCode }
      });

      if (!department) {
        throw new Error(`Department ${departmentCode} not found`);
      }

      const result = await prisma.personnelInfoExchange.updateMany({
        where: {
          department: originalName,
          departmentId: null
        },
        data: {
          departmentId: department.id
        }
      });

      migratedCount += result.count;
      console.log(`  ✅ Migrated ${result.count} personnel records from '${originalName}' to ${departmentCode}`);
    }

    return migratedCount;
  }

  /**
   * Migrate EngineeringChangeOrder.requestorDept field
   */
  static async migrateECODepartments(mapping: Map<string, string>): Promise<number> {
    console.log('🔧 Migrating ECO requestor departments...');

    let migratedCount = 0;

    for (const [originalName, departmentCode] of mapping) {
      const department = await prisma.department.findUnique({
        where: { departmentCode }
      });

      if (!department) {
        throw new Error(`Department ${departmentCode} not found`);
      }

      const result = await prisma.engineeringChangeOrder.updateMany({
        where: {
          requestorDept: originalName,
          requestorDeptId: null
        },
        data: {
          requestorDeptId: department.id
        }
      });

      migratedCount += result.count;
      console.log(`  ✅ Migrated ${result.count} ECOs from '${originalName}' to ${departmentCode}`);
    }

    return migratedCount;
  }

  /**
   * Migrate ECOTask.assignedToDept field
   */
  static async migrateECOTaskDepartments(mapping: Map<string, string>): Promise<number> {
    console.log('📝 Migrating ECO task departments...');

    let migratedCount = 0;

    for (const [originalName, departmentCode] of mapping) {
      const department = await prisma.department.findUnique({
        where: { departmentCode }
      });

      if (!department) {
        throw new Error(`Department ${departmentCode} not found`);
      }

      const result = await prisma.eCOTask.updateMany({
        where: {
          assignedToDept: originalName,
          assignedToDeptId: null
        },
        data: {
          assignedToDeptId: department.id
        }
      });

      migratedCount += result.count;
      console.log(`  ✅ Migrated ${result.count} ECO tasks from '${originalName}' to ${departmentCode}`);
    }

    return migratedCount;
  }

  /**
   * Migrate ICDChangeRequest.requestorDept field
   */
  static async migrateICDDepartments(mapping: Map<string, string>): Promise<number> {
    console.log('📄 Migrating ICD change request departments...');

    let migratedCount = 0;

    for (const [originalName, departmentCode] of mapping) {
      const department = await prisma.department.findUnique({
        where: { departmentCode }
      });

      if (!department) {
        throw new Error(`Department ${departmentCode} not found`);
      }

      const result = await prisma.iCDChangeRequest.updateMany({
        where: {
          requestorDept: originalName,
          requestorDeptId: null
        },
        data: {
          requestorDeptId: department.id
        }
      });

      migratedCount += result.count;
      console.log(`  ✅ Migrated ${result.count} ICD requests from '${originalName}' to ${departmentCode}`);
    }

    return migratedCount;
  }

  /**
   * Execute complete migration
   */
  static async executeMigration(dryRun: boolean = false): Promise<DepartmentMigrationResult> {
    console.log('🚀 Starting department string migration...');

    const result: DepartmentMigrationResult = {
      success: false,
      migratedFields: {
        users: 0,
        personnelInfoExchanges: 0,
        engineeringChangeOrders: 0,
        ecoTasks: 0,
        icdChangeRequests: 0
      },
      createdDepartments: 0,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Analyze existing data
      console.log('\n📊 Step 1: Analyzing existing department data...');
      const analyses = await this.analyzeDepartmentData();

      // Print analysis results
      console.log('\n📈 Analysis Results:');
      analyses.forEach(analysis => {
        console.log(`  ${analysis.table}.${analysis.field}:`);
        console.log(`    Total records: ${analysis.totalRecords}`);
        console.log(`    Null records: ${analysis.nullRecords}`);
        console.log(`    Unique values: ${analysis.uniqueValues.length}`);
        console.log(`    Values: ${analysis.uniqueValues.join(', ')}`);
        console.log('');
      });

      // Step 2: Generate mapping
      console.log('\n🗺️  Step 2: Generating department mapping...');
      const mapping = this.generateDepartmentMapping(analyses);

      console.log('\n📝 Department Mapping:');
      for (const [original, standardized] of mapping) {
        console.log(`  "${original}" -> "${standardized}"`);
      }

      if (dryRun) {
        console.log('\n🔍 DRY RUN MODE - No changes will be made');
        result.success = true;
        return result;
      }

      // Step 3: Create department records
      console.log('\n🏢 Step 3: Creating department records...');
      const createdDepartments = await this.createDepartmentRecords(mapping);
      result.createdDepartments = createdDepartments.length;

      // Step 4: Migrate data
      console.log('\n🔄 Step 4: Migrating department references...');

      // Execute all migrations in parallel for better performance
      const [
        userMigrations,
        personnelMigrations,
        ecoMigrations,
        ecoTaskMigrations,
        icdMigrations
      ] = await Promise.all([
        this.migrateUserDepartments(mapping),
        this.migratePersonnelDepartments(mapping),
        this.migrateECODepartments(mapping),
        this.migrateECOTaskDepartments(mapping),
        this.migrateICDDepartments(mapping)
      ]);

      result.migratedFields = {
        users: userMigrations,
        personnelInfoExchanges: personnelMigrations,
        engineeringChangeOrders: ecoMigrations,
        ecoTasks: ecoTaskMigrations,
        icdChangeRequests: icdMigrations
      };

      console.log('\n✅ Migration completed successfully!');
      console.log(`  Created departments: ${result.createdDepartments}`);
      console.log(`  Migrated users: ${result.migratedFields.users}`);
      console.log(`  Migrated personnel: ${result.migratedFields.personnelInfoExchanges}`);
      console.log(`  Migrated ECOs: ${result.migratedFields.engineeringChangeOrders}`);
      console.log(`  Migrated ECO tasks: ${result.migratedFields.ecoTasks}`);
      console.log(`  Migrated ICD requests: ${result.migratedFields.icdChangeRequests}`);

      result.success = true;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.success = false;
    }

    return result;
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    console.log('🚀 Department String Migration');
    console.log('==============================');

    const result = await DepartmentMigrationService.executeMigration(dryRun);

    if (result.success) {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    } else {
      console.error('\n💥 Migration failed:');
      result.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

export default DepartmentMigrationService;