// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Structural edits of the selected floor plan objects: delete, copy/paste, flip, move/resize by delta,
 * group/ungroup, open/close/convert paths and stacking order.
 * @param canvasService - Owner of the Fabric.js canvas, the history and the active-layer assignment
 * @param toolService - Grid snapping applied to move and resize deltas
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { Circle, FabricObject, Group, Line, Path, Polygon, Rect } from 'fabric';
import { FloorPlanCanvasService } from './floor-plan-canvas.service';
import { FloorPlanToolService } from './floor-plan-tool.service';
import { shapeToNodes, nodesToSvgString } from './floor-plan-point-editor.service';
import { FabricWithData } from './fabric-with-data.type';

const PASTE_OFFSET = 20;
const MIN_GROUP_SIZE = 2;
const MIN_PATH_NODES = 2;
const CLOSE_PATH_COMMAND = 'Z';

@Injectable()
export class FloorPlanObjectEditService {
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly toolService = inject(FloorPlanToolService);

  private readonly _clipboard = signal<object | null>(null);
  readonly hasClipboard = computed(() => this._clipboard() !== null);

  deleteSelected(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    canvas.discardActiveObject();
    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  }

  copySelected(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    this._clipboard.set(obj.toObject(['data']));
  }

  async paste(): Promise<void> {
    const data = this._clipboard();
    if (!data || !this.canvasService.getCanvas()) return;
    const { util } = await import('fabric');
    const objects = await util.enlivenObjects<FabricObject>([data]);
    if (!objects.length) return;
    const obj = objects[0];
    obj.set({
      left: (obj.left ?? 0) + PASTE_OFFSET,
      top: (obj.top ?? 0) + PASTE_OFFSET,
    });
    obj.set('data', { ...(obj as FabricWithData).data, shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(obj);
    const canvas = this.canvasService.getCanvas()!;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  flipHorizontal(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set({ flipX: !obj.flipX });
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  flipVertical(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set({ flipY: !obj.flipY });
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  moveSelectedByDelta(dx: number, dy: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set({
      left: this.toolService.snap((obj.left ?? 0) + dx),
      top: this.toolService.snap((obj.top ?? 0) + dy),
    });
    obj.setCoords();
    this.canvasService.notifyPositionChanged();
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  resizeSelectedByDelta(dw: number, dh: number): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const rawWidth = (obj.width ?? 0) * (obj.scaleX ?? 1) + dw;
    const rawHeight = (obj.height ?? 0) * (obj.scaleY ?? 1) + dh;
    const newWidth = Math.max(1, this.toolService.snap(rawWidth));
    const newHeight = Math.max(1, this.toolService.snap(rawHeight));
    obj.set({
      scaleX: newWidth / (obj.width ?? 1),
      scaleY: newHeight / (obj.height ?? 1),
    });
    obj.setCoords();
    canvas.renderAll();
    this.canvasService.saveHistory();
  }

  groupSelected(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length < MIN_GROUP_SIZE) return;

    canvas.discardActiveObject();
    activeObjects.forEach((obj) => canvas.remove(obj));

    const group = new Group(activeObjects);
    group.set('data', { shapeId: crypto.randomUUID() });
    this.canvasService.assignToActiveLayer(group);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }

  ungroupSelected(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!(activeObject instanceof Group)) return;

    const group = activeObject as Group;
    canvas.discardActiveObject();

    const items = group.getObjects();
    canvas.remove(group);

    items.forEach((item) => {
      canvas.add(item);
    });

    canvas.renderAll();
  }

  closeSelectedPath(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!(obj instanceof Path)) return;
    const cmds = (obj as Path & { path: (string | number)[][] }).path;
    if (cmds.some((cmd: (string | number)[]) => cmd[0] as string === CLOSE_PATH_COMMAND)) return;
    cmds.push([CLOSE_PATH_COMMAND] as (string | number)[]);
    obj.setCoords();
    this.canvasService.saveHistory();
    canvas.renderAll();
  }

  openSelectedPath(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!(obj instanceof Path)) return;
    const typedObj = obj as Path & { path: (string | number)[][] };
    const cmds = typedObj.path;
    if (!cmds.some((cmd: (string | number)[]) => cmd[0] as string === CLOSE_PATH_COMMAND)) return;
    typedObj.path = cmds.filter((cmd: (string | number)[]) => cmd[0] as string !== CLOSE_PATH_COMMAND);
    obj.set({ fill: 'transparent', dirty: true });
    obj.setCoords();
    this.canvasService.saveHistory();
    canvas.renderAll();
  }

  convertSelectedToPath(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || obj instanceof Path) return;
    const isConvertible = obj instanceof Rect || obj instanceof Circle ||
                          obj instanceof Polygon || obj instanceof Line;
    if (!isConvertible) return;

    const { nodes, isClosed } = shapeToNodes(obj);
    if (nodes.length < MIN_PATH_NODES) return;

    const fill = obj.fill ?? 'transparent';
    const stroke = obj.stroke ?? '#000000';
    const strokeWidth = obj.strokeWidth ?? 2;
    const data = (obj as FabricWithData).data ?? {};

    canvas.remove(obj);

    const newPath = new Path(nodesToSvgString(nodes, isClosed), { fill, stroke, strokeWidth, objectCaching: false });
    newPath.set('data', { ...data, shapeId: data.shapeId ?? crypto.randomUUID() });
    canvas.add(newPath);
    canvas.setActiveObject(newPath);
    this.canvasService.saveHistory();
    canvas.renderAll();
  }

  bringToFront(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      canvas.bringObjectToFront(obj);
      canvas.renderAll();
    }
  }

  sendToBack(): void {
    const canvas = this.canvasService.getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      canvas.sendObjectToBack(obj);
      canvas.renderAll();
    }
  }
}
