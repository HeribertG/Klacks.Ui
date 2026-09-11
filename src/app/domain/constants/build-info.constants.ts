// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Build identity of a development build: ng serve, unit tests and any Docker build without the
 * KLACKS_VERSION / KLACKS_BUILD_KEY build arguments. A bundle with DEV_BUILD_KEY never checks for a
 * newer deployed version and shows no version in the header.
 */
export const DEV_BUILD_KEY = 'dev';
export const DEV_BUILD_VERSION = '0.0.0';
