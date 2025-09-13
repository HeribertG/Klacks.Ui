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

  // State management
  private conversations = new Map<string, IConversation>();
  private availableModels$ = new BehaviorSubject<ILLMModel[]>([]);
  private selectedModelId$ = new BehaviorSubject<string>('');
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private currentLanguage$ = new BehaviorSubject<string>('German');

  // Signals for UI state
  public showProgressSpinner = signal(false);
  public isConnected = signal(true);


  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    // Try to load models from backend
    this.dataLLMService
      .getModels()
      .pipe(
        tap((models) => {
          if (models && models.length > 0) {
            this.availableModels$.next(models);
            const defaultModel = models.find((m) => m.isDefault) || models[0];
            if (defaultModel) {
              this.selectedModelId$.next(defaultModel.modelId);
            }
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

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    const request: ILLMChatRequest = {
      message,
      conversationId: convId,
      modelId: this.selectedModelId$.value,
      context: {
        conversationHistory: conversation.messages.slice(-10), // Last 10 messages
        language: this.currentLanguage$.value,
        userContext: this.getUserContext(),
      },
    };

    this.showProgressSpinner.set(true);
    this.isLoading$.next(true);

    return this.dataLLMService.chat(request).pipe(
      tap((response) => {
        // Add assistant response to conversation
        conversation.messages.push({
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          functionCalls: response.functionCalls,
        });

        // Update conversation metadata
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
      this.selectedModelId$.next(modelId);
    }
  }

  getModelInfo(modelId: string): ILLMModel | undefined {
    return this.availableModels$.value.find((m) => m.modelId === modelId);
  }

  setLanguage(language: string): void {
    this.currentLanguage$.next(language);
  }

  getCurrentLanguage(): Observable<string> {
    return this.currentLanguage$.asObservable();
  }

  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  getConversation(conversationId: string): IConversation | undefined {
    return this.conversations.get(conversationId);
  }

  getAllConversations(): IConversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  getUsageStatistics(days: number = 30): Observable<ILLMUsage> {
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

      // Decode JWT token to get user context
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
          description: 'KI-Assistent für Klacks',
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
}
