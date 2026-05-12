// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Timeline block renderer for Break entries (absences).
 * Renders a flat-filled rectangle using the absence-specific color and resolves
 * the localized absence abbreviation as block label.
 * @param entry - Schedule entry referencing an absence via entryId
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { ITimelineBlockRenderer } from './timeline-block-renderer.interface';

@Injectable()
export class BreakBlockRendererService implements ITimelineBlockRenderer {
  private absenceLookup = inject(AbsenceLookupService);
  private translateService = inject(TranslateService);
  private gridColors = inject(GridColorService);

  private readonly borderWidth = 1;
  private readonly borderDarken = 40;
  private readonly sealedDarken = 30;

  getColor(entry: IScheduleCell): string {
    const absenceColor = this.absenceLookup.getColorForEntryId(entry.entryId);
    const base = absenceColor ?? this.gridColors.backGroundColorHolyday;
    return this.isSealed(entry) ? DrawHelper.GetDarkColor(base, this.sealedDarken) : base;
  }

  private isSealed(entry: IScheduleCell): boolean {
    return entry.lockLevel > 0 || entry.isGroupRestricted;
  }

  getLabel(entry: IScheduleCell): string {
    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const abbr = this.absenceLookup.getAbbreviationForEntryId(entry.entryId, language);
    return abbr ?? entry.abbreviation ?? '';
  }

  drawShape(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string): void {
    DrawHelper.fillRectangle(ctx, color, rect);
    ctx.save();
    ctx.strokeStyle = DrawHelper.GetDarkColor(color, this.borderDarken);
    ctx.lineWidth = this.borderWidth;
    ctx.strokeRect(
      rect.left,
      rect.top,
      rect.right - rect.left,
      rect.bottom - rect.top,
    );
    ctx.restore();
  }
}
