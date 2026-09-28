// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}
