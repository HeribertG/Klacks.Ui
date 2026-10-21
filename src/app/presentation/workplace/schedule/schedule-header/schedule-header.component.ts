// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toolbar of the schedule page: period navigation, wizards, recalculation, bulk e-mail, display toggles, view mode,
 * zoom and PDF export. The behaviour lives in the component-scoped services listed in providers; this class keeps
 * what needs its own view (dialogs, icons, outputs, document listeners) and wires the services to the template.
 * @param period - Displays and steps the selected week, biweekly pair or month
 * @param recalculation - Normal and thorough period-hours recalculation with the busy flag
 * @param bulkSend - Bulk e-mail send of the visible range to all clients
 * @param wizardMenu - Auto-wizard state, wizard dropdown shortcut and the autofill / absence cover permissions
 * @param toolsOverlay - Open state of the collapsed toolbar overlay
 * @param displayToggles - Break placeholder, schedule command and availability toggles with their icon colours
 * @param zoomChange - Emits the zoom factor of the table view
 * @param pdfExportRequested - Emits when the PDF export button is clicked
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { DirectionService } from 'src/app/application/services/direction.service';
import { PeriodCalendarMonthlyComponent } from 'src/app/presentation/shared/period-calendar-monthly/period-calendar-monthly.component';
import { PeriodCalendarWeeklyComponent } from 'src/app/presentation/shared/period-calendar-weekly/period-calendar-weekly.component';
import { PeriodCalendarBiweeklyComponent } from 'src/app/presentation/shared/period-calendar-biweekly/period-calendar-biweekly.component';
import { ProgressLineComponent } from 'src/app/presentation/shared/progress-line/progress-line.component';
import { IconAngleLeftComponent } from 'src/app/presentation/icons/icon-angle-left.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { IconBreakPlaceholderComponent } from 'src/app/presentation/icons/icon-break-placeholder.component';
import { IconThunderCircleComponent } from 'src/app/presentation/icons/icon-thunder-circle.component';
import { IconAvailabilityCheckComponent } from 'src/app/presentation/icons/icon-availability-check.component';
import { IconFlyComponent } from 'src/app/presentation/icons/icon-fly.component';
import { IconWizardComponent } from 'src/app/presentation/icons/icon-wizard.component';
import { IconAbsenceCoverComponent } from 'src/app/presentation/icons/icon-absence-cover.component';
import { IconCalcComponent } from 'src/app/presentation/icons/icon-calc.component';
import { WizardDialogComponent } from '../dialogs/wizard-dialog/wizard-dialog.component';
import { HarmonizerDialogComponent } from '../dialogs/harmonizer-dialog/harmonizer-dialog.component';
import { HolisticHarmonizerDialogComponent } from '../dialogs/holistic-harmonizer-dialog/holistic-harmonizer-dialog.component';
import { Wizard4DialogComponent } from '../dialogs/wizard4-dialog/wizard4-dialog.component';
import { RecoveryDialogComponent } from '../dialogs/recovery-dialog/recovery-dialog.component';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { ScheduleTimelineRangeService } from '../services/schedule-timeline-range.service';
import { ScheduleSelectionService } from '../services/schedule-selection.service';
import { TimelineViewRange } from '../services/timeline-view-range.type';
import { ScenarioSelectorComponent } from './scenario-selector/scenario-selector.component';
import { ScheduleHeaderPeriodNavigationService } from './services/schedule-header-period-navigation.service';
import { ScheduleHeaderRecalculationService } from './services/schedule-header-recalculation.service';
import { ScheduleHeaderBulkSendService } from './services/schedule-header-bulk-send.service';
import { ScheduleHeaderWizardMenuService } from './services/schedule-header-wizard-menu.service';
import { ScheduleHeaderToolsOverlayService } from './services/schedule-header-tools-overlay.service';
import { ScheduleHeaderDisplayTogglesService } from './services/schedule-header-display-toggles.service';
import {
  SCHEDULE_HEADER_DEFAULT_ZOOM_VALUE,
  SCHEDULE_HEADER_PERCENT_BASE,
  SCHEDULE_HEADER_TIMELINE_SLIDER_OPTIONS,
  SCHEDULE_HEADER_ZOOM_FACTOR_DECIMALS,
  SCHEDULE_HEADER_ZOOM_SLIDER_OPTIONS,
} from './schedule-header.constants';

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
    ProgressLineComponent,
    WizardDialogComponent,
    HarmonizerDialogComponent,
    HolisticHarmonizerDialogComponent,
    Wizard4DialogComponent,
    RecoveryDialogComponent,
    IconAbsenceCoverComponent,
    ScenarioSelectorComponent,
  ],
  providers: [
    ScheduleHeaderPeriodNavigationService,
    ScheduleHeaderRecalculationService,
    ScheduleHeaderBulkSendService,
    ScheduleHeaderWizardMenuService,
    ScheduleHeaderToolsOverlayService,
    ScheduleHeaderDisplayTogglesService,
  ],
  host: {
    '(document:click)': 'toolsOverlay.onDocumentClickCloseTools($event)',
    '(document:keydown.escape)': 'toolsOverlay.onEscapeCloseTools()',
    '(document:keydown)': 'wizardMenu.onShortcutKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleHeaderComponent implements OnInit, AfterViewInit {
  readonly breakPlaceholderIcon = viewChild<IconBreakPlaceholderComponent>('breakPlaceholderIcon');
  readonly scheduleCommandsIcon = viewChild<IconThunderCircleComponent>('scheduleCommandsIcon');
  readonly availabilityCheckIcon = viewChild<IconAvailabilityCheckComponent>('availabilityCheckIcon');
  readonly wizardDialog = viewChild.required<WizardDialogComponent>('wizardDialog');
  readonly harmonizerDialog = viewChild.required<HarmonizerDialogComponent>('harmonizerDialog');
  readonly holisticHarmonizerDialog = viewChild.required<HolisticHarmonizerDialogComponent>('holisticHarmonizerDialog');
  readonly wizard4Dialog = viewChild.required<Wizard4DialogComponent>('wizard4Dialog');
  readonly recoveryDialog = viewChild.required<RecoveryDialogComponent>('recoveryDialog');

  private directionService = inject(DirectionService);
  readonly isRtl = computed(() => this.directionService.direction() === 'rtl');

  readonly paymentIntervals = PaymentInterval;

  value = SCHEDULE_HEADER_DEFAULT_ZOOM_VALUE;
  readonly options = SCHEDULE_HEADER_ZOOM_SLIDER_OPTIONS;

  timelineValue = SCHEDULE_HEADER_DEFAULT_ZOOM_VALUE;
  readonly timelineOptions = SCHEDULE_HEADER_TIMELINE_SLIDER_OPTIONS;

  zoomChange = output<number>();
  pdfExportRequested = output<void>();

  readonly period = inject(ScheduleHeaderPeriodNavigationService);
  readonly recalculation = inject(ScheduleHeaderRecalculationService);
  readonly bulkSend = inject(ScheduleHeaderBulkSendService);
  readonly wizardMenu = inject(ScheduleHeaderWizardMenuService);
  readonly toolsOverlay = inject(ScheduleHeaderToolsOverlayService);
  readonly displayToggles = inject(ScheduleHeaderDisplayTogglesService);

  private viewModeService = inject(ScheduleViewModeService);
  private timelineRangeService = inject(ScheduleTimelineRangeService);
  private scheduleSelection = inject(ScheduleSelectionService);
  private destroyRef = inject(DestroyRef);

  public readonly isTimelineMode = this.viewModeService.isTimelineMode;
  public readonly timelineViewRange = this.timelineRangeService.viewRange;

  constructor() {
    this.recalculation.connect(this.destroyRef);
  }

  ngOnInit(): void {
    this.emitZoomChange();
    this.timelineValue = Math.round(this.viewModeService.timelineRowHeightFactor() * SCHEDULE_HEADER_PERCENT_BASE);
  }

  ngAfterViewInit(): void {
    this.displayToggles.colourIcons(this.breakPlaceholderIcon(), this.scheduleCommandsIcon(), this.availabilityCheckIcon());
  }

  onTimelineRangeChange(range: TimelineViewRange): void {
    this.timelineRangeService.setViewRange(range);
  }

  onViewModeToggleChanged(checked: boolean): void {
    if (checked && this.value !== SCHEDULE_HEADER_DEFAULT_ZOOM_VALUE) {
      this.value = SCHEDULE_HEADER_DEFAULT_ZOOM_VALUE;
      this.emitZoomChange();
    }
    this.viewModeService.setViewMode(checked ? 'timeline' : 'table');
  }

  onTimelineRowHeightChange(): void {
    this.viewModeService.setTimelineRowHeightFactor(this.timelineValue / SCHEDULE_HEADER_PERCENT_BASE);
  }

  onChange(): void {
    this.emitZoomChange();
  }

  onPdfExport(): void {
    this.pdfExportRequested.emit();
  }

  onWizardClick(): void {
    this.wizardDialog().open();
  }

  onHarmonizerClick(): void {
    this.harmonizerDialog().open();
  }

  onHolisticHarmonizerClick(): void {
    this.holisticHarmonizerDialog().open();
  }

  onWizard4Click(): void {
    this.wizard4Dialog().open();
  }

  onRecoveryClick(): void {
    const selectedWork = this.scheduleSelection.selectedWork();
    if (!selectedWork) {
      return;
    }
    void this.recoveryDialog().open({ clientId: selectedWork.clientId, date: selectedWork.date });
  }

  private emitZoomChange(): void {
    const zoomValue = parseFloat((this.value / SCHEDULE_HEADER_PERCENT_BASE).toFixed(SCHEDULE_HEADER_ZOOM_FACTOR_DECIMALS));
    this.zoomChange.emit(zoomValue);
  }
}
