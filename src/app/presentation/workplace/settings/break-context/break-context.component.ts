/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, Field, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { BreakContextHeaderComponent } from './break-context-header/break-context-header.component';
import { BreakContextRowComponent } from './break-context-row/break-context-row.component';
import { DataBreakContextService } from 'src/app/infrastructure/api/data-break-context.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/data-absence.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { IBreakContext, BreakContext } from 'src/app/domain/models/break-context-class';
import { IAbsence, AbsenceFilter } from 'src/app/domain/models/absence-class';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { Language } from 'src/app/application/helpers/sharedItems';
import { BreakContextFormModel } from 'src/app/presentation/view-models/break-context-form.model';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';

interface BreakContextFormFields {
  absenceId: string;
  detailName: string;
}

@Component({
  selector: 'app-break-context',
  standalone: true,
  imports: [
    FormsModule,
    Field,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    BreakContextHeaderComponent,
    BreakContextRowComponent,
    SettingsListCardComponent,
    TimeInputComponent,
    FallbackPipe,
  ],
  templateUrl: './break-context.component.html',
  styleUrls: ['./break-context.component.scss'],
})
export class BreakContextComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('breakContextModal', { read: TemplateRef })
  breakContextModal!: TemplateRef<any>;

  private breakContextService = inject(DataBreakContextService);
  private absenceService = inject(DataAbsenceService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  breakContexts: IBreakContext[] = [];
  absences: IAbsence[] = [];
  isLoading = false;
  editingBreakContext: IBreakContext | null = null;
  private originalBreakContext: IBreakContext | null = null;

  isNewBreakContext = false;
  private isSaving = false;
  message = MessageLibrary.DELETE_ENTRY;
  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  private formFields = signal<BreakContextFormFields>({
    absenceId: '',
    detailName: '',
  });

  breakContextForm = form(this.formFields, f => {
    debounce(f.absenceId, 300);
    debounce(f.detailName, 300);
  });

  breakContextFormModel: BreakContextFormModel | null = null;

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;
    this.loadBreakContexts();
    this.loadAbsences();
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
      });

    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'break-context'
        ) {
          this.deleteBreakContext(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBreakContexts(): void {
    this.isLoading = true;
    this.breakContextService
      .readBreakContextList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (breakContexts) => {
          this.breakContexts = breakContexts;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading break contexts:', error);
          this.toastService.showError('setting.break-context.error.load');
          this.isLoading = false;
        },
      });
  }

  private loadAbsences(): void {
    const filter = new AbsenceFilter();
    filter.language = this.currentLang;
    this.absenceService
      .readTruncatedAbsence(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result) {
            this.absences = result.absences;
          }
        },
        error: (error) => {
          console.error('Error loading absences:', error);
        },
      });
  }

  getAbsenceName(absenceId: string): string {
    const absence = this.absences.find(a => a.id === absenceId);
    return getLocalizedValue(absence?.name, this.currentLang);
  }

  onClickAdd(): void {
    this.isNewBreakContext = true;
    this.editingBreakContext = new BreakContext();

    this.initFormFromBreakContext(this.editingBreakContext);
    this.originalBreakContext = null;

    setTimeout(() => {
      this.ngbModal.open(this.breakContextModal, {
        ariaLabelledBy: 'modal-title',
        size: 'md',
      });
    }, 0);
  }

  private initFormFromBreakContext(breakContext: IBreakContext): void {
    this.breakContextFormModel = new BreakContextFormModel(breakContext);

    this.formFields.set({
      absenceId: breakContext.absenceId || '',
      detailName: getLocalizedValue(breakContext.detailName, this.currentLang),
    });
  }

  private applyFormToBreakContext(): void {
    if (!this.editingBreakContext || !this.breakContextFormModel) return;

    const formData = this.formFields();
    this.editingBreakContext.absenceId = formData.absenceId;

    if (!this.editingBreakContext.detailName) {
      this.editingBreakContext.detailName = new MultiLanguage();
    }
    this.editingBreakContext.detailName[this.currentLang] = formData.detailName;

    this.breakContextFormModel.applyToBreakContext();
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveBreakContext();
    if (success) {
      modal.close();
    }
  }

  onClickEdit(breakContext: IBreakContext): void {
    this.isNewBreakContext = false;
    this.editingBreakContext = { ...breakContext };
    if (breakContext.detailName) {
      this.editingBreakContext.detailName = { ...breakContext.detailName };
    }
    this.originalBreakContext = breakContext;
    this.initFormFromBreakContext(this.editingBreakContext);

    setTimeout(() => {
      this.ngbModal.open(this.breakContextModal, {
        ariaLabelledBy: 'modal-title',
        size: 'md',
      });
    }, 0);
  }

  openDeleteBreakContext(breakContext: IBreakContext): void {
    if (breakContext.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'break-context';

      this.modalService.Filing = breakContext.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteBreakContext(id: string): Promise<void> {
    try {
      await firstValueFrom(this.breakContextService.deleteBreakContext(id));

      const index = this.breakContexts.findIndex((b) => b.id === id);
      if (index !== -1) {
        this.breakContexts.splice(index, 1);
      }
    } catch (error) {
      console.error('Error deleting break context:', error);
      this.toastService.showError('setting.break-context.error.delete');
    }
  }

  private async saveBreakContext(): Promise<boolean> {
    if (!this.editingBreakContext || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.applyFormToBreakContext();
    this.isSaving = true;

    try {
      if (this.originalBreakContext && this.originalBreakContext.id) {
        const updatedBreakContext = { ...this.originalBreakContext, ...this.editingBreakContext };
        await firstValueFrom(this.breakContextService.updateBreakContext(updatedBreakContext));
        this.loadBreakContexts();
      } else {
        const createdBreakContext = await firstValueFrom(
          this.breakContextService.addBreakContext(this.editingBreakContext as BreakContext)
        );
        if (createdBreakContext) {
          this.breakContexts.push(createdBreakContext);
          this.isNewBreakContext = false;
          this.editingBreakContext = createdBreakContext;
          this.originalBreakContext = createdBreakContext;
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving break context:', error);
      this.toastService.showError('setting.break-context.error.save');
      this.loadBreakContexts();
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  isFormValid(): boolean {
    if (!this.editingBreakContext) return false;
    const formData = this.formFields();

    return !!(formData.absenceId);
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingBreakContext) return errors;

    const formData = this.formFields();

    if (!formData.absenceId) {
      errors.push(
        this.translate.instant('setting.break-context.validation.absence-required')
      );
    }

    return errors;
  }

  get internalStartBreak(): OwnTime {
    return this.breakContextFormModel?.internalStartBreak ?? OwnTime.forTime('00', '00');
  }

  get internalEndBreak(): OwnTime {
    return this.breakContextFormModel?.internalEndBreak ?? OwnTime.forTime('23', '59');
  }

  onStartBreakChange(value: OwnTime): void {
    if (this.breakContextFormModel) {
      this.breakContextFormModel.internalStartBreak = value;
    }
  }

  onEndBreakChange(value: OwnTime): void {
    if (this.breakContextFormModel) {
      this.breakContextFormModel.internalEndBreak = value;
    }
  }
}
