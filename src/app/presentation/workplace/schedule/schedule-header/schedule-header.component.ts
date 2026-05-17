// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Header component for the Schedule page displaying navigation controls,
 * calendar selection, and zoom slider. Supports weekly, biweekly, and
 * monthly period navigation based on payment interval settings.
 *
 * @relations
 * - Parent: ScheduleHomeComponent
 * - Contains: CalendarSelectorComponent, ScheduleHeaderCalendar* components
 * - Uses: DataManagementScheduleService for filter state
 * - Uses: HolidayCollectionService for holiday data
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import {
  PeriodCalendarMonthlyComponent,
  PeriodResetData,
} from 'src/app/presentation/shared/period-calendar-monthly/period-calendar-monthly.component';
import { PeriodCalendarWeeklyComponent } from 'src/app/presentation/shared/period-calendar-weekly/period-calendar-weekly.component';
import { PeriodCalendarBiweeklyComponent } from 'src/app/presentation/shared/period-calendar-biweekly/period-calendar-biweekly.component';
import { FormsModule } from '@angular/forms';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { IconAngleLeftComponent } from 'src/app/presentation/icons/icon-angle-left.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { IconBreakPlaceholderComponent } from 'src/app/presentation/icons/icon-break-placeholder.component';
import { IconThunderCircleComponent } from 'src/app/presentation/icons/icon-thunder-circle.component';
import { IconAvailabilityCheckComponent } from 'src/app/presentation/icons/icon-availability-check.component';
import { IconFlyComponent } from 'src/app/presentation/icons/icon-fly.component';
import { IconWizardComponent } from 'src/app/presentation/icons/icon-wizard.component';
import { WizardDialogComponent } from '../dialogs/wizard-dialog/wizard-dialog.component';
import { HarmonizerDialogComponent } from '../dialogs/harmonizer-dialog/harmonizer-dialog.component';
import { HolisticHarmonizerDialogComponent } from '../dialogs/holistic-harmonizer-dialog/holistic-harmonizer-dialog.component';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { ScenarioSelectorComponent } from './scenario-selector/scenario-selector.component';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import {
  ScheduleTimelineRangeService,
  TimelineViewRange,
} from '../services/schedule-timeline-range.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ScheduleDataService } from '../schedule-section/services/schedule-data.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { TranslateService } from '@ngx-translate/core';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataAutoWizardService } from 'src/app/infrastructure/api/auto-wizard/data-auto-wizard.service';
import { AUTO_WIZARD_LIMITS } from 'src/app/infrastructure/api/auto-wizard/auto-wizard-limits.constants';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { IconCalcComponent } from 'src/app/presentation/icons/icon-calc.component';

const DEFAULT_ZOOM_VALUE = 100;

@Component({
  selector: 'app-schedule-header',
  templateUrl: './schedule-header.component.html',
  styleUrls: ['./schedule-header.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgxSliderModule,
    NgbDropdownModule,
    TranslateModule,
    NgbTooltip,
    PeriodCalendarMonthlyComponent,
    PeriodCalendarWeeklyComponent,
    PeriodCalendarBiweeklyComponent,
    IconAngleLeftComponent,
    IconAngleRightComponent,
    PdfIconComponent,
    IconBreakPlaceholderComponent,
    IconThunderCircleComponent,
    IconFlyComponent,
    IconCalcComponent,
    IconAvailabilityCheckComponent,
    IconWizardComponent,
    WizardDialogComponent,
    HarmonizerDialogComponent,
    HolisticHarmonizerDialogComponent,
    ScenarioSelectorComponent,
  ],
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleHeaderComponent implements OnInit, AfterViewInit {
  @ViewChild('breakPlaceholderIcon')
  breakPlaceholderIcon!: IconBreakPlaceholderComponent;
  @ViewChild('scheduleCommandsIcon')
  scheduleCommandsIcon!: IconThunderCircleComponent;
  @ViewChild('availabilityCheckIcon')
  availabilityCheckIcon!: IconAvailabilityCheckComponent;
  @ViewChild('wizardDialog') wizardDialog!: WizardDialogComponent;
  @ViewChild('harmonizerDialog') harmonizerDialog!: HarmonizerDialogComponent;
  @ViewChild('holisticHarmonizerDialog')
  holisticHarmonizerDialog!: HolisticHarmonizerDialogComponent;

  readonly isRtl = document.documentElement.dir === 'rtl';

  value = 100;
  options: Options = {
    floor: 50,
    ceil: 300,
    step: 10,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  };

  timelineValue = 100;
  timelineOptions: Options = {
    floor: 50,
    ceil: 200,
    step: 10,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  };

  zoomChange = output<number>();
  pdfExportRequested = output<void>();

  private gridSettingsService = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);
  private calendarUtil = inject(CalendarUtilService);
  private appSettings = inject(AppSettingsManagementService);
  private scheduleReportCtx = inject(ScheduleReportContextService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private scheduleChangeService = inject(ScheduleChangeService);
  private dataWorkScheduleService = inject(DataWorkScheduleService);
  private viewModeService = inject(ScheduleViewModeService);
  private timelineRangeService = inject(ScheduleTimelineRangeService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private authorizationService = inject(AuthorizationService);
  private dataAutoWizardService = inject(DataAutoWizardService);
  private scheduleSignalR = inject(SCHEDULE_SIGNALR);
  private destroyRef = inject(DestroyRef);
  private modalService = inject(ModalService);

  public readonly isTimelineMode = this.viewModeService.isTimelineMode;
  public readonly timelineViewRange = this.timelineRangeService.viewRange;

  isSending = signal(false);
  isRecalculating = signal(false);

  private readonly wizardDropdownMode = signal(false);
  readonly isWizardDropdownMode = this.wizardDropdownMode.asReadonly();
  readonly isAutoWizardRunning = computed(
    () => this.dataAutoWizardService.status() === 'running',
  );

  constructor() {
    effect(() => {
      const status = this.dataAutoWizardService.status();
      if (status === 'completed') {
        const result = this.dataAutoWizardService.result();
        if (
          result?.finalScenarioId &&
          result.finalScenarioToken &&
          result.finalScenarioName
        ) {
          const newScenario = {
            id: result.finalScenarioId,
            name: result.finalScenarioName,
            token: result.finalScenarioToken,
            fromDate: '',
            untilDate: '',
            createdByUser: '',
            status: AnalyseScenarioStatus.Active,
          };
          this.analyseScenarioService.scenarios.update((list) => {
            return list.some((s) => s.id === newScenario.id)
              ? list
              : [...list, newScenario];
          });
          this.analyseScenarioService.selectScenario(newScenario);
          this.dataManagementSchedule.readDatas();
        }
        const message = this.translateService.instant(
          'autoWizard.toast.completed',
          {
            scenario: result?.finalScenarioName ?? '',
          },
        );
        this.toastShowService.showInfo(
          message,
          'auto-wizard',
          '',
          TOAST_ICONS.INFO,
        );
        this.dataAutoWizardService.status.set('idle');
      } else if (status === 'failed') {
        const rawReason = (this.dataAutoWizardService.failureReason() ?? '').trim();
        const reason =
          rawReason.length > 0
            ? rawReason
            : this.translateService.instant('autoWizard.toast.failedUnknown');
        const message = this.translateService.instant(
          'autoWizard.toast.failed',
          { reason },
        );
        this.toastShowService.showError(message, 'auto-wizard');
        this.dataAutoWizardService.status.set('idle');
      }
    });

    this.scheduleSignalR.thoroughRecalculationCompleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        const activeToken = this.analyseScenarioService.activeToken() ?? null;
        if ((notification.analyseToken ?? null) !== activeToken) return;

        this.isRecalculating.set(false);
        this.toastShowService.showInfo(
          this.translateService.instant(
            'schedule.recalculate.thorough.completed',
          ),
          'recalculate-thorough',
          '',
          TOAST_ICONS.INFO,
        );
        this.dataManagementSchedule.readDatas();
      });
  }

  isEmailConfigured = computed(() => {
    const e = this.appSettings.emailSettings();
    return (
      !!e.outgoingServer &&
      !!e.outgoingServerPort &&
      !!e.username &&
      !!e.password
    );
  });

  isSendDisabled = computed(() => {
    return this.isSending() || !this.scheduleChangeService.hasDirtyClients();
  });

  get paymentInterval(): number {
    return this.dataManagementSchedule.workFilter.paymentInterval;
  }

  get displayYear(): string {
    return this.dataManagementSchedule.workFilter.currentYear.toString();
  }

  get displayPeriod(): string {
    switch (this.paymentInterval) {
      case 0:
        return `KW ${this.selectedWeek}`;
      case 1:
        return `KW ${this.selectedWeek}-${Math.min(this.selectedWeek + 1, this.getWeeksInYear(this.currentYear))}`;
      case 2:
      default:
        return this.gridSettingsService.monthsName[
          this.dataManagementSchedule.workFilter.currentMonth - 1
        ];
    }
  }

  get displayMonth(): string {
    return this.gridSettingsService.monthsName[
      this.dataManagementSchedule.workFilter.currentMonth - 1
    ];
  }

  get selectedMonth(): number {
    return this.dataManagementSchedule.workFilter.currentMonth;
  }
  set selectedMonth(value: number) {
    this.dataManagementSchedule.workFilter.currentMonth = value;
  }

  get selectedWeek(): number {
    return this.dataManagementSchedule.workFilter.currentWeek ?? 1;
  }
  set selectedWeek(value: number) {
    this.dataManagementSchedule.workFilter.currentWeek = value;
  }

  get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
  }

  get showAvailability(): boolean {
    return this.dataManagementSchedule.showAvailability();
  }

  hasAvailabilityData = computed(() => {
    this.dataManagementSchedule.isRead();
    return this.dataManagementSchedule.hasAvailabilityData;
  });

  get showBreakPlaceholders(): boolean {
    return this.dataManagementSchedule.showBreakPlaceholders();
  }

  toggleBreakPlaceholders(): void {
    this.dataManagementSchedule.toggleBreakPlaceholders();
    this.updateBreakPlaceholderIcon();
  }

  get showScheduleCommands(): boolean {
    return (this.dataService as ScheduleDataService).showScheduleCommands();
  }

  toggleScheduleCommands(): void {
    (this.dataService as ScheduleDataService).showScheduleCommands.update(
      (v) => !v,
    );
    this.updateScheduleCommandsIcon();
  }

  onTimelineRangeChange(range: TimelineViewRange): void {
    this.timelineRangeService.setViewRange(range);
  }

  onViewModeToggleChanged(checked: boolean): void {
    if (checked && this.value !== DEFAULT_ZOOM_VALUE) {
      this.value = DEFAULT_ZOOM_VALUE;
      this.emitZoomChange();
    }
    this.viewModeService.setViewMode(checked ? 'timeline' : 'table');
  }

  onTimelineRowHeightChange(): void {
    this.viewModeService.setTimelineRowHeightFactor(this.timelineValue / 100);
  }

  ngOnInit(): void {
    this.emitZoomChange();
    this.timelineValue = Math.round(
      this.viewModeService.timelineRowHeightFactor() * 100,
    );
  }

  ngAfterViewInit(): void {
    this.updateBreakPlaceholderIcon();
    this.updateScheduleCommandsIcon();
    this.updateAvailabilityCheckIcon();
  }

  private updateBreakPlaceholderIcon(): void {
    if (this.breakPlaceholderIcon) {
      this.breakPlaceholderIcon.ChangeColor(this.showBreakPlaceholders);
    }
  }

  private updateScheduleCommandsIcon(): void {
    if (this.scheduleCommandsIcon) {
      this.scheduleCommandsIcon.ChangeColor(this.showScheduleCommands);
    }
  }

  onChange() {
    this.emitZoomChange();
  }

  onCalendarReset(data: PeriodResetData): void {
    if (data.month !== undefined) {
      this.selectedMonth = data.month;
    }
    if (data.week !== undefined) {
      this.selectedWeek = data.week;
    }
    this.currentYear = data.year;
    this.applyPeriodChange();
  }

  onPdfExport() {
    this.pdfExportRequested.emit();
  }

  onAvailabilityCheck(): void {
    this.dataManagementSchedule.toggleAvailability();
    this.updateAvailabilityCheckIcon();
  }

  private updateAvailabilityCheckIcon(): void {
    if (this.availabilityCheckIcon) {
      this.availabilityCheckIcon.ChangeColor(this.showAvailability);
    }
  }

  onWizardClick(): void {
    this.wizardDialog.open();
  }

  onHarmonizerClick(): void {
    this.harmonizerDialog.open();
  }

  onHolisticHarmonizerClick(): void {
    this.holisticHarmonizerDialog.open();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.key.toLowerCase() !== 'h') {
      return;
    }
    if (!this.authorizationService.isAdmin) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    this.wizardDropdownMode.update((v) => !v);
  }

  async onAutoWizardClick(): Promise<void> {
    if (this.isAutoWizardRunning()) return;

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.noPeriod'),
        'auto-wizard',
      );
      return;
    }

    const agentIds = this.dataManagementSchedule.clients
      .map((c) => c.id)
      .filter((id): id is string => !!id);
    if (agentIds.length === 0) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.noAgents'),
        'auto-wizard',
      );
      return;
    }

    const shiftIds = [
      ...new Set(
        this.dataManagementSchedule.shiftSchedules.map((s) => s.shiftId),
      ),
    ];
    if (shiftIds.length === 0) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.noShifts'),
        'auto-wizard',
      );
      return;
    }

    const periodDays = Math.max(
      1,
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1,
    );
    const slotProduct = agentIds.length * Math.max(1, shiftIds.length) * periodDays;
    if (
      agentIds.length > AUTO_WIZARD_LIMITS.maxAgents ||
      shiftIds.length > AUTO_WIZARD_LIMITS.maxShifts ||
      slotProduct > AUTO_WIZARD_LIMITS.maxSlotProduct
    ) {
      this.toastShowService.showError(
        this.translateService.instant('autoWizard.toast.tooLarge', {
          agents: agentIds.length,
          shifts: shiftIds.length,
          days: periodDays,
          maxAgents: AUTO_WIZARD_LIMITS.maxAgents,
          maxShifts: AUTO_WIZARD_LIMITS.maxShifts,
          maxSlotProduct: AUTO_WIZARD_LIMITS.maxSlotProduct,
        }),
        'auto-wizard',
      );
      return;
    }

    try {
      await this.dataAutoWizardService.start({
        periodFrom: formatDateOnly(startDate),
        periodUntil: formatDateOnly(endDate),
        agentIds,
        shiftIds,
        groupId: this.dataManagementSchedule.workFilter.selectedGroup ?? null,
        analyseToken: this.analyseScenarioService.activeToken(),
        language: this.translateService.currentLang ?? null,
      });
      this.toastShowService.showInfo(
        this.translateService.instant('autoWizard.toast.started'),
        'auto-wizard',
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      // Failure handled via the status effect.
    }
  }

  async onSendAllSchedules(): Promise<void> {
    if (this.isSendDisabled()) return;

    const clients = this.dataManagementSchedule.clients;
    if (!clients?.length) return;

    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;
    if (!startDate || !endDate) return;

    this.isSending.set(true);

    try {
      const clientList = clients
        .filter((c) => !!c.id)
        .map((c) => ({
          id: c.id,
          name: `${c.firstName ?? ''} ${c.name ?? ''}`.trim(),
        }));

      const result = await this.scheduleReportCtx.sendForAllClients(
        clientList,
        formatDateOnly(startDate),
        formatDateOnly(endDate),
      );

      const msg = this.translateService.instant('schedule.send.bulk.summary', {
        success: result.success,
        failed: result.failed,
        noEmail: result.noEmail,
      });
      this.toastShowService.showInfo(msg, 'bulk-send', '', TOAST_ICONS.INFO);
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('schedule.send.error.failed', {
          clientName: 'Bulk',
        }),
        'bulk-send',
      );
    } finally {
      this.isSending.set(false);
    }
  }

  onThoroughRecalculateClick(): void {
    if (this.isRecalculating()) return;

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant(
        'schedule.recalculate.thorough.title',
      ),
      message: this.translateService.instant(
        'schedule.recalculate.thorough.warning',
      ),
      confirmText: this.translateService.instant(
        'schedule.recalculate.thorough.start',
      ),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.onThoroughRecalculateConfirmed(),
    });
  }

  async onThoroughRecalculateConfirmed(): Promise<void> {
    if (this.isRecalculating()) return;

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) return;

    this.isRecalculating.set(true);

    try {
      await new Promise<{ queued: boolean }>((resolve, reject) => {
        this.dataWorkScheduleService
          .recalculatePeriodHoursThorough(
            formatDateOnly(startDate),
            formatDateOnly(endDate),
            this.dataManagementSchedule.workFilter.selectedGroup,
            this.analyseScenarioService.activeToken(),
          )
          .subscribe({ next: resolve, error: reject });
      });

      this.toastShowService.showInfo(
        this.translateService.instant('schedule.recalculate.thorough.started'),
        'recalculate-thorough',
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      this.isRecalculating.set(false);
      this.toastShowService.showError(
        this.translateService.instant('schedule.recalculate.thorough.error'),
        'recalculate-thorough',
      );
    }
  }

  async onRecalculatePeriodHours(): Promise<void> {
    if (this.isRecalculating()) return;

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) return;

    this.isRecalculating.set(true);

    try {
      await new Promise<boolean>((resolve, reject) => {
        this.dataWorkScheduleService
          .recalculatePeriodHours(
            formatDateOnly(startDate),
            formatDateOnly(endDate),
            this.dataManagementSchedule.workFilter.selectedGroup,
          )
          .subscribe({ next: resolve, error: reject });
      });

      this.toastShowService.showInfo(
        this.translateService.instant('schedule.recalculate.success'),
        'recalculate',
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('schedule.recalculate.error'),
        'recalculate',
      );
    } finally {
      this.isRecalculating.set(false);
    }
  }

  goToPrevious() {
    switch (this.paymentInterval) {
      case 0:
        this.goToPreviousWeek();
        break;
      case 1:
        this.goToPreviousBiweekly();
        break;
      case 2:
      default:
        this.goToPreviousMonth();
        break;
    }
  }

  goToNext() {
    switch (this.paymentInterval) {
      case 0:
        this.goToNextWeek();
        break;
      case 1:
        this.goToNextBiweekly();
        break;
      case 2:
      default:
        this.goToNextMonth();
        break;
    }
  }

  private goToPreviousMonth() {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.currentYear--;
    } else {
      this.selectedMonth--;
    }
    this.applyPeriodChange();
  }

  private goToNextMonth() {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.currentYear++;
    } else {
      this.selectedMonth++;
    }
    this.applyPeriodChange();
  }

  private goToPreviousWeek() {
    if (this.selectedWeek === 1) {
      this.currentYear--;
      this.selectedWeek = this.getWeeksInYear(this.currentYear);
    } else {
      this.selectedWeek--;
    }
    this.applyPeriodChange();
  }

  private goToNextWeek() {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    if (this.selectedWeek >= weeksInYear) {
      this.currentYear++;
      this.selectedWeek = 1;
    } else {
      this.selectedWeek++;
    }
    this.applyPeriodChange();
  }

  private goToPreviousBiweekly() {
    if (this.selectedWeek <= 2) {
      this.currentYear--;
      const weeksInYear = this.getWeeksInYear(this.currentYear);
      this.selectedWeek = weeksInYear % 2 === 1 ? weeksInYear : weeksInYear - 1;
    } else {
      this.selectedWeek -= 2;
    }
    this.applyPeriodChange();
  }

  private goToNextBiweekly() {
    const weeksInYear = this.getWeeksInYear(this.currentYear);
    if (this.selectedWeek + 2 > weeksInYear) {
      this.currentYear++;
      this.selectedWeek = 1;
    } else {
      this.selectedWeek += 2;
    }
    this.applyPeriodChange();
  }

  private getWeeksInYear(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const week = this.calendarUtil.getISO8601WeekNumber(dec31);
    return week === 1 ? 52 : week;
  }

  private applyPeriodChange() {
    this.dataService.holidayCollection.currentYear = this.currentYear;
    this.dataManagementSchedule.readDatas();
    this.allScheduleStateService.saveCurrentFilter();
  }

  private emitZoomChange() {
    const zoomValue = parseFloat((this.value / 100).toFixed(1));
    this.zoomChange.emit(zoomValue);
  }
}
