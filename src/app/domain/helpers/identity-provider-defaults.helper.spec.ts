// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  applyDirectoryTypeDefaults,
  defaultDirectoryPort,
  directoryTransportWarningKey,
  isUsableForDirectoryLogin,
} from './identity-provider-defaults.helper';
import { IdentityProvider } from '../models/settings/identity-provider-class';
import { IdentityProviderType } from '../enums/identity-provider-enum';
import {
  AD_REQUIRES_SSL_WARNING_KEY,
  DEFAULT_USER_FILTER,
  LDAPS_DEFAULT_PORT,
  LDAP_DEFAULT_PORT,
  LDAP_UNENCRYPTED_WARNING_KEY,
} from '../constants/identity-provider.constants';

const LEGACY_AD_FILTER = '(&(objectClass=user)(objectCategory=person))';

function provider(type: IdentityProviderType, userFilter?: string): IdentityProvider {
  const p = new IdentityProvider();
  p.type = type;
  p.userFilter = userFilter;
  return p;
}

describe('identity provider defaults', () => {
  it('fills the LDAP default filter and port into a new provider', () => {
    const p = provider(IdentityProviderType.Ldap);

    applyDirectoryTypeDefaults(p);

    expect(p.userFilter).toBe(DEFAULT_USER_FILTER[IdentityProviderType.Ldap]);
    expect(p.port).toBe(LDAP_DEFAULT_PORT);
  });

  it('switches the AD default to the LDAP default, also the older AD spelling', () => {
    const current = provider(IdentityProviderType.Ldap, DEFAULT_USER_FILTER[IdentityProviderType.ActiveDirectory]);
    const legacy = provider(IdentityProviderType.Ldap, LEGACY_AD_FILTER);

    applyDirectoryTypeDefaults(current);
    applyDirectoryTypeDefaults(legacy);

    expect(current.userFilter).toBe('(objectClass=person)');
    expect(legacy.userFilter).toBe('(objectClass=person)');
  });

  it('switches the LDAP default to the AD default', () => {
    const p = provider(IdentityProviderType.ActiveDirectory, DEFAULT_USER_FILTER[IdentityProviderType.Ldap]);

    applyDirectoryTypeDefaults(p);

    expect(p.userFilter).toBe(DEFAULT_USER_FILTER[IdentityProviderType.ActiveDirectory]);
  });

  it('keeps a filter the administrator typed', () => {
    const p = provider(IdentityProviderType.ActiveDirectory, '(objectClass=inetOrgPerson)');

    applyDirectoryTypeDefaults(p);

    expect(p.userFilter).toBe('(objectClass=inetOrgPerson)');
  });

  it('keeps port and SSL of an existing provider', () => {
    const p = provider(IdentityProviderType.Ldap, LEGACY_AD_FILTER);
    p.useSsl = true;
    p.port = LDAPS_DEFAULT_PORT;

    applyDirectoryTypeDefaults(p);

    expect(p.useSsl).toBe(true);
    expect(p.port).toBe(LDAPS_DEFAULT_PORT);
  });

  it('leaves an OAuth provider untouched', () => {
    const p = provider(IdentityProviderType.OAuth2, LEGACY_AD_FILTER);

    applyDirectoryTypeDefaults(p);

    expect(p.userFilter).toBe(LEGACY_AD_FILTER);
    expect(p.port).toBeUndefined();
  });

  it('allows directory sign-in for LDAP always and for Active Directory only with SSL', () => {
    expect(isUsableForDirectoryLogin(IdentityProviderType.Ldap, false)).toBe(true);
    expect(isUsableForDirectoryLogin(IdentityProviderType.ActiveDirectory, false)).toBe(false);
    expect(isUsableForDirectoryLogin(IdentityProviderType.ActiveDirectory, true)).toBe(true);
    expect(isUsableForDirectoryLogin(IdentityProviderType.OAuth2, true)).toBe(false);
  });

  it('warns about a directory provider without SSL', () => {
    expect(directoryTransportWarningKey(IdentityProviderType.ActiveDirectory, false)).toBe(AD_REQUIRES_SSL_WARNING_KEY);
    expect(directoryTransportWarningKey(IdentityProviderType.Ldap, false)).toBe(LDAP_UNENCRYPTED_WARNING_KEY);
    expect(directoryTransportWarningKey(IdentityProviderType.ActiveDirectory, true)).toBeNull();
    expect(directoryTransportWarningKey(IdentityProviderType.Ldap, true)).toBeNull();
    expect(directoryTransportWarningKey(IdentityProviderType.OpenIdConnect, false)).toBeNull();
  });

  it('picks the port for the SSL setting', () => {
    expect(defaultDirectoryPort(false)).toBe(LDAP_DEFAULT_PORT);
    expect(defaultDirectoryPort(true)).toBe(LDAPS_DEFAULT_PORT);
  });
});
