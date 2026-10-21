// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ImapTestRequest {
  server: string;
  port: number;
  username: string;
  password: string;
  enableSSL: boolean;
  folder: string;
}
