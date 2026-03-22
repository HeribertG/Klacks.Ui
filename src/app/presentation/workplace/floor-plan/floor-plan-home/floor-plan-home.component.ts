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
import { FloorPlanCanvasComponent } from '../floor-plan-canvas/floor-plan-canvas.component';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';
import { FloorPlanLayerService } from '../services/floor-plan-layer.service';
import { FloorPlanImportService } from '../services/floor-plan-import.service';
import { DataManagementFloorPlanService } from 'src/app/domain/services/floor-plan/data-management-floor-plan.service';
import { IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-floor-plan-home',
  standalone: true,
  imports: [
    TranslateModule,
    FloorPlanCanvasComponent,
  ],
  templateUrl: './floor-plan-home.component.html',
  styleUrls: ['./floor-plan-home.component.scss'],
  providers: [
    FloorPlanCanvasService,
    FloorPlanLayerService,
    FloorPlanImportService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanHomeComponent implements OnInit {
  dataManagement = inject(DataManagementFloorPlanService);
  canvasService = inject(FloorPlanCanvasService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  readonly showFloorPlanList = signal(true);

  constructor() {
    effect(() => {
      const plan = this.dataManagement.selectedFloorPlan();
      if (plan?.canvasJson) {
        this.canvasService.loadFromJSON(plan.canvasJson);
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
    this.dataManagement.loadAll();
  }
}
