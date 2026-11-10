// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Own-admin setup page of a freshly deployed instance, in two modes: the anonymous first start (route data
 * ROUTE_DATA_FIRST_START, reached before any sign-in while the backend still allows it) and the forced page of the
 * seeded admin account signed in. Collects the caller's own admin account and replaces the seeded admin with it on
 * the server (which also deactivates the seeded admin in the same transaction). Afterwards the seeded session, if
 * any, is ended and the new admin is signed in with the credentials just typed and led to the country and industry
 * page; should that sign-in fail, the page falls back to the login page with the success message. The server derives
 * the user name itself; the new admin signs in with the email address. The password has to be
 * typed twice because a typo would otherwise lock the user out once the seeded admin is gone.
 * Errors are shown inline at the field they concern (or above the button), never as a toast. When the first-start
 * status says this browser needs the installer's one-time setup code, a code field comes first; a refusal (409) while
 * the first start is still pending then means the code did not match and is shown inline, a refusal after the setup
 * was completed elsewhere leads to the login page.
 * @param setupFormModel - Signal holding the new admin's registration form values
 * @param passwordRules - Live state of every rule the backend password policy demands; empty when the policy could not be loaded
 * @param fieldErrors - Translation keys of the errors shown under each field
 * @param generalErrorKeys - Translation keys of the errors shown above the submit button
 * @param requiresSetupCode - True while the first start of this browser needs the installer's setup code
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
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { ROUTE_DATA_FIRST_START } from 'src/app/domain/constants/setup.constants';
import { RealtimeSessionStartService } from 'src/app/application/services/realtime-session-start.service';
import { FirstStartSetupStatusService } from 'src/app/domain/services/setup/first-start-setup-status.service';
import { PasswordPolicy } from 'src/app/domain/models/setup/password-policy.interface';
import { SetupOwnAdminRequest } from 'src/app/domain/models/setup/setup-own-admin-request.interface';
import { SetupStatus } from 'src/app/domain/models/setup/setup-status.interface';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SetupFormModel } from './setup-form-model.interface';
import { SetupServerRejection } from './setup-server-rejection.interface';

const SETUP_FIELD = {
  SETUP_CODE: 'setupCode',
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
  SETUP_CODE_HINT: 'setupForm-setupCode-hint',
} as const;

const SETUP_TEXT_KEY = {
  RULE_PREFIX: 'setup.rule.',
  REQUIRED: 'setup.error.required',
  PASSWORD_MISMATCH: 'setup.error.passwordMismatch',
  GENERIC_ERROR: 'setup.error',
  SERVER_ERROR: 'setup.error.server',
  ALREADY_COMPLETED: 'setup.error.alreadyCompleted',
  SETUP_CODE_REJECTED: 'setup.error.setupCodeRejected',
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
  private readonly firstStartStatus = inject(FirstStartSetupStatusService);
  private readonly realtimeSessionStart = inject(RealtimeSessionStartService);

  private readonly isFirstStart = inject(ActivatedRoute).snapshot.data[ROUTE_DATA_FIRST_START] === true;

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
  readonly setupCodeHintId = SETUP_ELEMENT_ID.SETUP_CODE_HINT;

  public setupFormModel = signal<SetupFormModel>({
    setupCode: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  public setupForm = form(this.setupFormModel);

  public isSaving = signal(false);

  private readonly passwordPolicy = signal<PasswordPolicy | null>(null);
  readonly requiresSetupCode = signal(false);
  private readonly submitAttempted = signal(false);
  private readonly serverRejection = signal<SetupServerRejection | null>(null);
  readonly generalErrorKeys = signal<string[]>([]);
  readonly setupCodeInvalid = computed(
    () =>
      this.fieldErrors().setupCode.length > 0 || this.generalErrorKeys().includes(SETUP_TEXT_KEY.SETUP_CODE_REJECTED)
  );

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
      setupCode: this.requiresSetupCode() && isBlank(model.setupCode) ? [SETUP_TEXT_KEY.REQUIRED] : NO_ERRORS,
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
    const status$ = this.isFirstStart ? this.dataSetupService.getFirstStartStatus() : this.dataSetupService.getStatus();
    status$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status: SetupStatus | null) => {
          this.passwordPolicy.set(this.readPasswordPolicy(status));
          this.requiresSetupCode.set(this.isFirstStart && status?.requiresSetupCode === true);
        },
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

    const complete$ = this.isFirstStart
      ? this.dataSetupService.completeFirstStart({ ...request, setupCode: submitted.setupCode.trim() })
      : this.dataSetupService.completeOwnAdmin(request);
    complete$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.onCompleted(request.email, request.password),
        error: (error: unknown) => this.onRejected(error, submitted),
      });
  }

  private async onCompleted(email: string, password: string): Promise<void> {
    this.firstStartStatus.markCompleted();
    this.endSeededSession();

    if (await this.authService.logIn(email, password)) {
      this.realtimeSessionStart.startAfterSignIn();
      await this.navigationService.navigateToCompanySetup();
      return;
    }

    this.isSaving.set(false);
    this.toastService.showSuccess(this.translateService.instant(SETUP_TEXT_KEY.SUCCESS), '');
    void this.navigationService.navigateToRoot();
  }

  private onAlreadyCompleted(): void {
    this.firstStartStatus.markCompleted();
    this.endSeededSession();
    this.toastService.showInfo(this.translateService.instant(SETUP_TEXT_KEY.ALREADY_COMPLETED));
    this.navigationService.navigateToRoot();
  }

  private async onConflict(): Promise<void> {
    const codeRejected = this.requiresSetupCode() && (await this.isFirstStartStillPending());
    this.isSaving.set(false);
    if (codeRejected) {
      this.generalErrorKeys.set([SETUP_TEXT_KEY.SETUP_CODE_REJECTED]);
      this.focusFirstError();
      return;
    }

    this.onAlreadyCompleted();
  }

  /**
   * Asks the first-start status again after a refusal. A failed probe counts as "still pending", so a wrong code
   * keeps the user on the page instead of sending them to the login page on a transient error.
   */
  private async isFirstStartStillPending(): Promise<boolean> {
    try {
      const status = await firstValueFrom(this.dataSetupService.getFirstStartStatus());
      return status?.requiresOwnAdmin === true;
    } catch {
      return true;
    }
  }

  private endSeededSession(): void {
    if (this.authService.authenticated()) {
      this.authService.logOut();
    }
  }

  private isServerError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status >= HttpStatusCode.InternalServerError;
  }

  private onRejected(error: unknown, submitted: SetupFormModel): void {
    if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
      void this.onConflict();
      return;
    }

    this.isSaving.set(false);

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
