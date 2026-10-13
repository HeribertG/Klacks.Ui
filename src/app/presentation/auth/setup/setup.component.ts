// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Forced setup page shown to the seeded admin account on a freshly deployed instance.
 * Collects the caller's own admin account, replaces the seeded admin with it on the server
 * (which also deactivates the seeded admin in the same transaction), then logs the local
 * session out and sends the user to a normal login with the new credentials - no auto-login,
 * no other part of the app is reachable until this page has been completed. The server derives
 * the user name itself; the new admin signs in with the email address. The password has to be
 * typed twice because a typo would otherwise lock the user out once the seeded admin is gone.
 * Errors are shown inline at the field they concern (or above the button), never as a toast.
 * @param setupFormModel - Signal holding the new admin's registration form values
 * @param passwordRules - Live state of every rule the backend password policy demands; empty when the policy could not be loaded
 * @param fieldErrors - Translation keys of the errors shown under each field
 * @param generalErrorKeys - Translation keys of the errors shown above the submit button
 */
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faCircleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PASSWORD_RULE_REJECTION_REASON } from 'src/app/domain/constants/password-policy.constants';
import {
  ACCOUNT_REGISTRATION_REASON_TARGET,
  AccountRegistrationReasonTarget,
  accountRegistrationReasonKeys,
  accountRegistrationReasonTarget,
  readAccountRegistrationRejectionReasons,
} from 'src/app/domain/helpers/account-registration-rejection.helper';
import { evaluatePasswordRules, isPasswordPolicy } from 'src/app/domain/helpers/password-policy.helper';
import { PasswordPolicy } from 'src/app/domain/models/setup/password-policy.interface';
import { SetupOwnAdminRequest } from 'src/app/domain/models/setup/setup-own-admin-request.interface';
import { SetupStatus } from 'src/app/domain/models/setup/setup-status.interface';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SetupServerRejection } from './setup-server-rejection.interface';

interface SetupFormModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

const SETUP_FIELD = {
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  EMAIL: 'email',
  PASSWORD: 'password',
  PASSWORD_CONFIRM: 'passwordConfirm',
} as const;

type SetupField = (typeof SETUP_FIELD)[keyof typeof SETUP_FIELD];

const SETUP_FIELD_ORDER: readonly SetupField[] = Object.values(SETUP_FIELD);

const SETUP_ELEMENT_ID = {
  FIELD_PREFIX: 'setupForm-',
  ERROR_SUFFIX: '-error',
  PASSWORD_RULES: 'setupForm-password-rules',
  PASSWORD_RULES_TITLE: 'setupForm-password-rules-title',
  GENERAL_ERROR: 'setup-general-error',
} as const;

const SETUP_TEXT_KEY = {
  RULE_PREFIX: 'setup.rule.',
  REQUIRED: 'setup.error.required',
  PASSWORD_MISMATCH: 'setup.error.passwordMismatch',
  GENERIC_ERROR: 'setup.error',
  SERVER_ERROR: 'setup.error.server',
  ALREADY_COMPLETED: 'setup.error.alreadyCompleted',
  SUCCESS: 'setup.success',
} as const;

const SETUP_OWN_ADMIN_DEFAULTS = {
  appName: '',
  message: '',
  sendEmail: false,
  title: '',
} as const;

const NO_ERRORS: readonly string[] = [];

const isBlank = (value: string): boolean => value.trim().length === 0;

const unique = (keys: readonly string[]): string[] => [...new Set(keys)];

const toFieldRecord = <T>(valueOf: (field: SetupField) => T): Record<SetupField, T> =>
  Object.fromEntries(SETUP_FIELD_ORDER.map((field) => [field, valueOf(field)])) as Record<SetupField, T>;

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, NgTemplateOutlet, TranslateModule, FontAwesomeModule, PasswordInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupComponent implements OnInit {
  private readonly dataSetupService = inject(DataSetupService);
  private readonly authService = inject(AuthService);
  private readonly navigationService = inject(NavigationService);
  private readonly toastService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  readonly faCheck = faCheck;
  readonly faXmark = faXmark;
  readonly faCircleExclamation = faCircleExclamation;

  readonly fieldIds = toFieldRecord((field) => `${SETUP_ELEMENT_ID.FIELD_PREFIX}${field}`);
  readonly errorIds = toFieldRecord(
    (field) => `${SETUP_ELEMENT_ID.FIELD_PREFIX}${field}${SETUP_ELEMENT_ID.ERROR_SUFFIX}`
  );
  readonly passwordRulesId = SETUP_ELEMENT_ID.PASSWORD_RULES;
  readonly passwordRulesTitleId = SETUP_ELEMENT_ID.PASSWORD_RULES_TITLE;
  readonly generalErrorId = SETUP_ELEMENT_ID.GENERAL_ERROR;

  public setupFormModel = signal<SetupFormModel>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  public setupForm = form(this.setupFormModel);

  public isSaving = signal(false);

  private readonly passwordPolicy = signal<PasswordPolicy | null>(null);
  private readonly submitAttempted = signal(false);
  private readonly serverRejection = signal<SetupServerRejection | null>(null);
  readonly generalErrorKeys = signal<string[]>([]);

  private readonly ruleResults = computed(() => {
    const policy = this.passwordPolicy();
    return policy ? evaluatePasswordRules(policy, this.setupFormModel().password) : [];
  });

  readonly passwordRules = computed(() =>
    this.ruleResults().map((rule) => ({
      id: rule.id,
      met: rule.met,
      labelKey: `${SETUP_TEXT_KEY.RULE_PREFIX}${rule.id}`,
    }))
  );

  readonly requiredLength = computed(() => this.passwordPolicy()?.requiredLength ?? 0);

  private readonly clientErrors = computed<Record<SetupField, readonly string[]>>(() => {
    const model = this.setupFormModel();
    return {
      firstName: isBlank(model.firstName) ? [SETUP_TEXT_KEY.REQUIRED] : NO_ERRORS,
      lastName: isBlank(model.lastName) ? [SETUP_TEXT_KEY.REQUIRED] : NO_ERRORS,
      email: isBlank(model.email) ? [SETUP_TEXT_KEY.REQUIRED] : NO_ERRORS,
      password: model.password.length === 0 ? [SETUP_TEXT_KEY.REQUIRED] : this.unmetRuleKeys(),
      passwordConfirm: this.passwordConfirmErrors(model),
    };
  });

  private readonly serverFieldReasons = computed(() => {
    const rejection = this.serverRejection();
    const model = this.setupFormModel();
    const reasonsFor = (target: AccountRegistrationReasonTarget, sentValue: string, currentValue: string) =>
      rejection && sentValue === currentValue
        ? rejection.reasons.filter((reason) => accountRegistrationReasonTarget(reason) === target)
        : [];

    return {
      email: reasonsFor(ACCOUNT_REGISTRATION_REASON_TARGET.EMAIL, rejection?.email ?? '', model.email),
      password: reasonsFor(ACCOUNT_REGISTRATION_REASON_TARGET.PASSWORD, rejection?.password ?? '', model.password),
    };
  });

  readonly fieldErrors = computed<Record<SetupField, readonly string[]>>(() => {
    const client = this.submitAttempted() ? this.clientErrors() : null;
    const server = this.serverFieldReasons();
    return toFieldRecord((field) => {
      const clientKeys = client?.[field] ?? NO_ERRORS;
      if (field === SETUP_FIELD.EMAIL) {
        return unique([...clientKeys, ...accountRegistrationReasonKeys(server.email)]);
      }
      if (field === SETUP_FIELD.PASSWORD) {
        const shownByRuleList = this.passwordRules().length > 0 ? this.unmetRuleKeys() : NO_ERRORS;
        const passwordKeys = clientKeys.filter((key) => !shownByRuleList.includes(key));
        return unique([...passwordKeys, ...accountRegistrationReasonKeys(server.password)]);
      }
      return clientKeys;
    });
  });

  readonly showUnmetRulesAsErrors = computed(
    () => this.submitAttempted() && this.passwordRules().some((rule) => !rule.met)
  );

  readonly passwordInvalid = computed(
    () => this.fieldErrors().password.length > 0 || this.showUnmetRulesAsErrors()
  );

  readonly passwordDescribedBy = computed(() => {
    const ids = [
      this.fieldErrors().password.length > 0 ? this.errorIds.password : null,
      this.passwordRules().length > 0 ? this.passwordRulesId : null,
    ].filter((id): id is string => id !== null);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  ngOnInit(): void {
    this.dataSetupService
      .getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status: SetupStatus | null) => this.passwordPolicy.set(this.readPasswordPolicy(status)),
        error: () => this.passwordPolicy.set(null),
      });
  }

  updatePassword(value: string): void {
    this.setupFormModel.update((m) => ({ ...m, password: value }));
  }

  updatePasswordConfirm(value: string): void {
    this.setupFormModel.update((m) => ({ ...m, passwordConfirm: value }));
  }

  onSave(): void {
    if (this.isSaving()) {
      return;
    }

    this.submitAttempted.set(true);
    this.serverRejection.set(null);
    this.generalErrorKeys.set([]);

    if (SETUP_FIELD_ORDER.some((field) => this.clientErrors()[field].length > 0)) {
      this.focusFirstError();
      return;
    }

    this.isSaving.set(true);

    const submitted = this.setupFormModel();
    const request: SetupOwnAdminRequest = {
      ...SETUP_OWN_ADMIN_DEFAULTS,
      firstName: submitted.firstName.trim(),
      lastName: submitted.lastName.trim(),
      email: submitted.email.trim(),
      password: submitted.password,
    };

    this.dataSetupService
      .completeOwnAdmin(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onCompleted(),
        error: (error: unknown) => this.onRejected(error, submitted),
      });
  }

  private onCompleted(): void {
    this.authService.logOut();
    this.toastService.showSuccess(this.translateService.instant(SETUP_TEXT_KEY.SUCCESS), '');
    this.navigationService.navigateToRoot();
  }

  private onAlreadyCompleted(): void {
    this.authService.logOut();
    this.toastService.showInfo(this.translateService.instant(SETUP_TEXT_KEY.ALREADY_COMPLETED));
    this.navigationService.navigateToRoot();
  }

  private isServerError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status >= HttpStatusCode.InternalServerError;
  }

  private onRejected(error: unknown, submitted: SetupFormModel): void {
    this.isSaving.set(false);

    if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
      this.onAlreadyCompleted();
      return;
    }

    const reasons = readAccountRegistrationRejectionReasons(error);
    if (!reasons || reasons.length === 0) {
      this.generalErrorKeys.set([this.isServerError(error) ? SETUP_TEXT_KEY.SERVER_ERROR : SETUP_TEXT_KEY.GENERIC_ERROR]);
      this.focusFirstError();
      return;
    }

    this.serverRejection.set({ email: submitted.email, password: submitted.password, reasons });
    this.generalErrorKeys.set(
      accountRegistrationReasonKeys(
        reasons.filter(
          (reason) => accountRegistrationReasonTarget(reason) === ACCOUNT_REGISTRATION_REASON_TARGET.GENERAL
        )
      )
    );
    this.focusFirstError();
  }

  private readPasswordPolicy(status: SetupStatus | null): PasswordPolicy | null {
    const policy: unknown = status?.passwordPolicy;
    return isPasswordPolicy(policy) ? policy : null;
  }

  private unmetRuleKeys(): readonly string[] {
    return accountRegistrationReasonKeys(
      this.ruleResults()
        .filter((rule) => !rule.met)
        .map((rule) => PASSWORD_RULE_REJECTION_REASON[rule.id])
    );
  }

  private passwordConfirmErrors(model: SetupFormModel): readonly string[] {
    if (model.passwordConfirm.length === 0) {
      return [SETUP_TEXT_KEY.REQUIRED];
    }
    return model.passwordConfirm === model.password ? NO_ERRORS : [SETUP_TEXT_KEY.PASSWORD_MISMATCH];
  }

  private focusFirstError(): void {
    const errors = this.fieldErrors();
    const field = SETUP_FIELD_ORDER.find(
      (candidate) =>
        errors[candidate].length > 0 || (candidate === SETUP_FIELD.PASSWORD && this.showUnmetRulesAsErrors())
    );
    const targetId = field ? this.fieldIds[field] : this.generalErrorKeys().length > 0 ? this.generalErrorId : null;
    if (!targetId) {
      return;
    }

    afterNextRender(() => this.document.getElementById(targetId)?.focus(), { injector: this.injector });
  }
}
