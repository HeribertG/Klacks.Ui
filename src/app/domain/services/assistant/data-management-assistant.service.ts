// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, tap, switchMap, takeUntil } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  DataAssistantService,
  IAssistantChatRequest,
  IAssistantChatResponse,
  IAssistantUsage,
  ISubmitCorrectionRequest,
  ISubmitCorrectionResponse,
  IProposedSkillChange,
  IGenerateProposalsResponse,
  IApproveProposalResponse,
  IRejectProposalResponse,
  IKlacksyModelCheckResponse,
} from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataProactiveMessageService } from 'src/app/infrastructure/api/assistant/data-proactive-message.service';
import { DataTriggerPreferenceService } from 'src/app/infrastructure/api/assistant/data-trigger-preference.service';
import { ITriggerPreference } from 'src/app/domain/interfaces/trigger-preference.interface';
import { ProactiveReaction } from 'src/app/domain/constants/proactive-reaction.constants';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { DataAssistantStreamService, StreamCallbacks, StreamMetadata } from 'src/app/infrastructure/api/assistant/data-assistant-stream.service';
import { AssistantPageContextService } from 'src/app/domain/services/assistant/assistant-page-context.service';
import { decodeJwtPayload } from 'src/app/shared/helpers/jwt.helper';

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
export class DataManagementAssistantService {
  private dataAssistantService = inject(DataAssistantService);
  private dataProactiveMessageService = inject(DataProactiveMessageService);
  private dataTriggerPreferenceService = inject(DataTriggerPreferenceService);
  private dataAssistantStreamService = inject(DataAssistantStreamService);
  private pageContextService = inject(AssistantPageContextService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);
  private conversations = new Map<string, IConversation>();
  private destroy$ = new Subject<void>();

  public availableModels = signal<IAssistantModel[]>([]);
  public selectedModelId = signal<string>('');
  public isLoading = signal<boolean>(false);
  public currentLanguage = signal<string>(DomainMessages.DEFAULT_LANG);
  public isConnected = signal(true);
  public modelsInitialized = signal(false);

  private availableModels$ = toObservable(this.availableModels);
  private selectedModelId$ = toObservable(this.selectedModelId);
  private currentLanguage$ = toObservable(this.currentLanguage);
  private isLoading$ = toObservable(this.isLoading);

  constructor() {
    const savedLang = this.localStorageService.get(StorageKeys.CURRENT_LANG);
    this.currentLanguage.set(savedLang || this.translateService.currentLang || DomainMessages.DEFAULT_LANG);
  }

  public initializeAssistantModels(): void {
    this.initializeModels();
  }

  private initializeModels(): void {
    this.dataAssistantService
      .getModels()
      .pipe(
        tap((models) => {
          if (models && models.length > 0) {
            this.availableModels.set(models);

            const enabledModels = models.filter((m) => m.isEnabled);

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
          this.modelsInitialized.set(true);
        }),
        catchError(() => {
          this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.load', code: 'LLMModelError', context: 'DataManagementAssistantService.initializeModels' });
          this.availableModels.set([]);
          this.selectedModelId.set('');
          this.modelsInitialized.set(true);
          return of([]);
        })
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  sendMessage(
    message: string,
    conversationId?: string
  ): Observable<IAssistantChatResponse> {
    const convId = conversationId || this.generateConversationId();
    const conversation = this.getOrCreateConversation(convId);

    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    const modelId = this.selectedModelId();
    if (!modelId) {
      return throwError(() => new Error('Please select a model first.'));
    }

    const request: IAssistantChatRequest = {
      message,
      conversationId: convId,
      modelId: modelId,
      language: this.currentLanguage(),
      context: {
        conversationHistory: conversation.messages.slice(-10),
        language: this.currentLanguage(),
        userContext: this.getUserContext(),
      },
      pageContext: this.pageContextService.getPageContext(),
    };

    this.isLoading.set(true);

    return this.dataAssistantService.chat(request).pipe(
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
          context: 'DataManagementAssistantService.sendMessage'
        });
        return throwError(() => error);
      })
    );
  }

  sendMessageStream(
    message: string,
    conversationId: string | undefined,
    callbacks: StreamCallbacks,
    isVoiceMode = false,
  ): AbortController {
    const convId = conversationId || this.generateConversationId();
    const conversation = this.getOrCreateConversation(convId);

    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    const modelId = this.selectedModelId();
    if (!modelId) {
      callbacks.onError?.('Please select a model first.');
      return new AbortController();
    }

    const request: IAssistantChatRequest = {
      message,
      conversationId: convId,
      modelId,
      language: this.currentLanguage(),
      context: {
        conversationHistory: conversation.messages.slice(-10),
        language: this.currentLanguage(),
        userContext: this.getUserContext(),
      },
      pageContext: this.pageContextService.getPageContext(),
      isVoiceMode,
    };

    this.isLoading.set(true);

    const wrappedCallbacks: StreamCallbacks = {
      ...callbacks,
      onMetadata: (data: StreamMetadata) => {
        conversation.messages.push({
          role: 'assistant',
          content: data.functionCalls ? '' : message,
          timestamp: new Date(),
          functionCalls: data.functionCalls,
        });
        conversation.lastActivity = new Date();
        if (data.usage?.cost) {
          conversation.totalCost = (conversation.totalCost || 0) + data.usage.cost;
        }
        callbacks.onMetadata?.(data);
      },
      onDone: () => {
        this.isLoading.set(false);
        callbacks.onDone?.();
      },
      onError: (msg: string) => {
        this.isLoading.set(false);
        callbacks.onError?.(msg);
      },
    };

    return this.dataAssistantStreamService.chatStream(request, wrappedCallbacks);
  }

  getAvailableModels(): Observable<IAssistantModel[]> {
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

  getModelInfo(modelId: string): IAssistantModel | undefined {
    return this.availableModels().find((m) => m.modelId === modelId);
  }

  enableModel(modelId: string): Observable<any> {
    return this.dataAssistantService.enableModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.enable', code: 'LLMModelError', context: 'DataManagementAssistantService.enableModel' });
        throw error;
      })
    );
  }

  disableModel(modelId: string): Observable<any> {
    return this.dataAssistantService.disableModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.disable', code: 'LLMModelError', context: 'DataManagementAssistantService.disableModel' });
        throw error;
      })
    );
  }

  setDefaultModel(modelId: string): Observable<any> {
    return this.dataAssistantService.setDefaultModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, {
          message: 'settings.llm-models.error.set-default',
          code: 'LLMModelError',
          context: 'DataManagementAssistantService.setDefaultModel'
        });
        throw error;
      })
    );
  }

  optimizeForKlacksy(): Observable<IKlacksyModelCheckResponse> {
    return this.dataAssistantService.optimizeForKlacksy().pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, {
          message: 'settings.klacksy-models.error.optimize',
          code: 'LLMModelError',
          context: 'DataManagementAssistantService.optimizeForKlacksy'
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

  getUsageStatistics(days = 30): Observable<IAssistantUsage> {
    return this.dataAssistantService.getUsage(days).pipe(
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

  getDefaultModel(): IAssistantModel | undefined {
    return this.availableModels().find((m) => m.isDefault);
  }

  reloadModels(): void {
    this.initializeModels();
  }

  warmupCache(): void {
    this.dataAssistantService.warmup();
  }

  submitCorrection(request: ISubmitCorrectionRequest): Observable<ISubmitCorrectionResponse> {
    return this.dataAssistantService.submitCorrection(request);
  }

  setProactiveReaction(messageId: string, reaction: ProactiveReaction): Observable<void> {
    return this.dataProactiveMessageService.setReaction(messageId, reaction);
  }

  muteTriggerKind(triggerKind: string): Observable<ITriggerPreference> {
    return this.dataTriggerPreferenceService.muteKind(triggerKind);
  }

  generateSkillProposals(trajectories?: number): Observable<IGenerateProposalsResponse> {
    return this.dataAssistantService.generateSkillProposals(trajectories);
  }

  getPendingSkillProposals(limit?: number): Observable<IProposedSkillChange[]> {
    return this.dataAssistantService.getPendingSkillProposals(limit);
  }

  approveSkillProposal(id: string): Observable<IApproveProposalResponse> {
    return this.dataAssistantService.approveSkillProposal(id);
  }

  rejectSkillProposal(id: string): Observable<IRejectProposalResponse> {
    return this.dataAssistantService.rejectSkillProposal(id);
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
    const token = this.localStorageService.get(StorageKeys.TOKEN);
    if (!token) return null;

    const decoded = decodeJwtPayload(token);
    if (!decoded) return null;

    return {
      userId: decoded.sub || decoded.userId,
      userName: decoded.name || decoded.userName,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };
  }

  getHelp(): Observable<any> {
    return this.dataAssistantService.getHelp().pipe(
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
    return this.dataAssistantService.getFunctions().pipe(
      catchError(() => {
        return of([]);
      })
    );
  }

  createModel(model: IAssistantModel): Observable<IAssistantModel> {
    return this.dataAssistantService.createModel(model).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.save', code: 'LLMModelError', context: 'DataManagementAssistantService' });
        throw error;
      })
    );
  }

  deleteModel(id: string): Observable<any> {
    return this.dataAssistantService.deleteModel(id).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.delete', code: 'LLMModelError', context: 'DataManagementAssistantService.deleteModel' });
        throw error;
      })
    );
  }

  updateModel(model: IAssistantModel): Observable<IAssistantModel> {
    if (!model.id) {
      return throwError(() => new Error('Model ID is required for update'));
    }
    return this.dataAssistantService.updateModel(model.id, model).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.llm-models.error.save', code: 'LLMModelError', context: 'DataManagementAssistantService' });
        throw error;
      })
    );
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
