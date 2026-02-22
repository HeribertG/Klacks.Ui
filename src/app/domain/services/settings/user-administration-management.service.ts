// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject, signal } from '@angular/core';
import { Subject, timer, of } from 'rxjs';
import { takeUntil, retry, catchError, tap, finalize } from 'rxjs/operators';
import { UserAdministrationService } from 'src/app/infrastructure/api/settings/user-administration.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import {
  IAuthentication,
  ChangePassword,
  ChangeRole,
} from 'src/app/domain/models/authentification-class';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

@Injectable({
  providedIn: 'root',
})
export class UserAdministrationManagementService {
  private userAdministrationService = inject(UserAdministrationService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private localStorageService = inject(LocalStorageService);
  private destroy$ = new Subject<void>();

  public accountsList = signal<IAuthentication[]>([]);
  public isLoading = signal<boolean>(false);
  public currentAccountId = signal<string>('');

  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    this.initializeCurrentAccountId();
  }

  public loadAccounts(): void {
    if (!this.isLoading()) {
      this.loadAccountsList();
    }
  }

  private initializeCurrentAccountId(): void {
    const userId = this.localStorageService.get(StorageKeys.TOKEN_USERID);
    if (userId) {
      this.currentAccountId.set(userId);
    }
  }

  private loadAccountsList(): void {
    this.isLoading.set(true);

    this.userAdministrationService
      .readAccountsList()
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Retry ${retryCount} after error:`, error);
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        catchError((error) => {
          console.error('Failed to load accounts list:', error);
          this.eventBus.emit(DomainEventType.ERROR, {
            message: '',
            code: 'ACCOUNTS_LOAD_ERROR',
            context: 'UserAdministrationManagementService.loadAccountsList',
          });
          return of([]);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe((accounts) => {
        if (accounts) {
          const sortedAccounts = this.sortAccounts(accounts);
          this.accountsList.set(sortedAccounts);
        }
      });
  }

  private sortAccounts(accounts: IAuthentication[]): IAuthentication[] {
    return [...accounts].sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`;
      const nameB = `${b.lastName} ${b.firstName}`;
      return nameA.localeCompare(nameB);
    });
  }

  addAccount(account: IAuthentication): void {
    this.isLoading.set(true);

    this.userAdministrationService
      .addAccount(account)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Retry ${retryCount} for addAccount:`, error);
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        tap((result) => {
          if (result?.id) {
            this.eventBus.emit(DomainEventType.INFO, {
              message: '',
              context: 'REGISTER',
            });
            this.eventBus.emit(DomainEventType.INFO, {
              message: '',
              context: 'PASSWORD_RESET_EMAIL_SENT',
            });
          } else if (result && !result.mailSuccess) {
            this.eventBus.emit(DomainEventType.INFO, {
              message: '',
              context: 'EMAIL_WARNING',
            });
          }
        }),
        catchError((error) => {
          this.handleAddAccountError(error, account);
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.loadAccountsList();
      });
  }

  private handleAddAccountError(error: any, account: IAuthentication): void {
    console.error('User creation error:', error);

    if (error.status === 500) {
      this.eventBus.emit(DomainEventType.INFO, {
        message: '',
        context: 'USER_CREATION_FALLBACK',
      });

      this.userAdministrationService
        .requestPasswordReset(account.email!)
        .pipe(
          takeUntil(this.destroy$),
          catchError((resetError) => {
            console.error('Password reset fallback failed:', resetError);
            this.eventBus.emit(DomainEventType.ERROR, {
              message: '',
              code: 'USER_CREATION_COMPLETE_FAILURE',
              context: 'UserAdministrationManagementService.addAccount',
            });
            return of(null);
          })
        )
        .subscribe(() => {
          this.eventBus.emit(DomainEventType.INFO, {
            message: '',
            context: 'PASSWORD_RESET_FALLBACK_SUCCESS',
          });
        });
    } else if (error.status === 400) {
      const errorKey = this.mapValidationErrorToI18nKey(error.error);
      this.eventBus.emit(DomainEventType.ERROR, {
        message: '',
        code: errorKey,
        context: 'UserAdministrationManagementService.addAccount',
      });
    } else {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: '',
        code: 'USER_CREATION_ERROR',
        context: 'UserAdministrationManagementService.addAccount',
      });
    }
  }

  deleteAccount(id: string): void {
    this.isLoading.set(true);

    this.userAdministrationService
      .deleteAccount(id)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Retry ${retryCount} for deleteAccount:`, error);
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        catchError((error) => {
          console.error('Failed to delete account:', error);
          this.eventBus.emit(DomainEventType.ERROR, {
            message: '',
            code: 'ACCOUNT_DELETE_ERROR',
            context: 'UserAdministrationManagementService.deleteAccount',
          });
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.loadAccountsList();
      });
  }

  updateAccount(account: IAuthentication): void {
    this.isLoading.set(true);

    this.userAdministrationService
      .updateAccount(account)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Retry ${retryCount} for updateAccount:`, error);
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        catchError((error) => {
          console.error('Failed to update account:', error);
          this.eventBus.emit(DomainEventType.ERROR, {
            message: '',
            code: 'ACCOUNT_UPDATE_ERROR',
            context: 'UserAdministrationManagementService.updateAccount',
          });
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.loadAccountsList();
      });
  }

  updateAccountRole(
    account: IAuthentication,
    roleName: 'Admin' | 'Authorised',
    isSelected: boolean
  ): void {
    this.isLoading.set(true);

    const changeRole = new ChangeRole();
    changeRole.userId = account.id!;
    changeRole.roleName = roleName;
    changeRole.isSelected = isSelected;

    this.userAdministrationService
      .changeRole(changeRole)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Retry ${retryCount} for updateAccountRole:`, error);
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        catchError((error) => {
          console.error('Failed to update account role:', error);
          this.eventBus.emit(DomainEventType.ERROR, {
            message: '',
            code: 'ACCOUNT_ROLE_UPDATE_ERROR',
            context: 'UserAdministrationManagementService.updateAccountRole',
          });
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.loadAccountsList();
      });
  }

  sendPasswordResetEmail(passwordChange: ChangePassword): void {
    this.isLoading.set(true);

    this.userAdministrationService
      .ChangePassword(passwordChange)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(
              `Retry ${retryCount} for sendPasswordResetEmail:`,
              error
            );
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        catchError((error) => {
          console.error('Failed to send password reset:', error);
          this.eventBus.emit(DomainEventType.INFO, {
            message: '',
            context: 'REGISTER_SEND_PASSWORD_ERROR',
          });
          return of({ success: false });
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe((result) => {
        if (result.success) {
          this.eventBus.emit(DomainEventType.INFO, {
            message: '',
            context: 'REGISTER_SEND_PASSWORD',
          });
        } else {
          this.eventBus.emit(DomainEventType.INFO, {
            message: '',
            context: 'REGISTER_SEND_PASSWORD_ERROR',
          });
        }
      });
  }

  requestPasswordReset(email: string): void {
    this.isLoading.set(true);

    this.userAdministrationService
      .requestPasswordReset(email)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(
              `Retry ${retryCount} for requestPasswordReset:`,
              error
            );
            return timer(this.RETRY_DELAY_MS * retryCount);
          },
        }),
        catchError((error) => {
          console.error('Failed to request password reset:', error);
          this.eventBus.emit(DomainEventType.INFO, {
            message: '',
            context: 'PASSWORD_RESET_EMAIL_ERROR',
          });
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.eventBus.emit(DomainEventType.INFO, {
          message: '',
          context: 'PASSWORD_RESET_EMAIL_SENT',
        });
      });
  }

  generateUsername(firstName: string, lastName: string): void {
    this.userAdministrationService
      .generateUsername(firstName, lastName)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Failed to generate username:', error);
          return of('');
        })
      )
      .subscribe((username) => {
        this.generatedUsername.set(username);
      });
  }

  public generatedUsername = signal<string>('');

  private mapValidationErrorToI18nKey(errorMessage: string | any): string {
    let errorKey = 'INVALID_USER_DATA';

    if (typeof errorMessage === 'string') {
      const lowerError = errorMessage.toLowerCase();

      if (
        lowerError.includes('benutzername') ||
        lowerError.includes('username')
      ) {
        if (
          lowerError.includes('mindestens') ||
          lowerError.includes('at least')
        ) {
          errorKey = 'USERNAME_MIN_LENGTH';
        }
      } else if (
        lowerError.includes('e-mail') ||
        lowerError.includes('email')
      ) {
        errorKey = 'INVALID_EMAIL';
      } else if (
        lowerError.includes('passwort') ||
        lowerError.includes('password')
      ) {
        errorKey = 'PASSWORD_REQUIREMENTS';
      } else if (
        lowerError.includes('vorname') ||
        lowerError.includes('first name')
      ) {
        errorKey = 'FIRSTNAME_REQUIRED';
      } else if (
        lowerError.includes('nachname') ||
        lowerError.includes('last name')
      ) {
        errorKey = 'LASTNAME_REQUIRED';
      }
    } else if (errorMessage && typeof errorMessage === 'object') {
      if (errorMessage.errors) {
        const errors = errorMessage.errors;

        if (errors.UserName) {
          errorKey = 'USERNAME_MIN_LENGTH';
        } else if (errors.Email) {
          errorKey = 'INVALID_EMAIL';
        } else if (errors.Password) {
          errorKey = 'PASSWORD_REQUIREMENTS';
        } else if (errors.FirstName) {
          errorKey = 'FIRSTNAME_REQUIRED';
        } else if (errors.LastName) {
          errorKey = 'LASTNAME_REQUIRED';
        }
      }
    }

    return errorKey;
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
