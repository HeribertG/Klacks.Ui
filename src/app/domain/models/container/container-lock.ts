// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Represents an exclusive edit lock on a container resource.
 * @param acquired - True if the current user holds the lock, false if blocked by another user
 */
export interface IContainerLock {
  id: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userName: string;
  instanceId: string;
  acquiredAt: string;
  lastHeartbeatAt: string;
  acquired: boolean;
  isSelfConflict: boolean;
}

export const ContainerLockResourceType = {
  containerTemplate: 'ContainerTemplate',
  containerWork: 'ContainerWork',
  containerShiftOverride: 'ContainerShiftOverride',
} as const;

export type ContainerLockResourceTypeValue =
  (typeof ContainerLockResourceType)[keyof typeof ContainerLockResourceType];
