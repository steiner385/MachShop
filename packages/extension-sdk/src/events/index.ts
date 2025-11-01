/**
 * Extension Event & Hook System Module
 *
 * Comprehensive event bus and hook system for extensions with:
 * - Event publishing and subscription
 * - Hook registration and execution
 * - Dependency management
 * - Cross-extension communication
 * - Metrics and audit logging
 */

export { EventBus, createEventBus } from './event-bus';
export {
  HookDependencyResolver,
  HookBuilder,
  HookLifecycleManager,
  HookTypeDefinitions,
} from './hook-manager';

export type {
  HookType,
  EventPriority,
  EventStage,
  Hook,
  HookContext,
  HookExecutionResult,
  HookRegistrationRequest,
  HookRegistrationResponse,
  Event,
  CrossExtensionRequest,
  CrossExtensionResponse,
  HookExecutionMetrics,
  HookAuditLogEntry,
  CelCondition,
  IEventBus,
} from './types';

export { HookType, EventPriority, EventStage } from './types';

/**
 * Initialize the extension event & hook system
 *
 * @example
 * ```typescript
 * import { createEventBus } from '@machshop/extension-sdk/events';
 *
 * const eventBus = createEventBus();
 *
 * // Register hooks
 * const response = await eventBus.registerHooks({
 *   extensionId: 'my-extension',
 *   version: '1.0.0',
 *   hooks: [
 *     {
 *       type: HookType.VALIDATION,
 *       event: 'data:validate',
 *       stage: EventStage.PRE,
 *       priority: EventPriority.HIGH,
 *       handler: async (context) => {
 *         // Validate data
 *       },
 *       permissions: [
 *         { permission: 'data:validate', required: true }
 *       ],
 *       timeout: 5000,
 *     }
 *   ]
 * });
 *
 * // Publish events
 * await eventBus.publish({
 *   name: 'data:validate',
 *   data: { field: 'value' },
 *   source: 'core',
 *   timestamp: new Date(),
 * });
 *
 * // Send cross-extension request
 * const result = await eventBus.sendRequest({
 *   requesterId: 'ext1',
 *   targetId: 'ext2',
 *   event: 'custom:action',
 *   payload: { action: 'process' },
 * });
 *
 * // Get metrics
 * const metrics = eventBus.getHookMetrics(hookId);
 * ```
 */
