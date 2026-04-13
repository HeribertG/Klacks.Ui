// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Represents a shift available for assignment in the container work edit dialog.
 * @param id - Unique shift identifier
 * @param clientId - The client associated with this shift
 * @param startShift - Shift start time (HH:mm:ss format)
 * @param endShift - Shift end time (HH:mm:ss format)
 * @param workTime - Working hours as decimal
 */
export interface AvailableShift {
  id: string;
  name: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  clientId: string;
  isTimeRange?: boolean;
  isSporadic?: boolean;
}
