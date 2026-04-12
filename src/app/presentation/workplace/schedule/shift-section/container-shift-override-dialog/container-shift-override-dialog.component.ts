// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog for editing container shift day-specific overrides.
 * Shows date in header instead of weekday; no employment tab; same drag-drop layout as the work edit dialog.
 * @param containerId - The container shift ID
 * @param date - ISO date string for the override
 * @param weekday - Weekday name derived from the date
 * @param isHoliday - Whether the date is a holiday
 * @param containerStartTime - Optional override for the start time
 * @param containerEndTime - Optional override for the end time
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  ViewChild,
  TemplateRef,
  afterNextRender,
  Injector,
  effect,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
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
import { TimeRulerComponent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCompactComponent } from 'src/app/presentation/icons/icon-compact.component';
import { IconRouteComponent } from 'src/app/presentation/icons/icon-route.component';
import { IconByCarComponent } from 'src/app/presentation/icons/icon-by-car.component';
import { IconByFootComponent } from 'src/app/presentation/icons/icon-by-foot.component';
import { IconByBicycleComponent } from 'src/app/presentation/icons/icon-by-bicycle.component';
import { IconTransportMixComponent } from 'src/app/presentation/icons/icon-transport-mix.component';
import {
  NgbDropdownModule,
  NgbModal,
  NgbModalRef,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import {
  formatClientWithAddress,
  formatWorkTime,
} from 'src/app/shared/helpers/container-template-format.helper';
import { ContainerTemplateShiftOperationsService } from '../../shift/container-template/services/container-template-shift-operations.service';
import { ContainerTemplateDragDropService } from '../../shift/container-template/services/container-template-drag-drop.service';
import { ContainerTemplatePropertiesService } from '../../shift/container-template/services/container-template-properties.service';
import { ContainerTemplateRouteService } from '../../shift/container-template/services/container-template-route.service';
import { ContainerTemplateItemManipulationService } from '../../shift/container-template/services/container-template-item-manipulation.service';
import { MapRenderingService } from '../../shift/container-template/services/map-rendering.service';
import { ShiftArrangementService } from '../../shift/container-template/services/shift-arrangement.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerLockResourceType } from 'src/app/domain/models/container/container-lock';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';
import { ContainerShiftOverrideLifecycleService } from './services/container-shift-override-lifecycle.service';
import { IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import {
  Menu,
  MenuItem,
} from 'src/app/presentation/shared/context-menu/context-menu-class';

const MODAL_WINDOW_CLASS = 'container-shift-override-fullscreen';

@Component({
  selector: 'app-container-shift-override-dialog',
  imports: [
    FormsModule,
    AngularSplitModule,
    TranslateModule,
    DragDropModule,
    NgbTooltipModule,
    NgbDropdownModule,
    TimeInputComponent,
    TimeRulerComponent,
    IconShiftSegmentComponent,
    IconTimeWindowComponent,
    IconUnknownTimeComponent,
    TrashIconRedComponent,
    IconCompactComponent,
    IconRouteComponent,
    IconByCarComponent,
    IconByFootComponent,
    IconByBicycleComponent,
    IconTransportMixComponent,
    ContextMenuComponent,
    SearchInputComponent,
  ],
  templateUrl: './container-shift-override-dialog.component.html',
  styleUrl: './container-shift-override-dialog.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    TableSortingService,
    TimeRulerDragDropService,
    ContextMenuService,
    ContainerTemplateItemManipulationService,
    MapRenderingService,
    ShiftArrangementService,
    ContainerTemplateRouteService,
    ContainerTemplatePropertiesService,
    ContainerTemplateShiftOperationsService,
    ContainerTemplateDragDropService,
    ContainerShiftOverrideLifecycleService,
  ],
})
export class ContainerShiftOverrideDialogComponent {
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
  readonly lifecycleService = inject(ContainerShiftOverrideLifecycleService);
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  private dragDropService = inject(ContainerTemplateDragDropService);
  private lockService = inject(ContainerLockService);
  private toastService = inject(ToastShowService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();
  private timeChange$ = new Subject<void>();
  private modalRef: NgbModalRef | null = null;

  @ViewChild('overrideModal', { static: false })
  modalTemplate!: TemplateRef<unknown>;
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;

  private propertiesService = inject(ContainerTemplatePropertiesService);

  formatTime = formatTime;
  formatWorkTime = formatWorkTime;
  formatClientWithAddress = formatClientWithAddress;

  shiftFilter = signal('');

  get filteredAvailableTasks(): IShift[] {
    const term = this.shiftFilter().trim().toLowerCase();
    const tasks = this.lifecycleService.availableTasks;
    if (!term) return tasks;
    return tasks.filter(
      s =>
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

  open(
    containerId: string,
    date: string,
    weekday: string,
    isHoliday: boolean,
    containerStartTime?: string,
    containerEndTime?: string,
  ): void {
    const lockKey = `${containerId}:${date}`;
    this.lockService
      .acquire(ContainerLockResourceType.containerShiftOverride, lockKey)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: lock => {
          this.openModalInternal(containerId, date, weekday, isHoliday, containerStartTime, containerEndTime);
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
          this.openModalInternal(containerId, date, weekday, isHoliday, containerStartTime, containerEndTime);
        },
      });
  }

  private openModalInternal(
    containerId: string,
    date: string,
    weekday: string,
    isHoliday: boolean,
    containerStartTime?: string,
    containerEndTime?: string,
  ): void {
    this.lifecycleService
      .initialize(containerId, date, weekday, isHoliday, containerStartTime, containerEndTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.timeFrom = this.lifecycleService.getTimeFrom();
          this.timeTo = this.lifecycleService.getTimeTo();
          this.calculateDuration();
          this.cdr.markForCheck();
        },
        error: () => {},
      });

    this.timeFrom = this.lifecycleService.getTimeFrom();
    this.timeTo = this.lifecycleService.getTimeTo();
    this.calculateDuration();

    this.sortingService.initialize({
      columns: ['name', 'abbreviation', 'startShift', 'client'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: false,
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
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
    this.lifecycleService.updateStartTime(this.timeFrom);
    this.lifecycleService.markDirty();
    this.timeChange$.next();
  }

  onTimeToChange(time: OwnTime): void {
    this.timeTo = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();
    this.lifecycleService.updateEndTime(this.timeTo);
    this.lifecycleService.markDirty();
    this.timeChange$.next();
  }

  private calculateDuration(): void {
    this.duration = this.shiftOpsService.calculateDuration(this.timeFrom, this.timeTo);
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

  hasTimeRangeViolation(item: IContainerTemplateItem): boolean {
    return this.shiftOpsService.hasTimeRangeViolation(item);
  }

  isTimeRangePartial(shift: IShift): boolean {
    return this.shiftOpsService.isTimeRangePartial(shift, this.timeFrom, this.timeTo);
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
    this.routeService.selectedTransportMode = mode as ContainerTransportModeEnum;
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

  onItemsDisplaced(): void {
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  onShiftRowClick(item: IContainerTemplateItem): void {
    this.shiftService.setSelectedShift(item);
  }

  onHeaderClick(columnKey: string): void {
    this.sortingService.onHeaderClick(columnKey, () => {
      this.cdr.markForCheck();
    });
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

  onContextMenuClick(_keys: string[]): void {
    this.contextMenu.closeMenu(true);
  }

  onContainerContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  compactSelectedShifts(): void {
    this.shiftOpsService.compactSelectedShifts(
      this.timeFrom,
      this.timeTo,
      this.lifecycleService.weekday,
      this.lifecycleService.isHoliday,
      false,
    );
    this.lifecycleService.markDirty();
    this.cdr.markForCheck();
  }

  private openContextMenu(event: MouseEvent): void {
    const menuData = new Menu();
    const propertiesItem = new MenuItem(
      'properties',
      this.translateService.instant('shift.container-template.context-menu.properties'),
      false,
    );
    menuData.list.push(propertiesItem);
    this.contextMenu.menuData = menuData;
    this.contextMenu.openMenu(event);
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
      title: this.translateService.instant('dialog.containerShiftOverride.confirmResetTitle'),
      message: this.translateService.instant('dialog.containerShiftOverride.confirmReset'),
      confirmText: this.translateService.instant('reset'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => {
        this.lifecycleService.reset();
        this.lifecycleService
          .initialize(
            this.lifecycleService.containerId,
            this.lifecycleService.date,
            this.lifecycleService.weekday,
            this.lifecycleService.isHoliday,
            this.lifecycleService.containerStartTime ?? undefined,
            this.lifecycleService.containerEndTime ?? undefined,
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.timeFrom = this.lifecycleService.getTimeFrom();
              this.timeTo = this.lifecycleService.getTimeTo();
              this.calculateDuration();
              this.cdr.markForCheck();
            },
            error: () => {},
          });
      },
    });
  }

  onCancel(): void {
    if (!this.lifecycleService.isDirty()) {
      this.modalRef?.dismiss();
      return;
    }
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('dialog.containerShiftOverride.confirmCancelTitle'),
      message: this.translateService.instant('dialog.containerShiftOverride.confirmCancel'),
      confirmText: this.translateService.instant('dialog.containerWorkEdit.discardButton'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.modalRef?.dismiss(),
    });
  }
}
