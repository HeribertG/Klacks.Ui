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
  DestroyRef,
  inject,
  OnInit,
  OnDestroy,
  effect,
  Injector,
  runInInjectionContext,
  EffectRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import {
  HolidayCollectionService,
  OfficialOverrideMap,
  buildOfficialOverrideKey,
} from 'src/app/presentation/shared/grid/services/holiday-collection.service';
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
import { ScheduleCommandCellFormatterService } from '../schedule-section/services/cell-formatters/schedule-command-cell-formatter.service';
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
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, skip } from 'rxjs';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { ScheduleTimelineRangeService } from '../services/schedule-timeline-range.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { SchedulePdfExportService } from '../schedule-section/services/schedule-pdf-export.service';
import { SchedulePdfDrawingService } from '../schedule-section/services/schedule-pdf-drawing.service';
import { ShiftPdfExportService } from '../shift-section/services/shift-pdf-export.service';
import { TimelinePdfExportService } from '../schedule-section/services/timeline-pdf-export.service';
import { WorkBlockRendererService } from '../schedule-section/timeline/renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../schedule-section/timeline/renderers/work-change-block-renderer.service';
import { BreakBlockRendererService } from '../schedule-section/timeline/renderers/break-block-renderer.service';
import { FullViewportDirective } from 'src/app/presentation/directives/full-viewport.directive';

interface ResolvedCalendarChips {
  tokens: StateCountryToken[];
  overrides: OfficialOverrideMap;
}

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FullViewportDirective],
  imports: [ScheduleHeaderComponent, ScheduleContainerComponent],
  providers: [
    { provide: BaseDataService, useClass: ScheduleDataService },
    { provide: ScheduleDataService, useExisting: BaseDataService },
    ScrollService,
    BaseCellRenderService,
    HolidayCollectionService,
    ScrollbarService,
    BaseSettingsService,
    AllScheduleStateService,
    ScheduleHorizontalScrollService,
    ScheduleViewModeService,
    ScheduleTimelineRangeService,
    AbsenceLookupService,
    AbsenceMenuService,
    EmptyCellFormatterService,
    WorkCellFormatterService,
    BreakCellFormatterService,
    ScheduleNoteCellFormatterService,
    ScheduleCommandCellFormatterService,
    SchedulePdfExportService,
    SchedulePdfDrawingService,
    ShiftPdfExportService,
    TimelinePdfExportService,
    WorkBlockRendererService,
    WorkChangeBlockRendererService,
    BreakBlockRendererService,
  ],
})
export class ScheduleHomeComponent implements OnInit, OnDestroy {
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
  private timelinePdfExportService = inject(TimelinePdfExportService);
  private scheduleViewModeService = inject(ScheduleViewModeService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private dataGroupService = inject(DataGroupService);
  private dataClientService = inject(DataClientService);
  private searchStateService = inject(SearchStateService);
  private destroyRef = inject(DestroyRef);

  public currentZoom = 1.0;
  public refreshTrigger = false;
  public isInitialized = false;

  private effects: EffectRef[] = [];

  async ngOnInit(): Promise<void> {
    this.savebarService.setSavebarVisibility(false);
    this.layoutService.setContainerToFullSize();

    this.signalRService.startConnection();

    const holidayListPromise = this.holidayCollection.readDataAsync();

    await this.applyGroupQueryParam();
    await this.allScheduleStateService.initializeWorkplaceState();
    await this.applyClientQueryParam();
    this.isInitialized = true;
    this.cdr.markForCheck();

    this.setupEffects();
    this.setupActionQueryParamReaction();

    void this.finalizeHolidays(holidayListPromise);
  }

  /**
   * A second one-click action while the page is already open reuses this component, so ngOnInit
   * never runs again and the snapshot read there would keep showing the first client. Reacting to
   * the query-param stream is what makes the next message land on the next person.
   */
  private setupActionQueryParamReaction(): void {
    this.route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.reapplyActionQueryParams());
  }

  private async reapplyActionQueryParams(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    if (!params.get('clientId') && !params.get('groupId')) {
      return;
    }

    await this.applyGroupQueryParam();
    await this.applyClientQueryParam();
    this.dataManagementSchedule.readDatas();
  }

  private async applyGroupQueryParam(): Promise<void> {
    const groupId = this.route.snapshot.queryParamMap.get('groupId');
    if (!groupId) return;

    if (this.groupSelectionService.selectedGroup?.id === groupId) return;

    try {
      const group = await lastValueFrom(this.dataGroupService.getGroup(groupId));
      if (group) {
        this.groupSelectionService.selectGroup(group as Group);
      }
    } catch {
      // ignore: invalid id or no permission → fall back to current selection
    }
  }

  /**
   * Scopes the schedule to a single employee when the page is opened through a
   * one-click action carrying a clientId (proactive assistant messages, skills).
   * Runs after initializeWorkplaceState so the restored filter cannot overwrite
   * the scope, and before isInitialized so the grid's first read already carries it.
   *
   * The id number lands in the global search box on purpose: the same field the user
   * would have typed into, so the filter is visible and one click on the X clears it.
   * A numeric search matches IdNumber exactly, so namesakes cannot dilute the result.
   * Any group selection is dropped because the backend ANDs group and search — a
   * client outside the selected group would otherwise yield an empty grid.
   */
  private async applyClientQueryParam(): Promise<void> {
    const clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (!clientId) return;

    try {
      const client = await lastValueFrom(this.dataClientService.getClient(clientId));
      const searchString = client?.idNumber ? String(client.idNumber) : '';
      if (!searchString) return;

      this.groupSelectionService.clearSelection();
      this.dataManagementSchedule.workFilter.selectedGroup = undefined;
      this.dataManagementSchedule.workFilter.searchString = searchString;
      this.searchStateService.setRestoreSearch(searchString);
    } catch {
      // ignore: invalid id or no permission → fall back to the unfiltered schedule
    }
  }

  /**
   * Resolves the holiday/calendar pipeline in parallel with the initial
   * work- and shift-schedule reads. The shift read is triggered once by
   * ScheduleSectionComponent (executeReadDatas) together with the work read,
   * so both tables load in parallel and chunk-load independently. Holidays
   * only feed the shift query and must not gate it; a late holiday result is
   * applied via refreshShiftIfHolidaysInRange.
   * @param holidayListPromise - In-flight holiday list fetch started in ngOnInit
   */
  private async finalizeHolidays(holidayListPromise: Promise<void>): Promise<void> {
    await holidayListPromise;

    const { tokens, overrides } = await this.resolveCalendarChips();
    if (tokens.length > 0) {
      this.holidayCollection.setSelection(tokens, overrides);
    }

    this.updateHolidayDates();
    this.refreshShiftIfHolidaysInRange();
    this.refreshTrigger = !this.refreshTrigger;
    this.cdr.markForCheck();
  }

  /**
   * Refetches the shift schedule only when a holiday falls inside the visible
   * range AND the shift grid has already loaded (i.e. without those holidays).
   * The condition is essential, not an optimization: an unconditional refetch
   * would cancel and restart the shift chunk-load that runs in parallel with
   * the work grid, recreating the sequential-loading bug. On the common path
   * holidays are resolved before the shift read fires, so this is a no-op.
   */
  private refreshShiftIfHolidaysInRange(): void {
    const start = this.dataManagementSchedule.visibleStartDate;
    const end = this.dataManagementSchedule.visibleEndDate;
    if (!start || !end) {
      return;
    }

    const hasHolidayInRange = this.dataManagementSchedule.holidayDates.some(
      (holiday) => holiday >= start && holiday <= end,
    );
    if (hasHolidayInRange) {
      this.dataManagementSchedule.readShiftSchedule(false);
    }
  }

  private async resolveCalendarChips(): Promise<ResolvedCalendarChips> {
    const calendarSelectionId =
      this.groupSelectionService.selectedGroup?.calendarSelectionId ||
      this.appSettingsService.contactSettings().globalCalendarSelectionId;

    if (!calendarSelectionId) {
      return { tokens: [], overrides: new Map() };
    }

    try {
      const selection = await lastValueFrom(
        this.dataCalendarSelectionService.getCalendarSelection(calendarSelectionId)
      );

      if (!selection?.selectedCalendars?.length) {
        return { tokens: [], overrides: new Map() };
      }

      const tokens: StateCountryToken[] = [];
      const overrides: OfficialOverrideMap = new Map();
      selection.selectedCalendars.forEach((sc) => {
        const token = new StateCountryToken();
        token.country = sc.country;
        token.state = sc.state;
        tokens.push(token);
        overrides.set(
          buildOfficialOverrideKey(sc.country, sc.state),
          sc.officialOverride
        );
      });
      return { tokens, overrides };
    } catch {
      return { tokens: [], overrides: new Map() };
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
    if (this.scheduleViewModeService.isTimelineMode()) {
      this.timelinePdfExportService.exportTimeline();
    } else {
      this.schedulePdfExportService.exportSchedule();
    }
  }

  onZoomChange(zoomValue: number) {
    this.currentZoom = zoomValue;
  }
}
