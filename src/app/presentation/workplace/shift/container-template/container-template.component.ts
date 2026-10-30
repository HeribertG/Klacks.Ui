// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Container template component for weekly shift planning in containers. The behaviour lives in the
 * component-scoped services listed in providers; this class wires them to the template and bridges
 * the context menu and dialog templates of its own view. The bottom zone and the two dialog bodies are child components
 * that resolve the same component-scoped services.
 * @param state - Editor state: container, time window, weekday/holiday selection, grid, loading and read-only flags
 * @param session - Starts and ends the editing session (lock, routed load, teardown)
 * @param viewRefresh - Signal bridges and refreshes of tasks, slot and start/end base
 * @param selection - Weekday, holiday variant and tab switching
 * @param timeWindow - Time window edits and the debounced grid rebuild
 * @param taskActions - Drop, remove, autofill, route, compaction and PDF export of the selected tasks
 * @param contextMenuActions - Context menu and the properties/absence dialogs
 * @param routeMapVisible - Whether the user toggled the tour map on; it is only shown while a route exists
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';
import { DirectionService } from 'src/app/application/services/direction.service';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TimeRulerDragDropService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-drag-drop.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TimeRulerComponent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/shift-context-menu-event.interface';
import { ProgressLineComponent } from 'src/app/presentation/shared/progress-line/progress-line.component';
import { LongPressContextDirective } from 'src/app/presentation/directives/long-press-context.directive';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCompactComponent } from 'src/app/presentation/icons/icon-compact.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { IconRouteComponent } from 'src/app/presentation/icons/icon-route.component';
import { IconRouteFileComponent } from 'src/app/presentation/icons/icon-route-file.component';
import { IconRouteMapComponent } from 'src/app/presentation/icons/icon-route-map.component';
import { IconByCarComponent } from 'src/app/presentation/icons/icon-by-car.component';
import { IconByFootComponent } from 'src/app/presentation/icons/icon-by-foot.component';
import { IconByBicycleComponent } from 'src/app/presentation/icons/icon-by-bicycle.component';
import { IconTransportMixComponent } from 'src/app/presentation/icons/icon-transport-mix.component';
import { IconWizardComponent } from 'src/app/presentation/icons/icon-wizard.component';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { formatClientWithAddress, formatWorkTime } from 'src/app/domain/helpers/container-template-format.helper';
import {
  CONTAINER_TEMPLATE_ROW_DRAG_MOUSE_START_DELAY_MS,
  CONTAINER_TEMPLATE_SPLIT_SIZES,
} from './container-template.constants';
import { ContainerTemplateRouteService } from './services/container-template-route.service';
import { ContainerTemplatePropertiesService } from './services/container-template-properties.service';
import { ContainerTemplateTabService } from './services/container-template-tab.service';
import { ContainerTemplateLifecycleService } from './services/container-template-lifecycle.service';
import { ContainerTemplateShiftOperationsService } from './services/container-template-shift-operations.service';
import { ContainerTemplateItemManipulationService } from './services/container-template-item-manipulation.service';
import { ContainerTemplatePdfExportService } from './services/container-template-pdf-export.service';
import { RoutePdfExportService } from './services/route-pdf-export.service';
import { MapRenderingService } from './services/map-rendering.service';
import { ShiftArrangementService } from './services/shift-arrangement.service';
import { ContainerTemplateAbsenceService } from './services/container-template-absence.service';
import { ContainerTemplateDragDropService } from './services/container-template-drag-drop.service';
import { ContainerTemplateEditorStateService } from './services/container-template-editor-state.service';
import { ContainerTemplateViewRefreshService } from './services/container-template-view-refresh.service';
import { ContainerTemplateTimeWindowService } from './services/container-template-time-window.service';
import { ContainerTemplateSelectionService } from './services/container-template-selection.service';
import { ContainerTemplateSessionService } from './services/container-template-session.service';
import { ContainerTemplateTaskActionsService } from './services/container-template-task-actions.service';
import { ContainerTemplateContextMenuService } from './services/container-template-context-menu.service';
import { ContainerTemplateAvailableZoneComponent } from './container-template-available-zone/container-template-available-zone.component';
import { ContainerTemplatePropertiesDialogComponent } from './container-template-properties-dialog/container-template-properties-dialog.component';
import { ContainerTemplateAbsenceTimeDialogComponent } from './container-template-absence-time-dialog/container-template-absence-time-dialog.component';
import { ContainerTemplateRouteMapComponent } from './container-template-route-map/container-template-route-map.component';

@Component({
  selector: 'app-container-template',
  imports: [
    FormsModule,
    ProgressLineComponent,
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
    PdfIconComponent,
    IconRouteComponent,
    IconRouteFileComponent,
    IconRouteMapComponent,
    ContextMenuComponent,
    IconByCarComponent,
    IconByFootComponent,
    IconByBicycleComponent,
    IconTransportMixComponent,
    IconWizardComponent,
    NgxSliderModule,
    LongPressContextDirective,
    FallbackPipe,
    ContainerTemplateAvailableZoneComponent,
    ContainerTemplatePropertiesDialogComponent,
    ContainerTemplateAbsenceTimeDialogComponent,
    ContainerTemplateRouteMapComponent,
  ],
  templateUrl: './container-template.component.html',
  styleUrl: './container-template.component.scss',
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
    ContainerTemplateTabService,
    ContainerTemplateLifecycleService,
    ContainerTemplateShiftOperationsService,
    ContainerTemplateAbsenceService,
    ContainerTemplateDragDropService,
    ContainerTemplateEditorStateService,
    ContainerTemplateViewRefreshService,
    ContainerTemplateTimeWindowService,
    ContainerTemplateSelectionService,
    ContainerTemplateSessionService,
    ContainerTemplateTaskActionsService,
    ContainerTemplateContextMenuService,
  ],
})
export class ContainerTemplateComponent implements OnInit, OnDestroy {
  protected readonly rowDragStartDelay = {
    touch: TouchInteraction.RowDragTouchStartDelayMs,
    mouse: CONTAINER_TEMPLATE_ROW_DRAG_MOUSE_START_DELAY_MS,
  };
  protected readonly ContainerTransportModeEnum = ContainerTransportModeEnum;
  protected readonly formatTime = formatTime;
  protected readonly formatWorkTime = formatWorkTime;
  protected readonly formatClientWithAddress = formatClientWithAddress;
  protected readonly splitSizes = CONTAINER_TEMPLATE_SPLIT_SIZES;

  protected readonly direction = inject(DirectionService).direction;
  protected readonly translateService = inject(TranslateService);
  protected readonly addressProvider = inject(AddressProviderService);
  protected readonly shiftService = inject(ContainerTemplateShiftService);
  protected readonly routeService = inject(ContainerTemplateRouteService);
  protected readonly shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  protected readonly dragDropService = inject(ContainerTemplateDragDropService);
  protected readonly state = inject(ContainerTemplateEditorStateService);
  protected readonly viewRefresh = inject(ContainerTemplateViewRefreshService);
  protected readonly selection = inject(ContainerTemplateSelectionService);
  protected readonly timeWindow = inject(ContainerTemplateTimeWindowService);
  protected readonly taskActions = inject(ContainerTemplateTaskActionsService);
  private readonly session = inject(ContainerTemplateSessionService);
  private readonly contextMenuActions = inject(ContainerTemplateContextMenuService);

  private readonly contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');
  private readonly propertiesModal = viewChild.required<TemplateRef<unknown>>('propertiesModal');
  private readonly absenceTimeModal = viewChild.required<TemplateRef<unknown>>('absenceTimeModal');

  private readonly routeMapVisible = signal(false);
  protected readonly routeMapShown = computed(
    () => this.routeMapVisible() && this.routeService.lastRouteInfo() !== null,
  );

  constructor() {
    this.viewRefresh.connect();
  }

  ngOnInit(): void {
    this.session.start();
  }

  ngOnDestroy(): void {
    this.session.stop();
  }

  onShiftRightClick(event: IShiftContextMenuEvent): void {
    this.contextMenuActions.openForTimelineShift(event, this.contextMenu());
  }

  onTableRowRightClick(event: MouseEvent, item: IContainerTemplateItem): void {
    this.contextMenuActions.openForTableRow(event, item, this.contextMenu());
  }

  onContextMenuClick(keys: string[]): void {
    this.contextMenuActions.onMenuClick(keys, this.contextMenu(), this.propertiesModal(), this.absenceTimeModal());
  }

  toggleRouteMap(): void {
    this.routeMapVisible.update((visible) => !visible);
  }

  onAbsenceRowDblClick(item: IContainerTemplateItem): void {
    this.contextMenuActions.openAbsenceTimeDialog(item, this.absenceTimeModal());
  }
}
