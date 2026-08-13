// Copyright (c) Heribert Gasparoli Private. All rights reserved.

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with specific environment files.
// The list of file replacements can be found in `angular.json`.
//
// Default environment configuration (fallback)
// For specific environments, use:
// - environment.dev.ts for development
// - environment.prod.ts for production

export const environment = {
  production: false,
  _baseUrl: 'https://localhost:44371/api/backend/',
  baseUrl: 'https://localhost:5001/api/backend/',
  baseAssistantUrl: 'https://localhost:5001/api/backend/assistant/',
  healthUrl: 'https://localhost:5001/api/backend/health',
  
  // Default settings
  enableDebugMode: false,
  logLevel: 'info',
  apiTimeout: 15000, // 15 seconds
  enableMockData: false,
  enableConsoleLogging: false,
  enableAngularDevTools: false
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
