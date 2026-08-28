// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import {
  IOnboardingState,
  ISaveOnboardingStateRequest,
  IWelcomeRequest,
  IWelcomeResponse,
} from 'src/app/domain/models/assistant/welcome.interface';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

export interface ISpeechModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  error: string | null;
}

export interface ISpeechModelCheckResponse {
  models: ISpeechModelCheckDto[];
}

export interface IKlacksyModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  supportsToolCalling: boolean;
  latencyMs: number;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  qualifies: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  error: string | null;
}

export interface IKlacksyModelCheckResponse {
  models: IKlacksyModelCheckDto[];
  defaultModelId: string | null;
}

export interface IAssistantChatRequest {
  message: string;
  conversationId?: string;
  modelId?: string;
  language?: string;
  context?: any;
  agentId?: string;
  pageContext?: import('src/app/domain/models/assistant/assistant-page-context.interface').IAssistantPageContext;
  isVoiceMode?: boolean;
}

export interface IAssistantChatResponse {
  message: string;
  conversationId: string;
  suggestions?: string[];
  suggestedReplies?: ISuggestedRepliesConfig;
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

export interface IAutonomyLevelDto {
  level: number;
  name: string;
}

export interface IUpdateAutonomyLevelRequest {
  level: number;
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

  getAutonomyLevel(): Observable<IAutonomyLevelDto> {
    return this.httpClient
      .get<IAutonomyLevelDto>(`${this.baseUrl}autonomy-level`)
      .pipe(retry(3));
  }

  setAutonomyLevel(request: IUpdateAutonomyLevelRequest): Observable<IAutonomyLevelDto> {
    return this.httpClient
      .put<IAutonomyLevelDto>(`${this.baseUrl}autonomy-level`, request)
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

  checkSpeechModels(): Observable<ISpeechModelCheckResponse> {
    return this.httpClient.post<ISpeechModelCheckResponse>(
      `${this.baseUrl}models/check-speech`,
      {},
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }

  optimizeForKlacksy(): Observable<IKlacksyModelCheckResponse> {
    return this.httpClient.post<IKlacksyModelCheckResponse>(
      `${this.baseUrl}models/optimize-for-klacksy`,
      {},
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
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

  warmup(): void {
    // Cache warm-up is best-effort; a failure (e.g. a rate limit) must never surface a user-facing error.
    this.httpClient.get(`${this.baseUrl}chat/warmup`).subscribe({
      error: () => undefined,
    });
  }

  getWelcome(request: IWelcomeRequest): Observable<IWelcomeResponse> {
    const params: Record<string, string> = {
      lang: request.lang,
      localHour: request.localHour.toString(),
      weekday: request.weekday.toString(),
    };
    if (request.route) params['route'] = request.route;
    if (request.displayName) params['displayName'] = request.displayName;
    if (request.latitude !== undefined) params['latitude'] = request.latitude.toString();
    if (request.longitude !== undefined) params['longitude'] = request.longitude.toString();
    if (request.excludeVariantIndex !== undefined) {
      params['excludeVariantIndex'] = request.excludeVariantIndex.toString();
    }
    if (request.isReopen) {
      params['isReopen'] = 'true';
    }

    return this.httpClient.get<IWelcomeResponse>(
      `${this.baseUrl}chat/welcome`,
      {
        params,
        context: new HttpContext().set(SKIP_LOADING, true),
      },
    );
  }

  saveOnboardingState(request: ISaveOnboardingStateRequest): Observable<IOnboardingState> {
    return this.httpClient.post<IOnboardingState>(
      `${this.baseUrl}chat/onboarding/state`,
      request,
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }

  submitCorrection(request: ISubmitCorrectionRequest): Observable<ISubmitCorrectionResponse> {
    return this.httpClient.post<ISubmitCorrectionResponse>(
      `${this.baseUrl}eval/correction`,
      request,
    );
  }
}

export interface ISubmitCorrectionRequest {
  userMessage: string;
  correctionType: 'wrong_skill' | 'wrong_param' | 'repeated_request' | 'none_needed';
  expectedSkill?: string;
}

export interface ISubmitCorrectionResponse {
  found: boolean;
  trajectoryId: string | null;
}
