// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface SealRequest {
  startDate: string;
  endDate: string;
  groupId: string | null;
  reason: string | null;
}
