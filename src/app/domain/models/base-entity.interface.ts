// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IBaseEntity {
  createTime: Date | undefined;
  currentUserCreated: string | undefined;
  updateTime: Date | undefined;
  currentUserUpdated: string | undefined;
  isDeleted: boolean;
  deletedTime: Date | undefined;
  currentUserDeleted: string | undefined;
}
