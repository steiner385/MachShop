/**
 * Action Executor
 * Executes different types of actions from rules
 */

import {
  Action,
  ActionType,
  ExecutionStatus,
  RuleExecutionContext,
  ActionResult,
  NotificationAction,
  RecordAction,
  WorkflowAction,
  APIAction,
  QualityHoldAction,
  EscalationAction,
  WaitAction,
} from '../types';

/**
 * Executes all types of rule actions
 */
export class ActionExecutor {
  private actionHandlers: Map<ActionType, (action: any, context: RuleExecutionContext) => Promise<any>> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default action handlers
   */
  private registerDefaultHandlers(): void {
    this.registerHandler(ActionType.EMAIL, this.executeEmail.bind(this));
    this.registerHandler(ActionType.SMS, this.executeSMS.bind(this));
    this.registerHandler(ActionType.IN_APP_ALERT, this.executeInAppAlert.bind(this));
    this.registerHandler(ActionType.SLACK, this.executeSlack.bind(this));
    this.registerHandler(ActionType.TEAMS, this.executeTeams.bind(this));
    this.registerHandler(ActionType.CREATE_RECORD, this.executeCreateRecord.bind(this));
    this.registerHandler(ActionType.UPDATE_RECORD, this.executeUpdateRecord.bind(this));
    this.registerHandler(ActionType.DELETE_RECORD, this.executeDeleteRecord.bind(this));
    this.registerHandler(ActionType.WORKFLOW_START, this.executeWorkflowStart.bind(this));
    this.registerHandler(ActionType.API_CALL, this.executeAPICall.bind(this));
    this.registerHandler(ActionType.WEBHOOK, this.executeWebhook.bind(this));
    this.registerHandler(ActionType.DATA_TRANSFORM, this.executeTransform.bind(this));
    this.registerHandler(ActionType.QUALITY_HOLD, this.executeQualityHold.bind(this));
    this.registerHandler(ActionType.ESCALATE, this.executeEscalate.bind(this));
    this.registerHandler(ActionType.LOG_EVENT, this.executeLogEvent.bind(this));
    this.registerHandler(ActionType.WAIT, this.executeWait.bind(this));
  }

  /**
   * Register custom action handler
   */
  registerHandler(actionType: ActionType, handler: (action: any, context: RuleExecutionContext) => Promise<any>): void {
    this.actionHandlers.set(actionType, handler);
  }

  /**
   * Execute action
   */
  async executeAction(action: Action, context: RuleExecutionContext): Promise<ActionResult> {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      return {
        actionIndex: 0,
        actionType: action.type,
        status: ExecutionStatus.FAILED,
        error: { code: 'UNKNOWN_ACTION', message: `No handler for action type ${action.type}` },
        executionTimeMs: 0,
      };
    }

    const startTime = Date.now();
    try {
      const output = await handler(action, context);
      return {
        actionIndex: 0,
        actionType: action.type,
        status: ExecutionStatus.SUCCESS,
        output,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        actionIndex: 0,
        actionType: action.type,
        status: ExecutionStatus.FAILED,
        error: {
          code: 'ACTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  // ========================================================================
  // Action Handlers
  // ========================================================================

  private async executeEmail(action: NotificationAction, context: RuleExecutionContext): Promise<any> {
    // Simulate email sending
    console.log(`Sending email to ${action.recipients}: ${action.subject}`);
    return { sent: true, recipients: action.recipients };
  }

  private async executeSMS(action: NotificationAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Sending SMS to ${action.recipients}`);
    return { sent: true, recipients: action.recipients };
  }

  private async executeInAppAlert(action: NotificationAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Creating in-app alert for ${action.recipients}`);
    return { created: true, alertId: `alert-${Date.now()}` };
  }

  private async executeSlack(action: NotificationAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Posting to Slack channel: ${action.recipients}`);
    return { posted: true, channel: action.recipients };
  }

  private async executeTeams(action: NotificationAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Posting to Teams channel: ${action.recipients}`);
    return { posted: true, channel: action.recipients };
  }

  private async executeCreateRecord(action: RecordAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Creating ${action.entity} record with data:`, action.data);
    return { created: true, recordId: `${action.entity}-${Date.now()}`, data: action.data };
  }

  private async executeUpdateRecord(action: RecordAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Updating ${action.entity} records with data:`, action.data);
    return { updated: true, recordsAffected: 1, data: action.data };
  }

  private async executeDeleteRecord(action: RecordAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Deleting ${action.entity} records`);
    return { deleted: true, recordsAffected: 1 };
  }

  private async executeWorkflowStart(action: WorkflowAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Starting workflow ${action.workflowId}`);
    return { workflowStarted: true, workflowId: action.workflowId, executionId: `wf-${Date.now()}` };
  }

  private async executeAPICall(action: APIAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Making ${action.method} call to ${action.url}`);
    // Simulate API call
    return { statusCode: 200, response: { success: true } };
  }

  private async executeWebhook(action: APIAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Calling webhook ${action.url}`);
    return { webhookCalled: true, url: action.url };
  }

  private async executeTransform(action: any, context: RuleExecutionContext): Promise<any> {
    console.log(`Executing data transformation`);
    // In production, would execute the transform script safely
    return { transformed: true, output: action.outputVariable };
  }

  private async executeQualityHold(action: QualityHoldAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Placing quality hold: ${action.reason}`);
    return { holdPlaced: true, holdId: `hold-${Date.now()}`, reason: action.reason };
  }

  private async executeEscalate(action: EscalationAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Escalating to ${action.escalateTo}: ${action.reason}`);
    return { escalated: true, escalationId: `esc-${Date.now()}`, escalateTo: action.escalateTo };
  }

  private async executeLogEvent(action: any, context: RuleExecutionContext): Promise<any> {
    console.log(`Logging event: ${action.message}`);
    return { logged: true, eventId: `evt-${Date.now()}` };
  }

  private async executeWait(action: WaitAction, context: RuleExecutionContext): Promise<any> {
    console.log(`Waiting for ${action.duration}`);
    // In production, would actually wait
    return { waited: true, duration: action.duration };
  }
}

// Singleton instance
export const actionExecutor = new ActionExecutor();
