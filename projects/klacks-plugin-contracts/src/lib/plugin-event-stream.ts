// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Type definition for the plugin event stream (SignalR events from host).
 */

import { Observable } from 'rxjs';

export type PluginEventStream = Observable<unknown>;
