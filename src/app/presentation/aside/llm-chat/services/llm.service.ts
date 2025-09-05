/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LLMModel, LLMModelUsage, DEFAULT_MODELS } from '../models/llm-model.interface';

export interface LLMRequest {
  message: string;
  conversationId: string;
  modelId?: string;
  context?: any;
}

export interface LLMResponse {
  message: string;
  suggestions?: string[];
  navigateTo?: string;
  actionPerformed?: boolean;
  functionCalls?: any[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class LLMService {
  private readonly apiUrl = `${environment.baseUrl.replace(
    '/backend/',
    ''
  )}/llm`;

  // Service state
  private conversationHistory = new Map<string, any[]>();
  private isConnected$ = new BehaviorSubject<boolean>(true);
  private currentLanguage = 'German';
  private availableModels$ = new BehaviorSubject<LLMModel[]>(DEFAULT_MODELS.filter(m => m.isEnabled));
  private selectedModel$ = new BehaviorSubject<string>('gpt-3.5-turbo');
  private usageHistory: LLMModelUsage[] = [];

  constructor(private http: HttpClient) {
    // Initialize with defaults immediately
    const enabledModels = DEFAULT_MODELS.filter(m => m.isEnabled);
    console.log('LLMService constructor - enabledModels:', enabledModels);
    this.availableModels$.next(enabledModels);
    
    // Set default model
    const defaultModel = enabledModels.find(m => m.isDefault) || enabledModels[0];
    if (defaultModel) {
      this.selectedModel$.next(defaultModel.id);
      console.log('LLMService constructor - selected default model:', defaultModel.id);
    }

    // Don't try to load from server for now - use defaults only
    // this.initializeModels();
  }

  /**
   * Send a message to the LLM service
   */
  async sendMessage(request: LLMRequest): Promise<LLMResponse> {
    try {
      const headers = this.getAuthHeaders();

      // Add conversation context
      const contextualRequest = {
        ...request,
        context: {
          conversationHistory:
            this.conversationHistory.get(request.conversationId) || [],
          userContext: this.getUserContext(),
          language: this.currentLanguage,
        },
        modelId: request.modelId || this.selectedModel$.value,
      };

      const response = await this.http
        .post<LLMResponse>(`${this.apiUrl}/chat`, contextualRequest, {
          headers,
        })
        .toPromise();

      if (!response) {
        throw new Error('No response from LLM service');
      }

      // Update conversation history
      this.updateConversationHistory(
        request.conversationId,
        request.message,
        response.message
      );

      // Track usage if provided
      if (response.usage) {
        this.trackUsage(
          request.modelId || this.selectedModel$.value,
          request.conversationId,
          response.usage
        );
      }

      return response;
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw new Error('Fehler beim Kommunizieren mit dem KI-Assistenten');
    }
  }

  /**
   * Set the language for LLM responses
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Clear conversation history for a specific conversation
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get connection status observable
   */
  get isConnected(): Observable<boolean> {
    return this.isConnected$.asObservable();
  }

  /**
   * Test connection to LLM service
   */
  async testConnection(): Promise<boolean> {
    try {
      const headers = this.getAuthHeaders();
      await this.http.get(`${this.apiUrl}/health`, { headers }).toPromise();
      this.isConnected$.next(true);
      return true;
    } catch (error) {
      console.warn('LLM service connection test failed:', error);
      this.isConnected$.next(false);
      return false;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private getUserContext(): any {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      // Decode JWT token to get user context (simplified)
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

  private updateConversationHistory(
    conversationId: string,
    userMessage: string,
    assistantMessage: string
  ): void {
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, []);
    }

    const history = this.conversationHistory.get(conversationId)!;
    history.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date() }
    );

    // Limit conversation history to last 20 exchanges (40 messages)
    if (history.length > 40) {
      history.splice(0, history.length - 40);
    }
  }

  // Model Management
  private async initializeModels(): Promise<void> {
    try {
      // Try to fetch models from admin settings
      const headers = this.getAuthHeaders();
      const models = await this.http.get<LLMModel[]>(`${this.apiUrl}/models`, { headers }).toPromise();
      console.log('LLMService - fetched models from server:', models);
      this.availableModels$.next(models || DEFAULT_MODELS.filter(m => m.isEnabled));
    } catch (error) {
      // Fallback to default enabled models
      console.warn('Could not fetch models from server, using defaults:', error);
      const defaultEnabledModels = DEFAULT_MODELS.filter(m => m.isEnabled);
      console.log('LLMService - using default enabled models:', defaultEnabledModels);
      this.availableModels$.next(defaultEnabledModels);
    }
    
    // Set default model
    const models = this.availableModels$.value;
    console.log('LLMService - available models after init:', models);
    const defaultModel = models.find(m => m.isDefault) || models[0];
    if (defaultModel) {
      this.selectedModel$.next(defaultModel.id);
      console.log('LLMService - set default model after init:', defaultModel.id);
    }
  }

  getAvailableModels(): Observable<LLMModel[]> {
    console.log('getAvailableModels called, current models:', this.availableModels$.value);
    return this.availableModels$.asObservable();
  }

  getCurrentModel(): Observable<string> {
    return this.selectedModel$.asObservable();
  }

  setCurrentModel(modelId: string): void {
    const models = this.availableModels$.value;
    const model = models.find(m => m.id === modelId);
    if (model && model.isEnabled) {
      this.selectedModel$.next(modelId);
    }
  }

  getModelInfo(modelId: string): LLMModel | undefined {
    return this.availableModels$.value.find(m => m.id === modelId);
  }

  private trackUsage(modelId: string, conversationId: string, usage: any): void {
    const model = this.getModelInfo(modelId);
    if (!model) return;

    const cost = (usage.inputTokens / 1000 * model.costPerInputToken) + 
                 (usage.outputTokens / 1000 * model.costPerOutputToken);

    const usageRecord: LLMModelUsage = {
      modelId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cost,
      timestamp: new Date(),
      conversationId
    };

    this.usageHistory.push(usageRecord);
    
    // Keep only last 1000 usage records
    if (this.usageHistory.length > 1000) {
      this.usageHistory.splice(0, this.usageHistory.length - 1000);
    }
  }

  getUsageStatistics(days: number = 30): { totalCost: number; modelUsage: { [key: string]: number } } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentUsage = this.usageHistory.filter(u => u.timestamp >= cutoffDate);
    const totalCost = recentUsage.reduce((sum, u) => sum + u.cost, 0);
    const modelUsage: { [key: string]: number } = {};

    recentUsage.forEach(u => {
      modelUsage[u.modelId] = (modelUsage[u.modelId] || 0) + u.cost;
    });

    return { totalCost, modelUsage };
  }
}
