// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Orchestrates function call execution from assistant responses: UI actions, navigation, and backend calls.
 * Mutates the conversation log via ConversationOrchestratorService so all observers (chat panel and
 * voice-shell transcript overlay) receive signal updates. Pulses the matching main-nav icon as a side
 * effect when an explain_page_* skill call streams through.
 * @param functionExecutionService - Handles individual function execution against the backend API
 * @param uiActionEngine - Executes UI action step configurations in the frontend
 * @param orchestrator - Holds the conversation messages signal and exposes update helpers
 */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { IUiActionConfig } from 'src/app/domain/interfaces/ui-action-step.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, SkillExecutedEvent } from 'src/app/domain/events/domain-events';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { START_GUIDED_TOUR_SKILL } from 'src/app/domain/constants/onboarding-stations';
import { EXPLAIN_PAGE_SKILL_PREFIX, PAGE_EXPLAIN_NAV_ICONS } from 'src/app/domain/constants/page-explain-icons.constants';
import { KlacksyNavigationService } from 'src/app/core/services/klacksy-navigation.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';

@Injectable()
export class ChatFunctionExecutionService {
  private functionExecutionService = inject(AssistantFunctionExecutionService);
  private uiActionEngine = inject(UiActionEngineService);
  private orchestrator = inject(ConversationOrchestratorService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private onboarding = inject(OnboardingService);
  private klacksyNavigation = inject(KlacksyNavigationService);

  private readonly NAVIGATION_FUNCTIONS = ['navigateToPage', 'navigate_to', 'navigate_to_page'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeFunctionCalls(functionCalls: any[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uiActionCalls: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigationCalls: any[] = [];
    const backendCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = [];

    for (const call of functionCalls) {
      const functionName = call.FunctionName || call.functionName;
      if (!functionName) continue;

      if (functionName === START_GUIDED_TOUR_SKILL) {
        this.onboarding.requestTourStart();
        continue;
      }

      if (functionName.startsWith(EXPLAIN_PAGE_SKILL_PREFIX)) {
        this.highlightExplainedPageNavIcon(functionName);
      }

      const uiActionSteps = call.UiActionSteps || call.uiActionSteps;
      if (uiActionSteps && uiActionSteps !== '{}') {
        uiActionCalls.push(call);
      } else if (this.NAVIGATION_FUNCTIONS.includes(functionName)) {
        navigationCalls.push(call);
      }

      const clientId = this.extractClientIdFromResult(call.Result || call.result);
      if (clientId) {
        this.eventBus.emit<SkillExecutedEvent>(DomainEventType.SKILL_EXECUTED, { skillName: functionName, clientId });
      }
    }

    for (const call of uiActionCalls) {
      const uiActionSteps = call.UiActionSteps || call.uiActionSteps;
      await this.executeUiActionSteps(uiActionSteps, call);
    }

    for (const call of navigationCalls) {
      const functionName = call.FunctionName || call.functionName;
      const args = call.Parameters || call.parameters || {};
      const backendRoute = this.extractRouteFromResult(call.Result || call.result);
      if (backendRoute) {
        args['route'] = backendRoute;
      }
      const functionCall = {
        id: this.generateMessageId(),
        name: functionName,
        arguments: args,
      };
      try {
        const result = await firstValueFrom(
          this.functionExecutionService.executeFunction(functionCall)
        );
        this.applyFunctionResult(result);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        this.applyFunctionError(error);
      }
    }

    if (backendCalls.length === 0) return;

    if (backendCalls.length === 1) {
      try {
        const result = await firstValueFrom(
          this.functionExecutionService.executeFunction(backendCalls[0])
        );
        this.applyFunctionResult(result);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        this.applyFunctionError(error);
      }
      return;
    }

    try {
      const results = await this.functionExecutionService.executeFunctionsBatch(backendCalls);
      for (const result of results) {
        this.applyFunctionResult(result);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.applyFunctionError(error);
    }
  }

  private highlightExplainedPageNavIcon(functionName: string): void {
    const iconIds = PAGE_EXPLAIN_NAV_ICONS[functionName];
    if (!iconIds) return;

    for (const iconId of iconIds) {
      if (this.klacksyNavigation.highlightNavIcon(iconId)) return;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFunctionResult(result: any): void {
    const messages = this.orchestrator.messages();
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (!result.success && result.error && !result.error.includes('not implemented')) {
      if (!lastMessage.content) {
        this.orchestrator.updateMessage(lastMessage.id, { content: result.error });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFunctionError(error: any): void {
    const messages = this.orchestrator.messages();
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.content) {
      this.orchestrator.updateMessage(lastMsg.id, { content: error?.message || 'Function execution failed' });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeUiActionSteps(stepsJson: string, call: any): Promise<void> {
    try {
      const config: IUiActionConfig = JSON.parse(stepsJson);
      if (!config.steps || config.steps.length === 0) return;

      const context = {
        params: call.Parameters || call.parameters || {},
        results: {},
        callId: this.generateMessageId(),
      };

      await this.uiActionEngine.executeConfig(config, context);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const messages = this.orchestrator.messages();
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && !lastMsg.content) {
        this.orchestrator.updateMessage(lastMsg.id, { content: error?.message || 'UI action execution failed' });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractRouteFromResult(result: any): string | null {
    if (!result) return null;
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const dataMatch = resultStr.match(/Data:\s*(\{.*\})/s);
    if (!dataMatch) return null;
    try {
      const data = JSON.parse(dataMatch[1]);
      return data.Route || data.route || null;
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractClientIdFromResult(result: any): string | null {
    if (!result) return null;
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const dataMatch = resultStr.match(/Data:\s*(\{.*\})/s);
    if (!dataMatch) return null;
    try {
      const data = JSON.parse(dataMatch[1]);
      return data.ClientId || data.clientId || null;
    } catch {
      return null;
    }
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
