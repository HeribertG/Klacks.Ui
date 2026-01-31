/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Data class representing a cached row header image for the schedule grid.
 * Stores the rendered canvas image along with the row range it covers.
 * Used for performance optimization to avoid re-rendering unchanged row headers.
 *
 * @relations
 * - Used by: BaseDrawRowHeaderService, ShiftDrawRowHeaderService
 * - Part of: Schedule Grid rendering system
 */
export class GridRowHeader {
  lastRow!: number;
  firstRow!: number;
  img!: HTMLCanvasElement;

}
