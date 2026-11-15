// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the OAuth connection settings. The modes and limits mirror
 * Klacks.Api/Domain/Constants/OAuthConnectionModes.cs and OAuthTrustedRedirects.cs; the server validator stays
 * authoritative, the frontend only uses them to reject input early.
 */
export const OAUTH_CONNECTION_MODE = {
  Trusted: 'trusted',
  Off: 'off',
} as const;

export const OAUTH_CUSTOM_TARGET_MAX_ENTRIES = 50;
export const OAUTH_CUSTOM_TARGET_MAX_LENGTH = 2048;
export const OAUTH_CUSTOM_TARGET_HTTPS_PREFIX = 'https://';
export const OAUTH_CUSTOM_TARGET_DEFAULT_PORT = '443';
export const OAUTH_CUSTOM_TARGET_MAX_LABEL_LENGTH = 63;

export const OAUTH_CUSTOM_TARGET_ERROR = {
  Empty: 'setting.oauthConnection.error.empty',
  TooLong: 'setting.oauthConnection.error.too-long',
  NotHttps: 'setting.oauthConnection.error.not-https',
  ForbiddenCharacters: 'setting.oauthConnection.error.forbidden-characters',
  Port: 'setting.oauthConnection.error.port',
  HostMissing: 'setting.oauthConnection.error.host-missing',
  HostInvalid: 'setting.oauthConnection.error.host-invalid',
  IpAddress: 'setting.oauthConnection.error.ip-address',
  Localhost: 'setting.oauthConnection.error.localhost',
  Path: 'setting.oauthConnection.error.path',
  Duplicate: 'setting.oauthConnection.error.duplicate',
  LimitReached: 'setting.oauthConnection.error.limit-reached',
} as const;
