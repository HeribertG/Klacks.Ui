// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toast notification service abstraction for plugins.
 * @param showError - Displays an error toast
 * @param showSuccess - Displays a success toast with header
 */

export interface IPluginToastService {
  showError(message: string): void;
  showSuccess(message: string, header: string): void;
}
