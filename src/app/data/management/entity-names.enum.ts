/**
 * String Enum for Entity Names used in WorkplaceStateService
 * This replaces magic strings with type-safe constants
 */
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
  ABSENCE = 'DataManagementAbsenceService'
}

/**
 * String Enum for Route Names used in route-to-entity mapping
 */
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
  ABSENCE = 'absence'
}

/**
 * Type guard to check if a string is a valid RouteName
 */
export function isValidRouteName(value: string): value is RouteName {
  return Object.values(RouteName).includes(value as RouteName);
}