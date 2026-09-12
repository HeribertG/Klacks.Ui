// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The granular rights the backend hands to the client in the login response, mirrored one to one from
 * Klacks.Api/Domain/Constants/Permissions.cs. A backend guard test compares both files as sets by
 * scanning the source text, so every entry has to stay in the plain `Name: 'Name'` literal form.
 */
export const PERMISSIONS = {
  CanViewClients: 'CanViewClients',
  CanCreateClients: 'CanCreateClients',
  CanEditClients: 'CanEditClients',
  CanDeleteClients: 'CanDeleteClients',

  CanViewGroups: 'CanViewGroups',
  CanCreateGroups: 'CanCreateGroups',
  CanEditGroups: 'CanEditGroups',
  CanDeleteGroups: 'CanDeleteGroups',

  CanViewContracts: 'CanViewContracts',
  CanCreateContracts: 'CanCreateContracts',
  CanEditContracts: 'CanEditContracts',
  CanDeleteContracts: 'CanDeleteContracts',

  CanViewShifts: 'CanViewShifts',
  CanCreateShifts: 'CanCreateShifts',
  CanEditShifts: 'CanEditShifts',
  CanDeleteShifts: 'CanDeleteShifts',

  CanViewSettings: 'CanViewSettings',
  CanEditSettings: 'CanEditSettings',

  CanPlan: 'CanPlan',
  CanViewSchedule: 'CanViewSchedule',
  CanEditSchedule: 'CanEditSchedule',

  CanUseAssistant: 'CanUseAssistant',

  CanEditClientNotes: 'CanEditClientNotes',

  CanManageAutomation: 'CanManageAutomation',
  CanManageAccessTokens: 'CanManageAccessTokens',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Role name of the full-access role; it appears in the rights list next to the granular permissions. */
export const ROLE_ADMIN = 'Admin';

/** Role name of the supervisor role, kept for the transitional isAuthorised getter. */
export const ROLE_AUTHORISED = 'Authorised';
