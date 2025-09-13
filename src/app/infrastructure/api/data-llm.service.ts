import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ILLMChatRequest {
  message: string;
  conversationId?: string;
  modelId?: string;
  context?: any;
}

export interface ILLMChatResponse {
  message: string;
  conversationId: string;
  suggestions?: string[];
  navigateTo?: string;
  actionPerformed?: boolean;
  functionCalls?: any[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export interface ILLMModel {
  modelId: string;
  providerId: string;
  displayName: string;
  description?: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  isEnabled: boolean;
  isDefault: boolean;
  capabilities: string[];
}

export interface ILLMUsage {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  conversationCount: number;
  modelBreakdown: Array<{
    modelId: string;
    displayName: string;
    totalCost: number;
    usageCount: number;
  }>;
}

export interface ILLMFunction {
  name: string;
  description: string;
  parameters: any;
  isAvailable: boolean;
}

export interface ILLMHelp {
  description: string;
  examples: Array<{
    title: string;
    prompts: string[];
  }>;
  availableFunctions: string[];
  tips: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DataLLMService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}v1/assistant`;

  chat(request: ILLMChatRequest): Observable<ILLMChatResponse> {
    return this.httpClient
      .post<ILLMChatResponse>(`${this.baseUrl}/chat`, request)
      .pipe(retry(3));
  }

  getModels(): Observable<ILLMModel[]> {
    return this.httpClient
      .get<ILLMModel[]>(`${this.baseUrl}/models`)
      .pipe(retry(3));
  }

  updateModel(modelId: string, updates: Partial<ILLMModel>): Observable<ILLMModel> {
    return this.httpClient
      .put<ILLMModel>(`${this.baseUrl}/models/${modelId}`, updates)
      .pipe(retry(3));
  }

  getUsage(days: number = 30): Observable<ILLMUsage> {
    return this.httpClient
      .get<ILLMUsage>(`${this.baseUrl}/usage`, {
        params: { days: days.toString() }
      })
      .pipe(retry(3));
  }

  getFunctions(): Observable<ILLMFunction[]> {
    return this.httpClient
      .get<ILLMFunction[]>(`${this.baseUrl}/chat/functions`)
      .pipe(retry(3));
  }

  getHelp(): Observable<ILLMHelp> {
    return this.httpClient
      .get<ILLMHelp>(`${this.baseUrl}/chat/help`)
      .pipe(retry(3));
  }
}