/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, tap, switchMap, map, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  DataLLMService,
  ILLMChatRequest,
  ILLMChatResponse,
  ILLMModel,
  ILLMUsage,
} from 'src/app/infrastructure/api/data-llm.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { TranslateService } from '@ngx-translate/core';
import { LLMSystemContextService } from './llm-system-context.service';
import { LLMFunctionExecutionService } from './llm-function-execution.service';
import { ILLMFunctionCall } from '../../interfaces/llm-function-definitions.interface';

export interface IConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  functionCalls?: any[];
}

export interface IConversation {
  id: string;
  messages: IConversationMessage[];
  startTime: Date;
  lastActivity: Date;
  totalCost?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DataManagementLLMService {
  private dataLLMService = inject(DataLLMService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private translateService = inject(TranslateService);
  private systemContextService = inject(LLMSystemContextService);
  private functionExecutionService = inject(LLMFunctionExecutionService);

  private conversations = new Map<string, IConversation>();
  private destroy$ = new Subject<void>();

  public availableModels = signal<ILLMModel[]>([]);
  public selectedModelId = signal<string>('');
  public isLoading = signal<boolean>(false);
  public currentLanguage = signal<string>('de');
  public isConnected = signal(true);

  private availableModels$ = toObservable(this.availableModels);
  private selectedModelId$ = toObservable(this.selectedModelId);
  private currentLanguage$ = toObservable(this.currentLanguage);
  private isLoading$ = toObservable(this.isLoading);

  constructor() {
    this.currentLanguage.set(this.translateService.currentLang);
  }

  public initializeLLMModels(): void {
    this.initializeModels();
  }

  private initializeModels(): void {
    this.dataLLMService
      .getModels()
      .pipe(
        tap((models) => {
          if (models && models.length > 0) {
            this.availableModels.set(models);

            // Find enabled models first
            const enabledModels = models.filter((m) => m.isEnabled);

            // Try to find default enabled model, otherwise take first enabled
            const defaultModel =
              enabledModels.find((m) => m.isDefault) || enabledModels[0];
            if (defaultModel) {
              this.selectedModelId.set(defaultModel.modelId);
            } else {
              this.selectedModelId.set('');
            }
          } else {
            this.selectedModelId.set('');
          }
        }),
        catchError(() => {
          this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.load', code: 'LLMModelError', context: 'DataManagementLLMService.initializeModels' });
          // Set empty array if backend fails
          this.availableModels.set([]);
          this.selectedModelId.set('');
          return of([]);
        })
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  sendMessage(
    message: string,
    conversationId?: string
  ): Observable<ILLMChatResponse> {
    const convId = conversationId || this.generateConversationId();
    const conversation = this.getOrCreateConversation(convId);

    // Add system context on first message
    if (conversation.messages.length === 0) {
      const systemMessage = this.systemContextService.formatSystemMessage();
      conversation.messages.push({
        role: 'system',
        content: systemMessage,
        timestamp: new Date(),
      });
    }

    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    const modelId = this.selectedModelId();
    if (!modelId) {
      return throwError(() => new Error('Please select a model first.'));
    }

    const request: ILLMChatRequest = {
      message,
      conversationId: convId,
      modelId: modelId,
      context: {
        conversationHistory: conversation.messages.slice(-10),
        language: this.currentLanguage(),
        userContext: this.getUserContext(),
        availableTools: this.systemContextService.getToolsForLLM(),
        systemContext: this.systemContextService.getSystemContext(),
      },
    };

    this.isLoading.set(true);

    return this.dataLLMService.chat(request).pipe(
      switchMap((response) => {
        conversation.messages.push({
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          functionCalls: response.functionCalls,
        });

        conversation.lastActivity = new Date();
        if (response.usage?.cost) {
          conversation.totalCost =
            (conversation.totalCost || 0) + response.usage.cost;
        }

        // Execute function calls if present
        if (response.functionCalls && response.functionCalls.length > 0) {
          return this.executeFunctionCalls(response.functionCalls).pipe(
            map((functionResults) => {
              // Add function results to response
              return {
                ...response,
                functionResults,
              };
            })
          );
        }

        return of(response);
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.eventBus.emit(DomainEventType.ERROR, {
          message: 'settings.llm-models.error.communication',
          code: 'LLMCommunicationError',
          context: 'DataManagementLLMService.sendMessage'
        });
        return throwError(() => error);
      })
    );
  }

  getAvailableModels(): Observable<ILLMModel[]> {
    return this.availableModels$;
  }

  getCurrentModelId(): Observable<string> {
    return this.selectedModelId$;
  }

  setCurrentModel(modelId: string): void {
    const models = this.availableModels();
    const model = models.find((m) => m.modelId === modelId && m.isEnabled);
    if (model) {
      this.selectedModelId.set(modelId);
    }
  }

  getModelInfo(modelId: string): ILLMModel | undefined {
    return this.availableModels().find((m) => m.modelId === modelId);
  }

  enableModel(modelId: string): Observable<any> {
    return this.dataLLMService.enableModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.enable', code: 'LLMModelError', context: 'DataManagementLLMService.enableModel' });
        throw error;
      })
    );
  }

  disableModel(modelId: string): Observable<any> {
    return this.dataLLMService.disableModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.disable', code: 'LLMModelError', context: 'DataManagementLLMService.disableModel' });
        throw error;
      })
    );
  }

  setDefaultModel(modelId: string): Observable<any> {
    return this.dataLLMService.setDefaultModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, {
          message: 'settings.llm-models.error.set-default',
          code: 'LLMModelError',
          context: 'DataManagementLLMService.setDefaultModel'
        });
        throw error;
      })
    );
  }

  setLanguage(language: string): void {
    this.currentLanguage.set(language);
  }

  clearAllConversations(): void {
    this.conversations.clear();
  }

  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  getConversationIds(): string[] {
    return Array.from(this.conversations.keys());
  }

  getCurrentLanguage(): Observable<string> {
    return this.currentLanguage$;
  }

  getConversation(conversationId: string): IConversation | undefined {
    return this.conversations.get(conversationId);
  }

  getAllConversations(): IConversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  getUsageStatistics(days = 30): Observable<ILLMUsage> {
    return this.dataLLMService.getUsage(days).pipe(
      catchError(() => {
        return of({
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          conversationCount: 0,
          modelBreakdown: [],
        });
      })
    );
  }

  isLoadingObservable(): Observable<boolean> {
    return this.isLoading$;
  }

  getDefaultModel(): ILLMModel | undefined {
    return this.availableModels().find((m) => m.isDefault);
  }

  reloadModels(): void {
    this.initializeModels();
  }

  private getOrCreateConversation(conversationId: string): IConversation {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        startTime: new Date(),
        lastActivity: new Date(),
        totalCost: 0,
      });
    }
    return this.conversations.get(conversationId)!;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserContext(): any {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      return {
        userId: decoded.sub || decoded.userId,
        userName: decoded.name || decoded.userName,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
      };
    } catch {
      return null;
    }
  }

  getHelp(): Observable<any> {
    return this.dataLLMService.getHelp().pipe(
      catchError(() => {
        return of({
          description: 'AI assistant',
          examples: [],
          availableFunctions: [],
          tips: [],
        });
      })
    );
  }

  getFunctions(): Observable<any[]> {
    return this.dataLLMService.getFunctions().pipe(
      catchError(() => {
        return of([]);
      })
    );
  }

  createModel(model: ILLMModel): Observable<ILLMModel> {
    return this.dataLLMService.createModel(model).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.save', code: 'LLMModelError', context: 'DataManagementLLMService' });
        throw error;
      })
    );
  }

  deleteModel(id: string): Observable<any> {
    return this.dataLLMService.deleteModel(id).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.delete', code: 'LLMModelError', context: 'DataManagementLLMService.deleteModel' });
        throw error;
      })
    );
  }

  updateModel(model: ILLMModel): Observable<ILLMModel> {
    if (!model.id) {
      return throwError(() => new Error('Model ID is required for update'));
    }
    return this.dataLLMService.updateModel(model.id, model).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.save', code: 'LLMModelError', context: 'DataManagementLLMService' });
        throw error;
      })
    );
  }

  private executeFunctionCalls(
    functionCalls: ILLMFunctionCall[]
  ): Observable<any> {
    return this.functionExecutionService.executeFunctions(functionCalls).pipe(
      catchError(() => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'Function execution failed', code: 'LLMFunctionError', context: 'DataManagementLLMService.executeFunctionCalls' });
        return of([]);
      })
    );
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
