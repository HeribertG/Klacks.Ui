// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FloorPlanLayerService, FloorPlanLayer } from '../services/floor-plan-layer.service';

@Component({
  selector: 'app-floor-plan-layer-panel',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './floor-plan-layer-panel.component.html',
  styleUrls: ['./floor-plan-layer-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanLayerPanelComponent {
  layerService = inject(FloorPlanLayerService);

  editingLayerId = signal<string | null>(null);
  editingName = signal<string>('');

  onSetActive(layer: FloorPlanLayer): void {
    this.layerService.setActiveLayer(layer.id);
  }

  onToggleVisibility(layer: FloorPlanLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.layerService.toggleVisibility(layer.id);
  }

  onToggleLock(layer: FloorPlanLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.layerService.toggleLock(layer.id);
  }

  onAddLayer(): void {
    this.layerService.addLayer('New Layer');
  }

  onRemoveLayer(layer: FloorPlanLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.layerService.removeLayer(layer.id);
  }

  onMoveUp(layer: FloorPlanLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.layerService.moveLayerUp(layer.id);
  }

  onMoveDown(layer: FloorPlanLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.layerService.moveLayerDown(layer.id);
  }

  startRename(layer: FloorPlanLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.editingLayerId.set(layer.id);
    this.editingName.set(layer.name);
  }

  commitRename(layerId: string): void {
    const name = this.editingName().trim();
    if (name) {
      this.layerService.renameLayer(layerId, name);
    }
    this.editingLayerId.set(null);
  }

  cancelRename(): void {
    this.editingLayerId.set(null);
  }

  isActive(layer: FloorPlanLayer): boolean {
    return this.layerService.activeLayerId() === layer.id;
  }
}
