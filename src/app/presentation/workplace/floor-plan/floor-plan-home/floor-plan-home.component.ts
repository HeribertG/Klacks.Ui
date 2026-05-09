// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
import { FloorPlanCanvasComponent } from '../floor-plan-canvas/floor-plan-canvas.component';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';
import { FloorPlanLayerService } from '../services/floor-plan-layer.service';
import { FloorPlanImportService } from '../services/floor-plan-import.service';
import { FloorPlanMergeService } from '../services/floor-plan-merge.service';
import { DataManagementFloorPlanService } from 'src/app/domain/services/floor-plan/data-management-floor-plan.service';
import { IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { IWorkScheduleFilter, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-floor-plan-home',
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    FloorPlanCanvasComponent,
  ],
  templateUrl: './floor-plan-home.component.html',
  styleUrls: ['./floor-plan-home.component.scss'],
  providers: [
    FloorPlanCanvasService,
    FloorPlanLayerService,
    FloorPlanImportService,
    FloorPlanMergeService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanHomeComponent implements OnInit {
  dataManagement = inject(DataManagementFloorPlanService);
  canvasService = inject(FloorPlanCanvasService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private dataWorkSchedule = inject(DataWorkScheduleService);

  readonly showFloorPlanList = signal(true);
  readonly selectedDate = signal<string>(this.formatDate(new Date()));
  readonly isLoadingWorks = signal(false);

  constructor() {
    effect(() => {
      const plan = this.dataManagement.selectedFloorPlan();
      if (plan?.canvasJson) {
        this.canvasService.loadFromJSON(plan.canvasJson).then(() => {
          this.loadWorksForSelectedDate();
        });
      }
    });
  }

  ngOnInit(): void {
    this.layoutService.setContainerToFullSize();
    this.searchService.setSearchVisibility(false);
    this.dataManagement.loadAll();
  }

  onSelectFloorPlan(plan: IFloorPlan): void {
    this.dataManagement.loadById(plan.id!);
    this.showFloorPlanList.set(false);
  }

  onBack(): void {
    this.showFloorPlanList.set(true);
    this.dataManagement.selectedFloorPlan.set(null);
    this.canvasService.clearLiveMarkers();
    this.dataManagement.loadAll();
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadWorksForSelectedDate();
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
        rowCount: 500,
      };

      const response = await firstValueFrom(this.dataWorkSchedule.getWorkSchedule(filter));
      const workEntries = response.entries.filter(
        (e) => e.entryType === WorkScheduleEntryType.Work
      );

      const clients = new Map(response.clients.map((c) => [c.id, c]));

      const liveMarkers = workEntries.map((entry) => {
        const client = clients.get(entry.clientId);
        const clientName = client ? `${client.firstName} ${client.name}`.trim() : '';
        return {
          clientName,
          shiftName: entry.entryName || '',
          startTime: entry.startTime,
          endTime: entry.endTime,
          color: '#2563eb',
        };
      });

      this.canvasService.renderLiveMarkers(liveMarkers);
    } catch {
      // Silently fail — the canvas still shows the floor plan
    } finally {
      this.isLoadingWorks.set(false);
    }
  }

  zoomIn(): void {
    this.canvasService.zoomIn();
  }

  zoomOut(): void {
    this.canvasService.zoomOut();
  }

  zoomReset(): void {
    this.canvasService.resetZoom();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
