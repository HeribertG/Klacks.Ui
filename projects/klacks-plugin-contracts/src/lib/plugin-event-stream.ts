// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Type definition for the plugin event stream (SignalR events from host).
 */

import { Observable } from 'rxjs';

export type PluginEventStream = Observable<unknown>;
