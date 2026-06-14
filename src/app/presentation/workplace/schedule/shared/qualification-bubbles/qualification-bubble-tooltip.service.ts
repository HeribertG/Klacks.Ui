// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared tooltip text and hit-testing for qualification bubbles. Single source of truth
 * for finding the hovered bubble and building its localized label (emoji + name), used by
 * both the employee row header and the shift row header tooltip services.
 * @param translateService - Provides the current language for localized names
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { QualificationBubble } from './qualification-bubble.model';

const HIT_PADDING = 2;

@Injectable({
  providedIn: 'root',
})
export class QualificationBubbleTooltipService {
  private translateService = inject(TranslateService);

  findHoveredBubble(
    bubbles: QualificationBubble[],
    x: number,
    y: number,
    diameter: number,
  ): QualificationBubble | undefined {
    const hitRadius = diameter / 2 + HIT_PADDING;
    return bubbles.find((b) => Math.hypot(x - b.cx, y - b.cy) <= hitRadius);
  }

  buildTooltipText(
    hovered: QualificationBubble,
    qualifications: IScheduleQualification[],
    bubbles: QualificationBubble[],
  ): string {
    return hovered.overflowCount > 0
      ? this.buildOverflowTooltip(qualifications, bubbles)
      : this.buildQualificationLabel(hovered.qualification);
  }

  buildQualificationLabel(qualification: IScheduleQualification | null): string {
    if (!qualification) return '';
    const lang = this.translateService.currentLang ?? 'de';
    const name = getLocalizedValue(qualification.name, lang);
    const emoji = qualification.emoji ?? '';
    return emoji ? `${emoji} ${name}` : name;
  }

  buildOverflowTooltip(
    qualifications: IScheduleQualification[],
    bubbles: QualificationBubble[],
  ): string {
    const shownIds = new Set(
      bubbles
        .map((b) => b.qualification?.qualificationId)
        .filter((id): id is string => !!id),
    );
    const hidden = qualifications.filter(
      (q) => !!q.emoji && q.emoji.trim() !== '' && !shownIds.has(q.qualificationId),
    );
    return hidden.map((q) => this.buildQualificationLabel(q)).join('\n');
  }
}
