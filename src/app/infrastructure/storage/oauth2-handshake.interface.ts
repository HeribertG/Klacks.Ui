// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface OAuth2Handshake {
  state: string | null;
  redirectUri: string | null;
}
