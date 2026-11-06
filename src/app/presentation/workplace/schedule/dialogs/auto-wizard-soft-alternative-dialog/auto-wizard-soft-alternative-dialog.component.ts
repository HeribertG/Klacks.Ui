// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Modal dialog that shows both results of an AutoWizard run whose soft-keyword retry filled more shifts: the strict
 * plan (all restricting wishes kept, opened by default) and the soft alternative with how many more shifts it fills
 * and which wishes it breaks for that. The planner keeps the strict plan or opens the alternative; accepting either
 * then goes through the scenario banner like any scenario. Opens by itself when AutoWizardSoftAlternativeService
 * publishes an offer. The open modal renders its own copy of the offer, so closing it neither empties the body during
 * the fade-out nor drops an offer published meanwhile; that one is shown once the modal is gone.
 * @param shownOffer - The offer the open modal shows, null while no modal is open
 * @param brokenWishRows - The wishes only the alternative breaks, as rows for the wish report
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
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
import { AutoWizardSoftAlternativeOffer } from '../../services/auto-wizard-soft-alternative-offer.interface';
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

  private readonly _shownOffer = signal<AutoWizardSoftAlternativeOffer | null>(null);
  readonly shownOffer = this._shownOffer.asReadonly();

  readonly brokenWishRows = computed<KeywordWishRow[]>(() => this.shownOffer()?.alternative.brokenWishes ?? []);

  readonly strictBrokenCount = computed(() =>
    brokenKeywordWishCount(this.shownOffer()?.strictSummary?.keywordWishes),
  );

  readonly alternativeBrokenCount = computed(() =>
    brokenKeywordWishCount(this.shownOffer()?.alternative.summary.keywordWishes),
  );

  readonly additionalSlotsKey = computed(() =>
    scenarioVariantCountKey(
      AUTO_WIZARD_SOFT_ADDITIONAL_SLOTS_KEYS,
      this.shownOffer()?.alternative.additionalFilledSlots ?? 0,
    ),
  );

  constructor() {
    effect(() => {
      const offer = this.softAlternative.offer();
      if (offer && !this.modalRef) {
        untracked(() => this.openModal(offer));
      }
    });
  }

  onKeepStrict(): void {
    const offer = this.shownOffer();
    if (offer) {
      this.softAlternative.dismiss(offer);
    }
    this.modalRef?.close();
  }

  onOpenAlternative(): void {
    const offer = this.shownOffer();
    if (offer) {
      void this.softAlternative.openAlternative(offer);
    }
    this.modalRef?.close();
  }

  private openModal(offer: AutoWizardSoftAlternativeOffer): void {
    this._shownOffer.set(offer);
    const modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
    this.modalRef = modalRef;
    modalRef.hidden.subscribe(() => this.onHidden(offer));
  }

  private onHidden(offer: AutoWizardSoftAlternativeOffer): void {
    this.softAlternative.dismiss(offer);
    this.modalRef = null;
    this._shownOffer.set(null);
    const next = this.softAlternative.offer();
    if (next) {
      this.openModal(next);
    }
  }
}
