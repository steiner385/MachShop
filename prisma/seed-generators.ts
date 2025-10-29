/**
 * Seed Data Generators for Manufacturing Modalities
 * Issue #162: Implements data generation for all 7 manufacturing modalities
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import {
  SeedDataGenerator,
  MANUFACTURING_MODALITIES,
  ManufacturingModality,
  SeedDataConfig
} from './seed-framework';

// Add missing property to fix TypeScript compilation
declare module './seed-framework' {
  interface SeedDataGenerator {
    uniqueSuffix: string;
  }
}

export class ManufacturingModalityGenerator extends SeedDataGenerator {
  constructor(prisma: PrismaClient, config: SeedDataConfig) {
    super(prisma, config);
  }

  /**
   * Generate complete manufacturing site with all modalities
   */
  async generateManufacturingSite(
    enterpriseId: string,
    siteIndex: number,
    modalityNames: string[]
  ) {
    const siteName = `Manufacturing Site ${siteIndex + 1}`;
    const siteCode = `MS${(siteIndex + 1).toString().padStart(2, '0')}`;

    // Create site
    const site = await this.prisma.site.upsert({
      where: { siteCode: `${siteCode}-${this.uniqueSuffix}` },
      create: {
        siteCode: `${siteCode}-${this.uniqueSuffix}`,
        siteName,
        location: faker.location.city(),
        enterpriseId,
        isActive: true
      },
      update: {
        siteName,
        location: faker.location.city()
      }
    });

    // Generate areas for each modality
    const areas = [];
    for (let i = 0; i < modalityNames.length; i++) {
      const modalityName = modalityNames[i];
      const modality = MANUFACTURING_MODALITIES[modalityName];

      const area = await this.generateManufacturingArea(site.id, modality, i);
      areas.push(area);
    }

    return { site, areas };
  }

  /**
   * Generate manufacturing area for specific modality
   */
  async generateManufacturingArea(siteId: string, modality: ManufacturingModality, areaIndex: number) {
    const areaCode = `${modality.code}${(areaIndex + 1).toString().padStart(2, '0')}`;

    const area = await this.prisma.area.upsert({
      where: { areaCode: `${areaCode}-${this.uniqueSuffix}` },
      create: {
        areaCode: `${areaCode}-${this.uniqueSuffix}`,
        areaName: `${modality.name} Production Area`,
        description: modality.description,
        siteId,
        isActive: true
      },
      update: {
        areaName: `${modality.name} Production Area`,
        description: modality.description
      }
    });

    // Generate work centers for this modality
    const workCenters = await this.generateWorkCenters(area.id, modality);

    // Generate equipment for each work center
    const equipment = [];
    for (const workCenter of workCenters) {
      const wcEquipment = await this.generateEquipment(workCenter.id, modality);
      equipment.push(...wcEquipment);
    }

    // Generate materials for this modality
    const materials = await this.generateMaterials(modality);

    // Generate parts and associated data
    const partsData = await this.generatePartsForModality(area.id, modality, materials);

    return {
      area,
      workCenters,
      equipment,
      materials,
      ...partsData
    };
  }

  /**
   * Generate work centers for modality
   */
  async generateWorkCenters(areaId: string, modality: ManufacturingModality) {
    const workCenters = [];

    for (let i = 0; i < modality.equipmentTypes.length; i++) {
      const equipmentType = modality.equipmentTypes[i];
      const workCenterName = `${modality.code} ${equipmentType.replace(/_/g, ' ')} ${i + 1}`;

      const workCenter = await this.prisma.workCenter.upsert({
        where: { name: `${workCenterName}-${this.uniqueSuffix}` },
        create: {
          name: `${workCenterName}-${this.uniqueSuffix}`,
          description: `${equipmentType.replace(/_/g, ' ').toLowerCase()} work center for ${modality.name.toLowerCase()}`,
          areaId,
          capacity: faker.number.int({ min: 1, max: 3 }),
          isActive: true
        },
        update: {
          description: `${equipmentType.replace(/_/g, ' ').toLowerCase()} work center for ${modality.name.toLowerCase()}`
        }
      });

      workCenters.push(workCenter);
    }

    return workCenters;
  }

  /**
   * Generate equipment for work center
   */
  async generateEquipment(workCenterId: string, modality: ManufacturingModality) {
    const equipment = [];
    const equipmentCount = faker.number.int({ min: 1, max: 2 });

    for (let i = 0; i < equipmentCount; i++) {
      const equipmentType = faker.helpers.arrayElement(modality.equipmentTypes);
      const metrics = this.generateEquipmentMetrics(equipmentType, `${modality.code}_WC`);

      const equipmentName = `${modality.code}-${equipmentType.replace(/_/g, '')}-${(i + 1).toString().padStart(2, '0')}`;

      const equipmentItem = await this.prisma.equipment.upsert({
        where: { equipmentNumber: `${equipmentName}-${this.uniqueSuffix}` },
        create: {
          equipmentNumber: `${equipmentName}-${this.uniqueSuffix}`,
          name: `${equipmentType.replace(/_/g, ' ')} Unit ${i + 1}`,
          description: `${equipmentType.replace(/_/g, ' ').toLowerCase()} for ${modality.name.toLowerCase()}`,
          equipmentClass: 'PRODUCTION',
          equipmentType: equipmentType,
          manufacturer: this.generateManufacturer(equipmentType),
          model: this.generateModel(equipmentType),
          serialNumber: faker.string.alphanumeric({ length: 10, casing: 'upper' }),
          installDate: faker.date.past({ years: 5 }),
          workCenterId,
          isActive: true,
          currentStatus: faker.helpers.arrayElement(['AVAILABLE', 'BUSY', 'MAINTENANCE']),
          // Add realistic OEE metrics
          utilizationTarget: metrics.oee,
          lastMaintenanceDate: faker.date.recent({ days: 30 })
        },
        update: {
          name: `${equipmentType.replace(/_/g, ' ')} Unit ${i + 1}`,
          description: `${equipmentType.replace(/_/g, ' ').toLowerCase()} for ${modality.name.toLowerCase()}`
        }
      });

      equipment.push(equipmentItem);
    }

    return equipment;
  }

  /**
   * Generate materials for modality
   */
  async generateMaterials(modality: ManufacturingModality) {
    const materials = [];

    for (let i = 0; i < modality.materialTypes.length; i++) {
      const materialType = modality.materialTypes[i];

      // Create material definition
      const materialDef = await this.prisma.materialDefinition.upsert({
        where: { materialCode: `${modality.code}-${materialType}-${this.uniqueSuffix}` },
        create: {
          materialCode: `${modality.code}-${materialType}-${this.uniqueSuffix}`,
          materialName: materialType.replace(/_/g, ' '),
          description: `${materialType.replace(/_/g, ' ').toLowerCase()} for ${modality.name.toLowerCase()}`,
          materialType: this.mapMaterialTypeToCategory(materialType),
          unitOfMeasure: this.getUnitOfMeasure(materialType),
          unitCost: faker.number.float({ min: 10, max: 1000, precision: 2 }),
          leadTimeDays: faker.number.int({ min: 7, max: 90 }),
          minimumOrderQty: faker.number.float({ min: 1, max: 100, precision: 1 }),
          isActive: true,
          isHazardous: this.isHazardousMaterial(materialType),
          shelfLifeDays: this.getShelfLife(materialType)
        },
        update: {
          materialName: materialType.replace(/_/g, ' '),
          description: `${materialType.replace(/_/g, ' ').toLowerCase()} for ${modality.name.toLowerCase()}`
        }
      });

      // Create initial inventory lots
      const lotCount = faker.number.int({ min: 2, max: 5 });
      for (let j = 0; j < lotCount; j++) {
        const lotNumber = this.generateLotNumber(materialDef.materialCode);
        const quantity = faker.number.float({ min: 50, max: 500, precision: 1 });

        const lot = await this.prisma.materialLot.upsert({
          where: { lotNumber: `${lotNumber}-${j}` },
          create: {
            lotNumber: `${lotNumber}-${j}`,
            materialDefinitionId: materialDef.id,
            quantity,
            unitOfMeasure: materialDef.unitOfMeasure,
            receivedDate: faker.date.recent({ days: 60 }),
            expirationDate: materialDef.shelfLifeDays ?
              faker.date.future({ days: materialDef.shelfLifeDays }) : null,
            supplierName: faker.company.name(),
            supplierLotNumber: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
            certificateNumber: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
            status: 'AVAILABLE',
            location: `${modality.code}-STOCK-${j + 1}`,
            unitCost: materialDef.unitCost * faker.number.float({ min: 0.9, max: 1.1, precision: 0.01 })
          },
          update: {
            quantity,
            status: 'AVAILABLE'
          }
        });

        materials.push({ definition: materialDef, lot });
      }
    }

    return materials;
  }

  /**
   * Generate parts and associated data for modality
   */
  async generatePartsForModality(areaId: string, modality: ManufacturingModality, materials: any[]) {
    const parts = [];
    const workOrders = [];
    const qualityPlans = [];
    const routings = [];

    for (const category of modality.partCategories) {
      for (let i = 0; i < category.partCount; i++) {
        const partNumber = this.generatePartNumber(
          Object.keys(MANUFACTURING_MODALITIES).find(k => MANUFACTURING_MODALITIES[k] === modality)!,
          category.name,
          i + 1
        );

        // Create part
        const part = await this.prisma.part.upsert({
          where: { partNumber: `${partNumber}-${this.uniqueSuffix}` },
          create: {
            partNumber: `${partNumber}-${this.uniqueSuffix}`,
            partName: `${category.name} ${i + 1}`,
            description: `${category.name.toLowerCase()} component for ${modality.name.toLowerCase()}`,
            partType: this.mapCategoryToPartType(category.name),
            productType: 'MADE_TO_ORDER',
            unitOfMeasure: 'EACH',
            unitCost: faker.number.float({ min: 100, max: 5000, precision: 2 }),
            leadTimeDays: faker.number.int({ min: 7, max: 60 }),
            isActive: true,
            complexity: category.complexity,
            criticality: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
          },
          update: {
            partName: `${category.name} ${i + 1}`,
            description: `${category.name.toLowerCase()} component for ${modality.name.toLowerCase()}`
          }
        });

        // Create routing for part
        const routing = await this.generateRouting(part.id, modality, category);
        routings.push(routing);

        // Create quality plan
        const qualityPlan = await this.generateQualityPlan(part.id, modality, category);
        qualityPlans.push(qualityPlan);

        // Create work orders for part
        const partWorkOrders = await this.generateWorkOrders(part.id, routing.id, category);
        workOrders.push(...partWorkOrders);

        parts.push(part);
      }
    }

    return { parts, workOrders, qualityPlans, routings };
  }

  /**
   * Generate routing for part
   */
  async generateRouting(partId: string, modality: ManufacturingModality, category: any) {
    const routingNumber = `RT-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`;

    const routing = await this.prisma.routing.upsert({
      where: { routingNumber: `${routingNumber}-${this.uniqueSuffix}` },
      create: {
        routingNumber: `${routingNumber}-${this.uniqueSuffix}`,
        description: `${category.name} routing for ${modality.name}`,
        routingType: 'PRIMARY',
        version: '1.0',
        effectiveDate: faker.date.past({ years: 1 }),
        isActive: true,
        partId
      },
      update: {
        description: `${category.name} routing for ${modality.name}`
      }
    });

    // Create routing operations
    for (let i = 0; i < category.operationTypes.length; i++) {
      const operationType = category.operationTypes[i];

      await this.prisma.routingOperation.upsert({
        where: {
          routingId_operationSequence: {
            routingId: routing.id,
            operationSequence: (i + 1) * 10
          }
        },
        create: {
          routingId: routing.id,
          operationSequence: (i + 1) * 10,
          operationCode: `OP${(i + 1).toString().padStart(2, '0')}`,
          description: operationType.replace(/_/g, ' ').toLowerCase(),
          operationType: operationType,
          setupTime: faker.number.float({ min: 0.25, max: 2, precision: 0.25 }),
          runTime: faker.number.float({ min: 0.5, max: 8, precision: 0.25 }),
          teardownTime: faker.number.float({ min: 0.1, max: 0.5, precision: 0.1 }),
          isActive: true
        },
        update: {
          description: operationType.replace(/_/g, ' ').toLowerCase()
        }
      });
    }

    return routing;
  }

  /**
   * Generate quality plan for part
   */
  async generateQualityPlan(partId: string, modality: ManufacturingModality, category: any) {
    const planNumber = `QP-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`;

    const qualityPlan = await this.prisma.qualityPlan.upsert({
      where: { planNumber: `${planNumber}-${this.uniqueSuffix}` },
      create: {
        planNumber: `${planNumber}-${this.uniqueSuffix}`,
        planName: `${category.name} Quality Plan`,
        description: `Quality control plan for ${category.name.toLowerCase()}`,
        planType: 'INSPECTION',
        version: '1.0',
        effectiveDate: faker.date.past({ years: 1 }),
        isActive: true,
        partId
      },
      update: {
        planName: `${category.name} Quality Plan`,
        description: `Quality control plan for ${category.name.toLowerCase()}`
      }
    });

    // Create quality characteristics based on modality requirements
    for (let i = 0; i < modality.qualityRequirements.length; i++) {
      const requirement = modality.qualityRequirements[i];

      await this.prisma.qualityCharacteristic.upsert({
        where: {
          qualityPlanId_characteristicSequence: {
            qualityPlanId: qualityPlan.id,
            characteristicSequence: (i + 1) * 10
          }
        },
        create: {
          qualityPlanId: qualityPlan.id,
          characteristicSequence: (i + 1) * 10,
          characteristic: requirement.replace(/_/g, ' '),
          measurementType: 'DIMENSIONAL',
          specification: this.generateSpecification(requirement),
          tolerance: faker.number.float({ min: 0.001, max: 0.1, precision: 0.001 }),
          unit: this.getSpecificationUnit(requirement),
          isRequired: true,
          sampleSize: faker.number.int({ min: 1, max: 5 }),
          frequency: faker.helpers.arrayElement(['FIRST_PIECE', 'EVERY_PIECE', 'SAMPLE', 'SETUP'])
        },
        update: {
          characteristic: requirement.replace(/_/g, ' ')
        }
      });
    }

    return qualityPlan;
  }

  /**
   * Generate work orders for part
   */
  async generateWorkOrders(partId: string, routingId: string, category: any) {
    const workOrders = [];
    const currentYear = new Date().getFullYear();
    let sequenceNumber = faker.number.int({ min: 1000, max: 9999 });

    // Generate historic work orders
    for (let i = 0; i < category.workOrdersPerPart.historic; i++) {
      const workOrder = await this.generateWorkOrder(
        partId,
        routingId,
        currentYear - 1,
        sequenceNumber++,
        'COMPLETED'
      );
      workOrders.push(workOrder);
    }

    // Generate active work orders
    for (let i = 0; i < category.workOrdersPerPart.active; i++) {
      const status = faker.helpers.arrayElement(['RELEASED', 'IN_PROGRESS']);
      const workOrder = await this.generateWorkOrder(
        partId,
        routingId,
        currentYear,
        sequenceNumber++,
        status
      );
      workOrders.push(workOrder);
    }

    // Generate planned work orders
    for (let i = 0; i < category.workOrdersPerPart.planned; i++) {
      const workOrder = await this.generateWorkOrder(
        partId,
        routingId,
        currentYear,
        sequenceNumber++,
        'CREATED'
      );
      workOrders.push(workOrder);
    }

    return workOrders;
  }

  /**
   * Generate individual work order
   */
  async generateWorkOrder(partId: string, routingId: string, year: number, sequence: number, status: string) {
    const workOrderNumber = this.generateWorkOrderNumber(year, sequence);

    const workOrder = await this.prisma.workOrder.upsert({
      where: { workOrderNumber: `${workOrderNumber}-${this.uniqueSuffix}` },
      create: {
        workOrderNumber: `${workOrderNumber}-${this.uniqueSuffix}`,
        partId,
        routingId,
        orderQuantity: faker.number.int({ min: 1, max: 100 }),
        orderType: faker.helpers.arrayElement(['PRODUCTION', 'REWORK', 'PROTOTYPE']),
        priority: faker.helpers.arrayElement(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
        status,
        plannedStartDate: status === 'CREATED' ?
          faker.date.future({ days: 30 }) :
          faker.date.past({ days: status === 'COMPLETED' ? 90 : 30 }),
        plannedEndDate: status === 'CREATED' ?
          faker.date.future({ days: 60 }) :
          faker.date.past({ days: status === 'COMPLETED' ? 60 : 0 }),
        actualStartDate: status !== 'CREATED' ?
          faker.date.past({ days: status === 'COMPLETED' ? 90 : 30 }) : null,
        actualEndDate: status === 'COMPLETED' ?
          faker.date.past({ days: 60 }) : null,
        description: `Production order for ${status.toLowerCase()} manufacturing`
      },
      update: {
        status,
        description: `Production order for ${status.toLowerCase()} manufacturing`
      }
    });

    return workOrder;
  }

  // Utility mapping functions
  private mapEquipmentTypeToWorkCenterType(equipmentType: string): string {
    const mapping = {
      'CNC_MACHINE': 'MACHINING',
      'ASSEMBLY_STATION': 'ASSEMBLY',
      'TEST_STATION': 'TESTING',
      'WELDING_STATION': 'WELDING',
      'ADDITIVE_PRINTER': 'ADDITIVE',
      'AUTOCLAVE': 'HEAT_TREATMENT',
      'GRINDER': 'FINISHING'
    };
    return mapping[equipmentType] || 'PRODUCTION';
  }

  private mapMaterialTypeToCategory(materialType: string): string {
    if (materialType.includes('POWDER') || materialType.includes('RESIN')) return 'RAW_MATERIAL';
    if (materialType.includes('FIBER') || materialType.includes('FABRIC')) return 'RAW_MATERIAL';
    if (materialType.includes('COATING') || materialType.includes('TREATMENT')) return 'CONSUMABLE';
    return 'RAW_MATERIAL';
  }

  private mapCategoryToPartType(categoryName: string): string {
    if (categoryName.toLowerCase().includes('assembly')) return 'ASSEMBLY';
    if (categoryName.toLowerCase().includes('component')) return 'COMPONENT';
    return 'PART';
  }

  private getUnitOfMeasure(materialType: string): string {
    if (materialType.includes('POWDER')) return 'KG';
    if (materialType.includes('RESIN') || materialType.includes('FLUID')) return 'L';
    if (materialType.includes('SHEET') || materialType.includes('FABRIC')) return 'SQM';
    if (materialType.includes('TUBE') || materialType.includes('BAR')) return 'M';
    return 'KG';
  }

  private isHazardousMaterial(materialType: string): boolean {
    return materialType.includes('RESIN') || materialType.includes('SOLVENT') ||
           materialType.includes('COATING') || materialType.includes('CHEMICAL');
  }

  private getShelfLife(materialType: string): number | null {
    if (materialType.includes('RESIN')) return 365;
    if (materialType.includes('ADHESIVE')) return 180;
    if (materialType.includes('COATING')) return 730;
    return null;
  }

  private generateManufacturer(equipmentType: string): string {
    const manufacturers = {
      'CNC_MACHINE': ['Haas', 'Mazak', 'DMG Mori', 'Okuma'],
      'ADDITIVE_PRINTER': ['Stratasys', 'EOS', 'SLM Solutions', '3D Systems'],
      'WELDING_STATION': ['Lincoln Electric', 'Miller', 'ESAB', 'Fronius'],
      'AUTOCLAVE': ['Scholz', 'ASC Process Systems', 'Thermal Equipment Corp'],
      'TEST_STATION': ['MTS', 'Instron', 'Shimadzu', 'Zwick']
    };

    const mfgList = manufacturers[equipmentType] || ['Generic Manufacturing Inc.'];
    return faker.helpers.arrayElement(mfgList);
  }

  private generateModel(equipmentType: string): string {
    const prefix = equipmentType.replace(/_/g, '').substring(0, 3).toUpperCase();
    const suffix = faker.string.alphanumeric({ length: 4, casing: 'upper' });
    return `${prefix}-${suffix}`;
  }

  private generateSpecification(requirement: string): string {
    const specs = {
      'DIMENSIONAL_ACCURACY': '±0.025mm',
      'SURFACE_FINISH': 'Ra 1.6μm',
      'DENSITY_CHECK': '≥99%',
      'LAYER_ADHESION': '≥50 MPa',
      'FIBER_ORIENTATION': '±5°',
      'VOID_CONTENT': '≤2%',
      'AIRFOIL_PROFILE': '±0.013mm',
      'COATING_THICKNESS': '0.25±0.05mm'
    };
    return specs[requirement] || '±0.1mm';
  }

  private getSpecificationUnit(requirement: string): string {
    if (requirement.includes('THICKNESS') || requirement.includes('ACCURACY')) return 'MM';
    if (requirement.includes('FINISH')) return 'UM';
    if (requirement.includes('ANGLE') || requirement.includes('ORIENTATION')) return 'DEG';
    if (requirement.includes('DENSITY') || requirement.includes('CONTENT')) return 'PCT';
    return 'MM';
  }
}