// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dialog "Convert into employee": turns a stand-in into an employee or an external employee in place. Its services,
 * membership, groups and qualifications stay; the person gets first name, name, gender and optionally an address, a
 * phone number and an e-mail address (address and contract can also be added afterwards in the master data form).
 * Opened from the master data form and from the row menu of the schedule; the host reloads the client or the rows when
 * `converted` fires. A refused input is explained in the dialog, a refused request as a toast.
 * @param converted - Emits once the server converted the stand-in
 * @param clientId - Stand-in to convert, passed to open()
 * @param displayName - Name of the stand-in shown in the dialog title, passed to open()
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
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { IStandInConvertInput } from 'src/app/domain/models/client/stand-in/stand-in-convert-input.interface';
import { StandInMessage } from 'src/app/domain/models/client/stand-in/stand-in-message.interface';
import { StandInService } from 'src/app/domain/services/client/stand-in.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { STAND_IN_I18N } from 'src/app/domain/constants/stand-in.constants';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { Language } from 'src/app/domain/models/settings/language.type';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { StandInConvertFormModel } from './stand-in-convert-form-model.interface';

const SUCCESS_KEY = 'standIn.convert.success';

@Component({
  selector: 'app-stand-in-convert-dialog',
  templateUrl: './stand-in-convert-dialog.component.html',
  styleUrls: ['./stand-in-convert-dialog.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule, FallbackPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StandInConvertDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('standInConvertModal');
  readonly converted = output<void>();

  private ngbModal = inject(NgbModal);
  private standInService = inject(StandInService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  protected clientConfigService = inject(ClientConfigService);

  protected readonly EntityTypeEnum = EntityTypeEnum;
  protected readonly GenderEnum = GenderEnum;
  protected readonly displayName = signal('');
  private readonly model = signal<StandInConvertFormModel>(this.emptyModel());
  protected readonly convertForm = form(this.model);
  protected readonly problem = signal<StandInMessage | null>(null);
  protected readonly isSaving = signal(false);

  private clientId = '';
  private modalRef: NgbModalRef | null = null;

  protected get currentLang(): Language {
    return this.translate.currentLang as Language;
  }

  open(clientId: string, displayName: string): void {
    this.clientId = clientId;
    this.displayName.set(displayName);
    this.model.set(this.emptyModel());
    this.problem.set(null);
    this.isSaving.set(false);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onConvert(): void {
    if (this.isSaving() || !this.clientId) {
      return;
    }

    const input = this.toInput(this.model());
    const problem = this.standInService.validateConvert(input);
    this.problem.set(problem);
    if (problem) {
      return;
    }

    this.isSaving.set(true);
    this.standInService
      .convertStandIn(this.clientId, input)
      .pipe(finalize(() => {
        this.isSaving.set(false);
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.toastShowService.showSuccess(
            this.translate.instant(SUCCESS_KEY, { name: [input.firstName, input.name].join(' ').trim() }),
            '',
          );
          this.modalRef?.close();
          this.converted.emit();
        },
        error: (error: unknown) => {
          const message = this.standInService.failureMessage(error, STAND_IN_I18N.convertFailed);
          this.toastShowService.showError(this.translate.instant(message.key, message.params));
        },
      });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }

  private toInput(model: StandInConvertFormModel): IStandInConvertInput {
    return {
      targetType: Number(model.targetType) as EntityTypeEnum,
      firstName: model.firstName,
      name: model.name,
      gender: model.gender === '' ? null : (Number(model.gender) as GenderEnum),
      street: model.street,
      zip: model.zip,
      city: model.city,
      country: model.country,
      phone: model.phone,
      email: model.email,
    };
  }

  private emptyModel(): StandInConvertFormModel {
    return {
      targetType: String(EntityTypeEnum.employee),
      firstName: '',
      name: '',
      gender: '',
      street: '',
      zip: '',
      city: '',
      country: '',
      phone: '',
      email: '',
    };
  }
}
