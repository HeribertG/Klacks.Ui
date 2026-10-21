// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MyPosition } from '../../classes/position';

/**
 * Interface for cell manipulation controller.
 * Handles cell selection and editing state.
 */
export interface ICellManipulationController {
  /** Gets the current position signal */
  positionSignal(): MyPosition | null;
  
  /** Checks if currently in edit mode */
  isEditing(): boolean;
  
  /** Sets the current position */
  Position: MyPosition;
  
  /** Sets the editing state */
  setIsEditing(value: boolean): void;
}
