import { Injectable } from '@angular/core';
import { OwnTime } from '../core/schedule-class';
import { isOwnTimeStructOk, transformOwnTimeToNumber } from '../helpers/format-helper';

@Injectable({
  providedIn: 'root'
})
export class WorkTimeCalculationService {

  /**
   * Berechnet die Arbeitszeit basierend auf Start- und Endzeit
   * @param startShift Start-Zeit als OwnTime
   * @param endShift End-Zeit als OwnTime
   * @returns Arbeitszeit in Dezimalstunden (z.B. 8.0 für 8 Stunden)
   */
  calculateWorkTime(startShift: OwnTime | undefined, endShift: OwnTime | undefined): number {
    if (!startShift || !endShift || !isOwnTimeStructOk(startShift) || !isOwnTimeStructOk(endShift)) {
      return 0;
    }

    const startMinutes = startShift.toMinutes();
    const endMinutes = endShift.toMinutes();
    
    let workTimeMinutes: number;
    
    if (startMinutes === endMinutes) {
      workTimeMinutes = 24 * 60;
    } else if (endMinutes > startMinutes) {
      workTimeMinutes = endMinutes - startMinutes;
    } else {
      workTimeMinutes = (24 * 60) - startMinutes + endMinutes;
    }
    
    return workTimeMinutes / 60;
  }

  /**
   * Berechnet die Arbeitszeit und berücksichtigt auch manuell gesetzte workTime
   * @param startShift Start-Zeit als OwnTime
   * @param endShift End-Zeit als OwnTime
   * @param manualWorkTime Manuell gesetzte Arbeitszeit als OwnTime (optional)
   * @returns Arbeitszeit in Dezimalstunden
   */
  calculateWorkTimeWithFallback(
    startShift: OwnTime | undefined, 
    endShift: OwnTime | undefined, 
    manualWorkTime?: OwnTime
  ): number {
    if (startShift && endShift && isOwnTimeStructOk(startShift) && isOwnTimeStructOk(endShift)) {
      return this.calculateWorkTime(startShift, endShift);
    }
    
    if (manualWorkTime && isOwnTimeStructOk(manualWorkTime)) {
      return transformOwnTimeToNumber(manualWorkTime);
    }
    
    return 0;
  }

  /**
   * Validiert ob eine Zeitspanne gültig ist
   * @param startShift Start-Zeit
   * @param endShift End-Zeit
   * @returns true wenn die Zeitspanne gültig ist
   */
  isValidTimeSpan(startShift: OwnTime | undefined, endShift: OwnTime | undefined): boolean {
    if (!startShift || !endShift || !isOwnTimeStructOk(startShift) || !isOwnTimeStructOk(endShift)) {
      return false;
    }

    const startMinutes = startShift.toMinutes();
    const endMinutes = endShift.toMinutes();
    
    if (startMinutes === endMinutes) {
      return true;
    }
    
    return true;
  }

  /**
   * Formatiert die Arbeitszeit für die Anzeige
   * @param workTimeHours Arbeitszeit in Dezimalstunden
   * @returns Formatierte Zeitangabe (z.B. "8:30")
   */
  formatWorkTimeForDisplay(workTimeHours: number): string {
    const hours = Math.floor(workTimeHours);
    const minutes = Math.round((workTimeHours - hours) * 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}