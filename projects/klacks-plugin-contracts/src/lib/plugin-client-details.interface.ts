// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Contact details of a client exposed to plugins.
 */

import { IPluginClientCommunication } from './plugin-client-communication.interface';
import { IPluginClientImage } from './plugin-client-image.interface';

export interface IPluginClientDetails {
  communications: IPluginClientCommunication[];
  clientImage: IPluginClientImage | undefined;
}
