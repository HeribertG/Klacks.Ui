// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import * as signalR from '@microsoft/signalr';

export interface SignalRConnectionCallbacks {
  onConnected: () => Promise<void>;
  onReconnecting: () => Promise<void>;
  onReconnected: (hub: signalR.HubConnection) => Promise<void>;
  onClosed: () => void;
}
