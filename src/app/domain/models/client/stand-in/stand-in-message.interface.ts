// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * An i18n key with its interpolation parameters, as the stand-in dialogs show it.
 */
export interface StandInMessage {
  key: string;
  params?: Record<string, string | number>;
}
