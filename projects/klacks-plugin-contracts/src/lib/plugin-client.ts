// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Slim client interface exposed to plugins.
 * Contains only the fields plugins typically need for display.
 */

export interface IPluginClient {
  idNumber: number;
  firstName: string;
  name: string;
}
