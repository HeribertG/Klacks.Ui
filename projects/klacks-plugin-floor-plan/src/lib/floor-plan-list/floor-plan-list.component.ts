// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the floor-plan view: toolbar (display checkboxes, date picker,
 * zoom controls) plus a paged table of all floor plans for selection.
 * @param floorPlans - Input signal carrying the full list of available floor plans
 * @param isLoading - Input signal indicating that floor plans are currently being loaded
 * @param selectedFloorPlanId - Input signal of the currently selected floor plan id
 * @param display - Input signal of the current marker-display preferences
 * @param date - Input signal of the currently selected date as yyyy-MM-dd
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgbDateStruct,
  NgbDatepickerModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { IFloorPlan } from '@floor-plan-plugin/domain/models/floor-plan-class';
import { ILiveMarkerDisplay } from '../services/floor-plan-canvas.service';
import { SimplePaginationComponent } from 'src/app/presentation/shared/simple-pagination/simple-pagination.component';

const DEFAULT_ITEMS_PER_PAGE = 5;

@Component({
  selector: 'lib-floor-plan-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbDatepickerModule,
    SimplePaginationComponent,
  ],
  templateUrl: './floor-plan-list.component.html',
  styleUrls: ['./floor-plan-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanListComponent {
  readonly floorPlans = input.required<IFloorPlan[]>();
  readonly isLoading = input<boolean>(false);
  readonly selectedFloorPlanId = input<string | null>(null);
  readonly display = input.required<ILiveMarkerDisplay>();
  readonly date = input.required<string>();

  readonly selectFloorPlan = output<IFloorPlan>();
  readonly displayChange = output<ILiveMarkerDisplay>();
  readonly dateChange = output<string>();

  readonly page = signal(1);
  readonly itemsPerPage = signal<number>(DEFAULT_ITEMS_PER_PAGE);

  readonly totalCount = computed(() => this.floorPlans().length);

  readonly pagedFloorPlans = computed<IFloorPlan[]>(() => {
    const items = this.floorPlans();
    const size = this.itemsPerPage();
    const currentPage = this.page();
    const start = (currentPage - 1) * size;
    return items.slice(start, start + size);
  });

  onPageChange(page: number): void {
    this.page.set(page);
  }

  onRowClick(plan: IFloorPlan): void {
    this.selectFloorPlan.emit(plan);
  }

  onToggleDisplay(key: keyof ILiveMarkerDisplay, checked: boolean): void {
    this.displayChange.emit({ ...this.display(), [key]: checked });
  }

  readonly datepickerModel = computed<NgbDateStruct | null>(() => this.parseIsoDate(this.date()));

  onDatepickerChange(value: NgbDateStruct | null): void {
    if (!value) return;
    this.dateChange.emit(this.formatIsoDate(value));
  }

  private parseIsoDate(value: string): NgbDateStruct | null {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { year, month, day };
  }

  private formatIsoDate(value: NgbDateStruct): string {
    const month = String(value.month).padStart(2, '0');
    const day = String(value.day).padStart(2, '0');
    return `${value.year}-${month}-${day}`;
  }
}
