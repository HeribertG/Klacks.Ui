// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Mirrors Klacks.Plugin.Messaging.Domain.Enums.SetupStepStatus. The backend enum carries its own
 * JsonStringEnumConverter without a naming policy, so the wire values are the member names verbatim.
 */
export enum SetupStepStatus {
  Ok = 'Ok',
  ActionRequired = 'ActionRequired',
  Error = 'Error',
  NotChecked = 'NotChecked',
}
