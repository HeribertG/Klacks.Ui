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
  /**
   * Number of errors the confirmation was issued for. The backend re-reads the findings and refuses
   * again when the period meanwhile holds more of them, so a confirmation never seals over errors
   * that appeared after it was given. Null keeps the legacy behaviour of sealing on the confirmation
   * alone.
   */
  acknowledgedErrorCount?: number | null;
}
