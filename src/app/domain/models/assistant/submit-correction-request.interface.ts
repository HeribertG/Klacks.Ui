// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISubmitCorrectionRequest {
  userMessage: string;
  correctionType: 'wrong_skill' | 'wrong_param' | 'repeated_request' | 'none_needed';
  expectedSkill?: string;

  /** Id of the corrected turn; omitted when unknown, which makes the server fall back to the message-hash lookup. */
  turnId?: string;
}
