// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, Signal } from '@angular/core';
import { FabricObject } from 'fabric';

export interface FloorPlanLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: FabricObject[];
}

const DEFAULT_LAYERS: Omit<FloorPlanLayer, 'objects'>[] = [
  { id: 'background', name: 'Background', visible: true, locked: false },
  { id: 'building', name: 'Building', visible: true, locked: false },
  { id: 'markers', name: 'Markers', visible: true, locked: false },
];

@Injectable()
export class FloorPlanLayerService {
  private readonly _layers = signal<FloorPlanLayer[]>([]);
  private readonly _activeLayerId = signal<string>('');

  readonly layers: Signal<FloorPlanLayer[]> = this._layers.asReadonly();
  readonly activeLayerId: Signal<string> = this._activeLayerId.asReadonly();

  initDefaultLayers(): void {
    const layers: FloorPlanLayer[] = DEFAULT_LAYERS.map((l) => ({ ...l, objects: [] }));
    this._layers.set(layers);
    this._activeLayerId.set(layers[1].id);
  }

  addLayer(name: string): void {
    const id = `layer-${Date.now()}`;
    const newLayer: FloorPlanLayer = { id, name, visible: true, locked: false, objects: [] };
    this._layers.update((layers) => [...layers, newLayer]);
    this._activeLayerId.set(id);
  }

  removeLayer(id: string): void {
    const current = this._layers();
    if (current.length <= 1) return;
    this._layers.update((layers) => layers.filter((l) => l.id !== id));
    if (this._activeLayerId() === id) {
      const remaining = this._layers();
      this._activeLayerId.set(remaining[remaining.length - 1]?.id ?? '');
    }
  }

  setActiveLayer(id: string): void {
    this._activeLayerId.set(id);
  }

  toggleVisibility(id: string): void {
    this._layers.update((layers) =>
      layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }

  toggleLock(id: string): void {
    this._layers.update((layers) =>
      layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  }

  renameLayer(id: string, name: string): void {
    this._layers.update((layers) =>
      layers.map((l) => (l.id === id ? { ...l, name } : l))
    );
  }

  moveLayerUp(id: string): void {
    this._layers.update((layers) => {
      const index = layers.findIndex((l) => l.id === id);
      if (index <= 0) return layers;
      const updated = [...layers];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  }

  moveLayerDown(id: string): void {
    this._layers.update((layers) => {
      const index = layers.findIndex((l) => l.id === id);
      if (index < 0 || index >= layers.length - 1) return layers;
      const updated = [...layers];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  }
}
