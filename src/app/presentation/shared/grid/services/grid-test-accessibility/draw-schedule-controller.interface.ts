// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Interface for draw schedule controller.
 * Handles canvas rendering and viewport queries.
 */
export interface IDrawScheduleController {
  /** 
   * Triggers a grid redraw after scroll changes.
   */
  moveGrid(): void;
  
  /**
   * Checks if canvas is available and initialized.
   */
  isCanvasAvailable(): boolean;
  
  /**
   * Gets the canvas width in pixels.
   */
  readonly width?: number;
  
  /**
   * Gets the canvas height in pixels.
   */
  readonly height?: number;
}
