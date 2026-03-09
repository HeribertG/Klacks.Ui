// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';

export interface IAssistantChatRequest {
  message: string;
  conversationId?: string;
  modelId?: string;
  language?: string;
  context?: any;
  agentId?: string;
}

export interface IAssistantChatResponse {
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

export { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';

export interface IAssistantUsage {
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

export interface IAssistantFunction {
  name: string;
  description: string;
  parameters: any;
  isAvailable: boolean;
}

export interface IAssistantHelp {
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
export class DataAssistantService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  chat(request: IAssistantChatRequest): Observable<IAssistantChatResponse> {
    return this.httpClient
      .post<IAssistantChatResponse>(`${this.baseUrl}chat`, request)
      .pipe(retry(3));
  }

  getModels(): Observable<IAssistantModel[]> {
    return this.httpClient
      .get<IAssistantModel[]>(`${this.baseUrl}models`)
      .pipe(retry(3));
  }

  updateModel(id: string, updates: Partial<IAssistantModel>): Observable<IAssistantModel> {
    return this.httpClient
      .put<IAssistantModel>(`${this.baseUrl}models/${id}`, updates)
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

  getUsage(days = 30): Observable<IAssistantUsage> {
    return this.httpClient
      .get<IAssistantUsage>(`${this.baseUrl}usage`, {
        params: { days: days.toString() },
      })
      .pipe(retry(3));
  }

  getFunctions(): Observable<IAssistantFunction[]> {
    return this.httpClient
      .get<IAssistantFunction[]>(`${this.baseUrl}chat/functions`)
      .pipe(retry(3));
  }

  getHelp(): Observable<IAssistantHelp> {
    return this.httpClient
      .get<IAssistantHelp>(`${this.baseUrl}chat/help`)
      .pipe(retry(3));
  }

  createModel(model: IAssistantModel): Observable<IAssistantModel> {
    return this.httpClient
      .post<IAssistantModel>(`${this.baseUrl}models`, model)
      .pipe(retry(3));
  }

  deleteModel(id: string): Observable<any> {
    return this.httpClient.delete(`${this.baseUrl}models/${id}`).pipe(retry(3));
  }
}
