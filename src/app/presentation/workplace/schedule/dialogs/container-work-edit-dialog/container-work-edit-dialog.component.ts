// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog for editing container work children (sub-works and absences).
 * Mirrors the container-template page inside a modal with 3-zone split layout.
 * @param workId - The ID of the parent container work entry
 * @param _shiftId - The shift entry ID (unused, kept for caller compatibility)
 * @param currentDate - The date context; weekday is derived from this
 * @param availableShifts - Shifts that can be assigned as sub-works
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  TemplateRef,
  afterNextRender,
  Injector,
  effect,
  signal,
  viewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import {
  ContainerTransportModeEnum,
  TransportModeEnum,
} from 'src/app/domain/enums/transport-mode.enum';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TimeRulerDragDropService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-drag-drop.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { IconByCarComponent } from 'src/app/presentation/icons/icon-by-car.component';
import { IconByFootComponent } from 'src/app/presentation/icons/icon-by-foot.component';
import { IconByBicycleComponent } from 'src/app/presentation/icons/icon-by-bicycle.component';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import {
  Menu,
  MenuItem,
} from 'src/app/presentation/shared/context-menu/context-menu-class';
import { IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import {
  NgbModal,
  NgbModalRef,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { IOpenContainerWorkOptions } from './open-container-work-options';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import {
  formatClientWithAddress,
  formatWorkTime,
} from 'src/app/shared/helpers/container-template-format.helper';
import { ContainerTemplateShiftOperationsService } from '../../../shift/container-template/services/container-template-shift-operations.service';
import { ContainerTemplateDragDropService } from '../../../shift/container-template/services/container-template-drag-drop.service';
import { ContainerTemplatePropertiesService } from '../../../shift/container-template/services/container-template-properties.service';
import { ContainerTemplateAbsenceService } from '../../../shift/container-template/services/container-template-absence.service';
import { ContainerTemplateRouteService } from '../../../shift/container-template/services/container-template-route.service';
import { ContainerTemplateItemManipulationService } from '../../../shift/container-template/services/container-template-item-manipulation.service';
import { ContainerTemplatePdfExportService } from '../../../shift/container-template/services/container-template-pdf-export.service';
import { RoutePdfExportService } from '../../../shift/container-template/services/route-pdf-export.service';
import { MapRenderingService } from '../../../shift/container-template/services/map-rendering.service';
import { ShiftArrangementService } from '../../../shift/container-template/services/shift-arrangement.service';
import { ContainerWorkModalLifecycleService } from './services/container-work-modal-lifecycle.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerLockResourceType } from 'src/app/domain/models/container/container-lock';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { ContainerEditorLayoutComponent } from 'src/app/presentation/workplace/schedule/shared/container-editor-layout/container-editor-layout.component';

const MODAL_WINDOW_CLASS = 'container-work-edit-fullscreen';

@Component({
  selector: 'app-container-work-edit-dialog',
  imports: [
    FormsModule,
    TranslateModule,
    NgbTooltipModule,
    TimeInputComponent,
    IconByCarComponent,
    IconByFootComponent,
    IconByBicycleComponent,
    ContextMenuComponent,
    ContainerEditorLayoutComponent,
  ],
  templateUrl: './container-work-edit-dialog.component.html',
  styleUrl: './container-work-edit-dialog.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    TableSortingService,
    TimeRulerDragDropService,
    ContextMenuService,
    ContainerTemplateItemManipulationService,
    MapRenderingService,
    RoutePdfExportService,
    ContainerTemplatePdfExportService,
    ShiftArrangementService,
    ContainerTemplateRouteService,
    ContainerTemplatePropertiesService,
    ContainerTemplateShiftOperationsService,
    ContainerTemplateAbsenceService,
    ContainerTemplateDragDropService,
    ContainerWorkModalLifecycleService,
  ],
})
export class ContainerWorkEditDialogComponent {
  private _timeFrom = OwnTime.forTime('06', '00');
  private _timeTo = OwnTime.forTime('18', '00');

  get timeFrom() {
    return this._timeFrom;
  }
  set timeFrom(value: OwnTime) {
    this._timeFrom = value;
  }

  get timeTo() {
    return this._timeTo;
  }
  set timeTo(value: OwnTime) {
    this._timeTo = value;
  }

  public duration: OwnTime = OwnTime.forDuration('00', '00');

  direction = inject(DirectionService).direction;

  private shiftService = inject(ContainerTemplateShiftService);
  public translateService = inject(TranslateService);
  public sortingService = inject(TableSortingService);
  public addressProvider = inject(AddressProviderService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);
  private ngbModal = inject(NgbModal);
  readonly routeService = inject(ContainerTemplateRouteService);
  readonly propertiesService = inject(ContainerTemplatePropertiesService);
  readonly lifecycleService = inject(ContainerWorkModalLifecycleService);
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  readonly absenceService = inject(ContainerTemplateAbsenceService);
  private dragDropService = inject(ContainerTemplateDragDropService);
  private lockService = inject(ContainerLockService);
  private toastService = inject(ToastShowService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();
  private timeChange$ = new Subject<void>();
  private modalRef: NgbModalRef | null = null;

  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('containerWorkEditModal');
  readonly contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');
  readonly propertiesModal = viewChild.required<TemplateRef<unknown>>('propertiesModal');
  readonly absenceTimeModal = viewChild.required<TemplateRef<unknown>>('absenceTimeModal');

  timeRangeToleranceValue = 50;

  formatTime = formatTime;

  shiftFilter = signal('');

  get filteredAvailableTasks(): IShift[] {
    const term = this.shiftFilter().trim().toLowerCase();
    const tasks = this.lifecycleService.availableTasks;
    if (!term) return tasks;
    return tasks.filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(term) ||
        (s.abbreviation ?? '').toLowerCase().includes(term) ||
        formatClientWithAddress(s).toLowerCase().includes(term),
    );
  }

  get selectedContainerTemplateItems(): IContainerTemplateItem[] {
    return this.shiftService.selectedContainerTemplateItemsSignal();
  }

  get selectedShift(): IContainerTemplateItem | null {
    return this.shiftService.selectedShiftSignal();
  }

  get TransportModeEnum(): typeof TransportModeEnum {
    return TransportModeEnum;
  }

  get ContainerTransportModeEnum(): typeof ContainerTransportModeEnum {
    return ContainerTransportModeEnum;
  }

  constructor() {
    afterNextRender(() => {
      effect(
        () => {
          this.lifecycleService.isLoading();
          this.cdr.markForCheck();
        },
        { injector: this.injector },
      );

      effect(
        () => {
          this.lifecycleService.isDirty();
          this.lifecycleService.availableShiftsVersion();
          this.lifecycleService.isAvailableShiftsLoading();
          this.lifecycleService.isEmploymentTabActive();
          this.lifecycleService.selectedTabIndex();
          this.lifecycleService.containerAbsences();
          this.lifecycleService.isReadOnly();
          this.lifecycleService.readOnlyReason();
          this.shiftService.selectedContainerTemplateItemsSignal();
          this.calculateDuration();
          this.cdr.markForCheck();
        },
        { injector: this.injector },
      );
    });

    this.timeChange$
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  open(options: IOpenContainerWorkOptions): void {
    this.lockService
      .acquire(ContainerLockResourceType.containerWork, options.workId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lock) => {
          this.openModalInternal(options);
          if (!lock.acquired) {
            const key = lock.isSelfConflict
              ? 'container.lock.lockedBySelf'
              : 'container.lock.lockedByOther';
            const message = this.translateService.instant(key, {
              user: lock.userName,
            });
            this.toastService.showInfo(message);
            this.lifecycleService.isReadOnly.set(true);
            this.lifecycleService.readOnlyReason.set(message);
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.openModalInternal(options);
        },
      });
  }

  private openModalInternal(options: IOpenContainerWorkOptions): void {
    this.lifecycleService.initialize(options);

    this.timeFrom = this.lifecycleService.getTimeFrom();
    this.timeTo = this.lifecycleService.getTimeTo();
    this.calculateDuration();

    this.sortingService.initialize({
      columns: ['name', 'abbreviation', 'startShift', 'client'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: false,
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      windowClass: MODAL_WINDOW_CLASS,
    });

    this.modalRef.result.then(
      () => this.cleanup(),
      () => this.cleanup(),
    );
  }

  private cleanup(): void {
    this.lockService.release();
    this.destroy$.next();
    this.lifecycleService.reset();
    this.modalRef = null;
  }

  onTimeFromChange(time: OwnTime): void {
    this.timeFrom = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();
    this.lifecycleService.updateParentStartTime(this.timeFrom);
    this.lifecycleService.markDirty();
    this.timeChange$.next();
  }

  onTimeToChange(time: OwnTime): void {
    this.timeTo = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();
    this.lifecycleService.updateParentEndTime(this.timeTo);
    this.lifecycleService.markDirty();
    this.timeChange$.next();
  }

  private calculateDuration(): void {
    const envelope = this.shiftOpsService.calculateDuration(
      this.timeFrom,
      this.timeTo,
    );
    this.duration = this.subtractUnpaidBreaks(envelope);
  }

  private subtractUnpaidBreaks(envelope: OwnTime): OwnTime {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    let totalMinutes = envelope.toMinutes();
    for (const item of items) {
      if (!item.absence?.isUnpaid || !item.startItem || !item.endItem) {
        continue;
      }
      totalMinutes -= this.breakDurationMinutes(item.startItem, item.endItem);
    }
    if (totalMinutes < 0) {
      totalMinutes = 0;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return OwnTime.forDuration(
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
    );
  }

  private breakDurationMinutes(start: string, end: string): number {
    const toMinutes = (hm: string): number => {
      const parts = hm.split(':');
      return (parseInt(parts[0] || '0', 10) * 60) + parseInt(parts[1] || '0', 10);
    };
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (s === e) {
      return 0;
    }
    return e > s ? e - s : (1440 - s) + e;
  }

  getConnectedDropLists(): string[] {
    return this.dragDropService.getConnectedDropLists();
  }

  onTaskDrop(event: CdkDragDrop<IContainerTemplateItem[]>): void {
    this.dragDropService.onTaskDrop(
      event,
      this.timeFrom,
      this.timeTo,
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
    );
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  formatWorkTime = formatWorkTime;

  formatClientWithAddress = formatClientWithAddress;

  hasTimeRangeViolation(item: IContainerTemplateItem): boolean {
    return this.shiftOpsService.hasTimeRangeViolation(item);
  }

  isTimeRangePartial(shift: IShift): boolean {
    return this.shiftOpsService.isTimeRangePartial(
      shift,
      this.timeFrom,
      this.timeTo,
    );
  }

  onRemoveAllTasks(): void {
    const items = [...this.selectedContainerTemplateItems];
    for (const item of items) {
      this.shiftOpsService.removeTask(
        item,
        this.lifecycleService.weekday,
        this.lifecycleService.isHoliday,
        () => {},
      );
    }
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  onRemoveTask(item: IContainerTemplateItem): void {
    this.shiftOpsService.removeTask(
      item,
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
      () => {},
    );
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  onAvailableTasksDrop(): void {}

  onTransportModeChange(mode: number): void {
    this.routeService.selectedTransportMode =
      mode as ContainerTransportModeEnum;
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  getTimeRangeStartTime(item: IContainerTemplateItem): OwnTime {
    return this.shiftOpsService.getTimeRangeStartTime(item);
  }

  onTimeRangeStartChange(item: IContainerTemplateItem, newTime: OwnTime): void {
    this.shiftOpsService.onTimeRangeStartChange(item, newTime);
    this.lifecycleService.markDirty();
  }

  autofill(): void {
    this.routeService.autofill({
      containerShift: this.lifecycleService.containerShiftId
        ? ({ id: this.lifecycleService.containerShiftId } as IShift)
        : null,
      selectedWeekday: this.lifecycleService.weekday,
      isHoliday: this.lifecycleService.isHoliday,
      timeFrom: this.timeFrom,
      timeTo: this.timeTo,
      additionalAvailableWorkIds: this.lifecycleService.getUnassignedOriginalChildIds(),
      timeRangeToleranceValue: this.timeRangeToleranceValue,
      destroy$: this.destroy$,
      onStateChanged: () => {
        this.lifecycleService.markDirty();
        this.cdr.markForCheck();
      },
    }, this.lifecycleService.availableTasks);
  }

  optimizeRoute(): void {
    this.routeService.optimizeRoute(
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
      this.timeFrom,
      this.destroy$,
      () => {
        this.lifecycleService.markDirty();
        this.cdr.markForCheck();
      },
    );
  }

  exportSelectedShiftsToPdf(): void {
    this.shiftOpsService.exportSelectedShiftsToPdf(
      null,
      this.lifecycleService.weekday,
      this.timeFrom,
      this.timeTo,
    );
  }

  exportRouteToPdf(): void {
    this.shiftOpsService.exportRouteToPdf(
      null,
      this.lifecycleService.weekday,
      this.timeFrom,
    );
  }

  onItemsDisplaced(): void {
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  onShiftRowClick(item: IContainerTemplateItem): void {
    this.shiftService.setSelectedShift(item);
  }

  onShiftRightClick(event: IShiftContextMenuEvent): void {
    this.propertiesService.contextMenuTargetItem = event.item;
    this.shiftService.setSelectedShift(event.item);
    this.openContextMenu(event.mouseEvent);
  }

  onTableRowRightClick(event: MouseEvent, item: IContainerTemplateItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.propertiesService.contextMenuTargetItem = item;
    this.shiftService.setSelectedShift(item);
    this.openContextMenu(event);
  }

  onContextMenuClick(keys: string[]): void {
    if (keys.includes('properties')) {
      this.openPropertiesDialog();
    }
    this.contextMenu().closeMenu(true);
  }

  onContainerContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  compactSelectedShifts(keepTravelAndBriefing = false): void {
    this.shiftOpsService.compactSelectedShifts(
      this.timeFrom,
      this.timeTo,
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
      keepTravelAndBriefing,
    );
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  private openContextMenu(event: MouseEvent): void {
    const menuData = new Menu();
    const propertiesItem = new MenuItem(
      'properties',
      this.translateService.instant(
        'shift.container-template.context-menu.properties',
      ),
      false,
    );
    menuData.list.push(propertiesItem);

    const contextMenu = this.contextMenu();
    contextMenu.menuData = menuData;
    contextMenu.openMenu(event);
  }

  private openPropertiesDialog(): void {
    const target = this.propertiesService.contextMenuTargetItem;
    if (target?.absenceId) {
      this.absenceService.openAbsenceTimeModal(
        target,
        this.absenceTimeModal(),
        this.timeFrom,
        this.timeTo,
        this.lifecycleService.weekday,
        this.lifecycleService.isHoliday,
      );
      return;
    }
    this.propertiesService.openPropertiesDialog(
      this.propertiesModal(),
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
    );
  }

  onAbsenceRowDblClick(item: IContainerTemplateItem): void {
    this.absenceService.openAbsenceTimeModal(
      item,
      this.absenceTimeModal(),
      this.timeFrom,
      this.timeTo,
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
    );
  }

  onAbsenceStartTimeChange(time: OwnTime): void {
    this.absenceService.onAbsenceStartTimeChange(time);
  }

  onAbsenceEndTimeChange(time: OwnTime): void {
    this.absenceService.onAbsenceEndTimeChange(time);
  }

  onSave(): void {
    this.lifecycleService
      .save()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.modalRef?.close();
        },
        error: () => {},
      });
  }

  onReset(): void {
    if (!this.lifecycleService.isDirty()) return;
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant(
        'dialog.containerWorkEdit.confirmResetTitle',
      ),
      message: this.translateService.instant(
        'dialog.containerWorkEdit.confirmReset',
      ),
      confirmText: this.translateService.instant('reset'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.lifecycleService.reset(),
    });
  }

  onCancel(): void {
    if (!this.lifecycleService.isDirty()) {
      this.modalRef?.dismiss();
      return;
    }
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant(
        'dialog.containerWorkEdit.confirmCancelTitle',
      ),
      message: this.translateService.instant(
        'dialog.containerWorkEdit.confirmCancel',
      ),
      confirmText: this.translateService.instant(
        'dialog.containerWorkEdit.discardButton',
      ),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.modalRef?.dismiss(),
    });
  }
}
