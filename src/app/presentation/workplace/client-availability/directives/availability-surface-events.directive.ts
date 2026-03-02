// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Directive, HostListener, inject } from '@angular/core';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { AvailabilityCanvasManagerService } from '../services/availability-canvas-manager.service';
import { AvailabilityCalculationService } from '../services/render-availability-grid/availability-calculation.service';
import { RenderAvailabilityGridService } from '../services/render-availability-grid';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { DrawAvailabilityGridService } from '../services/draw-availability-grid.service';

@Directive({
  selector: '[appAvailabilitySurfaceEvents]',
  standalone: true,
})
export class AvailabilitySurfaceEventsDirective {
  private settings = inject(AvailabilitySettingService);
  private canvasManager = inject(AvailabilityCanvasManagerService);
  private calculation = inject(AvailabilityCalculationService);
  private renderGrid = inject(RenderAvailabilityGridService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private drawGrid = inject(DrawAvailabilityGridService);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const x = event.clientX - rect.left + this.drawGrid.getScrollX();
    const y = event.clientY - rect.top - this.settings.cellHeaderHeight + this.drawGrid.getScrollY();

    if (y < 0) return;

    const row = Math.floor(y / this.settings.cellHeight);
    const col = Math.floor(x / this.settings.cellWidth);

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

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const y = event.clientY - rect.top - this.settings.cellHeaderHeight;
    const canvas = event.target as HTMLCanvasElement;

    canvas.style.cursor = y >= 0 ? 'pointer' : 'default';
  }
}
