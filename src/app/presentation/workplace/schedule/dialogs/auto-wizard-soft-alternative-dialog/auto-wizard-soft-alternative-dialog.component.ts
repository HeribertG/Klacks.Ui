// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Modal dialog that shows both results of an AutoWizard run whose soft-keyword retry filled more shifts: the strict
 * plan (all restricting wishes kept, opened by default) and the soft alternative with how many more shifts it fills
 * and which wishes it breaks for that. The planner keeps the strict plan or opens the alternative; accepting either
 * then goes through the scenario banner like any scenario. Opens by itself when AutoWizardSoftAlternativeService
 * publishes an offer.
 * @param offer - The pending offer, null when there is none
 * @param brokenWishRows - The wishes only the alternative breaks, as rows for the wish report
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AUTO_WIZARD_SOFT_ADDITIONAL_SLOTS_KEYS } from 'src/app/domain/constants/keyword-wish.constants';
import { brokenKeywordWishCount } from 'src/app/domain/helpers/keyword-wish.helper';
import { scenarioVariantCountKey } from 'src/app/domain/helpers/scenario-variant-count-key.helper';
import { KeywordWishRow } from 'src/app/domain/models/schedule/keyword-wish-row.interface';
import { AutoWizardSoftAlternativeService } from '../../services/auto-wizard-soft-alternative.service';
import { KeywordWishReportComponent } from '../../shared/keyword-wish-report/keyword-wish-report.component';

@Component({
  selector: 'app-auto-wizard-soft-alternative-dialog',
  templateUrl: './auto-wizard-soft-alternative-dialog.component.html',
  styleUrls: ['./auto-wizard-soft-alternative-dialog.component.scss'],
  standalone: true,
  imports: [TranslateModule, KeywordWishReportComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoWizardSoftAlternativeDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('softAlternativeModal');

  private readonly ngbModal = inject(NgbModal);
  private readonly softAlternative = inject(AutoWizardSoftAlternativeService);
  private modalRef: NgbModalRef | null = null;

  readonly offer = this.softAlternative.offer;

  readonly brokenWishRows = computed<KeywordWishRow[]>(() => this.offer()?.alternative.brokenWishes ?? []);

  readonly strictBrokenCount = computed(() => brokenKeywordWishCount(this.offer()?.strictSummary?.keywordWishes));

  readonly alternativeBrokenCount = computed(() =>
    brokenKeywordWishCount(this.offer()?.alternative.summary.keywordWishes),
  );

  readonly additionalSlotsKey = computed(() =>
    scenarioVariantCountKey(AUTO_WIZARD_SOFT_ADDITIONAL_SLOTS_KEYS, this.offer()?.alternative.additionalFilledSlots ?? 0),
  );

  constructor() {
    effect(() => {
      if (this.offer() && !this.modalRef) {
        untracked(() => this.openModal());
      }
    });
  }

  onKeepStrict(): void {
    this.softAlternative.dismiss();
    this.modalRef?.close();
  }

  onOpenAlternative(): void {
    void this.softAlternative.openAlternative();
    this.modalRef?.close();
  }

  private openModal(): void {
    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    this.modalRef.hidden.subscribe(() => {
      this.modalRef = null;
      this.softAlternative.dismiss();
    });
  }
}
