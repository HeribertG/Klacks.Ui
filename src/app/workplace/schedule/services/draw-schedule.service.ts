/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { SettingsService } from './settings.service';
import { CellManipulationService } from './cell-manipulation.service';
import { MyPosition } from 'src/app/grid/classes/position';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { CreateHeaderService } from './create-header.service';
import { CreateCellService } from './create-cell.service';
import { DataService } from './data.service';
import { CreateRowHeaderService } from './create-row-header.service';
import { CanvasManagerService } from './canvas-manager.service';
import { GridRenderService } from './grid-render.service';
import { CellRenderService } from './cell-render.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Injectable()
export class DrawScheduleService {
  public cellManipulation = inject(CellManipulationService);
  public gridData = inject(DataService);
  public createRowHeader = inject(CreateRowHeaderService);

  private gridColors = inject(GridColorService);
  private scroll = inject(ScrollService);
  private settings = inject(SettingsService);
  private createHeader = inject(CreateHeaderService);
  private createCell = inject(CreateCellService);
  private canvasManager = inject(CanvasManagerService);
  private gridRender = inject(GridRenderService);
  private cellRender = inject(CellRenderService);

  public startDate: Date = new Date();

  // public rowHeader: ScheduleScheduleRowHeaderComponent | undefined;
  public recFilterIcon: Rectangle = new Rectangle();
  public filterImage: HTMLImageElement | undefined;

  private readonly BORDER_OFFSET = 4;
  private readonly MAX_INCREMENTAL_SCROLL = 4;

  private _isFocused = true;
  private isScrolling = false;
  private pendingScrollX = 0;
  private pendingScrollY = 0;

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
    this.createCell.reset();
  }

  @CanvasAvailable('queue')
  public redraw() {
    this.redrawGrid();
  }

  @CanvasAvailable('queue')
  public refresh() {
    this.refreshGrid();
  }

  // @CanvasAvailable('queue')
  // private setMetrics() {
  //   if (this.existData) {
  //     // const visibleRows: number = this.updateVisibleRow();
  //     // const visibleCols: number = this.updateVisibleCol();
  //     // this.scroll.setMetrics(
  //     //   visibleCols,
  //     //   this.gridData.columns,
  //     //   visibleRows,
  //     //   this.gridData.rows
  //     // );
  //   }
  // }

  public set width(value: number) {
    this.canvasManager.width = value;
    //this.setMetrics();
    this.canvasManager.resizeMainCanvas();
  }
  public get width(): number {
    return this.canvasManager.width;
  }

  public set height(value: number) {
    this.canvasManager.height = value;
    //this.setMetrics();
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
    // this.setMetrics();
    this.gridRender.drawGridHeader(this.gridData.columns);
    this.drawGrid();
  }

  @CanvasAvailable('queue')
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

  @CanvasAvailable('queue')
  private renderGrid(): void {
    this.gridRender.renderGrid();

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
      this.gridRender.drawGridSelectedHeaderCell(
        this.position,
        this.firstVisibleCol
      );
      this.gridRender.drawGridSelectedCell(
        this.position,
        this.isFocused,
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    }
  }

  @CanvasAvailable('queue')
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
        this.addCells();
      }
    }
  }

  // private addNewCols(
  //   oldVisibleRow: number,
  //   oldVisibleCol: number,
  //   visibleRow: number,
  //   visibleCol: number
  // ) {
  //   for (let col = oldVisibleCol; col < visibleCol; col++) {
  //     for (let row = oldVisibleRow; row < visibleRow; row++) {
  //       this.addCells();
  //     }
  //   }
  // }

  @CanvasAvailable('queue')
  private shrinkGrid() {
    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);

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
  moveGrid(directionX: number, directionY: number): void {
    if (this.isScrolling) {
      this.pendingScrollX += directionX;
      this.pendingScrollY += directionY;
      return;
    }

    this.executeScroll(directionX, directionY);
  }

  private executeScroll(directionX: number, directionY: number): void {
    this.isScrolling = true;

    const oldFirstVisibleRow = this.firstVisibleRow;
    const oldFirstVisibleCol = this.firstVisibleCol;

    this.firstVisibleCol += directionX;
    this.firstVisibleRow += directionY;

    if (this.isInRange(directionX) || this.isInRange(directionY)) {
      this.moveCanvas(
        directionX,
        directionY,
        oldFirstVisibleRow,
        oldFirstVisibleCol
      );
    } else {
      this.gridRender.drawGrid(
        this.updateVisibleRow(),
        this.updateVisibleCol(),
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    }

    // if (this.rowHeader) {
    //   this.rowHeader.drawRowHeader.moveGrid(directionX, directionY);
    // }

    this.isScrolling = false;
    if (this.pendingScrollX !== 0 || this.pendingScrollY !== 0) {
      const pendingX = this.pendingScrollX;
      const pendingY = this.pendingScrollY;
      this.pendingScrollX = 0;
      this.pendingScrollY = 0;

      this.executeScroll(pendingX, pendingY);
    }
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
  private moveCanvas(
    directionX: number,
    directionY: number,
    oldFirstVisibleRow: number,
    oldFirstVisibleCol: number
  ) {
    const visibleRow: number = this.updateVisibleRow();
    const visibleCol: number = this.updateVisibleCol();

    if (directionX !== 0) {
      this.handleHorizontalScroll(
        directionX,
        directionY,
        visibleRow,
        visibleCol,
        oldFirstVisibleRow,
        oldFirstVisibleCol
      );
    }

    if (directionY !== 0) {
      this.handleVerticalScroll(
        directionX,
        directionY,
        visibleRow,
        visibleCol,
        oldFirstVisibleRow,
        oldFirstVisibleCol
      );
    }

    this.renderGrid();
  }

  private handleHorizontalScroll(
    directionX: number,
    directionY: number,
    visibleRow: number,
    visibleCol: number,
    oldFirstVisibleRow: number,
    oldFirstVisibleCol: number
  ) {
    const diff = this.scroll.horizontalScrollDelta;
    if (diff === 0) return;
    console.log('horizontalScrollDelta:', diff);
    const tempCanvas = this.createTempCanvas();
    this.drawOnTempCanvas(tempCanvas, 0, 0);

    this.resizeRenderCanvas(visibleRow, visibleCol);
    this.drawImageOnRenderCanvas(
      tempCanvas,
      -this.settings.cellWidth * diff,
      0
    );

    this.cellRender.updateCellsForHorizontalScroll(
      this.scroll.horizontalScrollDelta,
      directionX,
      directionY,
      visibleRow,
      visibleCol,
      oldFirstVisibleRow,
      oldFirstVisibleCol
    );
  }

  private handleVerticalScroll(
    directionX: number,
    directionY: number,
    visibleRow: number,
    visibleCol: number,
    oldFirstVisibleRow: number,
    oldFirstVisibleCol: number
  ) {
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

    this.cellRender.updateCellsForVerticalScroll(
      this.scroll.verticalScrollDelta,
      directionX,
      directionY,
      visibleRow,
      visibleCol,
      oldFirstVisibleRow,
      oldFirstVisibleCol
    );
  }

  private createTempCanvas(): HTMLCanvasElement {
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;
    tempCanvas.height = this.canvasManager.renderCanvas!.height;
    tempCanvas.width = this.canvasManager.renderCanvas!.width;
    return tempCanvas;
  }

  private drawOnTempCanvas(
    tempCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ) {
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.canvasManager.renderCanvas!, x, y);
    }
  }

  private resizeRenderCanvas(visibleRow: number, visibleCol: number) {
    this.canvasManager.renderCanvas!.height =
      visibleRow * this.settings.cellHeight;
    this.canvasManager.renderCanvas!.width =
      visibleCol * this.settings.cellWidth;
    this.canvasManager.renderCanvasCtx!.clearRect(
      0,
      0,
      this.canvasManager.renderCanvas!.width,
      this.canvasManager.renderCanvas!.height
    );
  }

  private drawImageOnRenderCanvas(
    tempCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ) {
    this.canvasManager.renderCanvasCtx!.drawImage(tempCanvas, x, y);
  }

  @CanvasAvailable('queue')
  private crateGridHeader() {
    this.canvasManager.headerCanvas!.height =
      this.settings.cellHeaderHeight + this.settings.increaseBorder;
    this.canvasManager.headerCanvas!.width =
      this.gridData.columns * this.settings.cellWidth;

    for (let col = 0; col < this.gridData.columns; col++) {
      const imgHeader = this.createHeader.createHeader(col);
      if (imgHeader) {
        if (col < this.gridData.columns) {
          this.canvasManager.headerCtx!.putImageData(
            imgHeader,
            col * this.settings.cellWidth,
            0
          );
        }
      }
    }
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

    // if (this.rowHeader) {
    //   this.rowHeader.drawRowHeader.redraw();
    // }
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
  refreshGridHeaderCell(pos: MyPosition): void {
    if (pos !== undefined) {
      if (!pos.isEmpty()) {
        const col: number =
          (pos.column - this.firstVisibleCol) * this.settings.cellWidth;

        const tmpImage: ImageData = this.canvasManager.headerCtx!.getImageData(
          pos.column * this.settings.cellWidth,
          0,
          this.settings.cellWidth,
          this.settings.cellHeaderHeight
        );
        this.canvasManager.ctx!.putImageData(tmpImage, col, 0);
      }
    }
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

  @CanvasAvailable('queue')
  private addCells() {
    if (this.existData) {
      const visibleRows: number = this.updateVisibleRow();
      const visibleCols: number = this.updateVisibleCol();

      this.cellRender.addCells(
        visibleRows,
        visibleCols,
        this.firstVisibleRow,
        this.firstVisibleCol
      );
    }
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
      const oldPosition: MyPosition = this.cellManipulation.Position;
      this.cellManipulation.Position = pos;

      this.refreshCell(oldPosition);
      this.refreshGridHeaderCell(oldPosition);
    }

    this.drawSelection();

    this.drawGridSelectedHeaderCell();
    this.drawGridSelectedCell();
  }

  @CanvasAvailable('queue')
  private drawSelectedCellBackground(col: number, row: number): void {
    const column: number =
      (col - this.firstVisibleCol) * this.settings.cellWidth;
    const rowSet: number =
      (row - this.firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    this.canvasManager.ctx!.fillRect(
      column,
      rowSet,
      this.settings.cellWidth,
      this.settings.cellHeight
    );
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
    return Math.ceil(
      this.canvasManager.renderCanvas!.height / this.settings.cellHeight
    );
  }

  private nominalVisibleCol(): number {
    return Math.ceil(
      this.canvasManager.renderCanvas!.width / this.settings.cellWidth
    );
  }
}
