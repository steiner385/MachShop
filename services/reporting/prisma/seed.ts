/**
 * Reporting Service Seed Script
 * Populates reporting database with KPIs, dashboards, and metrics
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-reporting';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Reporting Service database...');

  // 1. Create KPI Definitions
  const kpiOEE = await prisma.kPIDefinition.upsert({
    where: { kpiCode: 'OEE' },
    update: {},
    create: {
      kpiCode: 'OEE',
      kpiName: 'Overall Equipment Effectiveness',
      description: 'Measures manufacturing productivity: Availability × Performance × Quality',
      category: 'PRODUCTION',
      calculationFormula: '(Availability * Performance * Quality) * 100',
      dataSource: 'WorkOrder + Equipment services',
      aggregationType: 'PERCENTAGE',
      targetValue: 85.0,
      warningThreshold: 75.0,
      criticalThreshold: 65.0,
      unit: '%',
      isPercentage: true,
      displayFormat: '0.0',
      chartType: 'GAUGE',
      isActive: true,
    },
  });

  const kpiFPY = await prisma.kPIDefinition.upsert({
    where: { kpiCode: 'FPY' },
    update: {},
    create: {
      kpiCode: 'FPY',
      kpiName: 'First Pass Yield',
      description: 'Percentage of parts that pass inspection on first attempt',
      category: 'QUALITY',
      calculationFormula: '(PassCount / InspectionCount) * 100',
      dataSource: 'Quality service inspections',
      aggregationType: 'PERCENTAGE',
      targetValue: 98.0,
      warningThreshold: 95.0,
      criticalThreshold: 90.0,
      unit: '%',
      isPercentage: true,
      displayFormat: '0.00',
      chartType: 'TREND',
      isActive: true,
    },
  });

  console.log(`✅ Created ${2} KPI definitions`);

  // 2. Create KPI Calculations
  await prisma.kPICalculation.create({
    data: {
      kpiDefinitionId: kpiOEE.id,
      periodType: 'DAILY',
      periodStart: new Date('2025-10-17T00:00:00Z'),
      periodEnd: new Date('2025-10-18T00:00:00Z'),
      value: 82.5,
      previousValue: 79.3,
      targetValue: 85.0,
      trendDirection: 'UP',
      percentChange: 4.0,
      siteId: 'site-plant-001',
      siteName: 'Main Manufacturing Plant',
      dataPointCount: 24,
    },
  });

  await prisma.kPICalculation.create({
    data: {
      kpiDefinitionId: kpiFPY.id,
      periodType: 'DAILY',
      periodStart: new Date('2025-10-17T00:00:00Z'),
      periodEnd: new Date('2025-10-18T00:00:00Z'),
      value: 97.0,
      previousValue: 96.5,
      targetValue: 98.0,
      trendDirection: 'UP',
      percentChange: 0.5,
      siteId: 'site-plant-001',
      siteName: 'Main Manufacturing Plant',
      dataPointCount: 75,
    },
  });

  console.log(`✅ Created ${2} KPI calculations`);

  // 3. Create Dashboard
  const dashboardProd = await prisma.dashboard.upsert({
    where: { dashboardCode: 'PROD-OVERVIEW' },
    update: {},
    create: {
      dashboardCode: 'PROD-OVERVIEW',
      dashboardName: 'Production Overview',
      description: 'Real-time production metrics and KPIs',
      category: 'PRODUCTION',
      isPublic: true,
      allowedRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
      layoutConfig: {
        columns: 12,
        rows: 6,
      },
      refreshInterval: 30,
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} dashboard`);

  // 4. Create Dashboard Widgets
  await prisma.dashboardWidget.create({
    data: {
      dashboardId: dashboardProd.id,
      widgetName: 'OEE Gauge',
      widgetType: 'KPI_GAUGE',
      kpiDefinitionId: kpiOEE.id,
      positionX: 0,
      positionY: 0,
      width: 3,
      height: 2,
      displayConfig: {
        showTarget: true,
        showTrend: true,
        thresholds: [
          { value: 65, color: 'red' },
          { value: 75, color: 'yellow' },
          { value: 85, color: 'green' },
        ],
      },
      timeRangeType: 'LAST_24_HOURS',
      isActive: true,
    },
  });

  await prisma.dashboardWidget.create({
    data: {
      dashboardId: dashboardProd.id,
      widgetName: 'First Pass Yield Trend',
      widgetType: 'KPI_TREND',
      kpiDefinitionId: kpiFPY.id,
      positionX: 3,
      positionY: 0,
      width: 6,
      height: 2,
      displayConfig: {
        chartType: 'line',
        showPoints: true,
        interpolation: 'smooth',
      },
      timeRangeType: 'LAST_7_DAYS',
      isActive: true,
    },
  });

  console.log(`✅ Created ${2} dashboard widgets`);

  // 5. Create Report Template
  const reportTemplate = await prisma.reportTemplate.upsert({
    where: { reportCode: 'DAILY-PROD-RPT' },
    update: {},
    create: {
      reportCode: 'DAILY-PROD-RPT',
      reportName: 'Daily Production Report',
      description: 'Summary of daily production metrics',
      category: 'PRODUCTION',
      reportType: 'SUMMARY',
      dataQuery: 'SELECT * FROM production_metrics WHERE metric_date = ?',
      parameters: {
        fields: [
          { name: 'date', type: 'date', required: true },
          { name: 'siteId', type: 'string', required: false },
        ],
      },
      outputFormats: ['PDF', 'EXCEL'],
      templateConfig: {
        header: 'Daily Production Report',
        footer: 'Page {page} of {totalPages}',
        sections: ['summary', 'details', 'trends'],
      },
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} report template`);

  // 6. Create Production Metrics
  await prisma.productionMetric.create({
    data: {
      metricDate: new Date('2025-10-17'),
      shift: 'DAY',
      siteId: 'site-plant-001',
      siteName: 'Main Manufacturing Plant',
      workCenterId: 'wc-mill-01',
      workCenterName: '3-Axis CNC Mill #1',
      productId: 'prod-brk-001',
      productName: 'Machined Aluminum Bracket',
      plannedProduction: 100,
      actualProduction: 95,
      scrapCount: 3,
      reworkCount: 2,
      onTimeCompletion: 90,
      lateCompletion: 5,
      availableTime: 480,
      plannedDowntime: 30,
      unplannedDowntime: 15,
      setupTime: 20,
      runTime: 415,
      idleTime: 0,
      availability: 91.1,
      performance: 92.3,
      quality: 96.8,
      oee: 81.3,
      laborHoursPlanned: 8.0,
      laborHoursActual: 8.5,
      laborEfficiency: 94.1,
    },
  });

  console.log(`✅ Created ${1} production metric`);

  // 7. Create Alert Rule
  const alertRule = await prisma.alertRule.create({
    data: {
      ruleName: 'Low OEE Alert',
      description: 'Alert when OEE drops below critical threshold',
      category: 'PRODUCTION',
      kpiDefinitionId: kpiOEE.id,
      condition: 'value < 65',
      severity: 'CRITICAL',
      notifyEmails: ['supervisor@machshop.com'],
      notifyUserIds: ['supervisor-user-id'],
      notifyChannels: ['EMAIL'],
      cooldownMinutes: 60,
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} alert rule`);

  console.log('\n📊 Seed Summary:');
  const kpiDefCount = await prisma.kPIDefinition.count();
  const kpiCalcCount = await prisma.kPICalculation.count();
  const dashboardCount = await prisma.dashboard.count();
  const reportCount = await prisma.reportTemplate.count();
  const metricCount = await prisma.productionMetric.count();

  console.log(`  - KPI Definitions: ${kpiDefCount}`);
  console.log(`  - KPI Calculations: ${kpiCalcCount}`);
  console.log(`  - Dashboards: ${dashboardCount}`);
  console.log(`  - Report Templates: ${reportCount}`);
  console.log(`  - Production Metrics: ${metricCount}`);
  console.log('\n✅ Reporting Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
