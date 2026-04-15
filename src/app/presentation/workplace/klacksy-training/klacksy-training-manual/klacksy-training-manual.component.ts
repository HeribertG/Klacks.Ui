// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manual / explanation tab for the Klacksy training tool.
 * Loads localized HTML doc via ManualLoaderService.
 */
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

@Component({
  selector: 'app-klacksy-training-manual',
  standalone: true,
  templateUrl: './klacksy-training-manual.component.html',
  styleUrls: ['./klacksy-training-manual.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingManualComponent implements OnInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly manualLoader = inject(ManualLoaderService);
  private readonly destroy$ = new Subject<void>();

  protected readonly manualContent = signal<string>('');

  ngOnInit(): void {
    this.loadManual();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadManual());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || this.translate.defaultLang || 'de';
    this.manualLoader.loadManual('klacksy-training-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }
}
