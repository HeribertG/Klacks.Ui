// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Rules of the directory provider form: the defaults of a provider being edited (user filter of its type, a port that
 * fits the SSL setting; a filter the administrator typed is never overwritten), whether it can be used for sign-in and
 * which transport warning it gets.
 * @param provider - The provider being edited (changed in place)
 */

import { IdentityProviderType } from '../enums/identity-provider-enum';
import { IIdentityProvider } from '../interfaces/identity-provider.interface';
import {
  AD_REQUIRES_SSL_WARNING_KEY,
  DEFAULT_USER_FILTER,
  DirectoryProviderType,
  KNOWN_DEFAULT_USER_FILTERS,
  LDAPS_DEFAULT_PORT,
  LDAP_DEFAULT_PORT,
  LDAP_UNENCRYPTED_WARNING_KEY,
} from '../constants/identity-provider.constants';

export function isDirectoryProviderType(type: IdentityProviderType): type is DirectoryProviderType {
  return type === IdentityProviderType.Ldap || type === IdentityProviderType.ActiveDirectory;
}

/**
 * Whether a provider can be used for directory sign-in, the same rule as the Api (DirectoryLoginProviders): an LDAP
 * provider always, an Active Directory provider only over SSL (LDAPS).
 */
export function isUsableForDirectoryLogin(type: IdentityProviderType, useSsl: boolean): boolean {
  return type === IdentityProviderType.Ldap || (type === IdentityProviderType.ActiveDirectory && useSsl);
}

/** i18n key of the transport warning for a directory provider without SSL, or null when there is nothing to warn about. */
export function directoryTransportWarningKey(type: IdentityProviderType, useSsl: boolean): string | null {
  if (useSsl) {
    return null;
  }
  if (type === IdentityProviderType.ActiveDirectory) {
    return AD_REQUIRES_SSL_WARNING_KEY;
  }
  return type === IdentityProviderType.Ldap ? LDAP_UNENCRYPTED_WARNING_KEY : null;
}

/** Port for the given SSL setting: 636 with SSL, 389 without. */
export function defaultDirectoryPort(useSsl: boolean): number {
  return useSsl ? LDAPS_DEFAULT_PORT : LDAP_DEFAULT_PORT;
}

/**
 * Called after the type changed. The user filter switches to the new type's default when it is empty or still holds a
 * default the form filled in for a directory type; an empty port gets the default for the SSL setting.
 */
export function applyDirectoryTypeDefaults(provider: IIdentityProvider): void {
  if (!isDirectoryProviderType(provider.type)) {
    return;
  }

  const filter = provider.userFilter?.trim() ?? '';
  if (filter === '' || isKnownDefaultFilter(filter)) {
    provider.userFilter = DEFAULT_USER_FILTER[provider.type];
  }

  if (provider.port === undefined || provider.port === null) {
    provider.port = defaultDirectoryPort(provider.useSsl);
  }
}

function isKnownDefaultFilter(filter: string): boolean {
  return Object.values(KNOWN_DEFAULT_USER_FILTERS).some((filters) => filters.includes(filter));
}
