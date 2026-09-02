// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * W6.1: read-only settings card "Skill-Wirksamkeit" — eval trend, recipe funnel, failure classes,
 * top/flop skills and toolset provenance for a chosen reporting window. Read-only, so unlike the
 * neighbouring settings cards it has nothing to save; changing the window reloads the scorecard.
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { DataManagementSkillEffectivenessService } from 'src/app/domain/services/assistant/data-management-skill-effectiveness.service';
import {
  ISkillEffectivenessResource,
} from 'src/app/domain/interfaces/skill-effectiveness.interface';
import {
  SKILL_EFFECTIVENESS_DAY_OPTIONS,
  SKILL_EFFECTIVENESS_DEFAULT_DAYS,
} from 'src/app/domain/constants/skill-effectiveness.constants';

const PERCENT_FACTOR = 100;
const PERCENT_DIGITS = 1;
const SCORE_DIGITS = 4;
const EMPTY_VALUE = '-';

@Component({
  selector: 'app-skill-effectiveness',
  templateUrl: './skill-effectiveness.component.html',
  styleUrls: ['./skill-effectiveness.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillEffectivenessComponent implements OnInit, OnDestroy {
  private effectivenessService = inject(DataManagementSkillEffectivenessService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  readonly dayOptions = SKILL_EFFECTIVENESS_DAY_OPTIONS;
  readonly selectedDays = signal<number>(SKILL_EFFECTIVENESS_DEFAULT_DAYS);
  readonly data = signal<ISkillEffectivenessResource | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Switches the reporting window and reloads. A repeated click on the active window is ignored, so
   * the card does not fire a second identical request.
   * @param days - Window length in days, one of the offered options
   */
  selectDays(days: number): void {
    if (this.selectedDays() === days) return;

    this.selectedDays.set(days);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.effectivenessService
      .getSkillEffectiveness(this.selectedDays())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resource) => {
          this.data.set(resource);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  percent(value: number): string {
    return `${(value * PERCENT_FACTOR).toFixed(PERCENT_DIGITS)} %`;
  }

  score(value: number): string {
    return value.toFixed(SCORE_DIGITS);
  }

  date(value: string | null): string {
    if (!value) {
      return EMPTY_VALUE;
    }
    return new Date(value).toLocaleString();
  }

  model(value: string | null): string {
    return value ?? EMPTY_VALUE;
  }
}
