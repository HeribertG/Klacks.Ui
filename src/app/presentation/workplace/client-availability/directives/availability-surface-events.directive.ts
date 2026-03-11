// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Directive, HostListener, inject, OnDestroy } from '@angular/core';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { AvailabilityCanvasManagerService } from '../services/availability-canvas-manager.service';
import { AvailabilityCalculationService } from '../services/render-availability-grid/availability-calculation.service';
import { RenderAvailabilityGridService } from '../services/render-availability-grid';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { DrawAvailabilityGridService } from '../services/draw-availability-grid.service';
import { AvailabilitySelectionService } from '../services/availability-selection.service';
import { ClientAvailabilitySurfaceComponent } from '../client-availability-surface/client-availability-surface.component';

const REPEAT_DELAY_MS = 100;
const EDGE_ZONE_PX = 30;
const AUTO_SCROLL_INTERVAL_MS = 120;

@Directive({
  selector: '[appAvailabilitySurfaceEvents]',
  standalone: true,
})
export class AvailabilitySurfaceEventsDirective implements OnDestroy {
  private settings = inject(AvailabilitySettingService);
  private canvasManager = inject(AvailabilityCanvasManagerService);
  private calculation = inject(AvailabilityCalculationService);
  private renderGrid = inject(RenderAvailabilityGridService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private drawGrid = inject(DrawAvailabilityGridService);
  private selection = inject(AvailabilitySelectionService);
  private surface = inject(ClientAvailabilitySurfaceComponent);

  private lastKeyTime = 0;
  private isDragging = false;
  private dragValue = true;
  private lastDragRow = -1;
  private lastDragCol = -1;
  private autoScrollTimer: ReturnType<typeof setInterval> | null = null;
  private edgeDeltaX = 0;
  private edgeDeltaY = 0;
  private documentMouseUpHandler = () => this.endDrag();

  ngOnDestroy(): void {
    this.endDrag();
    document.removeEventListener('mouseup', this.documentMouseUpHandler);
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    const cell = this.getCellFromEvent(event);
    if (!cell) return;

    this.isDragging = true;
    this.dragValue = !event.ctrlKey;
    this.lastDragRow = cell.row;
    this.lastDragCol = cell.col;

    document.addEventListener('mouseup', this.documentMouseUpHandler, { once: true });

    this.applyCellValue(cell.row, cell.col, this.dragValue);
    this.drawGrid.drawGrid();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const canvas = event.target as HTMLCanvasElement;
    canvas.style.cursor = (localY - this.settings.cellHeaderHeight) >= 0 ? 'pointer' : 'default';

    if (!this.isDragging) return;

    this.applyDragAtPosition(event);
    this.handleAutoScrollOnEdge(localX, localY, rect.width, rect.height);
  }

  @HostListener('mouseup')
  onMouseUp(): void {
    this.endDrag();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
  }

  @HostListener('focus')
  onFocus(): void {
    this.drawGrid.isFocused = true;
    this.drawGrid.drawGrid();
  }

  @HostListener('blur')
  onBlur(): void {
    this.drawGrid.isFocused = false;
    this.drawGrid.drawGrid();
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const deltaY = event.deltaY !== 0 ? Math.sign(event.deltaY) * this.settings.cellHeight : 0;
    const deltaX = event.deltaX !== 0 ? Math.sign(event.deltaX) * this.settings.cellWidth : 0;

    const maxScrollX = Math.max(0, this.drawGrid.getMaxScrollX() - this.drawGrid.getVisibleWidth());
    const maxScrollY = Math.max(0, this.drawGrid.getMaxScrollY() - this.drawGrid.getVisibleHeight());
    const newScrollX = Math.min(maxScrollX, Math.max(0, this.drawGrid.getScrollX() + deltaX));
    const newScrollY = Math.min(maxScrollY, Math.max(0, this.drawGrid.getScrollY() + deltaY));

    this.drawGrid.moveGrid(newScrollX, newScrollY);
    this.surface.notifyScrollChanged();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const now = Date.now();
    if (event.repeat && now - this.lastKeyTime < REPEAT_DELAY_MS) return;
    this.lastKeyTime = now;

    if (!this.selection.hasSelection()) {
      if (this.isNavigationKey(event.key)) {
        this.selection.select(0, 0);
        this.autoScrollToSelection();
        this.drawGrid.drawGrid();
        event.preventDefault();
      }
      return;
    }

    const maxRows = this.renderGrid.getClients().length;
    const maxCols = this.calculation.totalColumns;
    let moved = false;

    switch (event.key) {
      case 'ArrowDown':
        moved = this.selection.moveDown(maxRows);
        break;
      case 'ArrowUp':
        moved = this.selection.moveUp();
        break;
      case 'ArrowLeft':
      case 'Backspace':
        moved = this.selection.moveLeft();
        break;
      case 'ArrowRight':
      case 'Tab':
        moved = this.selection.moveRight(maxCols);
        event.preventDefault();
        break;
      case 'PageDown': {
        const visibleRows = this.calculation.visibleRowCount(this.canvasManager.height) - 1;
        this.selection.jumpToRow(this.selection.selectedRow() + visibleRows, maxRows);
        moved = true;
        break;
      }
      case 'PageUp': {
        const visibleRows = this.calculation.visibleRowCount(this.canvasManager.height) - 1;
        this.selection.jumpToRow(this.selection.selectedRow() - visibleRows, maxRows);
        moved = true;
        break;
      }
      case 'Home':
        this.selection.jumpToRow(0, maxRows);
        moved = true;
        break;
      case 'End':
        this.selection.jumpToRow(maxRows - 1, maxRows);
        moved = true;
        break;
      case ' ':
      case 'Enter':
        this.toggleSelectedCell();
        event.preventDefault();
        return;
      default:
        return;
    }

    if (moved) {
      this.autoScrollToSelection();
      this.drawGrid.drawGrid();
      event.preventDefault();
    }
  }

  private applyDragAtPosition(event: MouseEvent): void {
    const cell = this.getCellFromEvent(event);
    if (!cell) return;
    if (cell.row === this.lastDragRow && cell.col === this.lastDragCol) return;

    this.lastDragRow = cell.row;
    this.lastDragCol = cell.col;
    this.applyCellValue(cell.row, cell.col, this.dragValue);
    this.drawGrid.drawGrid();
  }

  private handleAutoScrollOnEdge(localX: number, localY: number, width: number, height: number): void {
    this.edgeDeltaX = 0;
    this.edgeDeltaY = 0;

    if (localX < EDGE_ZONE_PX) {
      this.edgeDeltaX = -this.settings.cellWidth;
    } else if (localX > width - EDGE_ZONE_PX) {
      this.edgeDeltaX = this.settings.cellWidth;
    }

    const dataTop = this.settings.cellHeaderHeight;
    if (localY >= dataTop && localY < dataTop + EDGE_ZONE_PX) {
      this.edgeDeltaY = -this.settings.cellHeight;
    } else if (localY > height - EDGE_ZONE_PX) {
      this.edgeDeltaY = this.settings.cellHeight;
    }

    if ((this.edgeDeltaX !== 0 || this.edgeDeltaY !== 0) && !this.autoScrollTimer) {
      this.autoScrollTimer = setInterval(() => this.doAutoScrollStep(), AUTO_SCROLL_INTERVAL_MS);
    } else if (this.edgeDeltaX === 0 && this.edgeDeltaY === 0) {
      this.stopAutoScroll();
    }
  }

  private doAutoScrollStep(): void {
    if (!this.isDragging) {
      this.stopAutoScroll();
      return;
    }

    const maxRows = this.renderGrid.getClients().length;
    const maxCols = this.calculation.totalColumns;
    let newCol = this.lastDragCol + Math.sign(this.edgeDeltaX);
    let newRow = this.lastDragRow + Math.sign(this.edgeDeltaY);
    newCol = Math.max(0, Math.min(newCol, maxCols - 1));
    newRow = Math.max(0, Math.min(newRow, maxRows - 1));

    if (newRow === this.lastDragRow && newCol === this.lastDragCol) {
      return;
    }

    this.lastDragRow = newRow;
    this.lastDragCol = newCol;
    this.applyCellValue(newRow, newCol, this.dragValue);

    const cellLeft = newCol * this.settings.cellWidth;
    const cellRight = cellLeft + this.settings.cellWidth;
    const cellTop = newRow * this.settings.cellHeight;
    const cellBottom = cellTop + this.settings.cellHeight;

    let scrollX = this.drawGrid.getScrollX();
    let scrollY = this.drawGrid.getScrollY();
    const visibleWidth = this.drawGrid.getVisibleWidth();
    const visibleHeight = this.drawGrid.getVisibleHeight();

    if (this.edgeDeltaX < 0 && cellLeft < scrollX) {
      scrollX = cellLeft;
    } else if (this.edgeDeltaX > 0 && cellRight > scrollX + visibleWidth) {
      scrollX = cellRight - visibleWidth;
    }

    if (this.edgeDeltaY < 0 && cellTop < scrollY) {
      scrollY = cellTop;
    } else if (this.edgeDeltaY > 0 && cellBottom > scrollY + visibleHeight) {
      scrollY = cellBottom - visibleHeight;
    }

    scrollX = Math.max(0, scrollX);
    scrollY = Math.max(0, scrollY);

    if (scrollX !== this.drawGrid.getScrollX() || scrollY !== this.drawGrid.getScrollY()) {
      this.drawGrid.moveGrid(scrollX, scrollY);
      this.surface.notifyScrollChanged();
    }

    this.drawGrid.drawGrid();
  }

  private endDrag(): void {
    this.isDragging = false;
    this.stopAutoScroll();
  }

  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      clearInterval(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }
  }

  private getCellFromEvent(event: MouseEvent): { row: number; col: number } | null {
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const x = event.clientX - rect.left + this.drawGrid.getScrollX();
    const y = event.clientY - rect.top - this.settings.cellHeaderHeight + this.drawGrid.getScrollY();

    if (y < 0) return null;

    const row = Math.floor(y / this.settings.cellHeight);
    const col = Math.floor(x / this.settings.cellWidth);

    const clients = this.renderGrid.getClients();
    if (row < 0 || row >= clients.length) return null;
    if (col < 0 || col >= this.calculation.totalColumns) return null;

    return { row, col };
  }

  private applyCellValue(row: number, col: number, value: boolean): void {
    const clients = this.renderGrid.getClients();
    const client = clients[row];
    if (!client) return;

    const dateHour = this.calculation.columnToDateHour(col);
    this.dataManagement.setHourRange(
      client.id,
      dateHour.dateString,
      dateHour.startHour,
      dateHour.endHour,
      value
    );

    this.selection.select(row, col);
  }

  private isNavigationKey(key: string): boolean {
    return ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
  }

  private autoScrollToSelection(): void {
    const row = this.selection.selectedRow();
    const col = this.selection.selectedCol();

    const cellTop = row * this.settings.cellHeight;
    const cellBottom = cellTop + this.settings.cellHeight;
    const cellLeft = col * this.settings.cellWidth;
    const cellRight = cellLeft + this.settings.cellWidth;

    let scrollX = this.drawGrid.getScrollX();
    let scrollY = this.drawGrid.getScrollY();
    const visibleHeight = this.drawGrid.getVisibleHeight();
    const visibleWidth = this.drawGrid.getVisibleWidth();

    if (cellTop < scrollY) {
      scrollY = cellTop;
    } else if (cellBottom + this.settings.cellHeight > scrollY + visibleHeight) {
      scrollY = cellBottom + this.settings.cellHeight - visibleHeight;
    }

    if (cellLeft < scrollX) {
      scrollX = cellLeft;
    } else if (cellRight + this.settings.cellWidth > scrollX + visibleWidth) {
      scrollX = cellRight + this.settings.cellWidth - visibleWidth;
    }

    scrollX = Math.max(0, scrollX);
    scrollY = Math.max(0, scrollY);

    if (scrollX !== this.drawGrid.getScrollX() || scrollY !== this.drawGrid.getScrollY()) {
      this.drawGrid.moveGrid(scrollX, scrollY);
      this.surface.notifyScrollChanged();
    }
  }

  private toggleSelectedCell(): void {
    const row = this.selection.selectedRow();
    const col = this.selection.selectedCol();

    const clients = this.renderGrid.getClients();
    if (row < 0 || row >= clients.length) return;
    if (col < 0 || col >= this.calculation.totalColumns) return;

    const client = clients[row];
    const dateHour = this.calculation.columnToDateHour(col);

    this.dataManagement.toggleAvailability(
      client.id,
      dateHour.dateString,
      dateHour.startHour,
      dateHour.endHour
    );

    this.drawGrid.drawGrid();
  }
}
