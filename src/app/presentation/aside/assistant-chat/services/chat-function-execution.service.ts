// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Orchestrates function call execution from assistant responses: UI actions, navigation, and backend calls.
 * @param functionExecutionService - Handles individual function execution against the backend API
 * @param uiActionEngine - Executes UI action step configurations in the frontend
 */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AssistantFunctionExecutionService } from 'src/app/domain/services/assistant/assistant-function-execution.service';
import { UiActionEngineService } from 'src/app/domain/services/assistant/ui-action-engine.service';
import { IUiActionConfig } from 'src/app/domain/interfaces/ui-action-step.interface';
import { ChatMessage } from '../chat-message.interface';

@Injectable()
export class ChatFunctionExecutionService {
  private functionExecutionService = inject(AssistantFunctionExecutionService);
  private uiActionEngine = inject(UiActionEngineService);

  private readonly NAVIGATION_FUNCTIONS = ['navigateToPage', 'navigate_to', 'navigate_to_page'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeFunctionCalls(functionCalls: any[], messages: ChatMessage[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uiActionCalls: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigationCalls: any[] = [];
    const backendCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = [];

    for (const call of functionCalls) {
      const functionName = call.FunctionName || call.functionName;
      if (!functionName) continue;

      const uiActionSteps = call.UiActionSteps || call.uiActionSteps;
      if (uiActionSteps && uiActionSteps !== '{}') {
        uiActionCalls.push(call);
      } else if (this.NAVIGATION_FUNCTIONS.includes(functionName)) {
        navigationCalls.push(call);
      }
    }

    for (const call of uiActionCalls) {
      const uiActionSteps = call.UiActionSteps || call.uiActionSteps;
      await this.executeUiActionSteps(uiActionSteps, call, messages);
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
        this.applyFunctionResult(result, messages);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        this.applyFunctionError(error, messages);
      }
    }

    if (backendCalls.length === 0) return;

    if (backendCalls.length === 1) {
      try {
        const result = await firstValueFrom(
          this.functionExecutionService.executeFunction(backendCalls[0])
        );
        this.applyFunctionResult(result, messages);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        this.applyFunctionError(error, messages);
      }
      return;
    }

    try {
      const results = await this.functionExecutionService.executeFunctionsBatch(backendCalls);
      for (const result of results) {
        this.applyFunctionResult(result, messages);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.applyFunctionError(error, messages);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFunctionResult(result: any, messages: ChatMessage[]): void {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (!result.success && result.error && !result.error.includes('not implemented')) {
      if (!lastMessage.content) {
        lastMessage.content = result.error;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFunctionError(error: any, messages: ChatMessage[]): void {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.content) {
      lastMsg.content = error?.message || 'Function execution failed';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeUiActionSteps(stepsJson: string, call: any, messages: ChatMessage[]): Promise<void> {
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
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && !lastMsg.content) {
        lastMsg.content = error?.message || 'UI action execution failed';
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

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
