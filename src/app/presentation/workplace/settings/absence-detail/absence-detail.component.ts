// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component, ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  viewChild,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { AbsenceDetailHeaderComponent } from './absence-detail-header/absence-detail-header.component';
import { AbsenceDetailRowComponent } from './absence-detail-row/absence-detail-row.component';
import { DataAbsenceDetailService } from 'src/app/infrastructure/api/absence-detail/data-absence-detail.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { IAbsenceDetail, AbsenceDetail, AbsenceDetailMode } from 'src/app/domain/models/absence-detail/absence-detail-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { Language } from 'src/app/domain/models/settings/language-config';
import { AbsenceDetailFormModel } from 'src/app/presentation/view-models/absence-detail-form.model';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';

import { transformOwnTimeToNumber } from 'src/app/domain/helpers/own-time.helper';

interface AbsenceDetailFormFields {
  absenceId: string;
  detailName: string;
  description: string;
}

@Component({
  selector: 'app-absence-detail',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    AbsenceDetailHeaderComponent,
    AbsenceDetailRowComponent,
    SettingsListCardComponent,
    TimeInputComponent,
    FallbackPipe,
  ],
  templateUrl: './absence-detail.component.html',
  styleUrls: ['./absence-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsenceDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly absenceDetailModal = viewChild.required<TemplateRef<any>>('absenceDetailModal');

  private absenceDetailService = inject(DataAbsenceDetailService);
  private absenceService = inject(DataAbsenceService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  absenceDetails: IAbsenceDetail[] = [];
  absences: IAbsence[] = [];
  isLoading = false;
  editingAbsenceDetail: IAbsenceDetail | null = null;
  private originalAbsenceDetail: IAbsenceDetail | null = null;

  isNewAbsenceDetail = false;
  private isSaving = false;
  message = DomainMessages.DELETE_ENTRY;
  currentLang: Language = DomainMessages.DEFAULT_LANG;

  selectedMode = signal<AbsenceDetailMode>(AbsenceDetailMode.TimeRange);
  AbsenceDetailMode = AbsenceDetailMode;

  private formFields = signal<AbsenceDetailFormFields>({
    absenceId: '',
    detailName: '',
    description: '',
  });

  absenceDetailForm = form(this.formFields, f => {
    debounce(f.absenceId, 300);
    debounce(f.detailName, 300);
    debounce(f.description, 300);
  });

  absenceDetailFormModel: AbsenceDetailFormModel | null = null;

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;
    this.loadAbsenceDetails();
    this.loadAbsences();
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
        this.cdr.markForCheck();
      });

    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'absence-detail'
        ) {
          this.deleteAbsenceDetail(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAbsenceDetails(): void {
    this.isLoading = true;
    this.absenceDetailService
      .readAbsenceDetailList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (absenceDetails) => {
          this.absenceDetails = absenceDetails;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading absence details:', error);
          this.toastService.showError('setting.absence-detail.error.load');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private loadAbsences(): void {
    this.absenceService
      .readAbsenceList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (absences) => {
          this.absences = absences;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading absences:', error);
          this.cdr.markForCheck();
        },
      });
  }

  getAbsenceName(absenceId: string): string {
    const absence = this.absences.find(a => a.id === absenceId);
    return getLocalizedValue(absence?.name, this.currentLang);
  }

  onClickAdd(): void {
    this.isNewAbsenceDetail = true;
    this.editingAbsenceDetail = new AbsenceDetail();

    this.initFormFromAbsenceDetail(this.editingAbsenceDetail);
    this.originalAbsenceDetail = null;

    setTimeout(() => {
      this.ngbModal.open(this.absenceDetailModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'md',
      });
    }, 0);
  }

  private initFormFromAbsenceDetail(absenceDetail: IAbsenceDetail): void {
    this.absenceDetailFormModel = new AbsenceDetailFormModel(absenceDetail);
    this.selectedMode.set(absenceDetail.mode);

    this.formFields.set({
      absenceId: absenceDetail.absenceId || '',
      detailName: getLocalizedValue(absenceDetail.detailName, this.currentLang),
      description: getLocalizedValue(absenceDetail.description, this.currentLang),
    });
  }

  private applyFormToAbsenceDetail(): void {
    if (!this.editingAbsenceDetail || !this.absenceDetailFormModel) return;

    const formData = this.formFields();
    this.editingAbsenceDetail.absenceId = formData.absenceId;
    this.editingAbsenceDetail.mode = this.selectedMode();

    if (!this.editingAbsenceDetail.detailName) {
      this.editingAbsenceDetail.detailName = new MultiLanguage();
    }
    this.editingAbsenceDetail.detailName[this.currentLang] = formData.detailName;

    if (!this.editingAbsenceDetail.description) {
      this.editingAbsenceDetail.description = new MultiLanguage();
    }
    this.editingAbsenceDetail.description[this.currentLang] = formData.description;

    this.absenceDetailFormModel.internalMode = this.selectedMode();
    this.absenceDetailFormModel.applyToAbsenceDetail();
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveAbsenceDetail();
    if (success) {
      modal.close();
    }
  }

  onClickEdit(absenceDetail: IAbsenceDetail): void {
    this.isNewAbsenceDetail = false;
    this.editingAbsenceDetail = { ...absenceDetail };
    if (absenceDetail.detailName) {
      this.editingAbsenceDetail.detailName = { ...absenceDetail.detailName };
    }
    if (absenceDetail.description) {
      this.editingAbsenceDetail.description = { ...absenceDetail.description };
    }
    this.originalAbsenceDetail = absenceDetail;
    this.initFormFromAbsenceDetail(this.editingAbsenceDetail);

    setTimeout(() => {
      this.ngbModal.open(this.absenceDetailModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'md',
      });
    }, 0);
  }

  openDeleteAbsenceDetail(absenceDetail: IAbsenceDetail): void {
    if (absenceDetail.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'absence-detail';

      this.modalService.Filing = absenceDetail.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteAbsenceDetail(id: string): Promise<void> {
    try {
      await firstValueFrom(this.absenceDetailService.deleteAbsenceDetail(id));

      const index = this.absenceDetails.findIndex((b) => b.id === id);
      if (index !== -1) {
        this.absenceDetails.splice(index, 1);
      }
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error deleting absence detail:', error);
      this.toastService.showError('setting.absence-detail.error.delete');
      this.cdr.markForCheck();
    }
  }

  private async saveAbsenceDetail(): Promise<boolean> {
    if (!this.editingAbsenceDetail || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.applyFormToAbsenceDetail();
    this.isSaving = true;

    try {
      if (this.originalAbsenceDetail && this.originalAbsenceDetail.id) {
        const updatedAbsenceDetail = { ...this.originalAbsenceDetail, ...this.editingAbsenceDetail };
        await firstValueFrom(this.absenceDetailService.updateAbsenceDetail(updatedAbsenceDetail));
        this.loadAbsenceDetails();
      } else {
        const createdAbsenceDetail = await firstValueFrom(
          this.absenceDetailService.addAbsenceDetail(this.editingAbsenceDetail as AbsenceDetail)
        );
        if (createdAbsenceDetail) {
          this.absenceDetails.push(createdAbsenceDetail);
          this.isNewAbsenceDetail = false;
          this.editingAbsenceDetail = createdAbsenceDetail;
          this.originalAbsenceDetail = createdAbsenceDetail;
        }
      }

      this.cdr.markForCheck();
      return true;
    } catch (error) {
      console.error('Error saving absence detail:', error);
      this.toastService.showError('setting.absence-detail.error.save');
      this.loadAbsenceDetails();
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  isFormValid(): boolean {
    if (!this.editingAbsenceDetail) return false;
    const formData = this.formFields();

    if (!formData.absenceId) return false;

    if (this.selectedMode() === AbsenceDetailMode.Duration && this.absenceDetailFormModel) {
      const durationHours = transformOwnTimeToNumber(this.absenceDetailFormModel.internalDuration);
      if (durationHours < 0 || durationHours > 23.99) {
        return false;
      }
    }

    return true;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingAbsenceDetail) return errors;

    const formData = this.formFields();

    if (!formData.absenceId) {
      errors.push(
        this.translate.instant('setting.absence-detail.validation.absence-required')
      );
    }

    if (this.selectedMode() === AbsenceDetailMode.Duration && this.absenceDetailFormModel) {
      const durationHours = transformOwnTimeToNumber(this.absenceDetailFormModel.internalDuration);
      if (durationHours < 0) {
        errors.push(
          this.translate.instant('setting.absence-detail.validation.duration-min')
        );
      } else if (durationHours > 23.99) {
        errors.push(
          this.translate.instant('setting.absence-detail.validation.duration-max')
        );
      }
    }

    return errors;
  }

  get internalStartTime(): OwnTime {
    return this.absenceDetailFormModel?.internalStartTime ?? OwnTime.forTime('00', '00');
  }

  get internalEndTime(): OwnTime {
    return this.absenceDetailFormModel?.internalEndTime ?? OwnTime.forTime('23', '59');
  }

  get internalDuration(): OwnTime {
    return this.absenceDetailFormModel?.internalDuration ?? OwnTime.forTime('00', '00');
  }

  onStartTimeChange(value: OwnTime): void {
    if (this.absenceDetailFormModel) {
      this.absenceDetailFormModel.internalStartTime = value;
    }
  }

  onEndTimeChange(value: OwnTime): void {
    if (this.absenceDetailFormModel) {
      this.absenceDetailFormModel.internalEndTime = value;
    }
  }

  onDurationChange(value: OwnTime): void {
    if (this.absenceDetailFormModel) {
      this.absenceDetailFormModel.internalDuration = value;
    }
  }

  onModeChange(mode: AbsenceDetailMode): void {
    this.selectedMode.set(mode);
  }
}
