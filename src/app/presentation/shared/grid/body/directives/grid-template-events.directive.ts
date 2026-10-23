// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Generic grid events directive: keyboard dispatch, mouse events, focus management. The cell and viewport
 * movement (keyboard navigation, drag edge auto-scroll) lives in GridViewportNavigationService and the hover
 * and tooltip tracking in GridHoverTooltipService, both provided per canvas by this directive.
 * In touch mode the press-and-hold drags (shift drag, work move drag) stay disarmed: both arm on a
 * timer of 150 ms without a movement condition, which would start a drag long before the 500 ms of
 * the long-press context menu and cannot be cancelled afterwards. Cutting and pasting through the
 * context menu replaces them on a tablet.
 * @param gridSurface - GridSurfaceTemplateComponent for canvas access and scroll events
 * @param gridSettings - BaseSettingsService for grid configuration (selection mode)
 * @param cellManipulation - BaseCellManipulationService for cell editing and hover
 * @param fillHandleDrag - GridFillHandleDragService for fill handle drag-and-drop
 * @param scheduleEvents - GridScheduleEventsService for schedule-specific events
 * @param navigation - GridViewportNavigationService for keyboard navigation and drag edge scrolling
 * @param hoverTooltip - GridHoverTooltipService for the hovered cell and its tooltip
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridViewportNavigationService } from 'src/app/presentation/shared/grid/services/body/grid-viewport-navigation.service';
import { GridHoverTooltipService } from 'src/app/presentation/shared/grid/services/body/grid-hover-tooltip.service';
import { GridSurfaceTemplateComponent } from '../grid-surface-template/grid-surface-template.component';
import { GridSelectionModeEnum } from '../../enums/divers';
import { GridFillHandleDragService } from 'src/app/presentation/workplace/schedule/services/grid-fill-handle-drag.service';
import { GridScheduleEventsService } from 'src/app/presentation/workplace/schedule/services/grid-schedule-events.service';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { GridRightClickEvent } from './grid-right-click-event.interface';
import { GridDoubleClickEvent } from './grid-double-click-event.interface';

const CONTEXT_MENU_KEY = 'ContextMenu';
const SHIFT_CONTEXT_MENU_KEY = 'F10';
const CELL_CENTER_DIVISOR = 2;

@Directive({
  selector: '[appGridTemplateEvents]',
  standalone: true,
  providers: [GridViewportNavigationService, GridHoverTooltipService],
})
export class GridTemplateEventsDirective {
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private gridSurface = inject(GridSurfaceTemplateComponent);
  private gridSettings = inject(BaseSettingsService);
  private cellManipulation = inject(BaseCellManipulationService);
  private fillHandleDrag = inject(GridFillHandleDragService);
  private scheduleEvents = inject(GridScheduleEventsService);
  private inputModality = inject(InputModalityService);
  private navigation = inject(GridViewportNavigationService);
  private hoverTooltip = inject(GridHoverTooltipService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rightClick = output<GridRightClickEvent>();
  readonly workChangeDoubleClick = output<GridDoubleClickEvent>();
  readonly workDoubleClick = output<GridDoubleClickEvent>();
  readonly containerWorkDoubleClick = output<GridDoubleClickEvent>();

  private keyDown = false;
  private scrollByKey = false;
  private isDrawing = false;
  private hasCollection = false;

  private readonly keyHandlers = new Map<string, (event: KeyboardEvent) => void>([
    ['ArrowDown', (event) => this.navigate(event, () => this.navigation.moveDown(event.repeat))],
    ['PageDown', (event) => this.navigate(event, () => this.navigation.pageDown(event.repeat))],
    ['ArrowUp', (event) => this.navigate(event, () => this.navigation.moveUp(event.repeat))],
    ['PageUp', (event) => this.navigate(event, () => this.navigation.pageUp(event.repeat))],
    ['End', (event) => this.navigateUnlessRepeated(event, () => this.navigation.moveToEnd())],
    ['Home', (event) => this.navigateUnlessRepeated(event, () => this.navigation.moveToHome())],
    ['ArrowLeft', (event) => this.navigate(event, () => this.navigation.moveLeft(event.repeat))],
    ['Backspace', (event) => this.navigate(event, () => this.navigation.moveLeft(event.repeat))],
    ['ArrowRight', (event) => this.navigate(event, () => this.navigation.moveRight(event.repeat))],
    ['Tab', (event) => this.navigate(event, () => this.navigation.moveRight(event.repeat))],
    ['Enter', (event) => this.navigate(event, () => this.navigation.moveRight(event.repeat))],
    ['Delete', (event) => this.handleDeleteKeyAction(event)],
    ['Ctrl+c', (event) => this.handleCopy(event)],
    ['Ctrl+v', (event) => this.handlePaste(event)],
    ['F2', (event) => this.handleF2(event)],
    [CONTEXT_MENU_KEY, (event) => this.handleContextMenuKey(event)],
  ]);

  constructor() {
    this.fillHandleDrag.initialize({ gridSurface: this.gridSurface, el: this.el });
    this.scheduleEvents.workChangeDoubleClick.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.workChangeDoubleClick.emit(event));
    this.scheduleEvents.workDoubleClick.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.workDoubleClick.emit(event));
    this.scheduleEvents.containerWorkDoubleClick.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.containerWorkDoubleClick.emit(event));

    fromEvent<MouseEvent>(this.el.nativeElement, 'mousemove').pipe(
      throttleTime(16),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.onMouseMove(event);
    });

    this.destroyRef.onDestroy(() => this.hoverTooltip.cancelTooltipAutoHide());
  }

  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {}

  @HostListener('dblclick', ['$event']) onDoubleClick(event: MouseEvent): void {
    if (!this.isOwnElement(event)) {
      return;
    }

    const pos = this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (this.scheduleEvents.handleDoubleClick(pos)) {
      return;
    }

    this.cellManipulation.startEditing();
  }

  @HostListener('mouseleave', ['$event']) onMouseLeave(event: MouseEvent) {
    if (!this.isOwnElement(event)) {
      return;
    }
    this.cellManipulation.hoveredCell.set(null);
    this.hoverTooltip.destroyToolTip();
  }

  @HostListener('mousewheel', ['$event']) onMouseWheel(event: Event): void {
    const wheelEvent = event as WheelEvent;
    const moveY: number =
      wheelEvent.deltaY === 0 ? 0 : wheelEvent.deltaY > 0 ? 1 : -1;
    const moveX: number =
      wheelEvent.deltaX === 0 ? 0 : wheelEvent.deltaX > 0 ? 1 : -1;

    if (moveX !== 0) {
      const newValue = this.gridSurface.valueChangeHScrollbar() + moveX;
      if (newValue >= 0) {
        this.gridSurface.valueHScrollbar.emit(newValue);
      }
    }

    if (moveY !== 0) {
      const newValue = this.gridSurface.valueChangeVScrollbar() + moveY;
      if (newValue >= 0) {
        this.gridSurface.valueVScrollbar.emit(newValue);
      }
    }

    this.stopEvent(event);
  }

  @HostListener('appClickOutside', ['$event']) onClickOutside(
    event: Event
  ): void {
    this.hoverTooltip.destroyToolTip();
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (event.buttons === 1) {
      if (this.fillHandleDrag.tryStartDrag(event)) {
        return;
      }
      this.respondToLeftButtonMouseDown(event);
      if (this.inputModality.isFingerMode()) {
        return;
      }
      this.scheduleEvents.tryPrepareShiftDrag(event);
      this.scheduleEvents.tryPrepareScheduleCellDrag(event);
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.processMouseUp(event);
    this.gridSurface.notifySelectionChanged();
  }

  private processMouseUp(event: MouseEvent): void {
    this.scheduleEvents.cancelPendingDrag();
    this.scheduleEvents.cancelPendingScheduleCellDrag();

    if (this.scheduleEvents.isShiftDragging()) {
      return;
    }

    if (this.scheduleEvents.isScheduleCellDragging()) {
      return;
    }

    if (this.fillHandleDrag.isDragging()) {
      this.fillHandleDrag.endDrag();
      return;
    }

    this.isDrawing = false;
    this.navigation.resetRepeatClocks();

    if (this.hasCollection && !this.isMultiselectBlocked()) {
      const pos: MyPosition =
        this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
      if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
        return;
      }

      this.gridSurface.drawSchedule.createSelection(pos);
    }

    this.hasCollection = false;
  }

  onMouseMove(event: MouseEvent): void {
    if (this.scheduleEvents.isShiftDragging()) {
      this.scheduleEvents.updateShiftDragPosition(event.clientY);
      return;
    }

    if (this.scheduleEvents.isScheduleCellDragging()) {
      this.scheduleEvents.updateScheduleCellDragPosition(event.clientY);
      return;
    }

    if (this.scheduleEvents.tryStartPendingScheduleCellDrag(event)) {
      this.isDrawing = false;
      this.hasCollection = false;
      this.gridSurface.drawSchedule.destroySelection();
      return;
    }

    if (this.fillHandleDrag.isDragging()) {
      this.fillHandleDrag.updateDrag(event);
      return;
    }

    if (this.hoverTooltip.hoverHeader(event)) {
      return;
    }

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    this.hoverTooltip.hoverCell(pos, event);
    this.fillHandleDrag.updateCursorForFillHandle(event);

    if (event.buttons === 1 && this.isDrawing) {
      if (this.isMultiselectBlocked()) {
        return;
      }

      this.navigation.scrollOnPoint(pos);
      if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
        return;
      }

      this.gridSurface.drawSchedule.drawSelectionDynamically(pos);

      this.hasCollection = true;
    }
  }

  @HostListener('window:keydown', ['$event']) onKeyDown(
    event: KeyboardEvent
  ): void {
    if (event.key === 'Escape' && this.scheduleEvents.isScheduleCellDragging()) {
      this.scheduleEvents.cancelScheduleCellDrag();
      this.stopEvent(event);
      return;
    }

    this.keyDown = true;

    if (!this.isOwnElement(event)) {
      this.gridSurface.drawSchedule.isFocused = false;
      return;
    }

    this.gridSurface.drawSchedule.isFocused = true;

    this.keyDown = true;

    const contextMenu = this.gridSurface.contextMenu();
    if (contextMenu) {
      contextMenu.closeMenu(true);
    }

    if (event.shiftKey && event.key === SHIFT_CONTEXT_MENU_KEY) {
      this.handleContextMenuKey(event);
      return;
    }

    const mapKey = event.ctrlKey ? `Ctrl+${event.key}` : event.key;
    const handler = this.keyHandlers.get(mapKey);
    if (handler) {
      handler(event);
      this.gridSurface.notifySelectionChanged();
      return;
    }

    if (!event.ctrlKey && !event.altKey && !event.metaKey && this.isPrintableKey(event)) {
      this.cellManipulation.startEditing(event.key);
      this.stopEvent(event);
      return;
    }

    event.stopPropagation();
  }

  private navigate(event: KeyboardEvent, move: () => void): void {
    move();
    this.stopEvent(event);
  }

  private navigateUnlessRepeated(event: KeyboardEvent, move: () => void): void {
    if (event.repeat) {
      event.preventDefault();
      return;
    }

    move();
    this.stopEvent(event);
  }

  private handleDeleteKeyAction(event: KeyboardEvent): void {
    this.scheduleEvents.handleDeleteKey();
    this.stopEvent(event);
  }

  private handleCopy(event: KeyboardEvent): void {
    this.cellManipulation.copy();
    this.keyDown = false;
  }

  private handlePaste(event: KeyboardEvent): void {
    this.cellManipulation.paste();
    this.keyDown = false;
  }

  private handleF2(event: KeyboardEvent): void {
    this.cellManipulation.startEditing();
    this.stopEvent(event);
  }

  private isPrintableKey(event: KeyboardEvent): boolean {
    if (event.key.length !== 1) {
      return false;
    }
    const code = event.key.charCodeAt(0);
    return code >= 32 && code <= 126;
  }

  @HostListener('window:keyup', ['$event']) onKeyUp(
    event: KeyboardEvent
  ): void {
    this.keyDown = false;
    this.scrollByKey = false;
  }

  @HostListener('window:keypress', ['$event']) onKeyPress(
    event: KeyboardEvent
  ): void {}

  @HostListener('window:focus', ['$event']) onfocus(event: FocusEvent): void {
    this.gridSurface.setFocus();
    if (
      this.gridSurface.drawSchedule.position &&
      !this.gridSurface.drawSchedule.hasPositionCollection
    ) {
      this.gridSurface.drawSchedule.refreshCell(
        this.gridSurface.drawSchedule.position
      );
      this.gridSurface.drawSchedule.drawGridSelectedCell();
    }
  }

  @HostListener('window:blur', ['$event']) onblur(event: FocusEvent): void {
    this.gridSurface.drawSchedule.isFocused = false;
    if (
      this.gridSurface.drawSchedule.position &&
      !this.gridSurface.drawSchedule.hasPositionCollection
    ) {
      this.gridSurface.drawSchedule.refreshCell(
        this.gridSurface.drawSchedule.position
      );
      this.gridSurface.drawSchedule.drawGridSelectedCell();
    }
  }

  private respondToLeftButtonMouseDown(event: MouseEvent): void {
    this.gridSurface.drawSchedule.destroySelection();
    this.gridSurface.setFocus();

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    this.isDrawing = true;

    if (this.gridSurface.drawSchedule.position !== pos) {
      this.gridSurface.drawSchedule.position = pos;
    }
    this.gridSurface.drawSchedule.refresh();
  }

  private respondToRightButtonMouseDown(event: MouseEvent): void {
    this.gridSurface.setFocus();

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (this.gridSurface.drawSchedule.position !== pos) {
      this.gridSurface.drawSchedule.position = pos;
    }

    this.openContextMenuForPosition(pos, event.clientX, event.clientY);
  }

  private openContextMenuForPosition(
    pos: MyPosition,
    clientX: number,
    clientY: number
  ): void {
    this.gridSurface.drawSchedule.drawSelection();
    this.gridSurface.drawSchedule.drawGridSelectedCell();
    this.gridSurface.notifySelectionChanged();

    this.rightClick.emit({
      row: pos.row,
      column: pos.column,
      clientX,
      clientY,
    });
  }

  private handleContextMenuKey(event: KeyboardEvent): void {
    this.stopEvent(event);

    const pos = this.gridSurface.drawSchedule.position;
    if (!pos || !this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    const anchor = this.selectedCellCenterInClientCoordinates();
    if (!anchor) {
      return;
    }

    this.gridSurface.setFocus();
    this.openContextMenuForPosition(pos, anchor.clientX, anchor.clientY);
  }

  private selectedCellCenterInClientCoordinates(): {
    clientX: number;
    clientY: number;
  } | null {
    const rect = this.gridSurface.selectedCellRect();
    if (!rect) {
      return null;
    }

    const canvasBounds = this.el.nativeElement.getBoundingClientRect();
    return {
      clientX: canvasBounds.left + rect.left + rect.width / CELL_CENTER_DIVISOR,
      clientY: canvasBounds.top + rect.top + rect.height / CELL_CENTER_DIVISOR,
    };
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.cancelPendingLeftButtonState();
    this.respondToRightButtonMouseDown(event);
  }

  /**
   * Safari/WebKit on macOS reports a Ctrl+Click secondary click as an ordinary
   * left-button mousedown (buttons=1) before dispatching contextmenu, which can
   * leave left-button drag state armed when this handler opens the menu.
   */
  private cancelPendingLeftButtonState(): void {
    this.scheduleEvents.cancelPendingDrag();
    this.scheduleEvents.cancelPendingScheduleCellDrag();
    if (this.fillHandleDrag.isDragging()) {
      this.fillHandleDrag.endDrag();
    }
    this.isDrawing = false;
  }

  private stopEvent(event: Event): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
  }

  private isOwnElement(event: Event): boolean {
    const targetElement = event.target as HTMLElement;

    const hasId = targetElement.hasAttribute('id');
    const idValue = hasId ? targetElement.getAttribute('id') : '';

    if (idValue === 'scheduleCanvas') {
      return true;
    }

    if (targetElement === (this.el.nativeElement as HTMLElement)) {
      return true;
    }

    if (this.el.nativeElement.parentElement) {
      if (
        targetElement === (this.el.nativeElement.parentElement as HTMLElement)
      ) {
        return true;
      }
    }

    return false;
  }

  private isMultiselectBlocked(): boolean {
    return (
      this.gridSettings.selectionMode === GridSelectionModeEnum.Row ||
      this.gridSettings.selectionMode === GridSelectionModeEnum.RowActiveOnly
    );
  }
}
