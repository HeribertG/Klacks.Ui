// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Stateless magnetic snapping of a dragged time-ruler item onto the effective edges of its neighbours.
 * @param timeRangeService - Supplies the pre/post shift minutes (travel, briefing, debriefing) of each item
 * @param originalPositions - Positions of all items when the drag started; snapping targets them
 * @param pixelsPerMinute - Current canvas scale, converts the pixel snap threshold into minutes
 */
import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { TimeRangeService } from './time-range.service';
import { ItemPosition } from './item-position.interface';

@Injectable({
  providedIn: 'root',
})
export class TimeRulerEdgeSnapService {
  private timeRangeService = inject(TimeRangeService);

  private readonly SNAP_THRESHOLD_PIXELS = 5;

  public snapToNeighbourEdge(
    draggedShift: IContainerTemplateItem | null,
    startMinutes: number,
    endMinutes: number,
    allShifts: IContainerTemplateItem[],
    originalPositions: Map<IContainerTemplateItem, ItemPosition>,
    pixelsPerMinute: number
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    if (!draggedShift) return null;

    const snapThresholdMinutes = this.SNAP_THRESHOLD_PIXELS / pixelsPerMinute;
    const preShiftTime = this.timeRangeService.getTotalPreShiftMinutes(draggedShift);
    const postShiftTime = this.timeRangeService.getTotalPostShiftMinutes(draggedShift);
    const duration = endMinutes - startMinutes;

    const effectiveStart = startMinutes - preShiftTime;
    const effectiveEnd = endMinutes + postShiftTime;

    const otherItems = allShifts.filter(
      (item) => item !== draggedShift && (item.shift?.isTimeRange || !!item.absenceId)
    );

    let closestSnap: {
      newStartMinutes: number;
      newEndMinutes: number;
      distance: number;
    } | null = null;

    for (const other of otherItems) {
      const origPos = originalPositions.get(other);
      if (!origPos) continue;

      const otherPre = this.timeRangeService.getTotalPreShiftMinutes(other);
      const otherPost = this.timeRangeService.getTotalPostShiftMinutes(other);
      const otherEffectiveStart = origPos.startMinutes - otherPre;
      const otherEffectiveEnd = origPos.endMinutes + otherPost;

      const distanceToTop = effectiveEnd - otherEffectiveStart;
      if (
        distanceToTop > 0 &&
        distanceToTop <= snapThresholdMinutes &&
        effectiveStart < otherEffectiveStart
      ) {
        const newEffectiveEnd = otherEffectiveStart;
        const newEnd = newEffectiveEnd - postShiftTime;
        const newStart = newEnd - duration;

        if (!closestSnap || Math.abs(distanceToTop) < Math.abs(closestSnap.distance)) {
          closestSnap = { newStartMinutes: newStart, newEndMinutes: newEnd, distance: distanceToTop };
        }
      }

      const distanceToBottom = otherEffectiveEnd - effectiveStart;
      if (
        distanceToBottom > 0 &&
        distanceToBottom <= snapThresholdMinutes &&
        effectiveEnd > otherEffectiveEnd
      ) {
        const newEffectiveStart = otherEffectiveEnd;
        const newStart = newEffectiveStart + preShiftTime;
        const newEnd = newStart + duration;

        if (!closestSnap || Math.abs(distanceToBottom) < Math.abs(closestSnap.distance)) {
          closestSnap = { newStartMinutes: newStart, newEndMinutes: newEnd, distance: distanceToBottom };
        }
      }
    }

    if (closestSnap) {
      return {
        newStartMinutes: closestSnap.newStartMinutes,
        newEndMinutes: closestSnap.newEndMinutes,
      };
    }

    return null;
  }
}
