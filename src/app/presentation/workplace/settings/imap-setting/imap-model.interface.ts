// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ImapModel {
  server: string;
  port: string;
  username: string;
  password: string;
  enableSSL: string;
  folder: string;
  pollInterval: string;
}
