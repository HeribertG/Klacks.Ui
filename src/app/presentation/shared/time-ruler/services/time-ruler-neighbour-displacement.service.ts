// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Stateless calculation of how the neighbours of a dragged item or block are pushed aside on the time ruler.
 * @param timeRangeService - Supplies the pre/post shift minutes (travel, briefing, debriefing) of each item
 * @param originalPositions - Positions of all items when the drag started; pushing is always based on them
 */
import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { TimeRangeService } from './time-range.service';
import { ItemPosition } from './item-position.interface';

@Injectable({
  providedIn: 'root',
})
export class TimeRulerNeighbourDisplacementService {
  private timeRangeService = inject(TimeRangeService);

  public displaceAroundItem(
    draggedShift: IContainerTemplateItem | null,
    draggedStartMinutes: number,
    draggedEndMinutes: number,
    originalPositions: Map<IContainerTemplateItem, ItemPosition>,
    allItems: IContainerTemplateItem[]
  ): Map<IContainerTemplateItem, ItemPosition> {
    if (!draggedShift) return new Map();

    const draggedOrigPos = originalPositions.get(draggedShift);
    if (!draggedOrigPos) return new Map();

    const draggedPre = this.timeRangeService.getTotalPreShiftMinutes(draggedShift);
    const draggedPost = this.timeRangeService.getTotalPostShiftMinutes(draggedShift);

    const movableItems = allItems.filter(
      (item) => item !== draggedShift && this.isMovable(item)
    );

    return this.pushNeighbours(
      movableItems,
      originalPositions,
      draggedStartMinutes - draggedPre,
      draggedEndMinutes + draggedPost,
      draggedStartMinutes - draggedOrigPos.startMinutes
    );
  }

  public displaceAroundBlock(
    blockItems: Set<IContainerTemplateItem>,
    blockOriginalPositions: Map<IContainerTemplateItem, ItemPosition>,
    blockDelta: number,
    originalPositions: Map<IContainerTemplateItem, ItemPosition>,
    allItems: IContainerTemplateItem[]
  ): Map<IContainerTemplateItem, ItemPosition> {
    let blockEffStart = Infinity;
    let blockEffEnd = -Infinity;

    for (const item of blockItems) {
      const origPos = blockOriginalPositions.get(item);
      if (!origPos) continue;
      const newStart = origPos.startMinutes + blockDelta;
      const itemDuration = origPos.endMinutes - origPos.startMinutes;
      const newEnd = newStart + itemDuration;
      const pre = this.timeRangeService.getTotalPreShiftMinutes(item);
      const post = this.timeRangeService.getTotalPostShiftMinutes(item);
      blockEffStart = Math.min(blockEffStart, newStart - pre);
      blockEffEnd = Math.max(blockEffEnd, newEnd + post);
    }

    const movableItems = allItems.filter(
      (item) => !blockItems.has(item) && this.isMovable(item)
    );

    return this.pushNeighbours(movableItems, originalPositions, blockEffStart, blockEffEnd, blockDelta);
  }

  private isMovable(item: IContainerTemplateItem): boolean {
    return !!(item.shift?.isTimeRange || item.shift?.isSporadic || item.absenceId);
  }

  private pushNeighbours(
    movableItems: IContainerTemplateItem[],
    originalPositions: Map<IContainerTemplateItem, ItemPosition>,
    effectiveStart: number,
    effectiveEnd: number,
    movement: number
  ): Map<IContainerTemplateItem, ItemPosition> {
    if (movement > 0) {
      return this.pushDown(movableItems, originalPositions, effectiveStart, effectiveEnd);
    }
    if (movement < 0) {
      return this.pushUp(movableItems, originalPositions, effectiveStart, effectiveEnd);
    }
    return new Map();
  }

  private pushDown(
    movableItems: IContainerTemplateItem[],
    originalPositions: Map<IContainerTemplateItem, ItemPosition>,
    effectiveStart: number,
    effectiveEnd: number
  ): Map<IContainerTemplateItem, ItemPosition> {
    const displacements = new Map<IContainerTemplateItem, ItemPosition>();
    const candidates = movableItems
      .filter((item) => {
        const midpoint = this.effectiveMidpoint(item, originalPositions);
        return midpoint !== null && midpoint >= effectiveStart;
      })
      .sort((a, b) => originalPositions.get(a)!.startMinutes - originalPositions.get(b)!.startMinutes);

    let cursor = effectiveEnd;

    for (const item of candidates) {
      const orig = originalPositions.get(item)!;
      const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
      const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
      const itemEffStart = orig.startMinutes - itemPre;
      const itemDuration = orig.endMinutes - orig.startMinutes;

      if (cursor > itemEffStart) {
        const newStart = cursor + itemPre;
        const newEnd = newStart + itemDuration;
        displacements.set(item, { startMinutes: newStart, endMinutes: newEnd });
        cursor = newEnd + itemPost;
      } else {
        break;
      }
    }

    return displacements;
  }

  private pushUp(
    movableItems: IContainerTemplateItem[],
    originalPositions: Map<IContainerTemplateItem, ItemPosition>,
    effectiveStart: number,
    effectiveEnd: number
  ): Map<IContainerTemplateItem, ItemPosition> {
    const displacements = new Map<IContainerTemplateItem, ItemPosition>();
    const candidates = movableItems
      .filter((item) => {
        const midpoint = this.effectiveMidpoint(item, originalPositions);
        return midpoint !== null && midpoint <= effectiveEnd;
      })
      .sort((a, b) => originalPositions.get(b)!.startMinutes - originalPositions.get(a)!.startMinutes);

    let cursor = effectiveStart;

    for (const item of candidates) {
      const orig = originalPositions.get(item)!;
      const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
      const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
      const itemEffEnd = orig.endMinutes + itemPost;
      const itemDuration = orig.endMinutes - orig.startMinutes;

      if (cursor < itemEffEnd) {
        const newEnd = cursor - itemPost;
        const newStart = newEnd - itemDuration;
        displacements.set(item, { startMinutes: newStart, endMinutes: newEnd });
        cursor = newStart - itemPre;
      } else {
        break;
      }
    }

    return displacements;
  }

  private effectiveMidpoint(
    item: IContainerTemplateItem,
    originalPositions: Map<IContainerTemplateItem, ItemPosition>
  ): number | null {
    const orig = originalPositions.get(item);
    if (!orig) return null;
    const effStart = orig.startMinutes - this.timeRangeService.getTotalPreShiftMinutes(item);
    const effEnd = orig.endMinutes + this.timeRangeService.getTotalPostShiftMinutes(item);
    return (effStart + effEnd) / 2;
  }
}
