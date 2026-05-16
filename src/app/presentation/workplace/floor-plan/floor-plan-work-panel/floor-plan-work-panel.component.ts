// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Side panel that loads shift definitions and displays them as draggable items
 * that can be dropped onto the floor plan canvas to create work assignments.
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { FloorPlanWorkDropService } from '../services/floor-plan-work-drop.service';
import { FloorPlanMarkerType } from 'src/app/domain/enums/floor-plan-marker-type.enum';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-data-class';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';

const SHIFT_LOAD_COUNT = 500;

@Component({
  selector: 'app-floor-plan-work-panel',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './floor-plan-work-panel.component.html',
  styleUrls: ['./floor-plan-work-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanWorkPanelComponent implements OnInit, OnDestroy {
  private workDropService = inject(FloorPlanWorkDropService);
  private dataShiftService = inject(DataShiftService);
  private destroy$ = new Subject<void>();

  readonly searchText = signal<string>('');
  readonly availableShifts = signal<IShift[]>([]);
  readonly isLoadingShifts = signal(false);

  readonly filteredShifts = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const shifts = this.availableShifts();
    if (!search) return shifts;
    return shifts.filter(
      (s) =>
        s.name?.toLowerCase().includes(search) ||
        s.abbreviation?.toLowerCase().includes(search)
    );
  });

  ngOnInit(): void {
    this.loadShifts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadShifts(): void {
    const makeFilter = (type: ShiftFilterType): ShiftFilter => {
      const f = new ShiftFilter();
      f.numberOfItemsPerPage = SHIFT_LOAD_COUNT;
      f.filterType = type;
      f.activeDateRange = true;
      f.futureDateRange = true;
      return f;
    };

    this.isLoadingShifts.set(true);
    forkJoin([
      this.dataShiftService.readShiftList(makeFilter(ShiftFilterType.Shift)),
      this.dataShiftService.readShiftList(makeFilter(ShiftFilterType.Container)),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([shifts, containers]) => {
          const all = [...(shifts.shifts ?? []), ...(containers.shifts ?? [])];
          all.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
          this.availableShifts.set(all);
          this.isLoadingShifts.set(false);
        },
        error: () => {
          this.isLoadingShifts.set(false);
        },
      });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  onDragStartShift(shift: IShift, event: DragEvent): void {
    this.workDropService.startDrag({
      shiftId: shift.id,
      shiftName: shift.name,
      label: shift.abbreviation || shift.name,
      startTime: shift.startShift?.slice(0, 5),
      endTime: shift.endShift?.slice(0, 5),
      markerType: FloorPlanMarkerType.Work,
    });

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', shift.id ?? '');
    }
  }

  onDragEnd(): void {
    if (this.workDropService.isDragging()) {
      this.workDropService.cancelDrag();
    }
  }

  formatTime(start?: string, end?: string): string {
    if (!start && !end) return '';
    if (start && end) return `${start} – ${end}`;
    return start ?? end ?? '';
  }
}
