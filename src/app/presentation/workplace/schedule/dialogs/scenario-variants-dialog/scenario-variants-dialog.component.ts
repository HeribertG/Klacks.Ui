// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Modal dialog that manages the variants (keys) of the selected group: a key is a named container of not yet binding
 * shifts for one group and period, which scenarios can choose later. Everyone sees the list (name, period, number of
 * shifts, status and an "expired" badge); only a user with the right to edit shifts can create, change and delete
 * keys, edit their shifts and copy real shifts into them. "Edit shifts" ends scenario mode, starts variant mode for
 * the key and shows its shifts inside the dialog; opening one navigates to the existing shift screens, and variant
 * mode stays on while they are open. The group is the one selected in the group selection.
 * @param view - Which part of the dialog is shown: key list, key form, shifts of one key or the copy panel
 * @param selectedId - Id of the key the shifts panel or the copy panel works on
 * @param editingId - Id of the key being changed in the form, null while a new key is created
 * @param formName - Name field of the key form
 * @param description - Optional description field of the key form
 * @param fromDate - First day of the key's period as yyyy-MM-dd
 * @param untilDate - Last day of the key's period as yyyy-MM-dd
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { SCENARIO_VARIANT_DEFAULT_PERIOD_DAYS } from 'src/app/domain/constants/scenario-variant.constants';
import { calendarDateKey, companyToday, formatDateOnly } from 'src/app/domain/helpers/calendar-date.helper';
import { addDays, CalendarPeriodToStringShort } from 'src/app/domain/helpers/date.helper';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { showScenarioVariantRefusal } from './show-scenario-variant-refusal';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { VariantCopyPanelComponent } from './variant-copy-panel/variant-copy-panel.component';
import { VariantShiftsPanelComponent } from './variant-shifts-panel/variant-shifts-panel.component';

export const VARIANTS_DIALOG_VIEW = {
  List: 'list',
  Form: 'form',
  Shifts: 'shifts',
  Copy: 'copy',
} as const;

export type VariantsDialogView = (typeof VARIANTS_DIALOG_VIEW)[keyof typeof VARIANTS_DIALOG_VIEW];

const STATUS_KEYS: Readonly<Record<AnalyseScenarioStatus, string>> = {
  [AnalyseScenarioStatus.Active]: 'scenarioVariant.status.active',
  [AnalyseScenarioStatus.Accepted]: 'scenarioVariant.status.accepted',
  [AnalyseScenarioStatus.Rejected]: 'scenarioVariant.status.closed',
};

@Component({
  selector: 'app-scenario-variants-dialog',
  templateUrl: './scenario-variants-dialog.component.html',
  styleUrls: ['./scenario-variants-dialog.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, VariantShiftsPanelComponent, VariantCopyPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioVariantsDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('scenarioVariantsModal');

  private ngbModal = inject(NgbModal);
  private scenarioVariantService = inject(ScenarioVariantService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private groupSelection = inject(GroupSelectionService);
  private navigationService = inject(NavigationService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private modalRef: NgbModalRef | null = null;

  readonly views = VARIANTS_DIALOG_VIEW;
  readonly view = signal<VariantsDialogView>(VARIANTS_DIALOG_VIEW.List);
  readonly groupId = signal<string | undefined>(undefined);
  readonly groupName = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly formName = signal('');
  readonly description = signal('');
  readonly fromDate = signal('');
  readonly untilDate = signal('');
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly canManage = this.scenarioVariantService.canManage;
  readonly loadFailed = this.scenarioVariantService.loadFailed;

  readonly groupVariants = computed(() => (this.groupId() ? this.scenarioVariantService.variants() : []));

  readonly selectedVariant = computed(
    () => this.groupVariants().find((variant) => variant.id === this.selectedId()) ?? null,
  );

  readonly canEditSelected = computed(() => {
    const selected = this.selectedVariant();
    return !!selected && this.canEditVariant(selected);
  });

  readonly isPeriodValid = computed(() => {
    const from = calendarDateKey(this.fromDate());
    const until = calendarDateKey(this.untilDate());
    return from !== '' && until !== '' && from <= until;
  });

  readonly isFormValid = computed(() => this.formName().trim().length > 0 && this.isPeriodValid());

  open(): void {
    const group = this.groupSelection.selectedGroup;
    this.groupId.set(group?.id);
    this.groupName.set(group?.name ?? '');
    this.view.set(VARIANTS_DIALOG_VIEW.List);
    this.selectedId.set(null);
    this.errorMessage.set(null);
    if (group?.id) {
      this.scenarioVariantService.loadVariants(group.id);
    }

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      size: 'lg',
      scrollable: true,
    });
  }

  canEditVariant(variant: IScenarioVariant): boolean {
    return this.canManage() && variant.status === AnalyseScenarioStatus.Active;
  }

  statusKey(variant: IScenarioVariant): string {
    return STATUS_KEYS[variant.status];
  }

  periodText(variant: IScenarioVariant): string {
    return CalendarPeriodToStringShort(variant.fromDate, variant.untilDate, this.translate.currentLang);
  }

  onCreate(): void {
    const today = companyToday();
    this.editingId.set(null);
    this.formName.set('');
    this.description.set('');
    this.fromDate.set(formatDateOnly(today));
    this.untilDate.set(formatDateOnly(addDays(today, SCENARIO_VARIANT_DEFAULT_PERIOD_DAYS)));
    this.openForm();
  }

  onEdit(variant: IScenarioVariant): void {
    this.editingId.set(variant.id);
    this.formName.set(variant.name);
    this.description.set(variant.description ?? '');
    this.fromDate.set(calendarDateKey(variant.fromDate));
    this.untilDate.set(calendarDateKey(variant.untilDate));
    this.openForm();
  }

  onSave(): void {
    const groupId = this.groupId();
    if (!this.isFormValid() || this.isSaving() || !groupId) return;

    const editingId = this.editingId();
    const name = this.formName().trim();
    const description = this.description().trim() || undefined;
    const fromDate = this.fromDate();
    const untilDate = this.untilDate();

    const request$: Observable<IScenarioVariant> = editingId
      ? this.scenarioVariantService.update(editingId, { name, description, fromDate, untilDate })
      : this.scenarioVariantService.create({ name, description, groupId, fromDate, untilDate });

    this.errorMessage.set(null);
    this.isSaving.set(true);
    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.view.set(VARIANTS_DIALOG_VIEW.List);
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        showScenarioVariantRefusal(err, this.translate, this.errorMessage);
      },
    });
  }

  onDelete(variant: IScenarioVariant): void {
    this.modalService.openModal({
      type: ModalType.Delete,
      title: this.translate.instant('scenarioVariant.delete.title'),
      message: this.translate.instant('scenarioVariant.delete.confirm', { name: variant.name }),
      confirmText: this.translate.instant('scenarioVariant.delete.title'),
      cancelText: this.translate.instant('cancel'),
      onConfirm: () => this.remove(variant),
    });
  }

  onEditShifts(variant: IScenarioVariant): void {
    if (!this.canEditVariant(variant)) return;

    this.analyseScenarioService.exitScenario();
    this.scenarioVariantService.enter(variant);
    this.showView(VARIANTS_DIALOG_VIEW.Shifts, variant);
  }

  onViewShifts(variant: IScenarioVariant): void {
    this.showView(VARIANTS_DIALOG_VIEW.Shifts, variant);
  }

  onCopyShifts(variant: IScenarioVariant): void {
    if (!this.canEditVariant(variant)) return;

    this.showView(VARIANTS_DIALOG_VIEW.Copy, variant);
  }

  onBackToList(): void {
    this.errorMessage.set(null);
    this.view.set(VARIANTS_DIALOG_VIEW.List);
  }

  onNewShift(): void {
    this.closeAndNavigate(() => this.navigationService.navigateToNewShift());
  }

  onEditShift(shiftId: string): void {
    this.closeAndNavigate(() => this.navigationService.navigateToEditShift(shiftId));
  }

  onCutShift(shiftId: string): void {
    this.closeAndNavigate(() => this.navigationService.navigateToCutShift(shiftId));
  }

  onClose(): void {
    this.modalRef?.close();
  }

  private openForm(): void {
    this.errorMessage.set(null);
    this.isSaving.set(false);
    this.view.set(VARIANTS_DIALOG_VIEW.Form);
  }

  private showView(view: VariantsDialogView, variant: IScenarioVariant): void {
    this.errorMessage.set(null);
    this.selectedId.set(variant.id);
    this.view.set(view);
  }

  private remove(variant: IScenarioVariant): void {
    this.errorMessage.set(null);
    this.scenarioVariantService.remove(variant.id).subscribe({
      error: (err: unknown) => showScenarioVariantRefusal(err, this.translate, this.errorMessage),
    });
  }

  private closeAndNavigate(navigate: () => void): void {
    this.modalRef?.close();
    navigate();
  }
}
