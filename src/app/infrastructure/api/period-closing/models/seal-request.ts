// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface SealRequest {
  startDate: string;
  endDate: string;
  groupId: string | null;
  reason: string | null;
  /**
   * Confirms that the period's open violations were seen and the seal is wanted anyway. Without it
   * the backend refuses to seal a period that still holds errors, so the close cannot happen by
   * accident - sealing is what makes those days unwritable.
   */
  acknowledgeViolations?: boolean;
}
