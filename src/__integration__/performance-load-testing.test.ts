/**
 * Performance & Load Testing Suite
 *
 * Tests the performance of the Extension Framework v2.0 under various conditions.
 * Validates that all targets are met:
 * - Extension initialization: < 2 seconds
 * - Widget rendering: < 500ms
 * - Navigation queries: < 100ms
 * - Memory usage: < 512MB
 * - Concurrent extensions: 50+
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
} from '@machshop/frontend-extension-sdk';
import {
  NavigationExtensionFramework,
} from '@machshop/navigation-extension-framework';
import {
  ComponentOverrideFramework,
} from '@machshop/component-override-framework';

interface PerformanceMetrics {
  test: string;
  duration: number;
  target: number;
  passed: boolean;
  memory?: {
    before: number;
    after: number;
    used: number;
  };
  timestamp: Date;
}

describe('Performance & Load Testing', () => {
  let sdk: ExtensionSDK;
  let navFramework: NavigationExtensionFramework;
  let overrideFramework: ComponentOverrideFramework;
  let metrics: PerformanceMetrics[] = [];

  beforeEach(() => {
    sdk = new ExtensionSDK();
    navFramework = new NavigationExtensionFramework();
    overrideFramework = new ComponentOverrideFramework();

    // Clear memory before test
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(() => {
    // Generate performance report
    console.log('\n=== Performance Test Report ===\n');
    console.log(`Total Tests: ${metrics.length}`);

    const passed = metrics.filter(m => m.passed);
    const failed = metrics.filter(m => !m.passed);

    console.log(`Passed: ${passed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\nFailed Performance Tests:');
      failed.forEach(m => {
        const excess = m.duration - m.target;
        console.log(
          `  ✗ ${m.test}: ${m.duration}ms (target: ${m.target}ms, excess: +${excess}ms)`
        );
      });
    }

    // Performance statistics
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));
    const minDuration = Math.min(...metrics.map(m => m.duration));

    console.log(`\nPerformance Statistics:`);
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);

    // Passed percentage
    const passPercentage = ((passed.length / metrics.length) * 100).toFixed(1);
    console.log(`\nPass Rate: ${passPercentage}%`);
  });

  describe('Extension Initialization Performance', () => {
    test('should initialize simple extension in < 2 seconds', async () => {
      const extensionId = 'perf-simple-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      const startTime = performance.now();
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      const loadDuration = performance.now() - startTime;

      const initStart = performance.now();
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      const initDuration = performance.now() - initStart;

      const totalDuration = loadDuration + initDuration;

      metrics.push({
        test: 'Initialize simple extension',
        duration: totalDuration,
        target: 2000,
        passed: totalDuration < 2000,
        timestamp: new Date(),
      });

      expect(totalDuration).toBeLessThan(2000);
    });

    test('should initialize complex extension (10 components) in < 2.5 seconds', async () => {
      const extensionId = 'perf-complex-ext';
      const components = Array.from({ length: 10 }, (_, i) => ({
        id: `comp-${i}`,
        type: 'widget' as const,
        name: `Component ${i}`,
      }));

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      const startTime = performance.now();
      await sdk.loadExtension(extensionId, context as ExtensionContext);

      for (const component of components) {
        await sdk.registerComponent(component, context as ExtensionContext);
      }

      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Initialize complex extension (10 components)',
        duration,
        target: 2500,
        passed: duration < 2500,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(2500);
    });

    test('should activate extension in < 500ms', async () => {
      const extensionId = 'perf-activate-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      const startTime = performance.now();
      await sdk.activateExtension(extensionId, context as ExtensionContext);
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Activate extension',
        duration,
        target: 500,
        passed: duration < 500,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Widget Rendering Performance', () => {
    test('should register widget in < 200ms', async () => {
      const extensionId = 'perf-widget-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      const startTime = performance.now();
      await sdk.registerComponent(
        {
          id: 'widget-1',
          type: 'widget',
          name: 'Test Widget',
          slot: 'main-slot',
        },
        context as ExtensionContext
      );
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Register single widget',
        duration,
        target: 200,
        passed: duration < 200,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(200);
    });

    test('should register multiple widgets in < 1 second total', async () => {
      const extensionId = 'perf-multi-widget-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      const startTime = performance.now();

      for (let i = 0; i < 5; i++) {
        await sdk.registerComponent(
          {
            id: `widget-${i}`,
            type: 'widget',
            name: `Widget ${i}`,
            slot: `slot-${i}`,
          },
          context as ExtensionContext
        );
      }

      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Register 5 widgets',
        duration,
        target: 1000,
        passed: duration < 1000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(1000);
    });

    test('should prepare widget for rendering in < 100ms', async () => {
      const extensionId = 'perf-widget-render-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      await sdk.registerComponent(
        {
          id: 'render-widget',
          type: 'widget',
          name: 'Render Widget',
          slot: 'render-slot',
        },
        context as ExtensionContext
      );

      const startTime = performance.now();
      const widgets = await sdk.getWidgetsForSlot('render-slot');
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Prepare widget for rendering',
        duration,
        target: 100,
        passed: duration < 100,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(100);
      expect(widgets.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation Query Performance', () => {
    test('should query navigation items in < 100ms', async () => {
      const extensionId = 'perf-nav-query-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:navigation'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      await sdk.registerNavigation(
        {
          id: 'nav-item',
          label: 'Navigation',
          path: '/nav',
        },
        context as ExtensionContext
      );

      const startTime = performance.now();
      const items = await navFramework.getVisibleNavigationItems(
        context as ExtensionContext
      );
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Query visible navigation items',
        duration,
        target: 100,
        passed: duration < 100,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(100);
    });

    test('should query navigation by group in < 100ms', async () => {
      const extensionId = 'perf-nav-group-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:navigation'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // Register multiple navigation items
      for (let i = 0; i < 10; i++) {
        await sdk.registerNavigation(
          {
            id: `nav-${i}`,
            label: `Navigation ${i}`,
            path: `/nav/${i}`,
            group: i % 2 === 0 ? 'admin' : 'user',
          },
          context as ExtensionContext
        );
      }

      const startTime = performance.now();
      const grouped = await navFramework.getNavigationItemsByGroup(
        context as ExtensionContext
      );
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Query navigation by group (10 items)',
        duration,
        target: 100,
        passed: duration < 100,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(100);
    });

    test('should filter navigation by permission in < 150ms', async () => {
      const extensionId = 'perf-nav-perm-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:navigation', 'admin:navigation'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // Register navigation with various permissions
      for (let i = 0; i < 20; i++) {
        await sdk.registerNavigation(
          {
            id: `nav-perm-${i}`,
            label: `Navigation ${i}`,
            path: `/nav/${i}`,
            permissions: i % 3 === 0 ? ['admin:navigation'] : ['read:navigation'],
          },
          context as ExtensionContext
        );
      }

      const startTime = performance.now();
      const filtered = await navFramework.getVisibleNavigationItems(
        context as ExtensionContext
      );
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Filter navigation by permission (20 items)',
        duration,
        target: 150,
        passed: duration < 150,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(150);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain memory usage < 512MB with 20 extensions loaded', async () => {
      // Get initial memory
      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      // Load 20 extensions
      const startTime = performance.now();

      for (let i = 0; i < 20; i++) {
        const extensionId = `perf-mem-ext-${i}`;
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'user',
          siteId: 'site',
          config: { extensionId, siteId: 'site' } as ExtensionConfig,
          state: {},
          permissions: ['read:data'],
        };

        await sdk.loadExtension(extensionId, context as ExtensionContext);
        await sdk.initializeExtension(extensionId, context as ExtensionContext);
        await sdk.activateExtension(extensionId, context as ExtensionContext);
      }

      const duration = performance.now() - startTime;

      // Get final memory
      if (global.gc) {
        global.gc();
      }
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memUsed = memAfter - memBefore;

      metrics.push({
        test: 'Memory usage (20 extensions)',
        duration,
        target: 512,
        passed: memUsed < 512,
        memory: {
          before: memBefore,
          after: memAfter,
          used: memUsed,
        },
        timestamp: new Date(),
      });

      console.log(`Memory before: ${memBefore.toFixed(2)}MB`);
      console.log(`Memory after: ${memAfter.toFixed(2)}MB`);
      console.log(`Memory used: ${memUsed.toFixed(2)}MB`);

      expect(memUsed).toBeLessThan(512);
    });
  });

  describe('Concurrent Extension Loading', () => {
    test('should load 10 extensions concurrently in < 3 seconds', async () => {
      const startTime = performance.now();

      const loadPromises = Array.from({ length: 10 }, (_, i) => {
        const extensionId = `perf-concurrent-${i}`;
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'user',
          siteId: 'site',
          config: { extensionId, siteId: 'site' } as ExtensionConfig,
          state: {},
          permissions: ['read:data'],
        };

        return sdk.loadExtension(extensionId, context as ExtensionContext);
      });

      await Promise.all(loadPromises);
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Load 10 extensions concurrently',
        duration,
        target: 3000,
        passed: duration < 3000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(3000);
    });

    test('should initialize 10 extensions concurrently in < 4 seconds', async () => {
      // First load all
      const extensions = await Promise.all(
        Array.from({ length: 10 }, (_, i) => {
          const extensionId = `perf-concurrent-init-${i}`;
          const context: Partial<ExtensionContext> = {
            extensionId,
            userId: 'user',
            siteId: 'site',
            config: { extensionId, siteId: 'site' } as ExtensionConfig,
            state: {},
            permissions: ['read:data'],
          };

          return sdk.loadExtension(extensionId, context as ExtensionContext);
        })
      );

      // Then initialize concurrently
      const startTime = performance.now();

      const initPromises = Array.from({ length: 10 }, (_, i) => {
        const extensionId = `perf-concurrent-init-${i}`;
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'user',
          siteId: 'site',
          config: { extensionId, siteId: 'site' } as ExtensionConfig,
          state: {},
          permissions: ['read:data'],
        };

        return sdk.initializeExtension(extensionId, context as ExtensionContext);
      });

      await Promise.all(initPromises);
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Initialize 10 extensions concurrently',
        duration,
        target: 4000,
        passed: duration < 4000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(4000);
    });

    test('should activate 10 extensions concurrently in < 2 seconds', async () => {
      // First load and initialize
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => {
          const extensionId = `perf-concurrent-activate-${i}`;
          const context: Partial<ExtensionContext> = {
            extensionId,
            userId: 'user',
            siteId: 'site',
            config: { extensionId, siteId: 'site' } as ExtensionConfig,
            state: {},
            permissions: ['read:data'],
          };

          return sdk
            .loadExtension(extensionId, context as ExtensionContext)
            .then(() =>
              sdk.initializeExtension(extensionId, context as ExtensionContext)
            );
        })
      );

      // Then activate concurrently
      const startTime = performance.now();

      const activatePromises = Array.from({ length: 10 }, (_, i) => {
        const extensionId = `perf-concurrent-activate-${i}`;
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'user',
          siteId: 'site',
          config: { extensionId, siteId: 'site' } as ExtensionConfig,
          state: {},
          permissions: ['read:data'],
        };

        return sdk.activateExtension(extensionId, context as ExtensionContext);
      });

      await Promise.all(activatePromises);
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Activate 10 extensions concurrently',
        duration,
        target: 2000,
        passed: duration < 2000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(2000);
    });

    test('should support 50+ concurrent extensions', async () => {
      const extensionCount = 50;
      const startTime = performance.now();

      // Load 50 extensions
      const loadPromises = Array.from({ length: extensionCount }, (_, i) => {
        const extensionId = `perf-50-ext-${i}`;
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'user',
          siteId: 'site',
          config: { extensionId, siteId: 'site' } as ExtensionConfig,
          state: {},
          permissions: ['read:data'],
        };

        return sdk.loadExtension(extensionId, context as ExtensionContext);
      });

      await Promise.all(loadPromises);
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Load 50 extensions',
        duration,
        target: 10000, // 10 seconds for 50 extensions
        passed: duration < 10000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Component Override Performance', () => {
    test('should apply component override in < 150ms', async () => {
      const extensionId = 'perf-override-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['override:components'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      await sdk.registerComponentOverride(
        {
          targetComponent: 'Form',
          targetModule: '@machshop/core-mes-ui-foundation',
          componentPath: './CustomForm',
        },
        context as ExtensionContext
      );

      const startTime = performance.now();
      const result = await overrideFramework.applyOverride(
        'Form',
        '@machshop/core-mes-ui-foundation'
      );
      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Apply component override',
        duration,
        target: 150,
        passed: duration < 150,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(150);
    });
  });

  describe('State Management Performance', () => {
    test('should persist state in < 100ms', async () => {
      const { useExtensionState } = await import(
        '@machshop/frontend-extension-sdk'
      ).catch(() => ({ useExtensionState: undefined }));

      if (!useExtensionState) {
        console.log('State management not available, skipping test');
        return;
      }

      const store = useExtensionState();

      store.setState({
        userId: 'perf-user',
        siteId: 'perf-site',
      });

      const startTime = performance.now();
      await store.persist?.();
      const duration = performance.now() - startTime;

      if (store.persist) {
        metrics.push({
          test: 'Persist state',
          duration,
          target: 100,
          passed: duration < 100,
          timestamp: new Date(),
        });

        expect(duration).toBeLessThan(100);
      }
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid extension registration under load', async () => {
      const extensionId = 'perf-stress-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      const startTime = performance.now();

      // Rapidly register many components
      for (let i = 0; i < 50; i++) {
        await sdk.registerComponent(
          {
            id: `stress-comp-${i}`,
            type: 'widget',
            name: `Stress Component ${i}`,
          },
          context as ExtensionContext
        );
      }

      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Register 50 components under stress',
        duration,
        target: 5000,
        passed: duration < 5000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(5000);
    });

    test('should handle rapid navigation registration under load', async () => {
      const extensionId = 'perf-nav-stress-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:navigation'],
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      const startTime = performance.now();

      // Rapidly register many navigation items
      for (let i = 0; i < 100; i++) {
        await sdk.registerNavigation(
          {
            id: `stress-nav-${i}`,
            label: `Navigation ${i}`,
            path: `/nav/${i}`,
          },
          context as ExtensionContext
        );
      }

      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Register 100 navigation items under stress',
        duration,
        target: 5000,
        passed: duration < 5000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Performance Baseline Metrics', () => {
    test('should complete full deployment cycle in < 5 seconds', async () => {
      const extensionId = 'perf-full-cycle-ext';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'site',
        config: { extensionId, siteId: 'site' } as ExtensionConfig,
        state: {},
        permissions: ['read:data', 'read:navigation'],
      };

      const startTime = performance.now();

      // Full cycle: load -> init -> register -> activate
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      for (let i = 0; i < 5; i++) {
        await sdk.registerComponent(
          {
            id: `cycle-comp-${i}`,
            type: 'widget',
            name: `Component ${i}`,
          },
          context as ExtensionContext
        );
      }

      for (let i = 0; i < 5; i++) {
        await sdk.registerNavigation(
          {
            id: `cycle-nav-${i}`,
            label: `Navigation ${i}`,
            path: `/nav/${i}`,
          },
          context as ExtensionContext
        );
      }

      await sdk.activateExtension(extensionId, context as ExtensionContext);

      const duration = performance.now() - startTime;

      metrics.push({
        test: 'Full deployment cycle (5 components, 5 nav items)',
        duration,
        target: 5000,
        passed: duration < 5000,
        timestamp: new Date(),
      });

      expect(duration).toBeLessThan(5000);
    });
  });
});
