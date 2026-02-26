// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface EmailTestRequest {
  server: string;
  port: string;
  username: string;
  password: string;
  enableSSL: boolean;
  authenticationType: string;
  timeout: number;
}

export interface EmailTestResult {
  success: boolean;
  message: string;
  errorDetails?: string;
}

export interface ImapTestRequest {
  server: string;
  port: number;
  username: string;
  password: string;
  enableSSL: boolean;
  folder: string;
}