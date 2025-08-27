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