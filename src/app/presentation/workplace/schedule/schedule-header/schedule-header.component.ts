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
  Component,
  computed,
  inject,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  NgbDropdown,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';

import { CalendarSelectorComponent } from 'src/app/presentation/shared/calendar-selector/calendar-selector.component';
import {
  CalendarResetData,
  ScheduleHeaderCalendarMonthlyComponent,
} from './schedule-header-calendar-monthly/schedule-header-calendar-monthly.component';
import { ScheduleHeaderCalendarWeeklyComponent } from './schedule-header-calendar-weekly/schedule-header-calendar-weekly.component';
import { ScheduleHeaderCalendarBiweeklyComponent } from './schedule-header-calendar-biweekly/schedule-header-calendar-biweekly.component';
import { FormsModule } from '@angular/forms';
import { ChooseCalendarComponent } from 'src/app/presentation/icons/choose-calendar.component';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { IconAngleLeftComponent } from 'src/app/presentation/icons/icon-angle-left.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { IconBreakPlaceholderComponent } from 'src/app/presentation/icons/icon-break-placeholder.component';
import { IconFlyComponent } from 'src/app/presentation/icons/icon-fly.component';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { ToastShowService, TOAST_ICONS } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';

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
    CalendarSelectorComponent,
    NgbTooltip,
    ChooseCalendarComponent,
    ScheduleHeaderCalendarMonthlyComponent,
    ScheduleHeaderCalendarWeeklyComponent,
    ScheduleHeaderCalendarBiweeklyComponent,
    IconAngleLeftComponent,
    IconAngleRightComponent,
    PdfIconComponent,
    IconBreakPlaceholderComponent,
    IconFlyComponent,
  ],
  providers: [],
})
export class ScheduleHeaderComponent implements OnInit, AfterViewInit {
  @ViewChild('dropdownSetting') dropdownSetting!: NgbDropdown;
  @ViewChild('breakPlaceholderIcon') breakPlaceholderIcon!: IconBreakPlaceholderComponent;
  value = 100;
  options: Options = {
    floor: 50,
    ceil: 300,
    step: 10,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  };

  zoomChange = output<number>();
  pdfExportRequested = output<void>();

  private holidayCollection = inject(HolidayCollectionService);
  private dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService,
  );
  private gridSettingsService = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private dataService = inject(BaseDataService);
  private allScheduleStateService = inject(AllScheduleStateService);
  private settingsService = inject(DataManagementSettingsService);
  private calendarUtil = inject(CalendarUtilService);
  private appSettings = inject(AppSettingsManagementService);
  private scheduleReportCtx = inject(ScheduleReportContextService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private scheduleChangeService = inject(ScheduleChangeService);

  isSending = signal(false);

  isEmailConfigured = computed(() => {
    const e = this.appSettings.emailSettings();
    return !!e.outgoingServer && !!e.outgoingServerPort && !!e.username && !!e.password;
  });

  isSendDisabled = computed(() => {
    return this.isSending() || !this.scheduleChangeService.hasDirtyClients();
  });

  get paymentInterval(): number {
    return this.settingsService.paymentInterval;
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

  private get selectedMonth(): number {
    return this.dataManagementSchedule.workFilter.currentMonth;
  }
  private set selectedMonth(value: number) {
    this.dataManagementSchedule.workFilter.currentMonth = value;
  }

  private get selectedWeek(): number {
    return this.dataManagementSchedule.workFilter.currentWeek ?? 1;
  }
  private set selectedWeek(value: number) {
    this.dataManagementSchedule.workFilter.currentWeek = value;
  }

  private get currentYear(): number {
    return this.dataManagementSchedule.workFilter.currentYear;
  }
  private set currentYear(value: number) {
    this.dataManagementSchedule.workFilter.currentYear = value;
  }

  get showBreakPlaceholders(): boolean {
    return this.dataManagementSchedule.showBreakPlaceholders();
  }

  toggleBreakPlaceholders(): void {
    this.dataManagementSchedule.toggleBreakPlaceholders();
    this.updateBreakPlaceholderIcon();
  }

  ngOnInit(): void {
    this.emitZoomChange();
  }

  ngAfterViewInit(): void {
    this.updateBreakPlaceholderIcon();
  }

  private updateBreakPlaceholderIcon(): void {
    if (this.breakPlaceholderIcon) {
      this.breakPlaceholderIcon.ChangeColor(this.showBreakPlaceholders);
    }
  }

  onChange() {
    this.emitZoomChange();
  }

  changeYear(event: number) {
    this.holidayCollection.currentYear = event;
  }

  onOpenMenu() {
    setTimeout(() => {
      this.dropdownSetting.open();
    }, 100);
  }

  onChangeCalendar() {
    const chips = this.dataManagementCalendarSelectionService.chips;
    this.holidayCollection.setSelection(chips);
  }

  onCalendarReset(_data: CalendarResetData) {}

  onPdfExport() {
    this.pdfExportRequested.emit();
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
        .filter(c => !!c.id)
        .map(c => ({
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
        this.translateService.instant('schedule.send.error.failed', { clientName: 'Bulk' }),
        'bulk-send',
      );
    } finally {
      this.isSending.set(false);
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
