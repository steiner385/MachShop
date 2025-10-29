/**
 * Seed Script: Standard Indirect Cost Codes
 * Creates standard indirect cost codes for non-productive time tracking
 *
 * GitHub Issue #46: Time Tracking Infrastructure
 */

import { PrismaClient } from '@prisma/client';
import { IndirectCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface IndirectCostCodeSeed {
  code: string;
  description: string;
  category: IndirectCategory;
  costCenter?: string;
  glAccount?: string;
  displayColor: string;
  displayIcon: string;
}

/**
 * Standard indirect cost codes based on common manufacturing practices
 */
const standardIndirectCostCodes: IndirectCostCodeSeed[] = [
  // Break time codes
  {
    code: 'BREAK-15',
    description: '15-minute break',
    category: IndirectCategory.BREAK,
    costCenter: 'LABOR-INDIRECT',
    glAccount: '6100-001',
    displayColor: '#4CAF50',
    displayIcon: 'coffee'
  },
  {
    code: 'BREAK-30',
    description: '30-minute break',
    category: IndirectCategory.BREAK,
    costCenter: 'LABOR-INDIRECT',
    glAccount: '6100-001',
    displayColor: '#4CAF50',
    displayIcon: 'coffee'
  },

  // Lunch break codes
  {
    code: 'LUNCH-30',
    description: '30-minute lunch break',
    category: IndirectCategory.LUNCH,
    costCenter: 'LABOR-INDIRECT',
    glAccount: '6100-002',
    displayColor: '#FF9800',
    displayIcon: 'restaurant'
  },
  {
    code: 'LUNCH-60',
    description: '1-hour lunch break',
    category: IndirectCategory.LUNCH,
    costCenter: 'LABOR-INDIRECT',
    glAccount: '6100-002',
    displayColor: '#FF9800',
    displayIcon: 'restaurant'
  },

  // Training codes
  {
    code: 'TRAIN-SAFETY',
    description: 'Safety training',
    category: IndirectCategory.TRAINING,
    costCenter: 'TRAINING',
    glAccount: '6200-001',
    displayColor: '#2196F3',
    displayIcon: 'school'
  },
  {
    code: 'TRAIN-SKILL',
    description: 'Skills training',
    category: IndirectCategory.TRAINING,
    costCenter: 'TRAINING',
    glAccount: '6200-002',
    displayColor: '#2196F3',
    displayIcon: 'build'
  },
  {
    code: 'TRAIN-CERT',
    description: 'Certification training',
    category: IndirectCategory.TRAINING,
    costCenter: 'TRAINING',
    glAccount: '6200-003',
    displayColor: '#2196F3',
    displayIcon: 'verified'
  },
  {
    code: 'TRAIN-OJT',
    description: 'On-the-job training',
    category: IndirectCategory.TRAINING,
    costCenter: 'TRAINING',
    glAccount: '6200-004',
    displayColor: '#2196F3',
    displayIcon: 'group'
  },

  // Meeting codes
  {
    code: 'MEET-TEAM',
    description: 'Team meeting',
    category: IndirectCategory.MEETING,
    costCenter: 'ADMIN',
    glAccount: '6300-001',
    displayColor: '#9C27B0',
    displayIcon: 'people'
  },
  {
    code: 'MEET-SAFETY',
    description: 'Safety meeting',
    category: IndirectCategory.MEETING,
    costCenter: 'SAFETY',
    glAccount: '6300-002',
    displayColor: '#9C27B0',
    displayIcon: 'security'
  },
  {
    code: 'MEET-PLAN',
    description: 'Planning meeting',
    category: IndirectCategory.MEETING,
    costCenter: 'PLANNING',
    glAccount: '6300-003',
    displayColor: '#9C27B0',
    displayIcon: 'event'
  },
  {
    code: 'MEET-QA',
    description: 'Quality assurance meeting',
    category: IndirectCategory.MEETING,
    costCenter: 'QUALITY',
    glAccount: '6300-004',
    displayColor: '#9C27B0',
    displayIcon: 'verified_user'
  },

  // Maintenance codes
  {
    code: 'MAINT-PREV',
    description: 'Preventive maintenance',
    category: IndirectCategory.MAINTENANCE,
    costCenter: 'MAINTENANCE',
    glAccount: '6400-001',
    displayColor: '#607D8B',
    displayIcon: 'build_circle'
  },
  {
    code: 'MAINT-REPAIR',
    description: 'Equipment repair',
    category: IndirectCategory.MAINTENANCE,
    costCenter: 'MAINTENANCE',
    glAccount: '6400-002',
    displayColor: '#607D8B',
    displayIcon: 'handyman'
  },
  {
    code: 'MAINT-CALIB',
    description: 'Equipment calibration',
    category: IndirectCategory.MAINTENANCE,
    costCenter: 'MAINTENANCE',
    glAccount: '6400-003',
    displayColor: '#607D8B',
    displayIcon: 'tune'
  },
  {
    code: 'MAINT-CLEAN',
    description: 'Equipment cleaning',
    category: IndirectCategory.MAINTENANCE,
    costCenter: 'MAINTENANCE',
    glAccount: '6400-004',
    displayColor: '#607D8B',
    displayIcon: 'cleaning_services'
  },

  // Setup codes
  {
    code: 'SETUP-LINE',
    description: 'Production line setup',
    category: IndirectCategory.SETUP,
    costCenter: 'PRODUCTION',
    glAccount: '6500-001',
    displayColor: '#FF5722',
    displayIcon: 'settings'
  },
  {
    code: 'SETUP-TOOL',
    description: 'Tool setup and changeover',
    category: IndirectCategory.SETUP,
    costCenter: 'PRODUCTION',
    glAccount: '6500-002',
    displayColor: '#FF5722',
    displayIcon: 'construction'
  },
  {
    code: 'SETUP-MAT',
    description: 'Material setup and staging',
    category: IndirectCategory.SETUP,
    costCenter: 'MATERIAL',
    glAccount: '6500-003',
    displayColor: '#FF5722',
    displayIcon: 'inventory'
  },
  {
    code: 'SETUP-QC',
    description: 'Quality control setup',
    category: IndirectCategory.SETUP,
    costCenter: 'QUALITY',
    glAccount: '6500-004',
    displayColor: '#FF5722',
    displayIcon: 'checklist'
  },

  // Cleanup codes
  {
    code: 'CLEAN-AREA',
    description: 'Work area cleanup',
    category: IndirectCategory.CLEANUP,
    costCenter: 'FACILITIES',
    glAccount: '6600-001',
    displayColor: '#795548',
    displayIcon: 'cleaning_services'
  },
  {
    code: 'CLEAN-5S',
    description: '5S activities',
    category: IndirectCategory.CLEANUP,
    costCenter: 'LEAN',
    glAccount: '6600-002',
    displayColor: '#795548',
    displayIcon: 'auto_awesome'
  },
  {
    code: 'CLEAN-SAFETY',
    description: 'Safety cleanup',
    category: IndirectCategory.CLEANUP,
    costCenter: 'SAFETY',
    glAccount: '6600-003',
    displayColor: '#795548',
    displayIcon: 'health_and_safety'
  },

  // Waiting codes
  {
    code: 'WAIT-MATERIAL',
    description: 'Waiting for material',
    category: IndirectCategory.WAITING,
    costCenter: 'MATERIAL',
    glAccount: '6700-001',
    displayColor: '#FFC107',
    displayIcon: 'hourglass_empty'
  },
  {
    code: 'WAIT-TOOL',
    description: 'Waiting for tools',
    category: IndirectCategory.WAITING,
    costCenter: 'TOOLING',
    glAccount: '6700-002',
    displayColor: '#FFC107',
    displayIcon: 'schedule'
  },
  {
    code: 'WAIT-INSP',
    description: 'Waiting for inspection',
    category: IndirectCategory.WAITING,
    costCenter: 'QUALITY',
    glAccount: '6700-003',
    displayColor: '#FFC107',
    displayIcon: 'pending'
  },
  {
    code: 'WAIT-EQUIP',
    description: 'Waiting for equipment',
    category: IndirectCategory.WAITING,
    costCenter: 'PRODUCTION',
    glAccount: '6700-004',
    displayColor: '#FFC107',
    displayIcon: 'schedule'
  },
  {
    code: 'WAIT-INSTRUCT',
    description: 'Waiting for instructions',
    category: IndirectCategory.WAITING,
    costCenter: 'SUPERVISION',
    glAccount: '6700-005',
    displayColor: '#FFC107',
    displayIcon: 'help'
  },

  // Administrative codes
  {
    code: 'ADMIN-PAPERWORK',
    description: 'Administrative paperwork',
    category: IndirectCategory.ADMINISTRATIVE,
    costCenter: 'ADMIN',
    glAccount: '6800-001',
    displayColor: '#9E9E9E',
    displayIcon: 'description'
  },
  {
    code: 'ADMIN-TIMECARD',
    description: 'Timecard and attendance',
    category: IndirectCategory.ADMINISTRATIVE,
    costCenter: 'HR',
    glAccount: '6800-002',
    displayColor: '#9E9E9E',
    displayIcon: 'access_time'
  },
  {
    code: 'ADMIN-COMPUTER',
    description: 'Computer/system tasks',
    category: IndirectCategory.ADMINISTRATIVE,
    costCenter: 'IT',
    glAccount: '6800-003',
    displayColor: '#9E9E9E',
    displayIcon: 'computer'
  },
  {
    code: 'ADMIN-COMM',
    description: 'Communication activities',
    category: IndirectCategory.ADMINISTRATIVE,
    costCenter: 'ADMIN',
    glAccount: '6800-004',
    displayColor: '#9E9E9E',
    displayIcon: 'message'
  },

  // Other codes
  {
    code: 'OTHER-PERSONAL',
    description: 'Personal time',
    category: IndirectCategory.OTHER,
    costCenter: 'LABOR-INDIRECT',
    glAccount: '6900-001',
    displayColor: '#000000',
    displayIcon: 'person'
  },
  {
    code: 'OTHER-SICK',
    description: 'Sick time',
    category: IndirectCategory.OTHER,
    costCenter: 'HR',
    glAccount: '6900-002',
    displayColor: '#F44336',
    displayIcon: 'local_hospital'
  },
  {
    code: 'OTHER-EMERGENCY',
    description: 'Emergency response',
    category: IndirectCategory.OTHER,
    costCenter: 'SAFETY',
    glAccount: '6900-003',
    displayColor: '#F44336',
    displayIcon: 'emergency'
  },
  {
    code: 'OTHER-MISC',
    description: 'Miscellaneous indirect time',
    category: IndirectCategory.OTHER,
    costCenter: 'ADMIN',
    glAccount: '6900-999',
    displayColor: '#757575',
    displayIcon: 'help_outline'
  }
];

/**
 * Seed the database with standard indirect cost codes
 */
async function seedIndirectCostCodes() {
  console.log('🌱 Seeding indirect cost codes...');

  try {
    let created = 0;
    let skipped = 0;

    for (const codeData of standardIndirectCostCodes) {
      try {
        // Check if code already exists
        const existing = await prisma.indirectCostCode.findUnique({
          where: { code: codeData.code }
        });

        if (existing) {
          console.log(`  ⏭️  Skipping existing code: ${codeData.code}`);
          skipped++;
          continue;
        }

        // Create the cost code
        await prisma.indirectCostCode.create({
          data: {
            ...codeData,
            createdBy: 'system-seed',
            siteId: null, // Global codes (available to all sites)
          }
        });

        console.log(`  ✅ Created: ${codeData.code} - ${codeData.description}`);
        created++;

      } catch (error) {
        console.error(`  ❌ Failed to create ${codeData.code}:`, error);
      }
    }

    console.log(`\n✅ Indirect cost codes seeding completed:`);
    console.log(`   📦 Created: ${created} codes`);
    console.log(`   ⏭️  Skipped: ${skipped} existing codes`);
    console.log(`   🎯 Total: ${standardIndirectCostCodes.length} standard codes`);

  } catch (error) {
    console.error('❌ Error seeding indirect cost codes:', error);
    throw error;
  }
}

/**
 * Run the seed function if called directly
 */
if (require.main === module) {
  seedIndirectCostCodes()
    .then(() => {
      console.log('🎉 Indirect cost codes seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Indirect cost codes seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedIndirectCostCodes, standardIndirectCostCodes };