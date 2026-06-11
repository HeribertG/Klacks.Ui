// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';

export interface IBreakPlaceholderWithLayer extends IBreakPlaceholder {
  layer: number;
}

/**
 * Service for calculating overlap layers for breaks
 *
 * Usage:
 * - Add the service to the providers of the Gantt components
 * - Inject the service into your component/service
 * - Call calculateBreakLayers() to calculate layers
 * - Use the layer information for rendering
 */
@Injectable()
export class BreakLayerService {
  /**
   * Main function: calculates layers for all breaks of a row
   * @param breaks Array of breaks of a row
   * @returns Array of breaks with calculated layer values
   */
  public calculateBreakLayers(breaks: IBreakPlaceholder[]): IBreakPlaceholderWithLayer[] {
    if (!breaks || breaks.length === 0) {
      return [];
    }

    const validBreaks = this.filterValidBreaks(breaks);
    const sortedBreaks = this.sortBreaksByStartDate(validBreaks);

    const breaksWithLayers = sortedBreaks.map((breakItem) => ({
      ...breakItem,
      layer: this.calculateLayerForBreak(breakItem, sortedBreaks),
    }));

    return breaksWithLayers;
  }

  /**
   * Alternative layer calculation with optimized distribution
   * Tries to distribute breaks so that layer numbers are minimal
   * @param breaks Array of breaks
   * @returns Array of breaks with optimized layer values
   */
  public calculateOptimizedBreakLayers(breaks: IBreakPlaceholder[]): IBreakPlaceholderWithLayer[] {
    if (!breaks || breaks.length === 0) {
      return [];
    }

    const validBreaks = this.filterValidBreaks(breaks);

    const items = validBreaks
      .map((b) => ({
        ...b,
        fromTs: new Date(b.from!).getTime(),
        untilTs: new Date(b.until!).getTime(),
        layer: 0,
      }))
      .sort((a, b) => a.fromTs - b.fromTs);

    const layerEndTimes: number[] = [];
    for (const item of items) {
      let assignedLayer = layerEndTimes.findIndex((end) => end <= item.fromTs);
      if (assignedLayer === -1) {
        layerEndTimes.push(0);
        assignedLayer = layerEndTimes.length - 1;
      }
      layerEndTimes[assignedLayer] = item.untilTs;
      item.layer = assignedLayer;
    }

    return items;
  }

  /**
   * Calculates the maximum number of simultaneous overlaps
   * Useful for determining the required row height
   * @param breaks Array of breaks
   * @returns Maximum number of simultaneous overlaps
   */
  public getMaxSimultaneousOverlaps(breaks: IBreakPlaceholder[]): number {
    if (!breaks || breaks.length === 0) {
      return 0;
    }

    const validBreaks = this.filterValidBreaks(breaks);
    let maxOverlaps = 0;

    const events: { date: Date; type: 'start' | 'end'; break: IBreakPlaceholder }[] = [];

    validBreaks.forEach((breakItem) => {
      events.push({
        date: new Date(breakItem.from!),
        type: 'start',
        break: breakItem,
      });
      events.push({
        date: new Date(breakItem.until!),
        type: 'end',
        break: breakItem,
      });
    });

    events.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.type === 'end' ? -1 : 1;
    });

    let currentOverlaps = 0;
    for (const event of events) {
      if (event.type === 'start') {
        currentOverlaps++;
        maxOverlaps = Math.max(maxOverlaps, currentOverlaps);
      } else {
        currentOverlaps--;
      }
    }

    return maxOverlaps;
  }

  /**
   * Checks whether a break is overlapped by other breaks
   * @param targetBreak The break to check
   * @param allBreaks All breaks to compare against
   * @returns Number of overlapping breaks
   */
  public getOverlapCount(targetBreak: IBreakPlaceholder, allBreaks: IBreakPlaceholder[]): number {
    return this.calculateLayerForBreak(targetBreak, allBreaks);
  }

  /**
   * Calculates the recommended row height based on the layers
   * @param breaks Array of breaks
   * @param baseCellHeight Base cell height
   * @param layerHeight Height per layer
   * @returns Recommended total height
   */
  public calculateRecommendedRowHeight(
    breaks: IBreakPlaceholder[],
    baseCellHeight: number,
    layerHeight: number = baseCellHeight / 4
  ): number {
    const maxLayers = this.getMaxSimultaneousOverlaps(breaks);
    return baseCellHeight + maxLayers * layerHeight;
  }

  /**
   * Calculates the layer number for a single break
   */
  private calculateLayerForBreak(
    currentBreak: IBreakPlaceholder,
    allBreaks: IBreakPlaceholder[]
  ): number {
    let overlapCount = 0;

    for (const otherBreak of allBreaks) {
      if (this.isSameBreak(currentBreak, otherBreak)) {
        continue;
      }

      if (this.hasOverlap(currentBreak, otherBreak)) {
        overlapCount++;
      }
    }

    return overlapCount;
  }

  /**
   * Checks whether two breaks overlap in time
   */
  private hasOverlap(break1: IBreakPlaceholder, break2: IBreakPlaceholder): boolean {
    if (!break1.from || !break1.until || !break2.from || !break2.until) {
      return false;
    }

    const break1Start = new Date(break1.from).getTime();
    const break1End = new Date(break1.until).getTime();
    const break2Start = new Date(break2.from).getTime();
    const break2End = new Date(break2.until).getTime();

    return break1Start <= break2End && break1End >= break2Start;
  }

  /**
   * Checks whether two breaks are identical
   */
  private isSameBreak(break1: IBreakPlaceholder, break2: IBreakPlaceholder): boolean {
    if (break1.id && break2.id) {
      return break1.id === break2.id;
    }

    return (
      break1.clientId === break2.clientId &&
      break1.absenceId === break2.absenceId &&
      break1.from?.getTime() === break2.from?.getTime() &&
      break1.until?.getTime() === break2.until?.getTime()
    );
  }

  /**
   * Filters out invalid breaks
   */
  private filterValidBreaks(breaks: IBreakPlaceholder[]): IBreakPlaceholder[] {
    return breaks.filter(
      (breakItem) =>
        breakItem &&
        breakItem.from &&
        breakItem.until &&
        breakItem.from <= breakItem.until
    );
  }

  /**
   * Sorts breaks by start date
   */
  private sortBreaksByStartDate(breaks: IBreakPlaceholder[]): IBreakPlaceholder[] {
    return [...breaks].sort((a, b) => {
      if (!a.from || !b.from) return 0;
      return new Date(a.from).getTime() - new Date(b.from).getTime();
    });
  }
}
