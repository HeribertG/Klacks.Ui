import { Injectable } from '@angular/core';

/**
 * ScrollService – Verwalten der Scrollpositionen
 *
 * Dieser Service verwaltet die vertikale und horizontale Scrollposition innerhalb
 * eines definierten Bereichs (maxRows, maxCols). Er stellt Methoden zur Verfügung,
 * um die Positionen zu setzen und sicherzustellen, dass sie innerhalb der gültigen Grenzen bleiben.
 *
 * Eigenschaften:
 * - maxCols: Maximale Anzahl der Spalten (horizontale Begrenzung)
 * - maxRows: Maximale Anzahl der Zeilen (vertikale Begrenzung)
 * - Getter & Setter für Scrollpositionen, um Änderungen effizient zu verarbeiten
 *
 * Methoden:
 * - difference(oldValue: number, isHorizontal: boolean): Berechnet Differenzen bei Änderungen
 * - Getter & Setter für die Scroll-Positionen verhindern unkontrollierte Werte außerhalb des erlaubten Bereichs
 *
 * Nutzung:
 * - Wird in Komponenten oder anderen Services genutzt, um Scrollpositionen zu verwalten
 *
 */
@Injectable()
export class ScrollService {
  public maxCols = 0;
  public maxRows = 0;

  private _horizontalScrollDelta = 0;
  private _verticalScrollDelta = 0;
  private _verticalScrollPosition = 0;
  private _horizontalScrollPosition = 0;
  private _visibleCols = 0;
  private _visibleRows = 0;

  set verticalScrollPosition(value: number) {
    if (this._verticalScrollPosition === value) return;

    const oldValue = this._verticalScrollPosition;
    this._verticalScrollPosition = Math.max(0, Math.min(value, this.maxRows));

    this.difference(oldValue, false);
  }

  get verticalScrollPosition() {
    return this._verticalScrollPosition;
  }

  set horizontalScrollPosition(value: number) {
    if (this._horizontalScrollPosition === value) return;

    const oldValue = this._horizontalScrollPosition;
    this._horizontalScrollPosition = Math.max(0, Math.min(value, this.maxCols));

    this.difference(oldValue, true);
  }

  get horizontalScrollPosition() {
    return this._horizontalScrollPosition;
  }

  resetScrollPosition(): void {
    this._horizontalScrollPosition = 0;
    this._verticalScrollPosition = 0;
    this._horizontalScrollDelta = 0;
    this._verticalScrollDelta = 0;
  }

  private difference(oldValue: number, isHorizontal: boolean) {
    const newValue = isHorizontal
      ? this._horizontalScrollPosition
      : this._verticalScrollPosition;
    const delta = newValue - oldValue;

    if (isHorizontal) {
      this._horizontalScrollDelta = delta;
    } else {
      this._verticalScrollDelta = delta;
    }
  }

  get horizontalScrollDelta(): number {
    return this._horizontalScrollDelta;
  }
  get verticalScrollDelta(): number {
    return this._verticalScrollDelta;
  }

  get visibleCols(): number {
    return this._visibleCols;
  }

  set visibleCols(value: number) {
    this._visibleCols = value;
  }

  get visibleRows(): number {
    return this._visibleRows;
  }

  set visibleRows(value: number) {
    this._visibleRows = value;
  }
}
