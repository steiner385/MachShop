/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * ManufacturingRoleTemplatesInitializer - Creates predefined role templates
 * for common manufacturing roles to streamline role setup across sites
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { RoleTemplateService } from './RoleTemplateService';
import { CreateRoleTemplateInput, ManufacturingRoleTemplate } from '../types/roleTemplate';

export class ManufacturingRoleTemplatesInitializer {
  private prisma: PrismaClient;
  private roleTemplateService: RoleTemplateService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.roleTemplateService = new RoleTemplateService(prisma);
  }

  /**
   * Initialize all predefined manufacturing role templates
   */
  async initializeManufacturingRoleTemplates(createdById: string): Promise<void> {
    try {
      logger.info('Initializing predefined manufacturing role templates', { createdById });

      // Get permission mappings for the templates
      const permissionMap = await this.createPermissionMapping();

      // Create all manufacturing role templates
      const templates = this.getManufacturingRoleTemplateDefinitions();

      for (const template of templates) {
        await this.createRoleTemplateIfNotExists(template, permissionMap, createdById);
      }

      logger.info('Successfully initialized all manufacturing role templates');

    } catch (error) {
      logger.error('Failed to initialize manufacturing role templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a role template if it doesn't already exist
   */
  private async createRoleTemplateIfNotExists(
    template: ManufacturingRoleTemplate,
    permissionMap: Map<string, string>,
    createdById: string
  ): Promise<void> {
    try {
      // Check if template already exists
      const existingTemplate = await this.prisma.roleTemplate.findUnique({
        where: { templateCode: template.templateCode }
      });

      if (existingTemplate) {
        logger.info(`Role template ${template.templateCode} already exists, skipping`);
        return;
      }

      // Map permission codes to permission IDs
      const permissions = template.permissions
        .map(permCode => {
          const permissionId = permissionMap.get(permCode);
          if (!permissionId) {
            logger.warn(`Permission code '${permCode}' not found for template ${template.templateCode}`);
            return null;
          }
          return {
            permissionId,
            isRequired: true,
            isOptional: false,
            metadata: {}
          };
        })
        .filter(perm => perm !== null) as any[];

      // Create template input
      const templateInput: CreateRoleTemplateInput = {
        templateCode: template.templateCode,
        templateName: template.templateName,
        description: template.description,
        category: template.category,
        isActive: true,
        isGlobal: true,
        version: '1.0.0',
        metadata: template.metadata,
        permissions
      };

      // Create the template
      await this.roleTemplateService.createRoleTemplate(templateInput, createdById);
      logger.info(`Created manufacturing role template: ${template.templateCode}`);

    } catch (error) {
      logger.error(`Failed to create role template ${template.templateCode}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Create mapping of permission codes to permission IDs
   */
  private async createPermissionMapping(): Promise<Map<string, string>> {
    try {
      const permissions = await this.prisma.permission.findMany({
        select: {
          id: true,
          permissionCode: true
        }
      });

      const permissionMap = new Map<string, string>();
      permissions.forEach(perm => {
        permissionMap.set(perm.permissionCode, perm.id);
      });

      logger.info(`Created permission mapping with ${permissionMap.size} permissions`);
      return permissionMap;

    } catch (error) {
      logger.error('Failed to create permission mapping', { error: error.message });
      throw error;
    }
  }

  /**
   * Get predefined manufacturing role template definitions
   */
  private getManufacturingRoleTemplateDefinitions(): ManufacturingRoleTemplate[] {
    return [
      // 1. Production Operator Template
      {
        templateCode: 'PROD_OPERATOR',
        templateName: 'Production Operator',
        description: 'Standard production operator role with work order execution and basic quality checks',
        category: 'PRODUCTION',
        permissions: [
          'work_orders.view',
          'work_orders.update_status',
          'work_orders.view_instructions',
          'production.record_output',
          'production.view_schedule',
          'quality.basic_checks',
          'inventory.view_materials',
          'equipment.view_status',
          'time_tracking.record_hours'
        ],
        metadata: {
          skillRequirements: [
            'Basic manufacturing knowledge',
            'Equipment operation',
            'Safety procedures',
            'Quality awareness'
          ],
          certificationRequirements: [
            'Basic safety training',
            'Equipment operation certification'
          ],
          shiftPatterns: ['day_shift', 'night_shift', 'rotating'],
          workstationTypes: [
            'assembly_station',
            'machining_center',
            'inspection_station',
            'packaging_station'
          ],
          safetyLevel: 'basic',
          estimatedTrainingHours: 40
        }
      },

      // 2. Quality Inspector Template
      {
        templateCode: 'QUALITY_INSPECTOR',
        templateName: 'Quality Inspector',
        description: 'Quality control inspector with full inspection and non-conformance management capabilities',
        category: 'QUALITY',
        permissions: [
          'quality.view_all',
          'quality.create_inspections',
          'quality.update_inspections',
          'quality.approve_inspections',
          'quality.create_ncr',
          'quality.update_ncr',
          'quality.view_specifications',
          'quality.record_measurements',
          'quality.generate_reports',
          'work_orders.view',
          'work_orders.quality_hold',
          'inventory.quarantine_materials',
          'documents.view_quality_docs'
        ],
        metadata: {
          skillRequirements: [
            'Quality control principles',
            'Measurement and inspection',
            'Statistical analysis',
            'Regulatory compliance',
            'Documentation procedures'
          ],
          certificationRequirements: [
            'Quality control certification',
            'Measurement system certification',
            'ISO 9001 awareness training'
          ],
          shiftPatterns: ['day_shift', 'swing_shift'],
          workstationTypes: [
            'inspection_station',
            'metrology_lab',
            'incoming_inspection',
            'final_inspection'
          ],
          safetyLevel: 'intermediate',
          estimatedTrainingHours: 80
        }
      },

      // 3. Maintenance Technician Template
      {
        templateCode: 'MAINTENANCE_TECH',
        templateName: 'Maintenance Technician',
        description: 'Equipment maintenance technician with preventive and corrective maintenance responsibilities',
        category: 'MAINTENANCE',
        permissions: [
          'maintenance.view_all',
          'maintenance.create_work_orders',
          'maintenance.update_work_orders',
          'maintenance.schedule_maintenance',
          'maintenance.record_activities',
          'equipment.view_all',
          'equipment.update_status',
          'equipment.view_history',
          'inventory.view_parts',
          'inventory.request_parts',
          'safety.report_incidents',
          'documents.view_maintenance_docs'
        ],
        metadata: {
          skillRequirements: [
            'Mechanical systems',
            'Electrical systems',
            'Hydraulic/pneumatic systems',
            'Troubleshooting',
            'Preventive maintenance',
            'Safety procedures'
          ],
          certificationRequirements: [
            'Electrical safety certification',
            'Equipment-specific training',
            'Lockout/tagout certification',
            'Confined space training'
          ],
          shiftPatterns: ['day_shift', 'on_call', 'rotating'],
          workstationTypes: [
            'maintenance_shop',
            'production_floor',
            'utilities_area',
            'equipment_location'
          ],
          safetyLevel: 'advanced',
          estimatedTrainingHours: 120
        }
      },

      // 4. Site Manager Template
      {
        templateCode: 'SITE_MANAGER',
        templateName: 'Site Manager',
        description: 'Site management role with oversight of production, quality, and personnel',
        category: 'MANAGEMENT',
        permissions: [
          'production.view_all',
          'production.manage_schedule',
          'quality.view_all',
          'quality.approve_major_decisions',
          'maintenance.view_all',
          'maintenance.approve_major_work',
          'inventory.view_all',
          'inventory.approve_adjustments',
          'users.view_site_users',
          'users.manage_assignments',
          'reports.view_all',
          'reports.generate_management',
          'safety.view_all_incidents',
          'compliance.view_all'
        ],
        metadata: {
          skillRequirements: [
            'Management and leadership',
            'Manufacturing operations',
            'Budget management',
            'Personnel management',
            'Regulatory compliance',
            'Strategic planning'
          ],
          certificationRequirements: [
            'Management training',
            'Safety management certification',
            'Regulatory compliance training'
          ],
          shiftPatterns: ['day_shift', 'on_call'],
          workstationTypes: [
            'management_office',
            'production_floor',
            'conference_room'
          ],
          safetyLevel: 'advanced',
          estimatedTrainingHours: 60
        }
      },

      // 5. Process Engineer Template
      {
        templateCode: 'PROCESS_ENGINEER',
        templateName: 'Process Engineer',
        description: 'Engineering role focused on process design, optimization, and work instruction management',
        category: 'ENGINEERING',
        permissions: [
          'work_instructions.view_all',
          'work_instructions.create',
          'work_instructions.update',
          'work_instructions.approve',
          'routing.view_all',
          'routing.create',
          'routing.update',
          'routing.approve',
          'process.view_all',
          'process.design',
          'process.optimize',
          'quality.design_specifications',
          'production.analyze_efficiency',
          'reports.generate_engineering',
          'documents.manage_engineering'
        ],
        metadata: {
          skillRequirements: [
            'Process engineering',
            'Manufacturing systems',
            'Lean manufacturing',
            'Statistical analysis',
            'CAD/CAM systems',
            'Continuous improvement'
          ],
          certificationRequirements: [
            'Engineering degree or equivalent',
            'Lean Six Sigma certification',
            'Process safety management'
          ],
          shiftPatterns: ['day_shift'],
          workstationTypes: [
            'engineering_office',
            'production_floor',
            'laboratory',
            'conference_room'
          ],
          safetyLevel: 'intermediate',
          estimatedTrainingHours: 80
        }
      },

      // 6. Warehouse Operator Template
      {
        templateCode: 'WAREHOUSE_OPERATOR',
        templateName: 'Warehouse Operator',
        description: 'Warehouse operations role with inventory management and material handling responsibilities',
        category: 'PRODUCTION',
        permissions: [
          'inventory.view_all',
          'inventory.receive_materials',
          'inventory.issue_materials',
          'inventory.move_materials',
          'inventory.cycle_count',
          'inventory.adjust_quantities',
          'shipping.create_shipments',
          'shipping.update_status',
          'receiving.process_receipts',
          'receiving.inspect_materials',
          'work_orders.material_pick',
          'safety.report_incidents'
        ],
        metadata: {
          skillRequirements: [
            'Warehouse operations',
            'Inventory management',
            'Material handling equipment',
            'Shipping/receiving procedures',
            'Barcode/RFID systems'
          ],
          certificationRequirements: [
            'Forklift operation certification',
            'Material handling safety',
            'Hazmat handling (if applicable)'
          ],
          shiftPatterns: ['day_shift', 'night_shift', 'rotating'],
          workstationTypes: [
            'warehouse_floor',
            'receiving_dock',
            'shipping_dock',
            'inventory_station'
          ],
          safetyLevel: 'intermediate',
          estimatedTrainingHours: 50
        }
      },

      // 7. Safety Coordinator Template
      {
        templateCode: 'SAFETY_COORDINATOR',
        templateName: 'Safety Coordinator',
        description: 'Safety management role with incident investigation and compliance oversight',
        category: 'SAFETY',
        permissions: [
          'safety.view_all',
          'safety.manage_incidents',
          'safety.conduct_investigations',
          'safety.create_reports',
          'safety.manage_training',
          'safety.audit_compliance',
          'maintenance.safety_review',
          'quality.safety_review',
          'users.safety_training_status',
          'documents.manage_safety_docs',
          'compliance.safety_regulatory'
        ],
        metadata: {
          skillRequirements: [
            'Occupational safety',
            'Incident investigation',
            'Regulatory compliance',
            'Training development',
            'Risk assessment',
            'Emergency response'
          ],
          certificationRequirements: [
            'Safety professional certification',
            'OSHA training',
            'Emergency response training',
            'Incident investigation certification'
          ],
          shiftPatterns: ['day_shift', 'on_call'],
          workstationTypes: [
            'safety_office',
            'production_floor',
            'training_room',
            'incident_site'
          ],
          safetyLevel: 'advanced',
          estimatedTrainingHours: 100
        }
      },

      // 8. Quality Manager Template
      {
        templateCode: 'QUALITY_MANAGER',
        templateName: 'Quality Manager',
        description: 'Quality management role with system oversight and regulatory compliance responsibilities',
        category: 'QUALITY',
        permissions: [
          'quality.manage_all',
          'quality.approve_all',
          'quality.system_configuration',
          'quality.regulatory_compliance',
          'quality.audit_management',
          'quality.supplier_quality',
          'quality.customer_quality',
          'users.quality_team_management',
          'reports.quality_management',
          'documents.quality_system_docs',
          'compliance.quality_regulatory',
          'production.quality_authority'
        ],
        metadata: {
          skillRequirements: [
            'Quality management systems',
            'Statistical process control',
            'Regulatory compliance',
            'Audit management',
            'Supplier quality',
            'Customer quality',
            'Leadership and management'
          ],
          certificationRequirements: [
            'Quality management certification',
            'Lead auditor certification',
            'Industry-specific quality standards',
            'Management training'
          ],
          shiftPatterns: ['day_shift'],
          workstationTypes: [
            'quality_office',
            'production_floor',
            'laboratory',
            'conference_room',
            'audit_areas'
          ],
          safetyLevel: 'intermediate',
          estimatedTrainingHours: 80
        }
      }
    ];
  }

  /**
   * Check if manufacturing templates are already initialized
   */
  async areManufacturingTemplatesInitialized(): Promise<boolean> {
    try {
      const templateCodes = this.getManufacturingRoleTemplateDefinitions().map(t => t.templateCode);

      const count = await this.prisma.roleTemplate.count({
        where: {
          templateCode: { in: templateCodes },
          isActive: true
        }
      });

      return count === templateCodes.length;

    } catch (error) {
      logger.error('Failed to check manufacturing template initialization status', { error: error.message });
      return false;
    }
  }

  /**
   * Get list of manufacturing template codes that are missing
   */
  async getMissingManufacturingTemplates(): Promise<string[]> {
    try {
      const allTemplateCodes = this.getManufacturingRoleTemplateDefinitions().map(t => t.templateCode);

      const existingTemplates = await this.prisma.roleTemplate.findMany({
        where: {
          templateCode: { in: allTemplateCodes },
          isActive: true
        },
        select: { templateCode: true }
      });

      const existingCodes = existingTemplates.map(t => t.templateCode);
      return allTemplateCodes.filter(code => !existingCodes.includes(code));

    } catch (error) {
      logger.error('Failed to get missing manufacturing templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Create only missing manufacturing templates
   */
  async createMissingManufacturingTemplates(createdById: string): Promise<string[]> {
    try {
      const missingCodes = await this.getMissingManufacturingTemplates();

      if (missingCodes.length === 0) {
        logger.info('All manufacturing templates already exist');
        return [];
      }

      const permissionMap = await this.createPermissionMapping();
      const allTemplates = this.getManufacturingRoleTemplateDefinitions();
      const missingTemplates = allTemplates.filter(t => missingCodes.includes(t.templateCode));

      const createdTemplates: string[] = [];

      for (const template of missingTemplates) {
        await this.createRoleTemplateIfNotExists(template, permissionMap, createdById);
        createdTemplates.push(template.templateCode);
      }

      logger.info(`Created ${createdTemplates.length} missing manufacturing templates`, { createdTemplates });
      return createdTemplates;

    } catch (error) {
      logger.error('Failed to create missing manufacturing templates', { error: error.message });
      throw error;
    }
  }
}