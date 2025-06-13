/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { SettingsService } from './settings.service';
import { CellManipulationService } from './cell-manipulation.service';
import { MyPosition } from 'src/app/grid/classes/position';
import { CreateHeaderService } from './create-header.service';
import { CreateCellService } from './create-cell.service';
import { DataService } from './data.service';
import { CreateRowHeaderService } from './create-row-header.service';
import { CanvasManagerService } from './canvas-manager.service';
import { GridRenderService } from './grid-render.service';
import { CellRenderService } from './cell-render.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';

@Injectable()
export class DrawScheduleService {
  public cellManipulation = inject(CellManipulationService);
  public gridData = inject(DataService);
  public createRowHeader = inject(CreateRowHeaderService);

  private gridColors = inject(GridColorService);
  private scroll = inject(ScrollService);
  private settings = inject(SettingsService);
  private createHeader = inject(CreateHeaderService);
  private createCellService = inject(CreateCellService);
  private canvasManager = inject(CanvasManagerService);
  private gridRender = inject(GridRenderService);
  private cellRender = inject(CellRenderService);

  private readonly MAX_INCREMENTAL_SCROLL = 4;
  private readonly ADDITIONALLY_EMPTY_COLUMNS = 3;
  private readonly ADDITIONALLY_EMPTY_ROWS = 3;

  public startDate: Date = new Date();
  public recFilterIcon: Rectangle = new Rectangle();
  public filterImage: HTMLImageElement | undefined;

  private _isFocused = true;
  private isScrolling = false;
  private isScrollingToFast = false;

  /* #region initial/final */
  public createCanvas() {
    this.canvasManager.createCanvas();
    (this as any).executeQueuedMethods();
  }

  public deleteCanvas() {
    this.canvasManager.deleteCanvas();
  }

  /* #endregion initial/final */

  /* #region Environment changes */

  @CanvasAvailable('queue')
  public rebuild() {
    this.createHeader.reset();
    this.createCellService.reset();
  }

  @CanvasAvailable('queue')
  public redraw() {
    this.redrawGrid();
  }

  @CanvasAvailable('queue')
  public refresh() {
    this.refreshGrid();
  }

  public set width(value: number) {
    this.canvasManager.width = value;
    this.canvasManager.resizeMainCanvas();
  }
  public get width(): number {
    return this.canvasManager.width;
  }

  public set height(value: number) {
    this.canvasManager.height = value;
    this.canvasManager.resizeMainCanvas();
  }

  public get height(): number {
    return this.canvasManager.height;
  }

  public set isFocused(value: boolean) {
    this._isFocused = value;
  }
  public get isFocused(): boolean {
    return this._isFocused;
  }

  public isCanvasAvailable(): boolean {
    return this.canvasManager.isCanvasAvailable();
  }

  /* #endregion Environment changes */

  /* #region draw Grid */

  @CanvasAvailable('queue')
  private redrawGrid() {
    this.setVisibleColRows();

    this.gridRender.drawGridHeader(this.gridData.columns);
    this.drawGrid();
  }

  @CanvasAvailable('queue')
  private refreshGrid(): void {
    this.setVisibleColRows();
    const oldVisibleRow: number = this.nominalVisibleRow();
    const oldVisibleCol: number = this.nominalVisibleCol();

    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    if (oldVisibleCol < visibleCol && oldVisibleRow < visibleRow) {
      this.resizeRenderCanvas(visibleRow, visibleCol);
      this.redrawGrid();
    } else if (oldVisibleCol < visibleCol || oldVisibleRow < visibleRow) {
      this.growGrid();
    } else if (oldVisibleCol > visibleCol || oldVisibleRow > visibleRow) {
      this.shrinkGrid();
    } else {
      this.renderGrid();
    }
  }

  @CanvasAvailable('queue')
  private renderGrid(): void {
    this.gridRender.renderGrid();
    console.log('renderGrid', this.position);
    if (
      this.hasPositionCollection &&
      this.cellManipulation.PositionCollection.count() > 1
    ) {
      this.gridRender.drawSelection(
        this.cellManipulation.PositionCollection.getAll(),
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    } else {
      this.gridRender.drawGridSelectedCell(
        this.position,
        this.isFocused,
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    }

    this.gridRender.drawGridSelectedHeaderCell(
      this.position,
      this.firstVisibleCol
    );
  }

  @CanvasAvailable('queue')
  private growGrid() {
    const oldVisibleRow = this.nominalVisibleRow();
    const oldVisibleCol = this.nominalVisibleCol();

    const visibleRow = this.updateVisibleRow();
    const visibleCol = this.updateVisibleCol();

    if (oldVisibleRow < visibleRow || oldVisibleCol < visibleCol) {
      const tempCanvas = this.createTempCanvas();
      this.drawOnTempCanvas(tempCanvas, 0, 0);

      this.resizeRenderCanvas(visibleRow, visibleCol);

      this.drawImageOnRenderCanvas(tempCanvas, 0, 0);

      if (oldVisibleRow < visibleRow && oldVisibleCol < visibleCol) {
        this.addNewCells(oldVisibleRow, oldVisibleCol, visibleRow, visibleCol);
      } else if (oldVisibleRow === visibleRow && oldVisibleCol < visibleCol) {
        this.addNewCells(0, oldVisibleCol, visibleRow, visibleCol);
      } else if (oldVisibleRow < visibleRow && oldVisibleCol === visibleCol) {
        this.addNewCells(oldVisibleRow, 0, visibleRow, visibleCol);
      }
    }

    this.renderGrid();
  }

  private addNewCells(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ) {
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (r < this.gridData.rows && c < this.gridData.columns) {
          this.addCell(r, c);
        }
      }
    }
  }

  @CanvasAvailable('queue')
  @CanvasAvailable('queue')
  private shrinkGrid() {
    const oldVisibleRow = this.nominalVisibleRow();
    const oldVisibleCol = this.nominalVisibleCol();

    const tempCanvas = document.createElement('canvas');
    const pixelRatio = DrawHelper.pixelRatio();
    const oldLogicalWidth = oldVisibleCol * this.settings.cellWidth;
    const oldLogicalHeight = oldVisibleRow * this.settings.cellHeight;

    tempCanvas.width = oldLogicalWidth * pixelRatio;
    tempCanvas.height = oldLogicalHeight * pixelRatio;
    tempCanvas.style.width = `${oldLogicalWidth}px`;
    tempCanvas.style.height = `${oldLogicalHeight}px`;

    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx && this.canvasManager.renderCanvas) {
      tempCtx.drawImage(this.canvasManager.renderCanvas, 0, 0);
    }
    const visibleRow = this.updateVisibleRow();
    const visibleCol = this.updateVisibleCol();

    this.resizeRenderCanvas(visibleRow, visibleCol);
    this.drawImageOnRenderCanvas(tempCanvas, 0, 0);

    this.renderGrid();
  }

  @CanvasAvailable('queue')
  refreshCell(pos: MyPosition) {
    if (this.canvasManager.isRenderCanvasAvailable()) {
      const visibleRows: number = this.updateVisibleRow();
      const visibleCols: number = this.updateVisibleCol();
      this.cellRender.refreshCell(
        pos,
        visibleRows,
        visibleCols,
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    }
  }

  @CanvasAvailable('queue')
  moveGrid(): void {
    if (this.isScrolling) {
      this.isScrollingToFast = true;
      return;
    }

    if (this.isScrollingToFast) {
      this.redrawGrid();
      this.isScrollingToFast = false;
    } else {
      const deltaX = this.scroll.horizontalScrollDelta;
      const deltaY = this.scroll.verticalScrollDelta;
      this.executeScroll(deltaX, deltaY);
    }
  }

  private executeScroll(directionX: number, directionY: number): void {
    this.isScrolling = true;

    if (this.isInRange(directionX) || this.isInRange(directionY)) {
      this.moveCanvas(directionX, directionY);
    } else {
      this.gridRender.drawGrid(
        this.updateVisibleRow(),
        this.updateVisibleCol(),
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    }

    this.isScrolling = false;
  }

  private isInRange(direction: number): boolean {
    if (direction === 0) {
      return false;
    }

    if (direction < 0) {
      direction = direction * -1;
    }

    return direction <= this.MAX_INCREMENTAL_SCROLL;
  }

  @CanvasAvailable('queue')
  @CanvasAvailable('queue')
  private moveCanvas(directionX: number, directionY: number) {
    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    if (directionX !== 0) {
      this.handleHorizontalScroll(visibleRow, visibleCol);
    }

    if (directionY !== 0) {
      this.handleVerticalScroll(visibleRow, visibleCol);
    }

    this.renderGrid();
  }

  private handleHorizontalScroll(visibleRow: number, visibleCol: number): void {
    const horizontalDiff = this.scroll.horizontalScrollDelta;

    this.scroll.resetDeltas();

    if (horizontalDiff === 0) return;

    const newFirstVisibleCol = this.scroll.horizontalScrollPosition;
    const newFirstVisibleRow = this.scroll.verticalScrollPosition;

    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);
    this.resizeRenderCanvas(visibleRow, visibleCol);
    const scrollOffsetX = -this.settings.cellWidth * horizontalDiff;
    this.drawImageOnRenderCanvas(tempCanvas, scrollOffsetX, 0);

    this.cellRender.updateCellsForHorizontalScroll(
      horizontalDiff,
      visibleRow,
      visibleCol,
      newFirstVisibleRow,
      newFirstVisibleCol
    );
  }

  private handleVerticalScroll(visibleRow: number, visibleCol: number): void {
    const verticalDiff = this.scroll.verticalScrollDelta;
    this.scroll.resetDeltas();

    if (verticalDiff === 0) return;

    const newFirstVisibleCol = this.scroll.horizontalScrollPosition;
    const newFirstVisibleRow = this.scroll.verticalScrollPosition;

    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);
    this.resizeRenderCanvas(visibleRow, visibleCol);
    const scrollOffsetY = -this.settings.cellHeight * verticalDiff;
    this.drawImageOnRenderCanvas(tempCanvas, 0, scrollOffsetY);

    this.cellRender.updateCellsForVerticalScroll(
      verticalDiff,
      visibleRow,
      visibleCol,
      newFirstVisibleRow,
      newFirstVisibleCol
    );
  }

  private createTempCanvas(): HTMLCanvasElement {
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;
    const pixelRatio = DrawHelper.pixelRatio();
    const logicalWidth = this.updateVisibleCol() * this.settings.cellWidth;
    const logicalHeight = this.updateVisibleRow() * this.settings.cellHeight;

    tempCanvas.width = logicalWidth * pixelRatio;
    tempCanvas.height = logicalHeight * pixelRatio;

    tempCanvas.style.width = `${logicalWidth}px`;
    tempCanvas.style.height = `${logicalHeight}px`;

    return tempCanvas;
  }

  private drawOnTempCanvas(
    tempCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ): void {
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const renderCanvas = this.canvasManager.renderCanvas!;
    const pixelRatio = DrawHelper.pixelRatio();
    const logicalWidth = renderCanvas.width / pixelRatio;
    const logicalHeight = renderCanvas.height / pixelRatio;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    ctx.drawImage(renderCanvas, x, y);
  }

  private resizeRenderCanvas(visibleRow: number, visibleCol: number) {
    this.canvasManager.resizeRenderCanvas(visibleRow, visibleCol);
  }

  private drawImageOnRenderCanvas(
    tempCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ): void {
    if (!this.canvasManager.renderCanvasCtx) return;

    const ctx = this.canvasManager.renderCanvasCtx;
    const pixelRatio = DrawHelper.pixelRatio();

    ctx.drawImage(
      tempCanvas,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
      x,
      y,
      tempCanvas.width / pixelRatio,
      tempCanvas.height / pixelRatio
    );
  }

  @CanvasAvailable('queue')
  drawGrid() {
    const visibleRows: number = this.updateVisibleRow();
    const visibleCols: number = this.updateVisibleCol();

    this.cellRender.addCells(
      visibleRows,
      visibleCols,
      this.firstVisibleRow,
      this.firstVisibleCol
    );
    this.renderGrid();
  }

  @CanvasAvailable('queue')
  drawGridSelectedCell() {
    this.gridRender.drawGridSelectedCell(
      this.position,
      this.isFocused,
      this.firstVisibleRow,
      this.firstVisibleCol
    );
  }

  @CanvasAvailable('queue')
  drawGridSelectedHeaderCell() {
    if (this.position) {
      if (!this.position.isEmpty()) {
        this.canvasManager.ctx!.save();

        this.canvasManager.ctx!.fillStyle = this.gridColors.focusBorderColor;

        this.canvasManager.ctx!.globalAlpha = 0.2;
        const col: number =
          (this.position.column - this.firstVisibleCol) *
          this.settings.cellWidth;

        this.canvasManager.ctx!.fillRect(
          col,
          0,
          this.settings.cellWidth,
          this.settings.cellHeaderHeight
        );

        this.canvasManager.ctx!.restore();
      }
    }
  }

  private addCell(row: number, col: number): void {
    const ctx = this.canvasManager.renderCanvasCtx;
    if (!ctx) return;
    const cellCanvas = this.createCellService.createCell(
      row + this.firstVisibleRow,
      col + this.firstVisibleCol
    );
    if (!cellCanvas) return;

    const x = col * this.settings.cellWidth;
    const y = row * this.settings.cellHeight;

    ctx.drawImage(
      cellCanvas,
      x,
      y,
      this.settings.cellWidth,
      this.settings.cellHeight
    );
  }
  /* #endregion draw Grid */

  /* #region position and selection */

  @CanvasAvailable('queue')
  drawSelectionDynamically(pos: MyPosition): void {
    if (this.position != null && !this.position.isEmpty()) {
      if (pos != null && !pos.isEmpty()) {
        this.canvasManager.ctx!.save();

        this.renderGrid();

        this.canvasManager.ctx!.rect(
          0,
          this.settings.cellHeaderHeight,
          this.canvasManager.canvas!.width,
          this.canvasManager.renderCanvas!.height -
            this.settings.cellHeaderHeight
        );

        this.canvasManager.ctx!.clip();

        this.canvasManager.ctx!.globalAlpha = 0.2;
        this.canvasManager.ctx!.fillStyle = this.gridColors.focusBorderColor;

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
        this.canvasManager.ctx!.restore();
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
      this.cellManipulation.Position = pos;
      this.refresh();
    }

    this.drawSelection();

    this.drawGridSelectedHeaderCell();
    this.drawGridSelectedCell();
  }

  @CanvasAvailable('queue')
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

    if (lastCol > this.canvasManager.canvas!.width) {
      lastCol = this.canvasManager.canvas!.width;
    }
    if (lastRow > this.canvasManager.canvas!.height) {
      lastRow = this.canvasManager.canvas!.height;
    }

    const width = lastCol - col;
    const height = lastRow - row;

    this.canvasManager.ctx!.fillRect(col, row, width, height);
  }

  @CanvasAvailable('queue')
  drawSelection() {
    this.gridRender.drawSelection(
      this.cellManipulation.PositionCollection.getAll(),
      this.firstVisibleRow,
      this.firstVisibleCol
    );
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

  @CanvasAvailable('queue')
  calcCorrectCoordinate(event: MouseEvent) {
    let row = -1;
    let col = -1;
    const rect = this.canvasManager.canvas!.getBoundingClientRect();
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

  public get firstVisibleRow(): number {
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
    // return row <= this.gridData.rows ? row : this.gridData.rows;
  }

  private updateVisibleCol(): number {
    return Math.ceil(this.width / this.settings.cellWidth);
  }

  private nominalVisibleRow(): number {
    const dpr = DrawHelper.pixelRatio();
    const row = Math.ceil(
      this.canvasManager.renderCanvas!.height / dpr / this.settings.cellHeight
    );
    return row <= this.gridData.rows ? row : this.gridData.rows;
  }

  private nominalVisibleCol(): number {
    const dpr = DrawHelper.pixelRatio();
    return Math.ceil(
      this.canvasManager.renderCanvas!.width / dpr / this.settings.cellWidth
    );
  }

  private setVisibleColRows(): void {
    const newVisibleCols = Math.ceil(this.width / this.settings.cellWidth);
    const newVisibleRows = Math.ceil(this.height / this.settings.cellHeight);
    this.scroll.maxCols =
      this.gridData.columns - newVisibleCols + this.ADDITIONALLY_EMPTY_COLUMNS;
    this.scroll.maxRows =
      this.gridData.rows - newVisibleRows + this.ADDITIONALLY_EMPTY_ROWS;
    this.scroll.visibleCols = newVisibleCols;
    this.scroll.visibleRows = newVisibleRows;
  }
}
