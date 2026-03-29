// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Directive handling click events on schedule row headers.
 * Enables navigation to client details via double-click.
 * Calculates clicked row based on scroll position and cell height.
 *
 * @relations
 * - Used by: ScheduleScheduleRowHeaderComponent
 * - Uses: ScheduleDataService for client lookup
 * - Uses: Router for navigation
 */
import {
  Directive,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleDataService } from '../../services/schedule-data.service';

@Directive({
  selector: '[appScheduleRowHeaderEvents]',
  standalone: true,
})
export class ScheduleRowHeaderEventsDirective {
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  private scroll = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private dataService = inject(BaseDataService);

  private get scheduleData(): ScheduleDataService {
    return this.dataService as ScheduleDataService;
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    const canvas = this.elementRef.nativeElement as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const row = Math.floor(y / this.settings.cellHeight) + this.scroll.verticalScrollPosition;

    const groupIndex = this.scheduleData.rowGroupIndex[row];
    if (groupIndex === undefined) {
      return;
    }

    const client = this.scheduleData.getGroupIndex(groupIndex);
    if (client?.id) {
      this.router.navigate(['/workplace/edit-address', client.id], {
        queryParams: { returnUrl: '/workplace/schedule' }
      });
    }
  }
}
