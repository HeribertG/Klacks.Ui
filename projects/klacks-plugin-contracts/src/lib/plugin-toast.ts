// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Toast notification service abstraction for plugins.
 * @param showError - Displays an error toast
 * @param showSuccess - Displays a success toast with header
 */

export interface IPluginToastService {
  showError(message: string): void;
  showSuccess(message: string, header: string): void;
}
