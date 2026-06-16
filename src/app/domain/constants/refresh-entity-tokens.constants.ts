// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Backend entity tokens (lower-case, underscores stripped) carried by Klacksy's entity-changed
 * SignalR notifications. Each IRefreshable data source declares which tokens it reacts to so the
 * DataRefreshCoordinator can reload the right page after a Klacksy mutation.
 *
 * These must stay in sync with the backend EntityChangeNotifier, which derives the token from
 * SkillEntityMap (PascalCase entity names lower-cased) or, when absent, from the skill name
 * (prefix stripped, underscores removed). Schedule-domain tokens are intentionally absent here
 * because the work-notifications hub already pushes those live.
 */
export const RefreshEntityTokens = {
  CLIENT: ['client', 'address', 'communication', 'annotation', 'membership', 'contract', 'groupitem'],
  SHIFT: ['shift'],
  GROUP: ['group', 'groupitem'],
  ABSENCE: ['absence'],
  CLIENT_AVAILABILITY: ['client', 'clientavailability'],

  // Settings sub-lists (registered per-component via DataRefreshRegistry)
  MACRO: ['macro'],
  IDENTITY_PROVIDER: ['identityprovider'],
  QUALIFICATION: ['qualification'],
  BRANCH: ['branch'],
  SYSTEM_USER: ['user', 'systemuser', 'userpermissions'],
  CONTRACT: ['contract'],
} as const;
