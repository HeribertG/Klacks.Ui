// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AssistantStatusStage } from 'src/app/domain/constants/assistant-status-stage.constants';

export interface StreamStatus {
  stage: AssistantStatusStage;
  /** Milliseconds since the request started; the backend omits the field rather than sending null, and 0 is a legitimate value on the very first event, so callers must never test it for truthiness. */
  elapsedMs: number | null;
  /** 1-based multi-turn iteration number; only present on `calling_model` and `executing_tool`. */
  iteration?: number;
}
