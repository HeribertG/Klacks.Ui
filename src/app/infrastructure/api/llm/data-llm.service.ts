/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ILLMChatRequest {
  message: string;
  conversationId?: string;
  modelId?: string;
  language?: string;
  context?: any;
}

export interface ILLMChatResponse {
  message: string;
  conversationId: string;
  suggestions?: string[];
  navigateTo?: string;
  actionPerformed?: boolean;
  functionCalls?: any[];
  functionResults?: any[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export interface ILLMModel {
  id?: string;
  modelId: string;
  apiModelId?: string;
  providerId: string;
  modelName: string;
  description?: string;
  contextWindow: number;
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  isEnabled: boolean;
  isDefault: boolean;
  capabilities: string[];
  // Temporary field for API key during creation/update
  providerApiKey?: string;

  // Frontend-only display fields (not sent to backend)
  displayName?: string;
  maxOutputTokens?: number;
}

export interface ILLMUsage {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  conversationCount: number;
  modelBreakdown: {
    modelId: string;
    displayName: string;
    totalCost: number;
    usageCount: number;
  }[];
}

export interface ILLMFunction {
  name: string;
  description: string;
  parameters: any;
  isAvailable: boolean;
}

export interface ILLMHelp {
  description: string;
  examples: {
    title: string;
    prompts: string[];
  }[];
  availableFunctions: string[];
  tips: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DataLLMService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  chat(request: ILLMChatRequest): Observable<ILLMChatResponse> {
    return this.httpClient
      .post<ILLMChatResponse>(`${this.baseUrl}chat`, request)
      .pipe(retry(3));
  }

  getModels(): Observable<ILLMModel[]> {
    return this.httpClient
      .get<ILLMModel[]>(`${this.baseUrl}models`)
      .pipe(retry(3));
  }

  updateModel(id: string, updates: Partial<ILLMModel>): Observable<ILLMModel> {
    return this.httpClient
      .put<ILLMModel>(`${this.baseUrl}models/${id}`, updates)
      .pipe(retry(3));
  }

  enableModel(modelId: string): Observable<any> {
    return this.httpClient
      .post(`${this.baseUrl}models/${modelId}/enable`, {})
      .pipe(retry(3));
  }

  disableModel(modelId: string): Observable<any> {
    return this.httpClient
      .post(`${this.baseUrl}models/${modelId}/disable`, {})
      .pipe(retry(3));
  }

  setDefaultModel(modelId: string): Observable<any> {
    return this.httpClient
      .post(`${this.baseUrl}models/${modelId}/set-default`, {})
      .pipe(retry(3));
  }

  getUsage(days = 30): Observable<ILLMUsage> {
    return this.httpClient
      .get<ILLMUsage>(`${this.baseUrl}usage`, {
        params: { days: days.toString() },
      })
      .pipe(retry(3));
  }

  getFunctions(): Observable<ILLMFunction[]> {
    return this.httpClient
      .get<ILLMFunction[]>(`${this.baseUrl}chat/functions`)
      .pipe(retry(3));
  }

  getHelp(): Observable<ILLMHelp> {
    return this.httpClient
      .get<ILLMHelp>(`${this.baseUrl}chat/help`)
      .pipe(retry(3));
  }

  createModel(model: ILLMModel): Observable<ILLMModel> {
    return this.httpClient
      .post<ILLMModel>(`${this.baseUrl}models`, model)
      .pipe(retry(3));
  }

  deleteModel(id: string): Observable<any> {
    return this.httpClient.delete(`${this.baseUrl}models/${id}`).pipe(retry(3));
  }
}
