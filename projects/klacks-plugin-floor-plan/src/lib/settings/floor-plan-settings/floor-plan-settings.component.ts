// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  Component, ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbActiveModal, NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { PluginSettingsListCardComponent } from '../../shared/settings-list-card/settings-list-card.component';
import { FloorPlanSettingsRowComponent } from './floor-plan-settings-row/floor-plan-settings-row.component';
import { DataManagementFloorPlanService } from '@floor-plan-plugin/application/services/data-management-floor-plan.service';
import { FloorPlan } from '@floor-plan-plugin/domain/models/floor-plan-class';
import { IFloorPlan } from '@floor-plan-plugin/domain/models/floor-plan.interface';
import { IFloorPlanWorkMarker } from '@floor-plan-plugin/domain/models/floor-plan-work-marker.interface';
import { PLUGIN_DELETE_CONFIRMATION, PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { FloorPlanCanvasComponent } from '@floor-plan-plugin/floor-plan-canvas/floor-plan-canvas.component';
import { FloorPlanToolbarComponent } from '@floor-plan-plugin/floor-plan-toolbar/floor-plan-toolbar.component';
import { FloorPlanLayerPanelComponent } from '@floor-plan-plugin/floor-plan-layer-panel/floor-plan-layer-panel.component';
import { FloorPlanWorkPanelComponent } from '@floor-plan-plugin/floor-plan-work-panel/floor-plan-work-panel.component';
import { FloorPlanPropertyPanelComponent } from '@floor-plan-plugin/floor-plan-property-panel/floor-plan-property-panel.component';
import { FloorPlanCanvasService } from '@floor-plan-plugin/services/floor-plan-canvas.service';
import { FloorPlanCanvasMarkerService } from '@floor-plan-plugin/services/floor-plan-canvas-marker.service';
import { FloorPlanShapeService } from '@floor-plan-plugin/services/floor-plan-shape.service';
import { FloorPlanPolygonDrawingService } from '@floor-plan-plugin/services/floor-plan-polygon-drawing.service';
import { FloorPlanObjectEditService } from '@floor-plan-plugin/services/floor-plan-object-edit.service';
import { FloorPlanObjectStyleService } from '@floor-plan-plugin/services/floor-plan-object-style.service';
import { FloorPlanLayerService } from '@floor-plan-plugin/services/floor-plan-layer.service';
import { FloorPlanToolService } from '@floor-plan-plugin/services/floor-plan-tool.service';
import { FloorPlanImportService } from '@floor-plan-plugin/services/floor-plan-import.service';
import { FloorPlanExportService } from '@floor-plan-plugin/services/floor-plan-export.service';
import { FloorPlanWorkDropService } from '@floor-plan-plugin/services/floor-plan-work-drop.service';
import { FloorPlanConnectorService } from '@floor-plan-plugin/services/floor-plan-connector.service';
import { FloorPlanMergeService } from '@floor-plan-plugin/services/floor-plan-merge.service';
import { FloorPlanAnchorSnapService } from '@floor-plan-plugin/services/floor-plan-anchor-snap.service';
import { FloorPlanJoinService } from '@floor-plan-plugin/services/floor-plan-join.service';
import { FloorPlanPointEditorService } from '@floor-plan-plugin/services/floor-plan-point-editor.service';

const DELETE_CONFIRMATION_CONTEXT = 'floor-plan-settings';

@Component({
  selector: 'lib-floor-plan-settings',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    PluginSettingsListCardComponent,
    FloorPlanSettingsRowComponent,
    FloorPlanCanvasComponent,
    FloorPlanToolbarComponent,
    FloorPlanLayerPanelComponent,
    FloorPlanWorkPanelComponent,
    FloorPlanPropertyPanelComponent,
  ],
  templateUrl: './floor-plan-settings.component.html',
  styleUrls: ['./floor-plan-settings.component.scss'],
  providers: [
    FloorPlanCanvasService,
    FloorPlanShapeService,
    FloorPlanPolygonDrawingService,
    FloorPlanObjectEditService,
    FloorPlanObjectStyleService,
    FloorPlanCanvasMarkerService,
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
export class FloorPlanSettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorModal', { read: TemplateRef })
  editorModal!: TemplateRef<unknown>;

  dataManagement = inject(DataManagementFloorPlanService);
  canvasService = inject(FloorPlanCanvasService);
  private readonly markerService = inject(FloorPlanCanvasMarkerService);
  connectorService = inject(FloorPlanConnectorService);
  private ngbModal = inject(NgbModal);
  private deleteConfirmation = inject(PLUGIN_DELETE_CONFIRMATION);
  private toastService = inject(PLUGIN_TOAST_SERVICE);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  editingPlan: IFloorPlan | null = null;

  ngOnInit(): void {
    this.dataManagement.loadAll();
  }

  ngAfterViewInit(): void {
    this.deleteConfirmation
      .confirmedDeletes(DELETE_CONFIRMATION_CONTEXT)
      .pipe(takeUntil(this.destroy$))
      .subscribe((floorPlanId) => {
        this.deleteFloorPlan(floorPlanId);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    this.editingPlan = new FloorPlan();
    this.openEditorModal();
  }

  async onClickEdit(plan: IFloorPlan): Promise<void> {
    if (plan.id) {
      const loaded = await this.dataManagement.loadByIdAsync(plan.id);
      if (loaded) {
        this.editingPlan = { ...loaded };
      } else {
        this.editingPlan = { ...plan };
      }
    } else {
      this.editingPlan = { ...plan };
    }
    this.openEditorModal();
  }

  async onClickClone(plan: IFloorPlan): Promise<void> {
    if (plan.id) {
      const loaded = await this.dataManagement.loadByIdAsync(plan.id);
      if (loaded) {
        this.editingPlan = { ...loaded };
      } else {
        this.editingPlan = { ...plan };
      }
    } else {
      this.editingPlan = { ...plan };
    }
    this.editingPlan.id = undefined;
    this.editingPlan.name = '';
    this.openEditorModal();
  }

  openDeleteFloorPlan(plan: IFloorPlan): void {
    if (plan.id) {
      this.deleteConfirmation.requestDelete(DELETE_CONFIRMATION_CONTEXT, plan.id);
    }
  }

  async onSaveInModal(modal: Pick<NgbActiveModal, 'close'>, closeAfterSave = false): Promise<void> {
    if (!this.editingPlan || !this.editingPlan.name) return;

    const saveTarget = new FloorPlan();
    if (this.editingPlan.id) saveTarget.id = this.editingPlan.id;
    saveTarget.name = this.editingPlan.name;
    saveTarget.description = this.editingPlan.description;
    saveTarget.canvasJson = this.canvasService.toJSON();
    saveTarget.thumbnailData = this.canvasService.toDataURL();

    const canvasMarkers = this.markerService.extractWorkMarkers(saveTarget.id || '');
    saveTarget.workMarkers = this.mergeMarkersWithCanvasPositions(
      this.editingPlan.workMarkers ?? [],
      canvasMarkers
    );

    try {
      await this.dataManagement.save(saveTarget);
      this.toastService.showSuccess(this.translate.instant('floor-plan.save.success'), this.translate.instant('floor-plan.save.header'));
      if (closeAfterSave) {
        modal.close();
      }
    } catch {
      this.toastService.showError(this.translate.instant('floor-plan.save.error'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  private mergeMarkersWithCanvasPositions(
    existingMarkers: IFloorPlanWorkMarker[],
    canvasMarkers: IFloorPlanWorkMarker[]
  ): IFloorPlanWorkMarker[] {
    const result: IFloorPlanWorkMarker[] = [];
    const existingById = new Map(existingMarkers.map((m) => [m.id, { ...m }]));

    for (const canvasMarker of canvasMarkers) {
      const existing = canvasMarker.id ? existingById.get(canvasMarker.id) : undefined;
      if (existing) {
        existing.x = canvasMarker.x;
        existing.y = canvasMarker.y;
        existing.width = canvasMarker.width;
        existing.height = canvasMarker.height;
        existing.color = canvasMarker.color;
        result.push(existing);
        existingById.delete(canvasMarker.id);
      } else {
        result.push(canvasMarker);
      }
    }

    for (const remaining of existingById.values()) {
      result.push(remaining);
    }

    return result;
  }

  private async deleteFloorPlan(id: string): Promise<void> {
    try {
      await this.dataManagement.delete(id);
    } catch {
      this.toastService.showError(this.translate.instant('floor-plan.delete.error'));
    }
  }

  private openEditorModal(): void {
    setTimeout(() => {
      this.ngbModal.open(this.editorModal, {
        size: 'xl',
        backdrop: 'static',
        keyboard: false,
        windowClass: 'floor-plan-fullscreen-modal',
      });

      setTimeout(async () => {
        if (this.editingPlan?.canvasJson) {
          await this.canvasService.loadFromJSON(this.editingPlan.canvasJson);
          this.connectorService.rebuildAfterLoad();
        }
        if (this.editingPlan?.workMarkers) {
          this.markerService.renderWorkMarkers(this.editingPlan.workMarkers);
        }
      }, 100);
    }, 0);
  }
}
