// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { ScheduleNoteCellFormatterService } from '../schedule-section/services/cell-formatters/schedule-note-cell-formatter.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { lastValueFrom } from 'rxjs';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { SchedulePdfExportService } from '../schedule-section/services/schedule-pdf-export.service';
import { SchedulePdfDrawingService } from '../schedule-section/services/schedule-pdf-drawing.service';
import { ShiftPdfExportService } from '../shift-section/services/shift-pdf-export.service';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    ScheduleNoteCellFormatterService,
    SchedulePdfExportService,
    SchedulePdfDrawingService,
    ShiftPdfExportService,
  ],
})
export class ScheduleHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private holidayCollection = inject(HolidayCollectionService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);
  private groupSelectionService = inject(GroupSelectionService);
  private appSettingsService = inject(AppSettingsManagementService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private injector = inject(Injector);
  private allScheduleStateService = inject(AllScheduleStateService);
  private signalRService = inject(SignalRService);
  private schedulePdfExportService = inject(SchedulePdfExportService);
  private cdr = inject(ChangeDetectorRef);

  public currentZoom = 1.0;
  public refreshTrigger = false;
  public isInitialized = false;

  private effects: EffectRef[] = [];

  async ngOnInit(): Promise<void> {
    this.savebarService.setSavebarVisibility(false);
    this.layoutService.setContainerToFullSize();

    this.signalRService.startConnection();

    await this.allScheduleStateService.initializeWorkplaceState();
    this.isInitialized = true;
    this.cdr.markForCheck();

    this.setupEffects();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initializeHolidays();
  }

  private async initializeHolidays(): Promise<void> {
    await this.holidayCollection.readDataAsync();

    const chips = await this.resolveCalendarChips();
    if (chips.length > 0) {
      this.holidayCollection.setSelection(chips);
    }

    this.updateHolidayDates();
    this.dataManagementSchedule.readShiftSchedule();
    this.refreshTrigger = !this.refreshTrigger;
    this.cdr.markForCheck();
  }

  private async resolveCalendarChips(): Promise<StateCountryToken[]> {
    const calendarSelectionId =
      this.groupSelectionService.selectedGroup?.calendarSelectionId ||
      this.appSettingsService.contactSettings().globalCalendarSelectionId;

    if (!calendarSelectionId) {
      return [];
    }

    try {
      const selection = await lastValueFrom(
        this.dataCalendarSelectionService.getCalendarSelection(calendarSelectionId)
      );

      if (!selection?.selectedCalendars?.length) {
        return [];
      }

      return selection.selectedCalendars.map((sc) => {
        const token = new StateCountryToken();
        token.country = sc.country;
        token.state = sc.state;
        return token;
      });
    } catch {
      return [];
    }
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
          this.cdr.markForCheck();
        }
      });
      this.effects.push(holidayEffect);

    });
  }

  private updateHolidayDates(): void {
    const holidays = this.holidayCollection.holidays.holidayList;
    this.dataManagementSchedule.holidayDates = holidays.map((h) => {
      const d = h.currentDate;
      const offset = -d.getTimezoneOffset();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), offset / 60, 0, 0);
    });
  }

  onPdfExport() {
    this.schedulePdfExportService.exportSchedule();
  }

  onZoomChange(zoomValue: number) {
    this.currentZoom = zoomValue;
  }
}
