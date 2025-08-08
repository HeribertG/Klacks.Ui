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
  SCHEDULE = 'DataManagementScheduleService',
  ABSENCE = 'DataManagementAbsenceService',
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
  SCHEDULE = 'schedule',
  ABSENCE = 'absence',
}

export function isValidRouteName(value: string): value is RouteName {
  return Object.values(RouteName).includes(value as RouteName);
}
