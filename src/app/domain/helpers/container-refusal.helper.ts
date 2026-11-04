// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Coded 400 refusals around containers that the interceptor explains in the user's language: a container (schedule) or
 * container template whose service, absence or travel, briefing or debriefing time reaches outside the container, and an
 * expense on a service inside a container (expenses belong to the container), and confirming a service inside a container
 * on its own (the container confirms its services). The open dialog keeps what was entered.
 * @param error - The failed response
 */

import { readRefusalCode } from './read-refusal-code.helper';

export const CONTAINER_REFUSAL_TOAST_NAME = 'container-refused';

const CONTAINER_REFUSAL_KEYS: Readonly<Record<string, string>> = {
  CONTAINER_ITEM_OUTSIDE: 'schedule.container-fit.outside',
  EXPENSE_ON_CONTAINER_SERVICE: 'schedule.container-expense.refused',
  CONTAINER_CHILD_CONFIRM_REFUSED: 'schedule.container-child.confirm-refused',
};

export function containerRefusalKey(error: unknown): string | null {
  const code = readRefusalCode(error);
  return code ? (CONTAINER_REFUSAL_KEYS[code] ?? null) : null;
}
