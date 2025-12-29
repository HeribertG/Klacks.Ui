// Development environment configuration
export const environment = {
  production: false,
  _baseUrl: 'https://localhost:44371/api/backend/',
  baseUrl: 'https://localhost:5001/api/backend/',
  baseAssistantUrl: 'https://localhost:5001/api/backend/assistant/',
  
  // Development specific settings
  enableDebugMode: true,
  logLevel: 'debug',
  
  // API timeouts (longer for development/debugging)
  apiTimeout: 30000, // 30 seconds
  
  // Feature flags for development
  enableMockData: false,
  enableConsoleLogging: true,
  
  // Development tools
  enableAngularDevTools: true
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.