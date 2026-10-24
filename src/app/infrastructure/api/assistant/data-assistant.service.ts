// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { retryTransientHttpErrors } from 'src/app/infrastructure/helpers/http-retry.helper';
import { environment } from 'src/environments/environment';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';
import { IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';
import { IOnboardingState } from 'src/app/domain/models/assistant/onboarding-state.interface';
import { ISaveOnboardingStateRequest } from 'src/app/domain/models/assistant/save-onboarding-state-request.interface';
import { IWelcomeRequest } from 'src/app/domain/models/assistant/welcome-request.interface';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { ITurnOptionsRequest } from 'src/app/domain/models/assistant/turn-options.interface';
import { ISpeechModelCheckResponse } from '../../../domain/models/assistant/speech-model-check-response.interface';
import { IKlacksyModelCheckResponse } from '../../../domain/models/assistant/klacksy-model-check-response.interface';
import { IAssistantChatRequest } from '../../../domain/models/assistant/assistant-chat-request.interface';
import { IAssistantChatResponse } from '../../../domain/models/assistant/assistant-chat-response.interface';
import { IAssistantUsage } from '../../../domain/models/assistant/assistant-usage.interface';
import { IAssistantFunction } from '../../../domain/models/assistant/assistant-function.interface';
import { IAssistantHelp } from '../../../domain/models/assistant/assistant-help.interface';
import { IAutonomyLevelDto } from '../../../domain/models/assistant/autonomy-level-dto.interface';
import { IUpdateAutonomyLevelRequest } from '../../../domain/models/assistant/update-autonomy-level-request.interface';
import {
  IReportNavigationOutcomeRequest,
} from '../../../domain/models/assistant/report-navigation-outcome-request.interface';
import {
  IReportNavigationOutcomeResponse,
} from '../../../domain/models/assistant/report-navigation-outcome-response.interface';
import { ISubmitCorrectionRequest } from '../../../domain/models/assistant/submit-correction-request.interface';
import { ISubmitCorrectionResponse } from '../../../domain/models/assistant/submit-correction-response.interface';
import {
  ISubmitHelpfulFeedbackRequest,
} from '../../../domain/models/assistant/submit-helpful-feedback-request.interface';
import {
  IReportUiActionResultRequest,
} from '../../../domain/models/assistant/report-ui-action-result-request.interface';
import {
  IReportUiActionResultResponse,
} from '../../../domain/models/assistant/report-ui-action-result-response.interface';
import {
  ISubmitHelpfulFeedbackResponse,
} from '../../../domain/models/assistant/submit-helpful-feedback-response.interface';
import { ICancelTurnResponse } from '../../../domain/models/assistant/cancel-turn-response.interface';
import { ITurnOption } from 'src/app/domain/models/assistant/turn-option.interface';

export { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';

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

  enableModel(modelId: string): Observable<unknown> {
    return this.httpClient
      .post(`${this.baseUrl}models/${modelId}/enable`, {})
      .pipe(retry(3));
  }

  disableModel(modelId: string): Observable<unknown> {
    return this.httpClient
      .post(`${this.baseUrl}models/${modelId}/disable`, {})
      .pipe(retry(3));
  }

  setDefaultModel(modelId: string): Observable<unknown> {
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

  deleteModel(id: string): Observable<unknown> {
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

  /**
   * Stores the explanation-depth override "advanced" for the signed-in user (onboarding chip "I already
   * know Klacks") without an LLM turn. Completes on 204; 409 (no agent yet) and 400 arrive as errors.
   */
  setAdvancedExplainDepth(): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}chat/onboarding/explain-depth/advanced`,
      null,
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }

  /**
   * The skills that were offered to the model in the turn this message answered (C1). A POST because
   * the raw utterance travels in the body: the backend hashes it through MessageNormalizer, and a
   * query string would leak the user's message into the access logs. Skips the loading indicator -
   * the correction menu opens immediately and fills in afterwards.
   * @param request - The user message whose turn the correction menu is about to refine, plus the turn id
   *   when known (the server then never falls back to the message hash)
   */
  getTurnOptions(request: ITurnOptionsRequest): Observable<ITurnOption[]> {
    return this.httpClient.post<ITurnOption[]>(`${this.baseUrl}eval/turn-options`, request, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  submitCorrection(request: ISubmitCorrectionRequest): Observable<ISubmitCorrectionResponse> {
    return this.httpClient.post<ISubmitCorrectionResponse>(
      `${this.baseUrl}eval/correction`,
      request,
    );
  }

  /**
   * Marks the turn the given user message produced as helpful. The counterpart of submitCorrection:
   * the request carries no verdict, because the route itself is the verdict.
   * @param request - The user message whose answer helped, plus the turn id when known
   */
  submitHelpfulFeedback(
    request: ISubmitHelpfulFeedbackRequest,
  ): Observable<ISubmitHelpfulFeedbackResponse> {
    return this.httpClient.post<ISubmitHelpfulFeedbackResponse>(
      `${this.baseUrl}eval/feedback`,
      request,
    );
  }

  /**
   * Reports back what the browser actually did with a dispatched UI action (W1.4). Pure telemetry:
   * it never blocks the chat, so it skips the loading indicator, and it retries transient failures because a lost
   * report leaves the usage row stuck on "dispatched" forever.
   * @param request - Tracking id from the dispatch plus the outcome the browser observed
   */
  reportUiActionResult(
    request: IReportUiActionResultRequest,
  ): Observable<IReportUiActionResultResponse> {
    return this.httpClient
      .post<IReportUiActionResultResponse>(`${this.baseUrl}eval/ui-action-result`, request, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retryTransientHttpErrors());
  }

  /**
   * Reports what the browser actually did with a Klacksy navigation (W0). Every outcome is sent,
   * not only the failures: a miss rate needs a denominator, and the backend cannot reconstruct one
   * for the fast path, which writes no usage row at all.
   * @param request - Route, requested target and the outcome the browser observed
   */
  reportNavigationOutcome(
    request: IReportNavigationOutcomeRequest,
  ): Observable<IReportNavigationOutcomeResponse> {
    return this.httpClient
      .post<IReportNavigationOutcomeResponse>(`${this.baseUrl}eval/navigation-outcome`, request, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(retryTransientHttpErrors());
  }

  /**
   * Requests a cooperative stop of a running turn: the server answers 202 and ends the turn at its
   * next safe point, or 404 when the turn is unknown, foreign or already finished. No retry:
   * retrying would burn the 3-second grace window the caller waits before falling back to a hard
   * local abort.
   * @param turnId - Id the backend assigned in the stream_start SSE event
   */
  cancelTurn(turnId: string): Observable<ICancelTurnResponse> {
    return this.httpClient.post<ICancelTurnResponse>(
      `${this.baseUrl}chat/turns/${turnId}/cancel`,
      {},
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }
}
