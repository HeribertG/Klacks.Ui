import { Injectable, NgZone } from '@angular/core';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { ScrollService } from './scroll.service';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { SettingsService } from './settings.service';
import { CellManipulationService } from './cell-manipulation.service';
import { MyPosition } from 'src/app/grid/classes/position';
import { ScheduleVScrollbarComponent } from '../schedule-v-scrollbar/schedule-v-scrollbar.component';
import { ScheduleHScrollbarComponent } from '../schedule-h-scrollbar/schedule-h-scrollbar.component';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { CreateHeaderService } from './create-header.service';
import { CreateCellService } from './create-cell.service';
import { DataService } from './data.service';
import { CreateRowHeaderService } from './create-row-header.service';
import { CanvasAvailable } from './canvasAvailable.decorator';

@Injectable()
export class DrawScheduleService {
  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;

  public startDate: Date = new Date();

  public rowHeader: ScheduleScheduleRowHeaderComponent | undefined;
  public vScrollbar: ScheduleVScrollbarComponent | undefined;
  public hScrollbar: ScheduleHScrollbarComponent | undefined;

  public recFilterIcon: Rectangle = new Rectangle();
  public filterImage: HTMLImageElement | undefined;

  private readonly SUNDAY = 0;
  private readonly SATURDAY = 6;

  private readonly BORDER_OFFSET = 4;

  private _isFocused = true;

  private _height: number = 10;
  private _width: number = 10;

  constructor(
    public cellManipulation: CellManipulationService,
    public gridData: DataService,
    public createRowHeader: CreateRowHeaderService,
    private gridColors: GridColorService,
    private scroll: ScrollService,
    private gridSettings: GridSettingsService,
    private settings: SettingsService,
    private createHeader: CreateHeaderService,
    private createCell: CreateCellService,
    private zone: NgZone
  ) {}

  /* #region initial/final */
  public createCanvas() {
    this.canvas = document.getElementById(
      'scheduleCanvas'
    ) as HTMLCanvasElement;

    if (!this.canvas) {
      console.error("Canvas with ID 'scheduleCanvas' not found.");
      return;
    }

    try {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas,
        this.width,
        this.height
      );
    } catch (error) {
      console.error('Error when creating the scheduleCanvas context:', error);
      return;
    }

    DrawHelper.setAntiAliasing(this.ctx);

    this.renderCanvas = document.createElement('canvas') as HTMLCanvasElement;

    if (!this.renderCanvas) {
      console.error("Canvas with ID 'renderCanvas' not found.");
      return;
    }

    try {
      this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
        this.renderCanvas,
        this.width,
        this.height,
        true
      );
    } catch (error) {
      console.error('Error when creating the renderCanvas context:', error);
      return;
    }

    DrawHelper.setAntiAliasing(this.renderCanvasCtx);

    this.headerCanvas = document.createElement('canvas') as HTMLCanvasElement;
    if (!this.headerCanvas) {
      console.error("Canvas with ID 'headerCanvas' not found.");
      return;
    }

    try {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        this.width,
        this.settings.cellHeaderHeight,
        true
      );
    } catch (error) {
      console.error('Error when creating the headerCanvas context:', error);
      return;
    }
    DrawHelper.setAntiAliasing(this.headerCtx);

    if (this.vScrollbar) {
      this.vScrollbar.init();
    }
    if (this.hScrollbar) {
      this.hScrollbar.init();
    }
  }

  public deleteCanvas() {
    this.ctx = undefined;
    this.canvas = undefined;
    this.renderCanvasCtx = undefined;
    this.renderCanvas = undefined;
    this.headerCanvas = undefined;
    this.headerCtx = undefined;
  }

  private isCanvasAvailable(): boolean {
    return (
      this.gridSettings != null &&
      this.canvas != null &&
      this.width > 0 &&
      this.height > 0 &&
      this.ctx != null
    );
  }

  private isRenderCanvasAvailable(): boolean {
    return this.renderCanvas != null && this.renderCanvasCtx != null;
  }
  /* #endregion initial/final */

  /* #region Environment changes */

  public rebuild() {
    this.createHeader.reset();
    this.createCell.reset();
  }

  public redraw() {
    this.redrawGrid();
  }
  public refresh() {
    this.refreshGrid();
  }

  @CanvasAvailable('throw')
  private setMetrics() {
    if (this.existData) {
      const visibleRows: number = this.updateVisibleRow();
      const visibleCols: number = this.updateVisibleCol();
      this.scroll.setMetrics(
        visibleCols,
        this.gridData.columns,
        visibleRows,
        this.gridData.rows
      );
    }
  }

  public set width(value: number) {
    this._width = value;
    this.setMetrics();
    this.resizeMainCanvas();
  }
  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
    this.setMetrics();
    this.resizeMainCanvas();
  }
  public get height(): number {
    return this._height;
  }

  public set isFocused(value: boolean) {
    this._isFocused = value;
  }
  public get isFocused(): boolean {
    return this._isFocused;
  }

  @CanvasAvailable('throw')
  private resizeMainCanvas() {
    if (this.canvas) {
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }
    if (this.ctx) {
      this.ctx.canvas.height = this.height;
      this.ctx.canvas!.width = this.width;
    }
  }

  private refreshScroll() {
    if (this.vScrollbar) {
      this.vScrollbar.refresh();
    }
    if (this.hScrollbar) {
      this.hScrollbar.refresh();
    }
  }
  /* #endregion Environment changes */

  /* #region draw Grid */

  @CanvasAvailable('throw')
  private redrawGrid() {
    this.setMetrics();
    this.crateGridHeader();
    this.drawGrid();
    this.refreshScroll();
  }

  @CanvasAvailable('throw')
  private refreshGrid(): void {
    const oldVisibleRow: number = this.nominalVisibleRow();
    const oldVisibleCol: number = this.nominalVisibleCol();

    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    if (oldVisibleCol < visibleCol || oldVisibleRow < visibleRow) {
      this.growGrid();
    } else if (oldVisibleCol > visibleCol || oldVisibleRow > visibleRow) {
      this.shrinkGrid();
    } else {
      this.renderGrid();
    }
  }

  @CanvasAvailable('throw')
  private renderGrid(): void {
    this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);

    this.ctx!.drawImage(
      this.renderCanvas!,
      0,
      0,
      this.renderCanvas!.width,
      this.renderCanvas!.height,
      0,
      this.settings.cellHeaderHeight,
      this.renderCanvas!.width,
      this.renderCanvas!.height
    );

    let col: number = this.firstVisibleCol;
    if (col < 0) {
      col = 0;
    }

    if (this.headerCanvas!.width > 0 && this.headerCanvas!.height > 0) {
      this.ctx!.drawImage(
        this.headerCanvas!,
        col * -1 * this.settings.cellWidth,
        0
      );
    }

    if (
      this.hasPositionCollection &&
      this.cellManipulation.PositionCollection.count() > 1
    ) {
      this.drawSelection();
    } else {
      this.drawGridSelectedHeaderCell();
      this.drawGridSelectedCell();
    }
  }

  @CanvasAvailable('throw')
  private growGrid() {
    const oldVisibleRow: number = this.nominalVisibleRow();
    const oldVisibleCol: number = this.nominalVisibleCol();

    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    if (oldVisibleRow < visibleRow || oldVisibleCol < visibleCol) {
      const tempCanvas = this.createTempCanvas();
      this.drawOnTempCanvas(tempCanvas, 0, 0);

      this.resizeRenderCanvas(visibleRow, visibleCol);
      this.drawImageOnRenderCanvas(tempCanvas, 0, 0);

      // if it grows horizontally and vertically
      if (oldVisibleRow < visibleRow && oldVisibleCol < visibleCol) {
        this.addNewCells(
          oldVisibleRow,
          oldVisibleCol,
          visibleRow + 1,
          visibleCol + 1
        );
        // if it grows horizontally
      } else if (oldVisibleRow === visibleRow && oldVisibleCol < visibleCol) {
        // this.addNewCols(
        //   this.firstVisibleRow,
        //   oldVisibleCol - 1,
        //   visibleRow + 1,
        //   visibleCol + 1
        // );
        this.redrawGrid();
        // if it grows vertically
      } else if (oldVisibleRow < visibleRow && oldVisibleCol === visibleCol) {
        this.addNewCells(
          oldVisibleRow,
          this.firstVisibleCol,
          visibleRow + 1,
          visibleCol + 1
        );
      }
    }
    this.renderGrid();
  }

  private addNewCells(
    oldVisibleRow: number,
    oldVisibleCol: number,
    visibleRow: number,
    visibleCol: number
  ) {
    for (let row = oldVisibleRow; row < visibleRow; row++) {
      for (let col = oldVisibleCol; col < visibleCol; col++) {
        this.addCells(row, col);
      }
    }
  }

  private addNewCols(
    oldVisibleRow: number,
    oldVisibleCol: number,
    visibleRow: number,
    visibleCol: number
  ) {
    for (let col = oldVisibleCol; col < visibleCol; col++) {
      for (let row = oldVisibleRow; row < visibleRow; row++) {
        this.addCells(row, col);
      }
    }
  }

  @CanvasAvailable('throw')
  private shrinkGrid() {
    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);

    this.resizeRenderCanvas(visibleRow, visibleCol);
    this.drawImageOnRenderCanvas(tempCanvas, 0, 0);

    this.renderGrid();
  }

  @CanvasAvailable('throw')
  refreshCell(pos: MyPosition) {
    if (this.isRenderCanvasAvailable()) {
      if (pos != null && !pos.isEmpty()) {
        let col: number =
          (pos.column - this.firstVisibleCol) * this.settings.cellWidth;
        let row: number =
          (pos.row - this.firstVisibleRow) * this.settings.cellHeight;

        col -= this.BORDER_OFFSET;
        row -= this.BORDER_OFFSET;

        if (row < 0) {
          row = 0;
        }
        if (col < 0) {
          col = 0;
        }

        const tmpImage: ImageData = this.renderCanvasCtx!.getImageData(
          col,
          row,
          this.settings.cellWidth + this.BORDER_OFFSET + this.BORDER_OFFSET,
          this.settings.cellHeight +
            this.BORDER_OFFSET +
            this.BORDER_OFFSET +
            this.BORDER_OFFSET +
            this.BORDER_OFFSET
        );
        this.ctx!.putImageData(
          tmpImage,
          col,
          row + this.settings.cellHeaderHeight
        );
      }
    }
  }

  @CanvasAvailable('throw')
  moveGrid(directionX: number, directionY: number): void {
    const visibleCol = this.updateVisibleCol();
    const visibleRow = this.updateVisibleRow();

    this.firstVisibleCol += directionX;
    this.firstVisibleRow += directionY;

    this.zone.runOutsideAngular(() => {
      if (
        this.isInRange(directionX, visibleCol) ||
        this.isInRange(directionY, visibleRow)
      ) {
        this.moveCanvas(directionX, directionY);
      } else {
        this.drawGrid();
        this.refreshScroll();
      }

      if (this.rowHeader) {
        this.rowHeader.drawRowHeader.moveGrid(directionX, directionY);
      }
    });
  }

  private isInRange(direction: number, visibleRange: number): boolean {
    if (direction === 0) {
      return false;
    }

    if (direction < 0) {
      direction = direction * -1;
    }
    return direction < visibleRange / 2;
  }

  @CanvasAvailable('throw')
  private moveCanvas(directionX: number, directionY: number) {
    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    if (directionX !== 0) {
      this.handleHorizontalScroll(directionX, visibleRow, visibleCol);
    }

    if (directionY !== 0) {
      this.handleVerticalScroll(directionY, visibleRow, visibleCol);
    }

    this.renderGrid();
  }

  private handleHorizontalScroll(
    directionX: number,
    visibleRow: number,
    visibleCol: number
  ) {
    if (this.hScrollbar) {
      this.hScrollbar.value = this.firstVisibleCol;
    }

    const diff = this.scroll.horizontalScrollDelta;
    if (diff === 0) return;

    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);

    this.resizeRenderCanvas(visibleRow, visibleCol);
    this.drawImageOnRenderCanvas(tempCanvas, this.settings.cellWidth * diff, 0);

    this.updateCellsForHorizontalScroll(
      directionX,
      visibleRow,
      visibleCol,
      diff
    );
  }

  private handleVerticalScroll(
    directionY: number,
    visibleRow: number,
    visibleCol: number
  ) {
    if (this.vScrollbar) {
      this.vScrollbar.value = this.firstVisibleRow;
    }

    const diff = this.scroll.verticalScrollDelta;
    if (diff === 0) return;

    // Copy the content of the canvas
    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);
    // delete the contents of the canvas
    this.resizeRenderCanvas(visibleRow, visibleCol);
    // paste the copied to a new position
    this.drawImageOnRenderCanvas(
      tempCanvas,
      0,
      this.settings.cellHeight * diff
    );

    this.updateCellsForVerticalScroll(directionY, visibleRow, visibleCol, diff);
  }

  private createTempCanvas(): HTMLCanvasElement {
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;
    tempCanvas.height = this.renderCanvas!.height;
    tempCanvas.width = this.renderCanvas!.width;
    return tempCanvas;
  }

  private drawOnTempCanvas(
    tempCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ) {
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.renderCanvas!, x, y);
    }
  }

  private resizeRenderCanvas(visibleRow: number, visibleCol: number) {
    this.renderCanvas!.height = visibleRow * this.settings.cellHeight;
    this.renderCanvas!.width = visibleCol * this.settings.cellWidth;
    this.renderCanvasCtx!.clearRect(
      0,
      0,
      this.renderCanvas!.width,
      this.renderCanvas!.height
    );
  }

  private drawImageOnRenderCanvas(
    tempCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ) {
    this.renderCanvasCtx!.drawImage(tempCanvas, x, y);
  }

  private updateCellsForHorizontalScroll(
    directionX: number,
    visibleRow: number,
    visibleCol: number,
    diff: number
  ) {
    let firstCol = directionX > 0 ? visibleCol + diff : 0;
    let lastCol = directionX > 0 ? visibleCol - diff + 1 : diff + 1;

    for (let row = 0; row < visibleRow; row++) {
      for (let col = firstCol; col < lastCol; col++) {
        this.addCells(row, col);
      }
    }
  }

  private updateCellsForVerticalScroll(
    directionY: number,
    visibleRow: number,
    visibleCol: number,
    diff: number
  ) {
    let firstRow = directionY > 0 ? visibleRow + diff : 0;
    let lastRow = directionY > 0 ? visibleRow - diff + 1 : diff + 1;

    for (let row = firstRow; row < lastRow; row++) {
      for (let col = 0; col < visibleCol; col++) {
        this.addCells(row, col);
      }
    }
  }

  @CanvasAvailable('throw')
  private crateGridHeader() {
    const width: number = this.gridData.columns * this.settings.cellWidth;
    this.headerCanvas!.height =
      this.settings.cellHeaderHeight + this.settings.increaseBorder;
    this.headerCanvas!.width = this.gridData.columns * this.settings.cellWidth;

    for (let col = 0; col < this.gridData.columns; col++) {
      const imgHeader = this.createHeader.createHeader(col);
      if (imgHeader) {
        if (col < this.gridData.columns) {
          this.headerCtx!.putImageData(
            imgHeader,
            col * this.settings.cellWidth,
            0
          );
        }
      }
    }
  }

  @CanvasAvailable('throw')
  drawGrid() {
    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    this.resizeRenderCanvas(visibleRow, visibleCol);

    for (let row = 0; row < visibleRow; row++) {
      for (let col = 0; col < visibleCol; col++) {
        this.addCells(row, col);
      }
    }
    this.renderGrid();

    if (this.rowHeader) {
      this.rowHeader.drawRowHeader.redraw();
    }
  }

  @CanvasAvailable('throw')
  drawGridSelectedCell() {
    if (this.position && !this.position.isEmpty()) {
      this.ctx!.save();

      this.ctx!.rect(
        0,
        this.settings.cellHeaderHeight,
        this.canvas!.width,
        this.renderCanvas!.height - this.settings.cellHeaderHeight
      );

      this.ctx!.clip();

      if (this.isFocused) {
        this.ctx!.strokeStyle = this.gridColors.focusBorderColor;
        this.ctx!.setLineDash([0]);
      } else {
        this.ctx!.setLineDash([1, 2]);
        this.ctx!.strokeStyle = 'grey';
      }

      const col: number =
        (this.position.column - this.firstVisibleCol) * this.settings.cellWidth;
      const row: number =
        (this.position.row - this.firstVisibleRow) * this.settings.cellHeight +
        this.settings.cellHeaderHeight;

      this.ctx!.strokeRect(
        col - 1,
        row - 1,
        this.settings.cellWidth + 3,
        this.settings.cellHeight + 1
      );

      this.ctx!.restore();
    }
  }

  @CanvasAvailable('throw')
  refreshGridHeaderCell(pos: MyPosition): void {
    if (pos !== undefined) {
      if (!pos.isEmpty()) {
        const col: number =
          (pos.column - this.firstVisibleCol) * this.settings.cellWidth;

        const tmpImage: ImageData = this.headerCtx!.getImageData(
          pos.column * this.settings.cellWidth,
          0,
          this.settings.cellWidth,
          this.settings.cellHeaderHeight
        );
        this.ctx!.putImageData(tmpImage, col, 0);
      }
    }
  }

  @CanvasAvailable('throw')
  drawGridSelectedHeaderCell() {
    if (this.position) {
      if (!this.position.isEmpty()) {
        this.ctx!.save();

        this.ctx!.fillStyle = this.gridColors.focusBorderColor;

        this.ctx!.globalAlpha = 0.2;
        const col: number =
          (this.position.column - this.firstVisibleCol) *
          this.settings.cellWidth;

        this.ctx!.fillRect(
          col,
          0,
          this.settings.cellWidth,
          this.settings.cellHeaderHeight
        );

        this.ctx!.restore();
      }
    }
  }

  @CanvasAvailable('throw')
  private addCells(row: number, col: number) {
    if (this.existData) {
      const tmpRow: number = row + this.firstVisibleRow;
      const tmpCol: number = col + this.firstVisibleCol;
      const cellWidth = this.settings.cellWidth;
      const cellHeight = this.settings.cellHeight;

      if (
        tmpRow < 0 ||
        tmpRow >= this.gridData.rows ||
        tmpCol < 0 ||
        tmpCol >= this.gridData.columns
      ) {
        console.warn('Cell index outside the valid limits.');
        return;
      }

      if (tmpRow < this.gridData.rows && tmpCol < this.gridData.columns) {
        const img = this.createCell.createCell(tmpRow, tmpCol);
        if (img) {
          this.renderCanvasCtx!.drawImage(
            img,
            col * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight
          );
        }
      }
    }
  }

  /* #endregion draw Grid */

  /* #region position and selection */

  @CanvasAvailable('throw')
  drawSelectionDynamically(pos: MyPosition): void {
    if (this.position != null && !this.position.isEmpty()) {
      if (pos != null && !pos.isEmpty()) {
        this.ctx!.save();

        this.renderGrid();

        this.ctx!.rect(
          0,
          this.settings.cellHeaderHeight,
          this.canvas!.width,
          this.renderCanvas!.height - this.settings.cellHeaderHeight
        );

        this.ctx!.clip();

        this.ctx!.globalAlpha = 0.2;
        this.ctx!.fillStyle = this.gridColors.focusBorderColor;

        const minCol: number =
          this.position.column < pos.column ? this.position.column : pos.column;
        let maxCol: number =
          this.position.column > pos.column ? this.position.column : pos.column;
        const minRow: number =
          this.position.row < pos.row ? this.position.row : pos.row;
        let maxRow: number =
          this.position.row > pos.row ? this.position.row : pos.row;

        maxCol += 1;
        maxRow += 1;

        if (maxCol > this.gridData.columns) {
          maxCol = this.gridData.columns;
        }
        if (maxRow > this.gridData.rows) {
          maxRow = this.gridData.rows;
        }

        this.drawRange(minCol, maxCol, minRow, maxRow);
        this.ctx!.restore();
      }
    }
  }

  get position(): MyPosition {
    return this.cellManipulation.Position;
  }
  set position(pos: MyPosition) {
    if (!this.isPositionValid(pos)) {
      return;
    }

    if (this.cellManipulation.Position) {
      const oldPosition: MyPosition = this.cellManipulation.Position;
      this.cellManipulation.Position = pos;

      this.refreshCell(oldPosition);
      this.refreshGridHeaderCell(oldPosition);
    }

    this.drawSelection();

    this.drawGridSelectedHeaderCell();
    this.drawGridSelectedCell();
  }

  @CanvasAvailable('throw')
  private drawSelectedCellBackground(col: number, row: number): void {
    const column: number =
      (col - this.firstVisibleCol) * this.settings.cellWidth;
    const rowSet: number =
      (row - this.firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    this.ctx!.fillRect(
      column,
      rowSet,
      this.settings.cellWidth,
      this.settings.cellHeight
    );
  }

  @CanvasAvailable('throw')
  private drawRange(
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    let col: number = (minCol - this.firstVisibleCol) * this.settings.cellWidth;
    let row: number =
      (minRow - this.firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;
    if (col < 0) {
      col = 0;
    }
    if (row < this.settings.cellHeaderHeight) {
      row = this.settings.cellHeaderHeight;
    }

    let lastCol: number =
      (maxCol - this.firstVisibleCol) * this.settings.cellWidth;
    let lastRow: number =
      (maxRow - this.firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    if (lastCol > this.canvas!.width) {
      lastCol = this.canvas!.width;
    }
    if (lastRow > this.canvas!.height) {
      lastRow = this.canvas!.height;
    }

    const width = lastCol - col;
    const height = lastRow - row;

    this.ctx!.fillRect(col, row, width, height);
  }

  @CanvasAvailable('throw')
  drawSelection() {
    this.ctx!.save();

    this.ctx!.rect(
      0,
      this.settings.cellHeaderHeight,
      this.canvas!.width,
      this.renderCanvas!.height - this.settings.cellHeaderHeight
    );

    this.ctx!.clip();

    this.ctx!.globalAlpha = 0.2;
    this.ctx!.fillStyle = this.gridColors.focusBorderColor;

    for (let i = 0; i < this.cellManipulation.PositionCollection.count(); i++) {
      const pos = this.cellManipulation.PositionCollection.item(i);
      this.drawSelectedCellBackground(pos.column, pos.row);
    }

    this.ctx!.restore();
  }

  createSelection(pos: MyPosition): void {
    if (this.position) {
      const minCol: number =
        this.position.column < pos.column ? this.position.column : pos.column;
      let maxCol: number =
        this.position.column > pos.column ? this.position.column : pos.column;
      const minRow: number =
        this.position.row < pos.row ? this.position.row : pos.row;
      let maxRow: number =
        this.position.row > pos.row ? this.position.row : pos.row;

      maxCol += 1;
      maxRow += 1;

      this.cellManipulation.PositionCollection.clear();

      for (let row = minRow; row < maxRow; row++) {
        for (let col = minCol; col < maxCol; col++) {
          this.cellManipulation.PositionCollection.add(
            new MyPosition(row, col)
          );
        }
      }
    }
  }

  destroySelection() {
    this.cellManipulation.PositionCollection.clear();
    this.renderGrid();
  }

  get hasPositionCollection(): boolean {
    return this.cellManipulation.PositionCollection.count() > 0;
  }

  isPositionValid(pos: MyPosition): boolean {
    if (pos === undefined || pos.isEmpty()) {
      return false;
    }
    if (pos.column < 0 || pos.column >= this.gridData.columns) {
      return false;
    }
    if (pos.row < 0 || pos.row >= this.gridData.rows) {
      return false;
    }

    return true;
  }

  @CanvasAvailable('throw')
  calcCorrectCoordinate(event: MouseEvent) {
    let row = -1;
    let col = -1;
    const rect = this.canvas!.getBoundingClientRect();
    const x: number = event.clientX - rect.left;
    const y: number = event.clientY - rect.top;

    if (y >= this.settings.cellHeaderHeight) {
      row =
        Math.floor(
          (y - this.settings.cellHeaderHeight) / this.settings.cellHeight
        ) + this.firstVisibleRow;
      col = Math.floor(x / this.settings.cellWidth) + this.firstVisibleCol;
    }

    return new MyPosition(row, col);
  }

  /* #endregion position and selection */

  private get existData(): boolean {
    if (!this.gridData) {
      return false;
    }
    if (!this.gridData.rows) {
      return false;
    }

    return true;
  }

  private get firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }
  private set firstVisibleRow(value: number) {
    this.scroll.verticalScrollPosition = value;
  }

  private get firstVisibleCol(): number {
    return this.scroll.horizontalScrollPosition;
  }

  private set firstVisibleCol(value: number) {
    this.scroll.horizontalScrollPosition = value;
  }
  private updateVisibleRow(): number {
    return Math.ceil(this.height / this.settings.cellHeight);
  }

  private updateVisibleCol(): number {
    return Math.ceil(this.width / this.settings.cellWidth);
  }

  private nominalVisibleRow(): number {
    return Math.ceil(this.renderCanvas!.height / this.settings.cellHeight);
  }

  private nominalVisibleCol(): number {
    return Math.ceil(this.renderCanvas!.width / this.settings.cellWidth);
  }
}
