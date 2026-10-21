// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface EmailTestRequest {
  server: string;
  port: string;
  username: string;
  password: string;
  enableSSL: boolean;
  authenticationType: string;
  timeout: number;
}

