/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Component,
  HostListener,
  inject,
  Input,
  ViewChild,
} from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { CommonModule } from '@angular/common';

import { ScheduleSectionComponent } from '../schedule-section/schedule-section.component';
import { ShiftSectionComponent } from '../shift-section/shift-section.component';
import { ShiftToScheduleDragDropService } from '../services/shift-to-schedule-drag-drop.service';

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
})
export class ScheduleContainerComponent {
  @ViewChild('scheduleSection') scheduleSection!: ScheduleSectionComponent;

  @Input() zoom = 1.0;
  @Input() refreshTrigger = false;
  public horizontalSize = 205;
  public hScrollPosition = 0;
  public IsInfoVisible = false;

  public shiftDragService = inject(ShiftToScheduleDragDropService);

  onHorizontalSizeChange(newSize: number): void {
    this.horizontalSize = newSize;
  }

  onHScrollPositionChange(position: number): void {
    this.hScrollPosition = position;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.shiftDragService.isDragging()) return;

    this.shiftDragService.updateDragPosition(event.clientY);
    this.updateDropTarget(event);
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(event: MouseEvent): void {
    if (!this.shiftDragService.isDragging()) return;

    const result = this.shiftDragService.endDrag();
    if (result && this.scheduleSection) {
      this.scheduleSection.handleShiftDrop(result);
    }
  }

  private updateDropTarget(event: MouseEvent): void {
    if (!this.scheduleSection) {
      this.shiftDragService.setOverScheduleSection(false);
      return;
    }

    const scheduleElement = document.querySelector('app-schedule-section');
    if (!scheduleElement) {
      this.shiftDragService.setOverScheduleSection(false);
      return;
    }

    const rect = scheduleElement.getBoundingClientRect();
    const isOverSchedule =
      event.clientY >= rect.top && event.clientY <= rect.bottom;

    this.shiftDragService.setOverScheduleSection(isOverSchedule);

    if (isOverSchedule) {
      const dropInfo = this.scheduleSection.getDropTargetInfo(
        event.clientY,
        this.shiftDragService.dragData()?.sourceColumn ?? 0
      );
      if (dropInfo) {
        this.shiftDragService.setDropTarget(
          dropInfo.row,
          dropInfo.clientId,
          dropInfo.date,
          dropInfo.isEmpty
        );
      }
    }
  }
}
