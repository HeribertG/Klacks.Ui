// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { UiActionType } from './ui-action-type.type';

/**
 * Outcome of one UiAction config run. Needed because a config with onError 'continue' swallows its
 * step errors: without a returned verdict the caller cannot tell a fully executed action from one
 * that logged three failures and carried on, and would report success for both (W1.4).
 */
export interface IUiActionExecutionOutcome {
  succeeded: boolean;
  failedStep?: UiActionType;
  error?: string;
  /** Set when the run stopped early because the turn it belongs to was stopped (§4.5); never sent to the backend. */
  cancelled?: boolean;
}
