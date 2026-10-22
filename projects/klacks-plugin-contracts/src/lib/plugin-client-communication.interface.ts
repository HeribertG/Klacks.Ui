// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Communication entry of a client (phone, e-mail, ...) exposed to plugins.
 */

export interface IPluginClientCommunication {
  isPhone: boolean;
  value: string;
}
