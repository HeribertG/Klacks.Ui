import { Injectable } from '@angular/core';
import { IMacro } from '../../../models/settings/macro-class';

export interface IMacroRuleTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'workquant' | 'pause' | 'hours' | 'sequence';
}

@Injectable({
  providedIn: 'root'
})
export class MacroRuleTemplatesService {

  getTemplates(): IMacroRuleTemplate[] {
    return [
      this.getWorkQuantTemplate(),
      this.getMinPauseTemplate(),
      this.getOptimalPauseTemplate(),
      this.getMaxDailyHoursTemplate(),
      this.getMaxConsecutiveDaysTemplate(),
    ];
  }

  getTemplateById(id: string): IMacroRuleTemplate | undefined {
    return this.getTemplates().find(t => t.id === id);
  }

  getTemplatesByCategory(category: IMacroRuleTemplate['category']): IMacroRuleTemplate[] {
    return this.getTemplates().filter(t => t.category === category);
  }

  createMacroFromTemplate(template: IMacroRuleTemplate, type = 0): Partial<IMacro> {
    return {
      name: template.name,
      content: template.content,
      type: type,
      description: {
        de: template.description,
        en: template.description,
        fr: template.description,
        it: template.description
      },
      isDirty: 1
    };
  }

  private getWorkQuantTemplate(): IMacroRuleTemplate {
    return {
      id: 'template-workquant',
      name: 'Work-Quant Regel (5+2)',
      description: 'Nach 5 aufeinanderfolgenden Arbeitstagen müssen mindestens 2 Tage frei sein',
      category: 'workquant',
      content: `' Work-Quant Regel: 5 Arbeitstage + 2 freie Tage
' Nach 5 aufeinanderfolgenden Arbeitstagen müssen 2 Tage frei sein

IMPORT currentDate
IMPORT existingDates
IMPORT maxWorkDays
IMPORT minRestDays

DIM proposedDate
DIM dates
DIM consecutiveCount
DIM i
DIM checkDate
DIM hasWork

proposedDate = DateValue(currentDate)
dates = Split(existingDates, ";")
consecutiveCount = 1

FOR i = 1 TO maxWorkDays
  checkDate = DateAdd(proposedDate, -i, "d")
  hasWork = FALSE

  DIM j
  FOR j = 0 TO ArrayLength(dates) - 1
    IF DateDiff(checkDate, DateValue(dates[j]), "d") = 0 THEN
      hasWork = TRUE
      EXIT FOR
    ENDIF
  NEXT

  IF hasWork THEN
    consecutiveCount = consecutiveCount + 1
  ELSE
    EXIT FOR
  ENDIF
NEXT

IF consecutiveCount > maxWorkDays THEN
  OUTPUT 2, 0.8
  OUTPUT 1, "Work-Quant Verstoß: " & consecutiveCount & " aufeinanderfolgende Tage (max " & maxWorkDays & ")"
ELSE
  OUTPUT 1, "OK"
ENDIF`
    };
  }

  private getMinPauseTemplate(): IMacroRuleTemplate {
    return {
      id: 'template-minpause',
      name: 'Mindest-Pause (12h)',
      description: 'Zwischen zwei Arbeitseinsätzen müssen mindestens 12 Stunden Pause liegen',
      category: 'pause',
      content: `' Mindest-Pause Regel: 12 Stunden zwischen Arbeiten

IMPORT proposedStart
IMPORT proposedDate
IMPORT existingAssignments
IMPORT minPauseHours

DIM propStart
DIM assignments
DIM i
DIM assign
DIM timeGap

propStart = TimeToHours(proposedStart)
assignments = ParseJSON(existingAssignments)

FOR i = 0 TO ArrayLength(assignments) - 1
  assign = assignments[i]

  IF DateDiff(DateValue(proposedDate), DateValue(assign.date), "d") = 0 THEN
    IF propStart > TimeToHours(assign.endTime) THEN
      timeGap = propStart - TimeToHours(assign.endTime)

      IF timeGap < minPauseHours THEN
        OUTPUT 2, 0.9
        OUTPUT 1, "Mindest-Pause nicht eingehalten: " & timeGap & "h statt " & minPauseHours & "h"
        EXIT
      ENDIF
    ENDIF
  ENDIF

  IF DateDiff(DateValue(proposedDate), DateValue(assign.date), "d") = 1 THEN
    DIM hoursFromPrevEnd
    hoursFromPrevEnd = 24 - TimeToHours(assign.endTime)
    timeGap = hoursFromPrevEnd + propStart

    IF timeGap < minPauseHours AND timeGap > 0 THEN
      OUTPUT 2, 0.9
      OUTPUT 1, "Mindest-Pause (über Nacht) nicht eingehalten: " & timeGap & "h"
      EXIT
    ENDIF
  ENDIF
NEXT

OUTPUT 1, "OK"`
    };
  }

  private getOptimalPauseTemplate(): IMacroRuleTemplate {
    return {
      id: 'template-optimalpause',
      name: 'Optimale Pause (max 2h)',
      description: 'Zwischen zwei Arbeiten am selben Tag sollten maximal 2 Stunden Freizeit liegen',
      category: 'pause',
      content: `' Optimale-Pause Regel: Max 2h Freizeit zwischen Arbeiten

IMPORT proposedStart
IMPORT proposedDate
IMPORT existingAssignments
IMPORT maxOptimalGap

DIM propStart
DIM assignments
DIM i
DIM assign
DIM timeGap

propStart = TimeToHours(proposedStart)
assignments = ParseJSON(existingAssignments)
maxOptimalGap = 2

FOR i = 0 TO ArrayLength(assignments) - 1
  assign = assignments[i]

  IF DateDiff(DateValue(proposedDate), DateValue(assign.date), "d") = 0 THEN
    IF propStart > TimeToHours(assign.endTime) THEN
      timeGap = propStart - TimeToHours(assign.endTime)

      IF timeGap > maxOptimalGap AND timeGap < 12 THEN
        OUTPUT 2, 0.3
        OUTPUT 1, "Ungünstige Pause: " & timeGap & "h Freizeit (optimal: max 2h oder min 12h)"
        EXIT
      ENDIF
    ENDIF
  ENDIF
NEXT

OUTPUT 1, "OK"`
    };
  }

  private getMaxDailyHoursTemplate(): IMacroRuleTemplate {
    return {
      id: 'template-maxdailyhours',
      name: 'Max. Tagesstunden',
      description: 'Maximale Arbeitsstunden pro Tag nicht überschreiten',
      category: 'hours',
      content: `' Max-Tagesstunden Regel

IMPORT proposedDate
IMPORT proposedHours
IMPORT existingAssignments
IMPORT maxDailyHours

DIM propDate
DIM assignments
DIM totalHours
DIM i
DIM assign

totalHours = proposedHours
propDate = DateValue(proposedDate)
assignments = ParseJSON(existingAssignments)

FOR i = 0 TO ArrayLength(assignments) - 1
  assign = assignments[i]

  IF DateDiff(propDate, DateValue(assign.date), "d") = 0 THEN
    totalHours = totalHours + assign.hours
  ENDIF
NEXT

IF totalHours > maxDailyHours THEN
  OUTPUT 2, 0.7
  OUTPUT 1, "Maximale Tagesstunden überschritten: " & totalHours & "h (max " & maxDailyHours & "h)"
ELSE
  OUTPUT 1, "OK"
ENDIF`
    };
  }

  private getMaxConsecutiveDaysTemplate(): IMacroRuleTemplate {
    return {
      id: 'template-maxconsecutivedays',
      name: 'Max. aufeinanderfolgende Tage',
      description: 'Maximale Anzahl aufeinanderfolgender Arbeitstage begrenzen',
      category: 'sequence',
      content: `' Max-Aufeinanderfolgende-Tage Regel

IMPORT proposedDate
IMPORT existingDates
IMPORT maxConsecutiveDays

DIM proposed
DIM dates
DIM consecutiveCount
DIM i
DIM checkDate
DIM hasWork

proposed = DateValue(proposedDate)
dates = Split(existingDates, ";")
consecutiveCount = 1

FOR i = 1 TO maxConsecutiveDays + 1
  checkDate = DateAdd(proposed, -i, "d")
  hasWork = FALSE

  DIM j
  FOR j = 0 TO ArrayLength(dates) - 1
    IF DateDiff(checkDate, DateValue(dates[j]), "d") = 0 THEN
      hasWork = TRUE
      EXIT FOR
    ENDIF
  NEXT

  IF hasWork THEN
    consecutiveCount = consecutiveCount + 1
  ELSE
    EXIT FOR
  ENDIF
NEXT

IF consecutiveCount > maxConsecutiveDays THEN
  OUTPUT 2, 0.85
  OUTPUT 1, "Max. aufeinanderfolgende Tage überschritten: " & consecutiveCount & " Tage"
ELSE
  OUTPUT 1, "OK"
ENDIF`
    };
  }
}
