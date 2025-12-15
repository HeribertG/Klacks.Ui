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
import { ShiftDataService } from '../../services/shift-data.service';

@Directive({
  selector: '[appShiftRowHeaderEvents]',
  standalone: true,
})
export class ShiftRowHeaderEventsDirective {
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  private scroll = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private dataService = inject(BaseDataService);

  private get shiftData(): ShiftDataService {
    return this.dataService as ShiftDataService;
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    const canvas = this.elementRef.nativeElement as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const row = Math.floor(y / this.settings.cellHeight) + this.scroll.verticalScrollPosition;

    const shiftId = this.shiftData.getShiftId(row);
    if (shiftId) {
      this.router.navigate(['/workplace/edit-shift', shiftId], {
        queryParams: { readonly: 'true', returnUrl: '/workplace/schedule' }
      });
    }
  }
}
