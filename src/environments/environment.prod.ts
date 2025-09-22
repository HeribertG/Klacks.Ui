// Production environment configuration
export const environment = {
  production: true,
  baseUrl: 'http://157.180.42.127:5000/api/v1/backend/',
  baseAssistantUrl: 'http://157.180.42.127:5000/api/v1/backend/assistant/',
  
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
