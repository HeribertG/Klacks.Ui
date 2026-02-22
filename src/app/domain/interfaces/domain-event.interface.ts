// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}
