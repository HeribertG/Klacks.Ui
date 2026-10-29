// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Instance id of this browser tab, the key the backend uses to tell the tab's own container lock from a foreign one.
 * The HTTP interceptor sends it on every HttpClient request; calls on native fetch (chat stream) read it here.
 */

import { StorageKeys } from 'src/app/domain/constants/storage-keys';

export const INSTANCE_ID_HEADER = 'X-Instance-Id';

export function readInstanceId(): string | null {
  try {
    return sessionStorage.getItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID);
  } catch {
    return null;
  }
}
