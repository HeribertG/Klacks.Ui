// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Modal dialog that shows how completely a what-if scenario covers the demanded shift slots: the total, the coverage
 * per shift and why slots stayed open. The summary is loaded live from the backend each time the dialog opens.
 * @param scenario - The scenario to summarise, passed via open()
 * @param summary - The loaded summary, null until it arrived or when it is unavailable
 * @param loadState - Whether the summary is loading, loaded, unknown to the backend (404) or failed to load
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { scenarioOpenSlotReasonKey } from 'src/app/domain/helpers/scenario-summary-reason.helper';
import { CalendarDateToStringShort } from 'src/app/shared/helpers/date.helper';

export const SCENARIO_SUMMARY_LOAD_STATE = {
  Loading: 'loading',
  Loaded: 'loaded',
  NotFound: 'notFound',
  Failed: 'failed',
} as const;

export type ScenarioSummaryLoadState =
  (typeof SCENARIO_SUMMARY_LOAD_STATE)[keyof typeof SCENARIO_SUMMARY_LOAD_STATE];

const SHIFT_NAME_SEPARATOR = ', ';
const PERIOD_SEPARATOR = ' – ';

@Component({
  selector: 'app-scenario-summary-dialog',
  templateUrl: './scenario-summary-dialog.component.html',
  styleUrls: ['./scenario-summary-dialog.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSummaryDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('scenarioSummaryModal');

  private ngbModal = inject(NgbModal);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private translate = inject(TranslateService);
  private modalRef: NgbModalRef | null = null;
  private request: Subscription | null = null;

  readonly loadState = signal<ScenarioSummaryLoadState>(SCENARIO_SUMMARY_LOAD_STATE.Loading);
  readonly summary = signal<ScenarioSummary | null>(null);
  readonly scenarioName = signal('');
  readonly states = SCENARIO_SUMMARY_LOAD_STATE;

  readonly periodText = computed(() => {
    const summary = this.summary();
    if (!summary) return '';
    const locale = this.translate.currentLang;
    return [summary.fromDate, summary.untilDate]
      .map((value) => CalendarDateToStringShort(value, locale))
      .join(PERIOD_SEPARATOR);
  });

  open(scenario: IAnalyseScenario): void {
    this.request?.unsubscribe();
    this.scenarioName.set(scenario.name);
    this.summary.set(null);
    this.loadState.set(SCENARIO_SUMMARY_LOAD_STATE.Loading);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    this.modalRef.hidden.subscribe(() => this.request?.unsubscribe());

    this.request = this.analyseScenarioService.loadSummary(scenario.id).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loadState.set(SCENARIO_SUMMARY_LOAD_STATE.Loaded);
      },
      error: (err: unknown) => {
        const notFound = err instanceof HttpErrorResponse && err.status === HttpStatusCode.NotFound;
        this.loadState.set(
          notFound ? SCENARIO_SUMMARY_LOAD_STATE.NotFound : SCENARIO_SUMMARY_LOAD_STATE.Failed,
        );
      },
    });
  }

  reasonKey(reasonCode: string): string {
    return scenarioOpenSlotReasonKey(reasonCode);
  }

  shiftNames(names: string[]): string {
    return names.join(SHIFT_NAME_SEPARATOR);
  }

  onClose(): void {
    this.modalRef?.close();
  }
}
