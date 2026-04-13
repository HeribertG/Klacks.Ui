// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared 3-zone editor layout for container modal dialogs.
 * Provides time controls, toolbar (autofill/compact/route/PDF), TimeRuler (Zone 1),
 * selected tasks table (Zone 2), and available tasks/absences tabs (Zone 3).
 * @param timeFrom - Container start time
 * @param timeTo - Container end time
 * @param dropListId - Unique cdkDropList ID for selected tasks to avoid conflicts
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  input,
  Output,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateShiftOperationsService } from '../../../shift/container-template/services/container-template-shift-operations.service';
import { ContainerTemplateDragDropService } from '../../../shift/container-template/services/container-template-drag-drop.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TimeRulerComponent, IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCompactComponent } from 'src/app/presentation/icons/icon-compact.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { IconRouteComponent } from 'src/app/presentation/icons/icon-route.component';
import { IconRouteFileComponent } from 'src/app/presentation/icons/icon-route-file.component';
import { IconWizardComponent } from 'src/app/presentation/icons/icon-wizard.component';
import { IconByCarComponent } from 'src/app/presentation/icons/icon-by-car.component';
import { IconByFootComponent } from 'src/app/presentation/icons/icon-by-foot.component';
import { IconByBicycleComponent } from 'src/app/presentation/icons/icon-by-bicycle.component';
import { IconTransportMixComponent } from 'src/app/presentation/icons/icon-transport-mix.component';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';
import { DirectionService } from 'src/app/application/services/direction.service';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import {
  formatClientWithAddress,
  formatWorkTime,
} from 'src/app/shared/helpers/container-template-format.helper';

@Component({
  selector: 'app-container-editor-layout',
  host: {
    '[class.readonly-mode]': 'isReadOnly()',
  },
  imports: [
    FormsModule,
    AngularSplitModule,
    TranslateModule,
    DragDropModule,
    NgbTooltipModule,
    NgbDropdownModule,
    NgxSliderModule,
    TimeInputComponent,
    TimeRulerComponent,
    IconShiftSegmentComponent,
    IconTimeWindowComponent,
    IconUnknownTimeComponent,
    TrashIconRedComponent,
    IconCompactComponent,
    PdfIconComponent,
    IconRouteComponent,
    IconRouteFileComponent,
    IconWizardComponent,
    IconByCarComponent,
    IconByFootComponent,
    IconByBicycleComponent,
    IconTransportMixComponent,
    SearchInputComponent,
  ],
  templateUrl: './container-editor-layout.component.html',
  styleUrl: './container-editor-layout.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerEditorLayoutComponent {
  protected direction = inject(DirectionService).direction;
  protected translateService = inject(TranslateService);
  protected addressProvider = inject(AddressProviderService);
  protected sortingService = inject(TableSortingService);
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  private dragDropService = inject(ContainerTemplateDragDropService);
  private cdr = inject(ChangeDetectorRef);

  // Inputs — Data
  timeFrom = input<OwnTime>(OwnTime.forTime('06', '00'));
  timeTo = input<OwnTime>(OwnTime.forTime('18', '00'));
  duration = input<OwnTime>(OwnTime.forDuration('00', '00'));
  isLoading = input(false);
  isReadOnly = input(false);
  readOnlyReason = input('');
  availableTasks = input<IShift[]>([]);
  containerAbsences = input<IAbsence[]>([]);
  isEmploymentTabActive = input(false);
  isAvailableShiftsLoading = input(false);
  selectedItems = input<IContainerTemplateItem[]>([]);
  selectedShift = input<IContainerTemplateItem | null>(null);
  shiftFilter = input('');
  tabs = input<{ date: Date; label: string }[]>([]);
  selectedTabIndex = input(0);

  // Inputs — Toolbar state
  isAutofillRunning = input(false);
  isOptimizing = input(false);
  showAutofill = input(false);
  hasRouteInfo = input(false);
  hasOpenRouteServiceApiKey = input(false);
  timeRangeToleranceValue = input(50);

  // Inputs — Transport/Address state
  selectedStartBase = input('');
  selectedEndBase = input('');
  selectedTransportMode = input(0);

  // Inputs — IDs
  dropListId = input('selected-tasks-list');
  availableDropListId = input('available-tasks-list');
  absencesDropListId = input('container-absences-list');

  // Outputs — Time
  @Output() timeFromChange = new EventEmitter<OwnTime>();
  @Output() timeToChange = new EventEmitter<OwnTime>();

  // Outputs — Filter/Tolerance
  @Output() shiftFilterChange = new EventEmitter<string>();
  @Output() toleranceChange = new EventEmitter<number>();

  // Outputs — Drag-Drop
  @Output() taskDrop = new EventEmitter<CdkDragDrop<IContainerTemplateItem[]>>();
  @Output() availableTasksDrop = new EventEmitter<void>();

  // Outputs — Task actions
  @Output() removeTask = new EventEmitter<IContainerTemplateItem>();
  @Output() removeAllTasks = new EventEmitter<void>();

  // Outputs — Toolbar
  @Output() autofillClick = new EventEmitter<void>();
  @Output() compactClick = new EventEmitter<boolean>();
  @Output() optimizeRouteClick = new EventEmitter<void>();
  @Output() exportShiftsPdfClick = new EventEmitter<void>();
  @Output() exportRoutePdfClick = new EventEmitter<void>();

  // Outputs — Tabs
  @Output() employmentTabClick = new EventEmitter<void>();
  @Output() shiftsTabClick = new EventEmitter<void>();
  @Output() dayTabClick = new EventEmitter<number>();

  // Outputs — Row interaction
  @Output() shiftRowClick = new EventEmitter<IContainerTemplateItem>();
  @Output() shiftRightClick = new EventEmitter<IShiftContextMenuEvent>();
  @Output() tableRowRightClick = new EventEmitter<{ event: MouseEvent; item: IContainerTemplateItem }>();
  @Output() absenceRowDblClick = new EventEmitter<IContainerTemplateItem>();
  @Output() itemsDisplaced = new EventEmitter<void>();

  // Outputs — Address/Transport
  @Output() transportModeChange = new EventEmitter<number>();
  @Output() startBaseChange = new EventEmitter<string>();
  @Output() endBaseChange = new EventEmitter<string>();
  @Output() markDirty = new EventEmitter<void>();

  toleranceOptions: Options = {
    floor: 0,
    ceil: 100,
    step: 10,
    showSelectionBar: true,
    hideLimitLabels: true,
    hidePointerLabels: true,
  };

  formatTime = formatTime;
  formatWorkTime = formatWorkTime;
  formatClientWithAddress = formatClientWithAddress;

  getConnectedDropLists(): string[] {
    return this.dragDropService.getConnectedDropLists();
  }

  isTimeRangePartial(shift: IShift): boolean {
    return this.shiftOpsService.isTimeRangePartial(shift, this.timeFrom(), this.timeTo());
  }

  hasTimeRangeViolation(item: IContainerTemplateItem): boolean {
    return this.shiftOpsService.hasTimeRangeViolation(item);
  }

  getTimeRangeStartTime(item: IContainerTemplateItem): OwnTime {
    return this.shiftOpsService.getTimeRangeStartTime(item);
  }

  onTimeRangeStartChange(item: IContainerTemplateItem, newTime: OwnTime): void {
    this.shiftOpsService.onTimeRangeStartChange(item, newTime);
    this.markDirty.emit();
  }

  onHeaderClick(columnKey: string): void {
    this.sortingService.onHeaderClick(columnKey, () => this.cdr.markForCheck());
  }

  onTableRowRightClickInternal(event: MouseEvent, item: IContainerTemplateItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.tableRowRightClick.emit({ event, item });
  }

  onContainerContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  onTransportModeClick(mode: number): void {
    if (mode !== 0 && !this.hasOpenRouteServiceApiKey()) return;
    this.transportModeChange.emit(mode);
    this.markDirty.emit();
  }
}
