// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * W6.1: read-only settings card "Skill-Wirksamkeit" — eval trend, recipe funnel, failure classes,
 * top/flop skills and toolset provenance in one scorecard. Labels are kept inline (German) for the
 * first cut; i18n keys follow once the page shape stabilises.
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { DataManagementSkillEffectivenessService } from 'src/app/domain/services/assistant/data-management-skill-effectiveness.service';
import {
  ISkillEffectivenessResource,
} from 'src/app/domain/interfaces/skill-effectiveness.interface';

@Component({
  selector: 'app-skill-effectiveness',
  templateUrl: './skill-effectiveness.component.html',
  styleUrls: ['./skill-effectiveness.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillEffectivenessComponent implements OnInit, OnDestroy {
  private effectivenessService = inject(DataManagementSkillEffectivenessService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

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

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.effectivenessService
      .getSkillEffectiveness()
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
    return `${(value * 100).toFixed(1)} %`;
  }

  date(value: string | null): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleString();
  }
}
