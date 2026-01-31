/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Root component for the Schedule workplace page. Orchestrates the initialization
 * of the schedule view including loading holidays, calendar selection, and
 * coordinating between header and container components. Manages zoom level
 * and refresh triggers for the child components.
 *
 * @relations
 * - Contains: ScheduleHeaderComponent, ScheduleContainerComponent
 * - Uses: AllScheduleStateService for state management
 * - Uses: HolidayCollectionService for holiday data
 * - Part of: Workplace module routing
 */
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  effect,
  Injector,
  runInInjectionContext,
  EffectRef,
} from '@angular/core';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { BaseCellRenderService } from '../../../shared/grid/services/body/cell-render.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleDataService } from '../schedule-section/services/schedule-data.service';
import { EmptyCellFormatterService } from '../schedule-section/services/cell-formatters/empty-cell-formatter.service';
import { WorkCellFormatterService } from '../schedule-section/services/cell-formatters/work-cell-formatter.service';
import { BreakCellFormatterService } from '../schedule-section/services/cell-formatters/break-cell-formatter.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  imports: [ScheduleHeaderComponent, ScheduleContainerComponent],
  providers: [
    { provide: BaseDataService, useClass: ScheduleDataService },
    ScrollService,
    BaseCellRenderService,
    HolidayCollectionService,
    ScrollbarService,
    BaseSettingsService,
    AllScheduleStateService,
    ScheduleHorizontalScrollService,
    AbsenceLookupService,
    AbsenceMenuService,
    EmptyCellFormatterService,
    WorkCellFormatterService,
    BreakCellFormatterService,
  ],
})
export class ScheduleHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private holidayCollection = inject(HolidayCollectionService);
  private dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private injector = inject(Injector);
  private allScheduleStateService = inject(AllScheduleStateService);

  public currentZoom = 1.0;
  public refreshTrigger = false;
  public isInitialized = false;

  private effects: EffectRef[] = [];

  async ngOnInit(): Promise<void> {
    this.savebarService.setSavebarVisibility(false);
    this.layoutService.setContainerToFullSize();

    await this.allScheduleStateService.initializeWorkplaceState();
    this.isInitialized = true;

    this.setupEffects();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initializeHolidays();
  }

  private async initializeHolidays(): Promise<void> {
    await Promise.all([
      this.holidayCollection.readDataAsync(),
      this.dataManagementCalendarSelectionService.readData(),
    ]);

    this.dataManagementCalendarSelectionService.readSChips();
    const chips = this.dataManagementCalendarSelectionService.chips;

    if (chips && chips.length > 0) {
      this.holidayCollection.setSelection(chips);
    }

    this.updateHolidayDates();
    this.dataManagementSchedule.readShiftSchedule();
    this.refreshTrigger = !this.refreshTrigger;
  }

  ngOnDestroy(): void {
    this.effects.forEach((effect) => effect?.destroy());
    this.effects = [];
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      const holidayEffect = effect(() => {
        if (this.holidayCollection.isReset()) {
          this.updateHolidayDates();
          this.refreshTrigger = !this.refreshTrigger;
        }
      });
      this.effects.push(holidayEffect);

      const chipsLoadedEffect = effect(() => {
        if (this.dataManagementCalendarSelectionService.chipsLoaded()) {
          const chips = this.dataManagementCalendarSelectionService.chips;
          if (chips && chips.length > 0) {
            this.holidayCollection.setSelection(chips);
            this.updateHolidayDates();
            this.dataManagementSchedule.readShiftSchedule();
          }
        }
      });
      this.effects.push(chipsLoadedEffect);
    });
  }

  private updateHolidayDates(): void {
    const holidays = this.holidayCollection.holidays.holidayList;
    this.dataManagementSchedule.holidayDates = holidays.map(
      (h) => h.currentDate
    );
  }

  onZoomChange(zoomValue: number) {
    this.currentZoom = zoomValue;
  }
}
