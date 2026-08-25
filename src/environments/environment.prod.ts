// Copyright (c) Heribert Gasparoli Private. All rights reserved.

// Production environment configuration
export const environment = {
  production: true,
  baseUrl: '/api/backend/',
  baseAssistantUrl: '/api/backend/assistant/',
  healthUrl: '/api/backend/health',
  
  // Production specific settings
  enableDebugMode: false,
  logLevel: 'error', // Only log errors in production
  
  // API timeouts (shorter for production)
  apiTimeout: 10000, // 10 seconds
  
  // Feature flags for production
  enableMockData: false,
  enableConsoleLogging: false,
  
  // Production tools (disabled for performance)
  enableAngularDevTools: false,

  // Donation payment providers (Phase 2).
  // Alle Werte leer/false lassen, um die jeweilige Zahlweise im Spenden-Dialog auszublenden.
  donation: {
    paypalMeBaseUrl: '',
    stripePaymentLinks: [] as { currency: 'CHF' | 'EUR'; amount: number; url: string }[],
    stripePublishableKey: '',
    twintEnabled: false,
    twintLinkUrl: '',
  }
};
