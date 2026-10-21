// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { StreamStatus } from './stream-status.interface';
import { StreamMetadata } from './stream-metadata.interface';

export interface StreamCallbacks {
  onStreamStart?: (conversationId: string, turnId: string | null) => void;
  onStatus?: (data: StreamStatus) => void;
  onContent?: (text: string) => void;
  onFunctionCall?: (data: { functionName: string; parameters: Record<string, unknown> }) => void;
  onFunctionResult?: (data: { functionName: string; functionResult: string; executionType: string; uiActionSteps?: string; uiActionTrackingId?: string }) => void;
  onMetadata?: (data: StreamMetadata) => void;
  /** turnId is null and executedCount is null when the event omits them; executedCount may exceed the label count when a label is unavailable. */
  onTurnStopped?: (turnId: string | null, executedSkillLabels: string[], executedCount: number | null) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}
