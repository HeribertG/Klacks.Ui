// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Container component that hosts both the ScheduleSection and ShiftSection.
 * Manages the split view layout and coordinates drag-drop operations between
 * the shift grid and schedule grid. Handles horizontal scroll synchronization.
 *
 * @relations
 * - Contains: ScheduleSectionComponent, ShiftSectionComponent
 * - Uses: ShiftToScheduleDragDropService for cross-section drag-drop
 * - Parent: ScheduleHomeComponent
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  ViewChild,
  input
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { throttleTime, filter } from 'rxjs/operators';
import { AngularSplitModule } from 'angular-split';
import { CommonModule } from '@angular/common';

import { ScheduleSectionComponent } from '../schedule-section/schedule-section.component';
import { ShiftSectionComponent } from '../shift-section/shift-section.component';
import { ShiftToScheduleDragDropService } from '../services/shift-to-schedule-drag-drop.service';
import { ScheduleCellDragDropService } from '../schedule-section/services/schedule-cell-drag-drop.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { DirectionService } from 'src/app/application/services/direction.service';

@Component({
  selector: 'app-schedule-container',
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    ScheduleSectionComponent,
    ShiftSectionComponent,
  ],
  templateUrl: './schedule-container.component.html',
  styleUrls: ['./schedule-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleContainerComponent {
  @ViewChild('scheduleSection') scheduleSection!: ScheduleSectionComponent;

  readonly zoom = input(1.0);
  readonly refreshTrigger = input(false);
  public horizontalSize = 205;
  public hScrollPosition = 0;
  public IsInfoVisible = false;

  direction = inject(DirectionService).direction;

  public shiftDragService = inject(ShiftToScheduleDragDropService);
  public cellDragService = inject(ScheduleCellDragDropService);
  private viewModeService = inject(ScheduleViewModeService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    fromEvent<MouseEvent>(document, 'mousemove').pipe(
      filter(() => this.shiftDragService.isDragging() || this.cellDragService.isDragging()),
      throttleTime(16),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      if (this.shiftDragService.isDragging()) {
        this.onDocumentMouseMove(event);
      }
      if (this.cellDragService.isDragging()) {
        this.onCellDragMouseMove(event);
      }
    });
  }

  onHorizontalSizeChange(newSize: number): void {
    this.horizontalSize = newSize;
  }

  onHScrollPositionChange(position: number): void {
    this.hScrollPosition = position;
  }

  onDocumentMouseMove(event: MouseEvent): void {
    this.shiftDragService.updateDragPosition(event.clientY);
    this.updateDropTarget(event);
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(event: MouseEvent): void {
    if (this.shiftDragService.isDragging()) {
      const result = this.shiftDragService.endDrag();
      if (result && this.scheduleSection) {
        this.scheduleSection.handleShiftDrop(result);
      } else {
        this.scheduleSection?.invalidateDragDropRect();
      }
      return;
    }

    if (this.cellDragService.isDragging()) {
      const result = this.cellDragService.endDrag();
      if (result && this.scheduleSection) {
        this.scheduleSection.handleScheduleCellDrop(result);
      } else {
        this.scheduleSection?.invalidateDragDropRect();
      }
    }
  }

  onCellDragMouseMove(event: MouseEvent): void {
    this.cellDragService.updateDragPosition(event.clientY);
    this.updateCellDragMoveTarget(event);
  }

  private updateCellDragMoveTarget(event: MouseEvent): void {
    if (!this.scheduleSection) {
      this.cellDragService.setOverTable(false);
      return;
    }

    const rect = this.scheduleSection.getHostRect();
    const isOver =
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right;

    this.cellDragService.setOverTable(isOver);

    if (!isOver) return;

    const source = this.cellDragService.source();
    if (!source) return;

    const dropInfo = this.scheduleSection.getDropTargetInfo(
      event.clientY,
      source.column,
    );
    if (!dropInfo) {
      this.cellDragService.clearMoveTarget();
      return;
    }

    const isDifferentClient = dropInfo.clientId !== source.clientId;
    const isValidMove = isDifferentClient && dropInfo.isEmpty && !dropInfo.isBeforeClientStart;
    this.cellDragService.setMoveTarget(dropInfo.row, dropInfo.clientId, isValidMove);
  }

  private updateDropTarget(event: MouseEvent): void {
    if (!this.scheduleSection) {
      this.shiftDragService.setOverScheduleSection(false);
      return;
    }

    const rect = this.scheduleSection.getHostRect();
    const isOverSchedule =
      event.clientY >= rect.top && event.clientY <= rect.bottom;

    this.shiftDragService.setOverScheduleSection(isOverSchedule);

    if (isOverSchedule) {
      const dropInfo = this.scheduleSection.getDropTargetInfo(
        event.clientY,
        this.shiftDragService.dragData()?.sourceColumn ?? 0
      );
      if (dropInfo) {
        const isValid = (this.viewModeService.isTimelineMode() ? true : dropInfo.isEmpty) && !dropInfo.isBeforeClientStart;
        this.shiftDragService.setDropTarget(
          dropInfo.row,
          dropInfo.clientId,
          dropInfo.date,
          isValid
        );
      }
    }
  }
}
