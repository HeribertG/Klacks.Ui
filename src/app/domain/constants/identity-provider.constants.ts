// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Defaults of the identity provider form (ports, user filters per directory type) and the constants of the directory
 * approval list (Api path, search limits, error code to i18n key map).
 */

import { IdentityProviderType } from '../enums/identity-provider-enum';

export const LDAP_DEFAULT_PORT = 389;

export const LDAPS_DEFAULT_PORT = 636;

/** Directory provider types; only these have a connection tab and an approval list. */
export type DirectoryProviderType = IdentityProviderType.Ldap | IdentityProviderType.ActiveDirectory;

/** User filter a new provider of each directory type starts with, equal to the backend default of that type. */
export const DEFAULT_USER_FILTER: Readonly<Record<DirectoryProviderType, string>> = {
  [IdentityProviderType.Ldap]: '(objectClass=person)',
  [IdentityProviderType.ActiveDirectory]: '(&(objectCategory=person)(objectClass=user))',
};

/**
 * Every filter the form ever filled in by itself per type, including the older AD default with the reversed order that
 * existing providers still hold. A filter from this list is replaced on a type change; anything else was typed by the
 * administrator and is kept.
 */
export const KNOWN_DEFAULT_USER_FILTERS: Readonly<Record<DirectoryProviderType, readonly string[]>> = {
  [IdentityProviderType.Ldap]: [DEFAULT_USER_FILTER[IdentityProviderType.Ldap]],
  [IdentityProviderType.ActiveDirectory]: [
    DEFAULT_USER_FILTER[IdentityProviderType.ActiveDirectory],
    '(&(objectClass=user)(objectCategory=person))',
  ],
};

/** Shown after a counted number when the directory stopped at its server limit, so the real number is higher. */
export const TRUNCATED_COUNT_SUFFIX = '+';

/** Warning for an Active Directory provider without SSL: AD signs in only over LDAPS, so the approval list stays closed. */
export const AD_REQUIRES_SSL_WARNING_KEY = 'settings.identity-provider.warning.ad-requires-ssl';

/** Warning for an LDAP provider without SSL: passwords are sent unencrypted. */
export const LDAP_UNENCRYPTED_WARNING_KEY = 'settings.identity-provider.warning.ldap-unencrypted';

/** Path segment of the approval list endpoints; their failures are reported by the accounts tab itself. */
export const DIRECTORY_ACCOUNTS_API_SEGMENT = 'DirectoryAccounts';

export const DIRECTORY_ACCOUNTS_ACCESS_API_SEGMENT = 'Access';

/** Query parameter of the server-side search of the approval list. */
export const DIRECTORY_ACCOUNTS_SEARCH_PARAM = 'search';

/** Wait after the last keystroke before the approval list is searched again. */
export const DIRECTORY_ACCOUNTS_SEARCH_DEBOUNCE_MS = 300;

/** Longest search text the Api accepts (DirectoryAccountLimits). */
export const DIRECTORY_ACCOUNTS_SEARCH_MAX_LENGTH = 100;

export const DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY = 'settings.identity-provider.accounts.error.generic';

/** i18n key of each coded refusal of an approval change; any other failure uses the generic key. */
export const DIRECTORY_ACCOUNT_ERROR_KEYS: Readonly<Record<string, string>> = {
  directoryAccountNotFound: 'settings.identity-provider.accounts.error.directoryAccountNotFound',
  directoryAccountWithoutEmail: 'settings.identity-provider.accounts.error.directoryAccountWithoutEmail',
  directoryAccountEmailTaken: 'settings.identity-provider.accounts.error.directoryAccountEmailTaken',
  directoryProviderNotUsableForLogin: 'settings.identity-provider.accounts.error.directoryProviderNotUsableForLogin',
  directoryAccountHasRoles: 'settings.identity-provider.accounts.error.directoryAccountHasRoles',
  directoryAccountNotLinked: 'settings.identity-provider.accounts.error.directoryAccountNotLinked',
};
