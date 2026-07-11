// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for managing personal access tokens with one-time plaintext display after creation.
 * @param tokens - Token metadata list of the current user (never contains the secret)
 * @param createdToken - Create response holding the plaintext token until the modal is closed
 */

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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { PersonalAccessTokensHeaderComponent } from './personal-access-tokens-header/personal-access-tokens-header.component';
import { PersonalAccessTokensRowComponent } from './personal-access-tokens-row/personal-access-tokens-row.component';
import { DataPersonalAccessTokenService } from 'src/app/infrastructure/api/settings/data-personal-access-token.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import {
  IPersonalAccessToken,
  IPersonalAccessTokenCreate,
  IPersonalAccessTokenCreated,
  PERSONAL_ACCESS_TOKEN_EXPIRY,
} from 'src/app/domain/models/settings/personal-access-token';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

import { DomainMessages } from 'src/app/domain/constants/messages';
interface PersonalAccessTokenFormModel {
  name: string;
  expiresInDays: string;
}

const PERSONAL_ACCESS_TOKENS_CONTEXT = 'personal-access-tokens';

@Component({
  selector: 'app-personal-access-tokens',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    SpinnerModule,
    PersonalAccessTokensHeaderComponent,
    PersonalAccessTokensRowComponent,
    SettingsListCardComponent,
    IconCopyGreyComponent,
  ],
  templateUrl: './personal-access-tokens.component.html',
  styleUrls: ['./personal-access-tokens.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalAccessTokensComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly tokenModal = viewChild.required<TemplateRef<any>>('tokenModal');

  private tokenService = inject(DataPersonalAccessTokenService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  private clipboard = inject(Clipboard);
  public translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  tokens: IPersonalAccessToken[] = [];
  isLoading = false;
  createdToken: IPersonalAccessTokenCreated | null = null;
  private isSaving = false;

  tabId = signal('token');
  manualContent = signal('');

  private formModel = signal<PersonalAccessTokenFormModel>({
    name: '',
    expiresInDays: String(PERSONAL_ACCESS_TOKEN_EXPIRY.DEFAULT_DAYS),
  });

  tokenForm = form(this.formModel, f => {
    debounce(f.name, 300);
    debounce(f.expiresInDays, 300);
  });

  ngOnInit(): void {
    this.loadTokens();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === PERSONAL_ACCESS_TOKENS_CONTEXT
        ) {
          this.revokeToken(this.modalService.Filing);
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

  private loadTokens(): void {
    this.isLoading = true;
    this.tokenService
      .getTokenList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.tokens = tokens;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading personal access tokens:', error);
          this.toastService.showError(
            this.translate.instant('setting.personal-access-tokens.error.load-tokens')
          );
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onClickAdd(): void {
    this.createdToken = null;
    this.formModel.set({
      name: '',
      expiresInDays: String(PERSONAL_ACCESS_TOKEN_EXPIRY.DEFAULT_DAYS),
    });
    this.tabId.set('token');
    this.loadManual();

    setTimeout(() => {
      this.ngbModal
        .open(this.tokenModal(), {
          ariaLabelledBy: 'modal-title',
          size: 'lg',
        })
        .result.then(
          () => this.onModalClosed(),
          () => this.onModalClosed()
        );
    }, 0);
  }

  loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader.loadManual('personal-access-token-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }

  private onModalClosed(): void {
    if (this.createdToken) {
      this.createdToken = null;
      this.loadTokens();
    }
    this.cdr.markForCheck();
  }

  async onCreateToken(): Promise<void> {
    if (!this.isFormValid() || this.isSaving || this.createdToken) {
      return;
    }

    this.isSaving = true;
    const formData = this.formModel();
    const request: IPersonalAccessTokenCreate = { name: formData.name.trim() };
    const expiresInDays = parseInt(formData.expiresInDays, 10);
    if (!isNaN(expiresInDays)) {
      request.expiresInDays = expiresInDays;
    }

    try {
      this.createdToken = await firstValueFrom(
        this.tokenService.createToken(request)
      );
      this.toastService.showSuccess(
        this.translate.instant('setting.personal-access-tokens.success.create'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch (error) {
      console.error('Error creating personal access token:', error);
      this.toastService.showError(
        this.translate.instant('setting.personal-access-tokens.error.save')
      );
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  onCopyToken(): void {
    if (!this.createdToken) {
      return;
    }

    this.clipboard.copy(this.createdToken.token);
    this.toastService.showSuccess(
      this.translate.instant('setting.personal-access-tokens.success.copied'),
      this.translate.instant('TOAST_SUCCESS')
    );
  }

  openRevokeToken(token: IPersonalAccessToken): void {
    if (token.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = PERSONAL_ACCESS_TOKENS_CONTEXT;

      this.modalService.Filing = token.id;
      this.modalService.deleteMessage = this.translate.instant(
        'setting.personal-access-tokens.confirm-revoke'
      );
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async revokeToken(id: string): Promise<void> {
    try {
      await firstValueFrom(this.tokenService.revokeToken(id));

      this.toastService.showSuccess(
        this.translate.instant('setting.personal-access-tokens.success.delete'),
        this.translate.instant('TOAST_SUCCESS')
      );
      this.loadTokens();
    } catch (error) {
      console.error('Error revoking personal access token:', error);
      this.toastService.showError(
        this.translate.instant('setting.personal-access-tokens.error.delete')
      );
      this.cdr.markForCheck();
    }
  }

  isFormValid(): boolean {
    const formData = this.formModel();

    if (!formData.name.trim()) {
      return false;
    }

    if (formData.expiresInDays.trim() === '') {
      return true;
    }

    const expiresInDays = parseInt(formData.expiresInDays, 10);
    return (
      !isNaN(expiresInDays) &&
      expiresInDays >= PERSONAL_ACCESS_TOKEN_EXPIRY.MIN_DAYS &&
      expiresInDays <= PERSONAL_ACCESS_TOKEN_EXPIRY.MAX_DAYS
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    const formData = this.formModel();

    if (!formData.name.trim()) {
      errors.push(
        this.translate.instant(
          'setting.personal-access-tokens.validation.name-required'
        )
      );
    }

    if (formData.expiresInDays.trim() !== '') {
      const expiresInDays = parseInt(formData.expiresInDays, 10);
      if (
        isNaN(expiresInDays) ||
        expiresInDays < PERSONAL_ACCESS_TOKEN_EXPIRY.MIN_DAYS ||
        expiresInDays > PERSONAL_ACCESS_TOKEN_EXPIRY.MAX_DAYS
      ) {
        errors.push(
          this.translate.instant(
            'setting.personal-access-tokens.validation.expiry-range'
          )
        );
      }
    }

    return errors;
  }
}
