// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for the permissions to work on statutory holidays.
 * Without a matching exemption the holiday detector reports every staffed shift on a public holiday,
 * and compliance rules have no "off" switch - so this card is the only way to say that an operation
 * runs legally on holidays. Create and delete only: the endpoint offers no update, changing an
 * exemption means removing it and adding a new one.
 */
import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  effect,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  viewChild,
  TemplateRef,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { HolidayWorkExemptionHeaderComponent } from './holiday-work-exemption-header/holiday-work-exemption-header.component';
import { HolidayWorkExemptionRowComponent } from './holiday-work-exemption-row/holiday-work-exemption-row.component';
import { DataManagementHolidayWorkExemptionService } from 'src/app/domain/services/scheduling/data-management-holiday-work-exemption.service';
import { IHolidayWorkExemption } from 'src/app/domain/models/scheduling/holiday-work-exemption.model';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';

interface HolidayWorkExemptionFormModel {
  description: string;
  schedulingRuleId: string;
}

const GLOBAL_SCOPE_VALUE = '';

@Component({
  selector: 'app-holiday-work-exemptions',
  templateUrl: './holiday-work-exemptions.component.html',
  styleUrls: ['./holiday-work-exemptions.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    FormField,
    NgbModule,
    SpinnerModule,
    HolidayWorkExemptionHeaderComponent,
    HolidayWorkExemptionRowComponent,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayWorkExemptionsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly exemptionModal = viewChild.required<TemplateRef<unknown>>('exemptionModal');
  readonly containerBox = viewChild<ElementRef>('containerBox');

  public translate = inject(TranslateService);
  public dataManagementService = inject(DataManagementHolidayWorkExemptionService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  public readonly globalScopeValue = GLOBAL_SCOPE_VALUE;
  private isSaving = false;
  private destroy$ = new Subject<void>();

  private formModel = signal<HolidayWorkExemptionFormModel>({
    description: '',
    schedulingRuleId: GLOBAL_SCOPE_VALUE,
  });

  exemptionForm = form(this.formModel, f => {
    debounce(f.description, 300);
  });

  message = DomainMessages.DELETE_ENTRY;

  private isReadEffect = effect(() => {
    if (this.dataManagementService.isRead()) {
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementService.init();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing holiday work exemptions:', error);
    }
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, 'holidayWorkExemptions')
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        void this.deleteExemption(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  scopeLabelOf(exemption: IHolidayWorkExemption): string {
    return this.dataManagementService.scopeLabel(exemption.schedulingRuleId);
  }

  onClickAdd(): void {
    this.formModel.set({
      description: '',
      schedulingRuleId: GLOBAL_SCOPE_VALUE,
    });
    this.openModal();
  }

  onScopeChange(value: string): void {
    this.formModel.update(model => ({ ...model, schedulingRuleId: value }));
  }

  private openModal(): void {
    setTimeout(() => {
      this.ngbModal.open(this.exemptionModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  isFormValid(): boolean {
    return this.formModel().description.trim().length > 0;
  }

  async onSaveModal(modal: unknown): Promise<void> {
    const saved = await this.saveExemption();
    if (saved) {
      (modal as { close: () => void }).close();
    }
  }

  private async saveExemption(): Promise<boolean> {
    if (this.isSaving || !this.isFormValid()) {
      return false;
    }

    this.isSaving = true;

    try {
      const formData = this.formModel();
      const draft = this.dataManagementService.createExemptionDraft();
      draft.description = formData.description.trim();
      draft.schedulingRuleId =
        formData.schedulingRuleId === GLOBAL_SCOPE_VALUE ? null : formData.schedulingRuleId;

      return await this.dataManagementService.saveExemption(draft);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Warns only where the warning is true: an exemption that came from a region package is restored
   * by the next import, a hand-made one is gone for good. The neighbouring rule lists show the
   * import warning on every row, which trains the reader to ignore it.
   * @param index - Position of the exemption in the displayed list
   */
  openDeleteExemption(index: number): void {
    const exemptions = this.dataManagementService.exemptions;
    if (index >= 0 && index < exemptions.length) {
      const isImported = (exemptions[index]?.importSourceKey ?? '').length > 0;

      this.modalService.Filing = '';
      this.modalService.componentContext = 'holidayWorkExemptions';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = isImported
        ? this.translate.instant('setting.holidayWorkExemption.importDeleteWarning')
        : this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteExemption(indexStr: string): Promise<void> {
    const index = parseInt(indexStr, 10);
    const exemptions = this.dataManagementService.exemptions;

    if (index >= 0 && index < exemptions.length) {
      const exemption = exemptions[index];

      if (exemption?.id) {
        await this.dataManagementService.deleteExemption(exemption.id);
      }
    }
  }
}
