// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseEntity } from './base-entity.interface';

export class BaseEntity implements IBaseEntity {
  isDeleted = false;
  createTime = undefined;
  currentUserCreated = undefined;
  updateTime = undefined;
  currentUserUpdated = undefined;
  deletedTime = undefined;
  currentUserDeleted = undefined;
}
