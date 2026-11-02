// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Modal dialog for creating a new what-if scenario. The period and group
 * are taken implicitly from the open plan (its planning period, without the padded days) - the user
 * only supplies a name and optional description. For a selected group the user can also choose the active variants
 * (keys) of that group the scenario plans with; every user may choose, because a scenario never changes the real plan.
 * An expired key is shown with a hint but stays selectable, the backend accepts it. Without a selected group no key is
 * offered, and nothing is sent when no key is chosen.
 * @param scenarioName - Name of the new scenario
 * @param description - Optional description of the new scenario
 * @param groupId - Id of the group selected when the dialog was opened, undefined without a selected group
 * @param selectedVariantIds - Ids of the keys ticked by the user
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { readScenarioVariantRefusalKey } from 'src/app/domain/models/schedule/scenario-variant-refusal.model';
import { CalendarPeriodToStringShort } from 'src/app/domain/helpers/date.helper';
import { formatDateOnly } from 'src/app/domain/helpers/calendar-date.helper';

@Component({
  selector: 'app-create-scenario-dialog',
  templateUrl: './create-scenario-dialog.component.html',
  styleUrls: ['./create-scenario-dialog.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateScenarioDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('createScenarioModal');

  private ngbModal = inject(NgbModal);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private dataManagement = inject(DataManagementScheduleService);
  private groupSelection = inject(GroupSelectionService);
  private scenarioVariantService = inject(ScenarioVariantService);
  private translate = inject(TranslateService);
  private modalRef: NgbModalRef | null = null;

  scenarioName = signal('');
  description = signal('');
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  groupId = signal<string | undefined>(undefined);
  selectedVariantIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly variantsLoadFailed = this.scenarioVariantService.loadFailed;

  readonly variantChoices = computed(() => {
    if (!this.groupId()) return [];

    return this.scenarioVariantService.variants().filter((variant) => variant.status === AnalyseScenarioStatus.Active);
  });

  isValid = computed(() => this.scenarioName().trim().length > 0);

  open(): void {
    this.scenarioName.set('');
    this.description.set('');
    this.isSaving.set(false);
    this.errorMessage.set(null);
    this.selectedVariantIds.set(new Set<string>());

    const groupId = this.groupSelection.selectedGroup?.id;
    this.groupId.set(groupId);
    if (groupId) {
      this.scenarioVariantService.loadVariants(groupId);
    }

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onConfirm(): void {
    if (!this.isValid() || this.isSaving()) return;
    this.errorMessage.set(null);

    const start = this.dataManagement.periodStartDate;
    const end = this.dataManagement.periodEndDate;
    if (!start || !end) {
      this.errorMessage.set(this.translate.instant('scenario.error.noDateRange'));
      return;
    }

    const groupId = this.groupSelection.selectedGroup?.id;
    const fromDate = formatDateOnly(start);
    const untilDate = formatDateOnly(end);
    const variantIds = this.chosenVariantIds();

    this.isSaving.set(true);

    this.analyseScenarioService.createScenario({
      name: this.scenarioName().trim(),
      description: this.description().trim() || undefined,
      groupId,
      fromDate,
      untilDate,
      ...(variantIds.length > 0 ? { variantIds } : {}),
    }).subscribe({
      next: () => {
        this.modalRef?.close();
        this.isSaving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.describeCreateFailure(err, variantIds.length > 0));
        this.isSaving.set(false);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.close();
  }

  isChosen(variantId: string): boolean {
    return this.selectedVariantIds().has(variantId);
  }

  onToggleVariant(variantId: string): void {
    this.selectedVariantIds.update((current) => {
      const next = new Set(current);
      if (!next.delete(variantId)) {
        next.add(variantId);
      }
      return next;
    });
  }

  periodOf(variant: IScenarioVariant): string {
    return CalendarPeriodToStringShort(variant.fromDate, variant.untilDate, this.translate.currentLang);
  }

  /** A refusal can only be about a key when keys were chosen; every other failure keeps the general text. */
  private describeCreateFailure(err: HttpErrorResponse, choseKeys: boolean): string {
    const refusalKey = choseKeys ? readScenarioVariantRefusalKey(err) : null;
    if (refusalKey !== null) {
      return this.translate.instant(refusalKey);
    }

    return this.translate.instant('scenario.error.createFailed');
  }

  private chosenVariantIds(): string[] {
    const chosen = this.selectedVariantIds();
    return this.variantChoices()
      .map((variant) => variant.id)
      .filter((id) => chosen.has(id));
  }
}
