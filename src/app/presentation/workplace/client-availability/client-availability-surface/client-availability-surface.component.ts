// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { AvailabilitySurfaceEventsDirective } from '../directives/availability-surface-events.directive';
import { AvailabilityCanvasManagerService } from '../services/availability-canvas-manager.service';
import { DrawAvailabilityGridService } from '../services/draw-availability-grid.service';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { ClientAvailabilityFilterService } from 'src/app/domain/services/client-availability/client-availability-filter.service';

@Component({
  selector: 'app-client-availability-surface',
  templateUrl: './client-availability-surface.component.html',
  styleUrls: ['./client-availability-surface.component.scss'],
  standalone: true,
  imports: [ResizeDirective, AvailabilitySurfaceEventsDirective],
})
export class ClientAvailabilitySurfaceComponent implements AfterViewInit, OnDestroy {
  private canvasManager = inject(AvailabilityCanvasManagerService);
  public drawGrid = inject(DrawAvailabilityGridService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private filterService = inject(ClientAvailabilityFilterService);

  valueChangeHScrollbar = input(0);
  valueChangeVScrollbar = input(0);

  valueHScrollbar = output<number>();
  maxValueHScrollbar = output<number>();
  visibleValueHScrollbar = output<number>();
  valueVScrollbar = output<number>();
  maxValueVScrollbar = output<number>();
  visibleValueVScrollbar = output<number>();

  constructor() {
    effect(() => {
      const hValue = this.valueChangeHScrollbar();
      const vValue = this.valueChangeVScrollbar();
      this.drawGrid.moveGrid(hValue, vValue);
    });

    effect(() => {
      const isRead = this.dataManagement.isRead();
      if (isRead) {
        this.drawGrid.drawGrid();
        this.updateScrollbarValues();
      }
    });

    effect(() => {
      const changed = this.filterService.clientsChanged();
      if (changed) {
        this.drawGrid.drawGrid();
        this.updateScrollbarValues();
      }
    });
  }

  ngAfterViewInit(): void {
    this.canvasManager.createCanvas('availability-surface-canvas');
  }

  ngOnDestroy(): void {
    this.canvasManager.deleteCanvas();
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (!entries || entries.length === 0) return;
    const entry = entries[0];
    const width = entry.contentRect.width;
    const height = entry.contentRect.height;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.canvasManager.width = width;
        this.canvasManager.height = height;
        this.drawGrid.drawGrid();
        this.updateScrollbarValues();
      });
    });
  }

  private updateScrollbarValues(): void {
    this.maxValueHScrollbar.emit(this.drawGrid.getMaxScrollX());
    this.maxValueVScrollbar.emit(this.drawGrid.getMaxScrollY());
    this.visibleValueHScrollbar.emit(this.drawGrid.getVisibleWidth());
    this.visibleValueVScrollbar.emit(this.drawGrid.getVisibleHeight());
  }
}
