export enum IdentityProviderType {
  Ldap = 0,
  ActiveDirectory = 1,
  OAuth2 = 2,
  OpenIdConnect = 3
}

export const IdentityProviderTypeLabels: Record<IdentityProviderType, string> = {
  [IdentityProviderType.Ldap]: 'settings.identity-provider.type.ldap',
  [IdentityProviderType.ActiveDirectory]: 'settings.identity-provider.type.active-directory',
  [IdentityProviderType.OAuth2]: 'settings.identity-provider.type.oauth2',
  [IdentityProviderType.OpenIdConnect]: 'settings.identity-provider.type.openid-connect'
};
