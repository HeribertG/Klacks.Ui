// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Host of the floor-plan area: combines the settings card (list + toolbar) with the
 * viewer card and orchestrates marker rendering for the chosen date and display options.
 * @param dataManagement - Floor-plan list and selection state
 * @param canvasService - Fabric canvas controller used for rendering live work markers
 */

import {
  Component,
  inject,
  signal,
  effect,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { FloorPlanCanvasComponent } from '../floor-plan-canvas/floor-plan-canvas.component';
import { FloorPlanListComponent } from '../floor-plan-list/floor-plan-list.component';
import { FloorPlanPrintPreviewComponent } from '../floor-plan-print-preview/floor-plan-print-preview.component';
import {
  FloorPlanCanvasService,
  ILiveMarkerDisplay,
  ILiveMarkerEntry,
} from '../services/floor-plan-canvas.service';
import { FloorPlanLayerService } from '../services/floor-plan-layer.service';
import { FloorPlanImportService } from '../services/floor-plan-import.service';
import { FloorPlanMergeService } from '../services/floor-plan-merge.service';
import { FloorPlanAnchorSnapService } from '../services/floor-plan-anchor-snap.service';
import { FloorPlanToolService } from '../services/floor-plan-tool.service';
import { FloorPlanExportService } from '../services/floor-plan-export.service';
import { FloorPlanWorkDropService } from '../services/floor-plan-work-drop.service';
import { FloorPlanConnectorService } from '../services/floor-plan-connector.service';
import { FloorPlanJoinService } from '../services/floor-plan-join.service';
import { FloorPlanPointEditorService } from '../services/floor-plan-point-editor.service';
import { DataManagementFloorPlanService } from 'src/app/domain/services/floor-plan/data-management-floor-plan.service';
import { FloorPlanMarkerEnrichmentService } from 'src/app/domain/services/floor-plan/floor-plan-marker-enrichment.service';
import { IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import {
  IWorkScheduleFilter,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';

type ViewMode = 'view' | 'print';
type PrintOrientation = 'landscape' | 'portrait';

const WORK_SCHEDULE_ROW_COUNT = 500;
const DEFAULT_MARKER_COLOR = '#2563eb';
const ZOOM_SLIDER_DEFAULT = 100;
const ZOOM_SLIDER_FLOOR = 50;
const ZOOM_SLIDER_CEIL = 300;
const ZOOM_SLIDER_STEP = 10;
const ZOOM_PERCENT_DIVISOR = 100;

@Component({
  selector: 'app-floor-plan-home',
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgxSliderModule,
    FloorPlanCanvasComponent,
    FloorPlanListComponent,
    FloorPlanPrintPreviewComponent,
  ],
  templateUrl: './floor-plan-home.component.html',
  styleUrls: ['./floor-plan-home.component.scss'],
  providers: [
    FloorPlanCanvasService,
    FloorPlanLayerService,
    FloorPlanToolService,
    FloorPlanImportService,
    FloorPlanExportService,
    FloorPlanWorkDropService,
    FloorPlanConnectorService,
    FloorPlanMergeService,
    FloorPlanJoinService,
    FloorPlanPointEditorService,
    FloorPlanAnchorSnapService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanHomeComponent implements OnInit {
  dataManagement = inject(DataManagementFloorPlanService);
  canvasService = inject(FloorPlanCanvasService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private enrichmentService = inject(FloorPlanMarkerEnrichmentService);
  private exportService = inject(FloorPlanExportService);

  readonly selectedDate = signal<string>(this.formatDate(new Date()));
  readonly display = signal<ILiveMarkerDisplay>({
    name: false,
    time: false,
    phone: false,
    image: false,
  });
  readonly isLoadingWorks = signal(false);
  readonly viewMode = signal<ViewMode>('view');
  readonly printOrientation = signal<PrintOrientation>('landscape');
  readonly printSvgContent = signal<string>('');

  zoomValue = ZOOM_SLIDER_DEFAULT;
  readonly zoomOptions: Options = {
    floor: ZOOM_SLIDER_FLOOR,
    ceil: ZOOM_SLIDER_CEIL,
    step: ZOOM_SLIDER_STEP,
    showSelectionBarEnd: false,
    showSelectionBar: false,
  };

  constructor() {
    effect(() => {
      const plan = this.dataManagement.selectedFloorPlan();
      const ready = this.canvasService.canvasReady();
      if (plan?.canvasJson && ready) {
        this.canvasService.loadFromJSON(plan.canvasJson).then(() => {
          this.canvasService.setReadOnly(true);
          this.loadWorksForSelectedDate();
        });
      }
    });

    effect(() => {
      this.selectedDate();
      this.display();
      if (this.dataManagement.selectedFloorPlan()) {
        this.loadWorksForSelectedDate();
      }
    });
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.dataManagement.loadAll();
  }

  onSelectFloorPlan(plan: IFloorPlan): void {
    if (!plan.id) return;
    this.dataManagement.loadById(plan.id);
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
  }

  onDisplayChange(next: ILiveMarkerDisplay): void {
    this.display.set(next);
  }

  onZoomSliderChange(): void {
    if (this.viewMode() === 'view') {
      this.canvasService.setZoom(this.zoomValue / ZOOM_PERCENT_DIVISOR);
    }
  }

  onViewModeChange(mode: ViewMode): void {
    if (mode === 'print' && this.dataManagement.selectedFloorPlan()) {
      this.printSvgContent.set(this.canvasService.toSVG());
    }
    this.viewMode.set(mode);
  }

  onOrientationChange(orientation: PrintOrientation): void {
    this.printOrientation.set(orientation);
  }

  onPrint(): void {
    const svg = this.printSvgContent();
    if (svg) {
      this.exportService.printCurrentPage(svg, this.printOrientation());
    }
  }

  async loadWorksForSelectedDate(): Promise<void> {
    const plan = this.dataManagement.selectedFloorPlan();
    if (!plan?.id || !this.selectedDate()) return;

    this.isLoadingWorks.set(true);
    try {
      const filter: IWorkScheduleFilter = {
        startDate: this.selectedDate(),
        endDate: this.selectedDate(),
        showEmployees: true,
        showExtern: true,
        rowCount: WORK_SCHEDULE_ROW_COUNT,
      };

      const response = await firstValueFrom(this.dataWorkSchedule.getWorkSchedule(filter));
      const workEntries = response.entries.filter(
        (e) => e.entryType === WorkScheduleEntryType.Work,
      );

      const clients = new Map(response.clients.map((c) => [c.id, c]));
      const display = this.display();

      if (display.phone || display.image) {
        const clientIds = Array.from(new Set(workEntries.map((e) => e.clientId)));
        await this.enrichmentService.loadMany(clientIds);
      }

      const liveMarkers: ILiveMarkerEntry[] = workEntries.map((entry) => {
        const client = clients.get(entry.clientId);
        const clientName = client ? `${client.firstName ?? ''} ${client.name ?? ''}`.trim() : '';
        const enrichment = this.enrichmentService.get(entry.clientId);
        return {
          clientId: entry.clientId,
          clientName,
          startTime: entry.startTime,
          endTime: entry.endTime,
          phone: enrichment?.phone ?? null,
          imageDataUrl: enrichment?.imageDataUrl ?? null,
          color: DEFAULT_MARKER_COLOR,
          display,
        };
      });

      this.canvasService.renderLiveMarkers(liveMarkers);
    } catch {
      this.canvasService.clearLiveMarkers();
    } finally {
      this.isLoadingWorks.set(false);
      if (this.viewMode() === 'print') {
        this.printSvgContent.set(this.canvasService.toSVG());
      }
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
