// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dialog "Create placeholders": creates several stand-ins at once with a name pattern ("Fair {n}"), the membership
 * period and the qualifications they all hold, always in the group selected in the schedule (shown read-only in the
 * title). Opened from the more-actions menu of the schedule toolbar; the host reloads its rows when `created` fires. A
 * refused input is explained in the dialog, a refused request as a toast.
 * @param created - Emits the created stand-ins after the server stored them
 * @param defaults - Group and period the dialog starts with (the schedule passes its selected group and shown period)
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { NgbDateStruct, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { ICreatedStandIn } from 'src/app/domain/models/client/stand-in/created-stand-in.interface';
import { StandInMessage } from 'src/app/domain/models/client/stand-in/stand-in-message.interface';
import { StandInService } from 'src/app/domain/services/client/stand-in.service';
import { DataManagementQualificationService } from 'src/app/domain/services/settings/data-management-qualification.service';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { STAND_IN_I18N } from 'src/app/domain/constants/stand-in.constants';
import { Language } from 'src/app/domain/models/settings/language.type';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/presentation/helpers/ngb-date.helper';
import { StandInQualificationSelectComponent } from '../stand-in-qualification-select/stand-in-qualification-select.component';
import { StandInCreateDefaults } from './stand-in-create-defaults.interface';

const SUCCESS_KEY = 'standIn.create.success';

@Component({
  selector: 'app-stand-in-create-dialog',
  templateUrl: './stand-in-create-dialog.component.html',
  styleUrls: ['./stand-in-create-dialog.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule, DateInputComponent, StandInQualificationSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StandInCreateDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('standInCreateModal');
  readonly created = output<ICreatedStandIn[]>();

  private ngbModal = inject(NgbModal);
  private standInService = inject(StandInService);
  private qualificationService = inject(DataManagementQualificationService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  private readonly textModel = signal<{ count: number | null; namePattern: string }>({ count: 1, namePattern: '' });
  protected readonly textForm = form(this.textModel);
  protected readonly groupId = signal('');
  protected readonly groupName = signal('');
  protected readonly validFrom = signal<NgbDateStruct | null>(null);
  protected readonly validUntil = signal<NgbDateStruct | null>(null);
  protected readonly qualifications = signal<IQualification[]>([]);
  protected readonly selectedQualificationIds = signal<ReadonlySet<string>>(new Set());
  protected readonly problem = signal<StandInMessage | null>(null);
  protected readonly isSaving = signal(false);

  private modalRef: NgbModalRef | null = null;

  protected get currentLang(): Language {
    return this.translate.currentLang as Language;
  }

  open(defaults: StandInCreateDefaults): void {
    this.textModel.set({ count: 1, namePattern: '' });
    this.groupId.set(defaults.groupId);
    this.groupName.set(defaults.groupName);
    this.validFrom.set(this.toStruct(defaults.validFrom ?? companyToday()));
    this.validUntil.set(this.toStruct(defaults.validUntil ?? null));
    this.selectedQualificationIds.set(new Set());
    this.problem.set(null);
    this.isSaving.set(false);

    this.qualificationService.getQualificationList(true).subscribe({
      next: (list) => {
        this.qualifications.set(list);
        this.cdr.markForCheck();
      },
      error: () => this.qualifications.set([]),
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onToggleQualification(id: string): void {
    const next = new Set(this.selectedQualificationIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedQualificationIds.set(next);
  }

  onCreate(): void {
    if (this.isSaving()) {
      return;
    }

    const input = {
      count: this.textModel().count,
      namePattern: this.textModel().namePattern,
      groupId: this.groupId(),
      validFrom: transformNgbDateStructToDate(this.validFrom() ?? undefined) ?? null,
      validUntil: transformNgbDateStructToDate(this.validUntil() ?? undefined) ?? null,
      qualificationIds: [...this.selectedQualificationIds()],
    };

    const problem = this.standInService.validateCreate(input);
    this.problem.set(problem);
    if (problem) {
      return;
    }

    this.isSaving.set(true);
    this.standInService
      .createStandIns(input)
      .pipe(finalize(() => {
        this.isSaving.set(false);
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (createdStandIns) => {
          this.toastShowService.showSuccess(
            this.translate.instant(SUCCESS_KEY, { count: createdStandIns.length }),
            '',
          );
          this.modalRef?.close();
          this.created.emit(createdStandIns);
        },
        error: (error: unknown) => {
          const message = this.standInService.failureMessage(error, STAND_IN_I18N.createFailed);
          this.toastShowService.showError(this.translate.instant(message.key, message.params));
        },
      });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }

  private toStruct(date: Date | null): NgbDateStruct | null {
    return date ? (transformDateToNgbDateStruct(date) ?? null) : null;
  }
}
