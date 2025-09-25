/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  DataLLMService,
  ILLMChatRequest,
  ILLMChatResponse,
  ILLMModel,
  ILLMUsage,
} from 'src/app/infrastructure/api/data-llm.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';

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
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  private conversations = new Map<string, IConversation>();
  private availableModels$ = new BehaviorSubject<ILLMModel[]>([]);
  private selectedModelId$ = new BehaviorSubject<string>('');
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private currentLanguage$ = new BehaviorSubject<string>('de');

  public showProgressSpinner = signal(false);
  public isConnected = signal(true);

  constructor() {
    this.currentLanguage$.next(this.translateService.currentLang);
  }

  public initializeLLMModels(): void {
    this.initializeModels();
  }

  private initializeModels(): void {
    this.dataLLMService
      .getModels()
      .pipe(
        tap((models) => {
          console.log(
            'DataManagementLLMService - received models from backend:',
            models
          );
          if (models && models.length > 0) {
            this.availableModels$.next(models);

            // Find enabled models first
            const enabledModels = models.filter((m) => m.isEnabled);
            console.log(
              'DataManagementLLMService - enabled models:',
              enabledModels
            );

            // Try to find default enabled model, otherwise take first enabled
            const defaultModel =
              enabledModels.find((m) => m.isDefault) || enabledModels[0];
            if (defaultModel) {
              console.log(
                'DataManagementLLMService - setting default model:',
                defaultModel.modelId
              );
              this.selectedModelId$.next(defaultModel.modelId);
            } else {
              console.warn(
                'DataManagementLLMService - no enabled models available'
              );
            }
          } else {
            console.warn(
              'DataManagementLLMService - no models received from backend'
            );
          }
        }),
        catchError((error) => {
          console.error('Could not load models from backend:', error);
          this.toastShowService.showError('aside.llm.error.load_models');
          // Set empty array if backend fails
          this.availableModels$.next([]);
          return of([]);
        })
      )
      .subscribe();
  }

  sendMessage(
    message: string,
    conversationId?: string
  ): Observable<ILLMChatResponse> {
    const convId = conversationId || this.generateConversationId();
    const conversation = this.getOrCreateConversation(convId);

    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    const modelId = this.selectedModelId$.value;
    if (!modelId) {
      console.error('No model selected');
      return throwError(() => new Error('Please select a model first.'));
    }

    const request: ILLMChatRequest = {
      message,
      conversationId: convId,
      modelId: modelId,
      context: {
        conversationHistory: conversation.messages.slice(-10),
        language: this.currentLanguage$.value,
        userContext: this.getUserContext(),
      },
    };

    this.showProgressSpinner.set(true);
    this.isLoading$.next(true);

    return this.dataLLMService.chat(request).pipe(
      tap((response) => {
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

        this.showProgressSpinner.set(false);
        this.isLoading$.next(false);
      }),
      catchError((error) => {
        this.showProgressSpinner.set(false);
        this.isLoading$.next(false);
        this.toastShowService.showError('aside.llm.error.communication');
        console.error('LLM chat error:', error);
        return throwError(() => error);
      })
    );
  }

  getAvailableModels(): Observable<ILLMModel[]> {
    return this.availableModels$.asObservable();
  }

  getCurrentModelId(): Observable<string> {
    return this.selectedModelId$.asObservable();
  }

  setCurrentModel(modelId: string): void {
    const models = this.availableModels$.value;
    const model = models.find((m) => m.modelId === modelId && m.isEnabled);
    if (model) {
      console.log(
        'DataManagementLLMService - setting current model to:',
        modelId
      );
      this.selectedModelId$.next(modelId);
    } else {
      console.warn(
        'DataManagementLLMService - model not found or not enabled:',
        modelId
      );
    }
  }

  getModelInfo(modelId: string): ILLMModel | undefined {
    return this.availableModels$.value.find((m) => m.modelId === modelId);
  }

  enableModel(modelId: string): Observable<any> {
    return this.dataLLMService.enableModel(modelId).pipe(
      tap(() => {
        this.initializeModels();
      }),
      catchError((error) => {
        console.error('Could not enable model:', error);
        this.toastShowService.showError('aside.llm.error.enable_model');
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
        console.error('Could not disable model:', error);
        this.toastShowService.showError('aside.llm.error.disable_model');
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
        console.error('Could not set default model:', error);
        this.toastShowService.showError('aside.llm.error.set_default_model');
        throw error;
      })
    );
  }

  setLanguage(language: string): void {
    this.currentLanguage$.next(language);
  }

  clearAllConversations(): void {
    this.conversations.clear();
    console.log('All conversations cleared');
  }

  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    console.log(`Conversation ${conversationId} cleared`);
  }

  getConversationIds(): string[] {
    return Array.from(this.conversations.keys());
  }

  getCurrentLanguage(): Observable<string> {
    return this.currentLanguage$.asObservable();
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
      catchError((error) => {
        console.error('Could not fetch usage statistics:', error);
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

  isLoading(): Observable<boolean> {
    return this.isLoading$.asObservable();
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
    } catch (error) {
      console.warn('Could not extract user context from token:', error);
      return null;
    }
  }

  getHelp(): Observable<any> {
    return this.dataLLMService.getHelp().pipe(
      catchError((error) => {
        console.error('Could not fetch help:', error);
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
      catchError((error) => {
        console.error('Could not fetch functions:', error);
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
        console.error('Could not create model:', error);
        this.toastShowService.showError('settings.llm-models.error.save');
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
        console.error('Could not delete model:', error);
        this.toastShowService.showError('settings.llm-models.error.delete');
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
        console.error('Could not update model:', error);
        this.toastShowService.showError('settings.llm-models.error.save');
        throw error;
      })
    );
  }
}
