// Copyright (c) Heribert Gasparoli Private. All rights reserved.

// Production environment configuration
export const environment = {
  production: true,
  baseUrl: '/api/backend/',
  baseAssistantUrl: '/api/backend/assistant/',
  healthUrl: '/health',
  
  // Production specific settings
  enableDebugMode: false,
  logLevel: 'error', // Only log errors in production
  
  // API timeouts (shorter for production)
  apiTimeout: 10000, // 10 seconds
  
  // Feature flags for production
  enableMockData: false,
  enableConsoleLogging: false,
  
  // Production tools (disabled for performance)
  enableAngularDevTools: false
};
