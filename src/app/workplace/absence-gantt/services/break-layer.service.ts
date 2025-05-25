import { Injectable } from '@angular/core';
import { IBreak } from 'src/app/core/break-class';

export interface IBreakWithLayer extends IBreak {
  layer: number;
}

/**
 * Service für die Berechnung von Überdeckungsebenen (Layern) für Breaks
 *
 * Verwendung:
 * - Füge den Service zu den providers der Gantt-Components hinzu
 * - Injiziere den Service in deine Component/Service
 * - Rufe calculateBreakLayers() auf um Layer zu berechnen
 * - Verwende die Layer-Information für das Rendering
 */
@Injectable()
export class BreakLayerService {
  /**
   * Hauptfunktion: Berechnet Layer für alle Breaks einer Row
   * @param breaks Array von Breaks einer Row
   * @returns Array von Breaks mit berechneten Layer-Werten
   */
  public calculateBreakLayers(breaks: IBreak[]): IBreakWithLayer[] {
    if (!breaks || breaks.length === 0) {
      return [];
    }

    // Filtere gültige Breaks und sortiere nach Startdatum
    const validBreaks = this.filterValidBreaks(breaks);
    const sortedBreaks = this.sortBreaksByStartDate(validBreaks);

    // Berechne Layer für jeden Break
    const breaksWithLayers = sortedBreaks.map((breakItem) => ({
      ...breakItem,
      layer: this.calculateLayerForBreak(breakItem, sortedBreaks),
    }));

    return breaksWithLayers;
  }

  /**
   * Alternative Layer-Berechnung mit optimierter Verteilung
   * Versucht Breaks so zu verteilen, dass die Layer-Nummern minimal sind
   * @param breaks Array von Breaks
   * @returns Array von Breaks mit optimierten Layer-Werten
   */
  public calculateOptimizedBreakLayers(breaks: IBreak[]): IBreakWithLayer[] {
    if (!breaks || breaks.length === 0) {
      return [];
    }

    const validBreaks = this.filterValidBreaks(breaks);
    const sortedBreaks = this.sortBreaksByStartDate(validBreaks);
    const breaksWithLayers: IBreakWithLayer[] = [];

    for (const currentBreak of sortedBreaks) {
      let layer = 0;
      let layerAssigned = false;

      // Finde den niedrigsten verfügbaren Layer
      while (!layerAssigned) {
        const conflictingBreaks = breaksWithLayers.filter(
          (b) => b.layer === layer && this.hasOverlap(currentBreak, b)
        );

        if (conflictingBreaks.length === 0) {
          // Layer ist verfügbar
          breaksWithLayers.push({
            ...currentBreak,
            layer: layer,
          });
          layerAssigned = true;
        } else {
          // Layer ist belegt, probiere nächsten
          layer++;
        }
      }
    }

    return breaksWithLayers;
  }

  /**
   * Berechnet die maximale Anzahl gleichzeitiger Overlaps
   * Nützlich für die Bestimmung der benötigten Zeilenhöhe
   * @param breaks Array von Breaks
   * @returns Maximale Anzahl gleichzeitiger Overlaps
   */
  public getMaxSimultaneousOverlaps(breaks: IBreak[]): number {
    if (!breaks || breaks.length === 0) {
      return 0;
    }

    const validBreaks = this.filterValidBreaks(breaks);
    let maxOverlaps = 0;

    // Erstelle Events für Start und Ende jedes Breaks
    const events: { date: Date; type: 'start' | 'end'; break: IBreak }[] = [];

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

    // Sortiere Events nach Datum (Ende-Events vor Start-Events bei gleichem Datum)
    events.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.type === 'end' ? -1 : 1;
    });

    // Durchlaufe Events und zähle aktive Breaks
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
   * Prüft ob ein Break von anderen Breaks überdeckt wird
   * @param targetBreak Der zu prüfende Break
   * @param allBreaks Alle Breaks zum Vergleich
   * @returns Anzahl der überdeckenden Breaks
   */
  public getOverlapCount(targetBreak: IBreak, allBreaks: IBreak[]): number {
    return this.calculateLayerForBreak(targetBreak, allBreaks);
  }

  /**
   * Berechnet die empfohlene Zeilenhöhe basierend auf den Layern
   * @param breaks Array von Breaks
   * @param baseCellHeight Basis-Zellenhöhe
   * @param layerHeight Höhe pro Layer
   * @returns Empfohlene Gesamthöhe
   */
  public calculateRecommendedRowHeight(
    breaks: IBreak[],
    baseCellHeight: number,
    layerHeight: number = baseCellHeight / 4
  ): number {
    const maxLayers = this.getMaxSimultaneousOverlaps(breaks);
    return baseCellHeight + maxLayers * layerHeight;
  }

  // Private Helper Methods

  /**
   * Berechnet die Layer-Nummer für einen einzelnen Break
   */
  private calculateLayerForBreak(
    currentBreak: IBreak,
    allBreaks: IBreak[]
  ): number {
    let overlapCount = 0;

    for (const otherBreak of allBreaks) {
      // Überspringe den Break selbst
      if (this.isSameBreak(currentBreak, otherBreak)) {
        continue;
      }

      // Prüfe auf zeitliche Überschneidung
      if (this.hasOverlap(currentBreak, otherBreak)) {
        overlapCount++;
      }
    }

    return overlapCount;
  }

  /**
   * Prüft, ob zwei Breaks zeitlich überschneiden
   */
  private hasOverlap(break1: IBreak, break2: IBreak): boolean {
    if (!break1.from || !break1.until || !break2.from || !break2.until) {
      return false;
    }

    const break1Start = new Date(break1.from).getTime();
    const break1End = new Date(break1.until).getTime();
    const break2Start = new Date(break2.from).getTime();
    const break2End = new Date(break2.until).getTime();

    // Überschneidung liegt vor wenn:
    // Break1 startet vor Break2 endet UND Break1 endet nach Break2 startet
    return break1Start <= break2End && break1End >= break2Start;
  }

  /**
   * Prüft ob zwei Breaks identisch sind
   */
  private isSameBreak(break1: IBreak, break2: IBreak): boolean {
    // Wenn beide IDs haben, vergleiche IDs
    if (break1.id && break2.id) {
      return break1.id === break2.id;
    }

    // Fallback: Vergleiche alle relevanten Eigenschaften
    return (
      break1.clientId === break2.clientId &&
      break1.absenceId === break2.absenceId &&
      break1.from?.getTime() === break2.from?.getTime() &&
      break1.until?.getTime() === break2.until?.getTime()
    );
  }

  /**
   * Filtert ungültige Breaks heraus
   */
  private filterValidBreaks(breaks: IBreak[]): IBreak[] {
    return breaks.filter(
      (breakItem) =>
        breakItem &&
        breakItem.from &&
        breakItem.until &&
        breakItem.from <= breakItem.until
    );
  }

  /**
   * Sortiert Breaks nach Startdatum
   */
  private sortBreaksByStartDate(breaks: IBreak[]): IBreak[] {
    return [...breaks].sort((a, b) => {
      if (!a.from || !b.from) return 0;
      return new Date(a.from).getTime() - new Date(b.from).getTime();
    });
  }
}
