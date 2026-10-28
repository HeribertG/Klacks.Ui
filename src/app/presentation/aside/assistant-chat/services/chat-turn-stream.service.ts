// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One streamed chat turn of an assistant chat instance: posts the user message, opens the streaming
 * assistant message, consumes the SSE callbacks (status, tool steps, content, metadata, stop, done,
 * error), triggers function calls, reply toasts and the fast-path navigation, and owns the stream's
 * abort controller and teardown. Registers itself as the composer's sender and as the turn-control
 * hooks for stop and hard abort.
 * @param turn - Per-turn context: assistant message id, turn sequence, stop check and the sent text
 */
import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { StreamCallbacks } from 'src/app/domain/models/assistant/stream-callbacks.interface';
import { StreamMetadata } from 'src/app/domain/models/assistant/stream-metadata.interface';
import { StreamStatus } from 'src/app/domain/models/assistant/stream-status.interface';
import {
  NAVIGATION_CONTENT_KEY_PATTERN,
  WORKPLACE_ROUTE_PREFIX,
} from 'src/app/domain/constants/navigation-outcome.constants';
import { EXPLAIN_PAGE_SKILL_PREFIX } from 'src/app/domain/constants/page-explain-icons.constants';
import { playgroundErrorI18nKey } from 'src/app/domain/helpers/playground-token-limit.helper';
import { PlaygroundSendGuardService } from 'src/app/presentation/playground/playground-send-guard.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { formatMessage, stripMetadataMarkers } from 'src/app/shared/helpers/assistant-text.helper';
import { AsideService } from '../../aside.service';
import { ChatMessage } from '../chat-message.interface';
import { createChatMessageId } from '../chat-ids.helper';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatStageStatusService } from './chat-stage-status.service';
import { ChatTurnControlService } from './chat-turn-control.service';
import { ChatFunctionExecutionService } from './chat-function-execution.service';
import { NavigationVerdictService } from './navigation-verdict.service';
import { TextToSpeechService } from './text-to-speech.service';
import { ChatAutoSpeakService } from './chat-auto-speak.service';
import { ChatComposerService } from './chat-composer.service';
import { ChatTranscriptService } from './chat-transcript.service';
import { ChatStreamBufferService } from './chat-stream-buffer.service';
import { ChatSessionService } from './chat-session.service';
import { ChatOnboardingTourService } from './chat-onboarding-tour.service';
import { ChatReplyToastService } from './chat-reply-toast.service';
import { IChatStreamTurn } from './chat-stream-turn.interface';

const FAST_PATH_NAVIGATE_DELAY_MS = 0;
const FUNCTION_NAME_KEY = 'FunctionName';
const FUNCTION_NAME_CAMEL_KEY = 'functionName';
const ERROR_SEPARATOR = '\n\n';
const QUERY_SEPARATOR = '?';
const FRAGMENT_SEPARATOR = '#';

@Injectable()
export class ChatTurnStreamService {
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly chatStageStatus = inject(ChatStageStatusService);
  private readonly turnControl = inject(ChatTurnControlService);
  private readonly chatFunctionExecution = inject(ChatFunctionExecutionService);
  private readonly navigationVerdict = inject(NavigationVerdictService);
  private readonly klacksyNavigation = inject(KlacksyNavigationService);
  private readonly ttsService = inject(TextToSpeechService);
  private readonly outputModes = inject(SpeechOutputModeService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly asideService = inject(AsideService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly autoSpeak = inject(ChatAutoSpeakService);
  private readonly composer = inject(ChatComposerService);
  private readonly transcript = inject(ChatTranscriptService);
  private readonly buffer = inject(ChatStreamBufferService);
  private readonly session = inject(ChatSessionService);
  private readonly tour = inject(ChatOnboardingTourService);
  private readonly replyToasts = inject(ChatReplyToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly playgroundSendGuard = inject(PlaygroundSendGuardService);

  private currentStreamController: AbortController | null = null;
  private sawFunctionCall = false;
  private fastPathNavigationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.composer.registerSender(() => this.sendMessage());

    this.destroyRef.onDestroy(() => {
      this.buffer.cancelFrame();
      this.ttsService.stop();
      this.chatStageStatus.clear();
    });

    this.turnControl.registerHooks({
      silence: () => {
        this.ttsService.interrupt();
        this.orchestrator.stopAutoSpeak();
      },
      hardAbort: () => this.hardAbortStream(),
      hadToolSteps: () => this.sawFunctionCall,
    });

    this.destroyRef.onDestroy(() => {
      if (!this.asideService.isVisible()) {
        this.turnControl.cancelRunningExecutions();
        this.clearFastPathNavigation();
      }
      void this.turnControl.stop('panel-closed');
    });
  }

  currentAbortController(): AbortController | null {
    return this.currentStreamController;
  }

  async sendMessage(): Promise<void> {
    if (!this.composer.inputText().trim()) {
      return;
    }

    if (!(await this.playgroundSendGuard.allowSendWhenReady(() => this.composer.inputText()))) {
      return;
    }

    await this.settlePreviousTurn();
    const messageText = this.postUserMessage();
    const turn = this.openAssistantTurn(messageText);

    const voiceModeActive =
      this.orchestrator.voiceModeEnabled() || this.outputModes.isAutoSpeakMode();
    this.currentStreamController = this.assistantService.sendMessageStream(
      messageText,
      this.session.conversationId,
      this.buildCallbacks(turn),
      voiceModeActive,
    );
  }

  private async settlePreviousTurn(): Promise<void> {
    this.turnControl.cancelRunningExecutions();
    if (this.turnControl.isTurnRunning() || this.turnControl.isStopping()) {
      await this.turnControl.stop('superseded');
    } else {
      this.ttsService.interrupt();
      this.orchestrator.stopAutoSpeak();
    }
  }

  private postUserMessage(): string {
    const userContent = this.composer.inputText().trim();
    const userMessage: ChatMessage = {
      id: createChatMessageId(),
      sender: 'user',
      content: userContent,
      formattedContent: formatMessage(userContent),
      timestamp: new Date(),
    };

    this.orchestrator.addMessage(userMessage);
    if (!this.tour.isStationPending()) {
      this.toastShowService.dismissInteractiveReplies();
    }
    const messageText = this.composer.inputText();
    this.composer.inputText.set('');
    this.transcript.requestScrollToBottom();
    return messageText;
  }

  private openAssistantTurn(messageText: string): IChatStreamTurn {
    const assistantMessageId = createChatMessageId();
    this.orchestrator.addMessage({
      id: assistantMessageId,
      sender: 'assistant',
      content: '',
      formattedContent: '',
      timestamp: new Date(),
      isStreaming: true,
      respondedToUserMessage: messageText.trim(),
    });
    const turnSeq = this.turnControl.beginTurn(assistantMessageId);
    const isStopped = this.turnControl.captureCancellation(turnSeq);
    this.chatStageStatus.startMessage(assistantMessageId);
    this.sawFunctionCall = false;
    this.buffer.begin(isStopped);
    this.transcript.detectChanges();
    return { assistantMessageId, turnSeq, isStopped, messageText };
  }

  private buildCallbacks(turn: IChatStreamTurn): StreamCallbacks {
    return {
      onStreamStart: (convId: string, turnId: string | null) => this.onStreamStart(turn, convId, turnId),
      onStatus: (data: StreamStatus) => this.ngZone.run(() => this.onStatus(data)),
      onFunctionCall: (data: { functionName: string; parameters: Record<string, unknown> }) =>
        this.ngZone.run(() => this.onFunctionCall(turn, data.functionName)),
      onFunctionResult: (data: { functionName: string }) => this.ngZone.run(() => this.onFunctionResult(data.functionName)),
      onContent: (rawText: string) => this.onContent(turn, rawText),
      onMetadata: (data: StreamMetadata) => this.ngZone.run(() => this.onMetadata(turn, data)),
      onTurnStopped: (turnId: string | null, executedSkillLabels: string[], executedCount: number | null) =>
        this.ngZone.run(() => this.onTurnStopped(turnId, executedSkillLabels, executedCount)),
      onDone: () => this.ngZone.run(() => this.onDone(turn)),
      onError: (message: string, errorCode?: string) =>
        this.ngZone.run(() => this.onError(turn, message, errorCode)),
    };
  }

  private onStreamStart(turn: IChatStreamTurn, conversationId: string, turnId: string | null): void {
    this.session.adoptConversationId(conversationId);
    if (turnId) {
      this.turnControl.setTurnId(turnId);
      this.ngZone.run(() => this.orchestrator.updateMessage(turn.assistantMessageId, { respondedToTurnId: turnId }));
    }
  }

  private onStatus(data: StreamStatus): void {
    this.chatStageStatus.applyStatus(data.stage);
    this.transcript.detectChanges();
  }

  private onFunctionCall(turn: IChatStreamTurn, functionName: string): void {
    this.sawFunctionCall = true;
    if (!turn.isStopped()) {
      this.chatFunctionExecution.navigateForStreamedExplainCall(functionName, turn.turnSeq);
    }
    this.orchestrator.onStreamFunctionCall();
    this.chatStageStatus.addToolStep(functionName);
    this.transcript.requestScrollToBottom();
    this.transcript.detectChanges();
  }

  private onFunctionResult(functionName: string): void {
    this.chatStageStatus.markToolStepDone(functionName);
    this.transcript.detectChanges();
  }

  private onContent(turn: IChatStreamTurn, rawText: string): void {
    const text = this.resolveNavigationContentKey(rawText);
    if (this.chatStageStatus.toolSteps().length > 0) {
      this.orchestrator.onStreamPlanningEnded();
    }
    this.chatStageStatus.onContentStarted();
    this.buffer.append(turn.assistantMessageId, text);
  }

  private onMetadata(turn: IChatStreamTurn, data: StreamMetadata): void {
    this.finalizeAnswer(turn.assistantMessageId, data);
    this.chatStageStatus.clear();
    this.transcript.requestScrollToBottom();

    const offerableNavigateTo = this.offerableNavigateTo(data);
    if (!this.tour.tryReshowPendingStationChips()) {
      this.presentTurnReplies(data, offerableNavigateTo);
    }

    if (data.functionCalls && data.functionCalls.length > 0) {
      this.chatFunctionExecution.executeFunctionCalls(
        data.functionCalls,
        turn.assistantMessageId,
        turn.messageText,
        turn.turnSeq,
      );
    } else if (data.navigateTo && data.actionPerformed && data.navigateTo.startsWith(WORKPLACE_ROUTE_PREFIX)) {
      this.scheduleFastPathNavigation(turn, data.navigateTo, data.target || undefined);
    }

    if (data.missedTargetId) {
      this.navigationVerdict.applySuspectedMiss(turn.assistantMessageId);
    }

    this.transcript.detectChanges();
  }

  private finalizeAnswer(assistantMessageId: string, data: StreamMetadata): void {
    this.buffer.drain(assistantMessageId);
    const current = this.findMessage(assistantMessageId);
    const cleanedFinal = stripMetadataMarkers(current?.content ?? '');
    this.orchestrator.updateMessage(assistantMessageId, {
      isStreaming: false,
      content: cleanedFinal,
      formattedContent: formatMessage(cleanedFinal),
      suggestions: data.suggestedReplies ? undefined : data.suggestions,
      suggestedReplies: data.suggestedReplies,
      navigateTo: data.navigateTo,
      actionPerformed: data.actionPerformed,
    });
  }

  private presentTurnReplies(data: StreamMetadata, offerableNavigateTo: string | null): void {
    if (data.suggestedReplies) {
      this.replyToasts.showRepliesAsToast(data.suggestedReplies);
    } else if (offerableNavigateTo || (data.suggestions && data.suggestions.length > 0)) {
      this.replyToasts.showActionsAsToast(data.suggestions, offerableNavigateTo);
    } else {
      this.toastShowService.dismissInteractiveReplies();
    }
  }

  private scheduleFastPathNavigation(turn: IChatStreamTurn, navigateTo: string, target: string | undefined): void {
    this.clearFastPathNavigation();
    this.fastPathNavigationTimer = setTimeout(() => {
      this.fastPathNavigationTimer = null;
      if (turn.isStopped()) return;
      void this.klacksyNavigation
        .navigateAndScroll(navigateTo, target)
        .then((outcome) =>
          this.navigationVerdict.apply(turn.assistantMessageId, outcome, navigateTo, target, turn.messageText),
        );
    }, FAST_PATH_NAVIGATE_DELAY_MS);
  }

  private onTurnStopped(turnId: string | null, executedSkillLabels: string[], executedCount: number | null): void {
    if (this.turnControl.notifyTurnStopped(turnId, executedSkillLabels, executedCount)) {
      this.chatStageStatus.clear();
      this.transcript.detectChanges();
    }
  }

  private onDone(turn: IChatStreamTurn): void {
    this.buffer.drain(turn.assistantMessageId);
    const doneMessage = this.findMessage(turn.assistantMessageId);
    const doneContent = doneMessage?.content ?? '';
    this.orchestrator.updateMessage(turn.assistantMessageId, {
      isStreaming: false,
      formattedContent: doneMessage?.formattedContent ?? formatMessage(doneContent),
    });
    this.finishTurn();
    this.orchestrator.onStreamDone();
    if (!turn.isStopped()) {
      this.autoSpeak.maybeAutoSpeak(doneMessage);
    }
    this.transcript.focusInputSoon();
  }

  private onError(turn: IChatStreamTurn, rawMessage: string, errorCode?: string): void {
    this.buffer.drain(turn.assistantMessageId);
    const playgroundKey = playgroundErrorI18nKey(errorCode);
    const message = playgroundKey ? this.translateService.instant(playgroundKey) : rawMessage;
    const existing = this.findMessage(turn.assistantMessageId)?.content ?? '';
    const merged = existing ? `${existing}${ERROR_SEPARATOR}${message}` : message;
    this.orchestrator.updateMessage(turn.assistantMessageId, {
      isStreaming: false,
      content: merged,
      formattedContent: formatMessage(merged),
    });
    this.finishTurn();
    this.orchestrator.onStreamError(errorCode);
  }

  private finishTurn(): void {
    this.transcript.requestScrollToBottom();
    this.turnControl.endTurn();
    this.chatStageStatus.clear();
    this.currentStreamController = null;
    this.transcript.detectChanges();
  }

  private hardAbortStream(): void {
    if (this.currentStreamController) {
      this.currentStreamController.abort();
      this.currentStreamController = null;
    }
    const streamingMessage = this.orchestrator.messages().find((m) => m.isStreaming);
    if (streamingMessage) {
      this.buffer.drain(streamingMessage.id);
      const finalized = this.findMessage(streamingMessage.id);
      this.orchestrator.updateMessage(streamingMessage.id, {
        isStreaming: false,
        formattedContent: finalized?.formattedContent ?? formatMessage(finalized?.content ?? ''),
      });
    }
    this.chatStageStatus.clear();
    this.buffer.clear();
    this.klacksyNavigation.clearExplainScrollQueue();
  }

  private clearFastPathNavigation(): void {
    if (this.fastPathNavigationTimer !== null) {
      clearTimeout(this.fastPathNavigationTimer);
      this.fastPathNavigationTimer = null;
    }
  }

  private offerableNavigateTo(data: StreamMetadata): string | null {
    const navigateTo = data.navigateTo;
    if (!navigateTo) {
      return null;
    }

    const explainCallNavigates = (data.functionCalls ?? []).some((call) => {
      const name = (call[FUNCTION_NAME_KEY] ?? call[FUNCTION_NAME_CAMEL_KEY]) as string | undefined;
      return !!name && name.startsWith(EXPLAIN_PAGE_SKILL_PREFIX);
    });

    if (explainCallNavigates || this.isCurrentRoute(navigateTo)) {
      return null;
    }

    return navigateTo;
  }

  private isCurrentRoute(route: string): boolean {
    const current = this.router.url.split(QUERY_SEPARATOR)[0].split(FRAGMENT_SEPARATOR)[0];
    return current === route || current.startsWith(`${route}/`);
  }

  /**
   * Turns a navigation acknowledgement that arrived as a bare i18n key into the sentence the user
   * should read. The backend streams NavigationResponseKeys unresolved by design ("The frontend
   * resolves them via its translation store"). Anything that is not exactly one known nav key is
   * left untouched.
   * @param text - One raw content chunk as it came off the SSE stream
   */
  private resolveNavigationContentKey(text: string): string {
    const key = text.trim();
    if (!NAVIGATION_CONTENT_KEY_PATTERN.test(key)) return text;

    const translated = this.translateService.instant(key);
    return translated === key ? text : translated;
  }

  private findMessage(messageId: string): ChatMessage | undefined {
    return this.orchestrator.messages().find((m) => m.id === messageId);
  }
}
