// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Slim client interface exposed to plugins.
 * Contains only the fields plugins typically need for display.
 */

export interface IPluginClient {
  id: string | undefined;
  idNumber: number;
  firstName: string;
  name: string;
}
