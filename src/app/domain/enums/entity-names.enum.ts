// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum EntityName {
  CLIENT = 'DataManagementClientService',
  CLIENT_EDIT = 'DataManagementClientService_Edit',
  PROFILE = 'DataManagementProfileService',
  SETTINGS = 'DataManagementSettingsService',
  GROUP = 'DataManagementGroupService',
  GROUP_EDIT = 'DataManagementGroupService_Edit',
  GROUP_STRUCTURE = 'DataManagementGroupTreeService_Structure',
  SHIFT = 'DataManagementShiftService',
  SHIFT_EDIT = 'DataManagementShiftService_Edit',
  SHIFT_CUT = 'DataManagementShiftService_Cut',
  SHIFT_CONTAINER_TEMPLATE = 'DataManagementContainerService',
  SCHEDULE = 'DataManagementScheduleService',
  ABSENCE = 'DataManagementAbsenceService',
  DASHBOARD = 'Dashboard',
}

export enum RouteName {
  CLIENT = 'client',
  EDIT_ADDRESS = 'edit-address',
  PROFILE = 'profile',
  SETTINGS = 'settings',
  GROUP = 'group',
  EDIT_GROUP = 'edit-group',
  GROUP_STRUCTURE = 'group-structure',
  SHIFT = 'shift',
  NEW_SHIFT = 'new-shift',
  EDIT_SHIFT = 'edit-shift',
  CUT_SHIFT = 'cut-shift',
  CONTAINER_TEMPLATE = 'container-template',
  SCHEDULE = 'schedule',
  ABSENCE = 'absence',
}

export function isValidRouteName(value: string): value is RouteName {
  return Object.values(RouteName).includes(value as RouteName);
}
