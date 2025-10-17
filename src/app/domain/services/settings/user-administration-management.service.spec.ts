import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserAdministrationManagementService } from './user-administration-management.service';
import { UserAdministrationService } from 'src/app/infrastructure/api/user-administration.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { IAuthentication, ChangePassword } from 'src/app/domain/models/authentification-class';
import { DomainEventType } from 'src/app/domain/events/domain-events';

describe('UserAdministrationManagementService', () => {
  let service: UserAdministrationManagementService;
  let mockUserAdministrationService: jasmine.SpyObj<UserAdministrationService>;
  let mockEventBus: jasmine.SpyObj<IEventBus>;

  beforeEach(() => {
    mockUserAdministrationService = jasmine.createSpyObj('UserAdministrationService', [
      'readAccountsList',
      'addAccount',
      'deleteAccount',
      'changeRole',
      'ChangePassword',
      'requestPasswordReset',
    ]);

    mockEventBus = jasmine.createSpyObj('IEventBus', ['emit', 'on', 'onAny']);

    mockUserAdministrationService.readAccountsList.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        UserAdministrationManagementService,
        { provide: UserAdministrationService, useValue: mockUserAdministrationService },
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
      ],
    });
  });

  it('should be created', () => {
    service = TestBed.inject(UserAdministrationManagementService);
    expect(service).toBeTruthy();
  });

  describe('loadAccountsList', () => {
    it('should load and sort accounts list', (done) => {
      const mockAccounts: IAuthentication[] = [
        { id: '2', firstName: 'Bob', lastName: 'Smith', email: 'bob@test.com' } as IAuthentication,
        { id: '1', firstName: 'Alice', lastName: 'Johnson', email: 'alice@test.com' } as IAuthentication,
      ];

      mockUserAdministrationService.readAccountsList.and.returnValue(of(mockAccounts));

      service = TestBed.inject(UserAdministrationManagementService);

      setTimeout(() => {
        const accounts = service.accountsList();
        expect(accounts.length).toBe(2);
        expect(accounts[0].firstName).toBe('Alice');
        expect(accounts[1].firstName).toBe('Bob');
        done();
      }, 100);
    });

    it('should emit error event on load failure', (done) => {
      mockUserAdministrationService.readAccountsList.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service = TestBed.inject(UserAdministrationManagementService);

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.ERROR,
          jasmine.objectContaining({
            code: 'ACCOUNTS_LOAD_ERROR',
          })
        );
        done();
      }, 3500);
    });
  });

  describe('addAccount', () => {
    it('should add account and reload list on success', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      const newAccount: IAuthentication = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
      } as IAuthentication;

      mockUserAdministrationService.addAccount.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ id: '123', mailSuccess: true } as any)
      );

      service.addAccount(newAccount);

      setTimeout(() => {
        expect(mockUserAdministrationService.addAccount).toHaveBeenCalledWith(newAccount);
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.INFO,
          jasmine.objectContaining({ context: 'REGISTER' })
        );
        done();
      }, 100);
    });

    it('should handle 400 error with validation message', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      const newAccount: IAuthentication = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      } as IAuthentication;

      const error = { status: 400, error: 'Invalid email' };
      mockUserAdministrationService.addAccount.and.returnValue(
        throwError(() => error)
      );

      service.addAccount(newAccount);

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.ERROR,
          jasmine.objectContaining({
            code: jasmine.any(String),
          })
        );
        done();
      }, 3500);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and reload list', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      mockUserAdministrationService.deleteAccount.and.returnValue(of({} as IAuthentication));

      service.deleteAccount('123');

      setTimeout(() => {
        expect(mockUserAdministrationService.deleteAccount).toHaveBeenCalledWith('123');
        expect(mockUserAdministrationService.readAccountsList).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should emit error event on delete failure', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      mockUserAdministrationService.deleteAccount.and.returnValue(
        throwError(() => new Error('Delete failed'))
      );

      service.deleteAccount('123');

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.ERROR,
          jasmine.objectContaining({
            code: 'ACCOUNT_DELETE_ERROR',
          })
        );
        done();
      }, 3500);
    });
  });

  describe('updateAccountRole', () => {
    it('should update admin role', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      const account: IAuthentication = { id: '123' } as IAuthentication;
      mockUserAdministrationService.changeRole.and.returnValue(of(true));

      service.updateAccountRole(account, 'Admin', true);

      setTimeout(() => {
        expect(mockUserAdministrationService.changeRole).toHaveBeenCalledWith(
          jasmine.objectContaining({
            userId: '123',
            roleName: 'Admin',
            isSelected: true,
          })
        );
        done();
      }, 100);
    });

    it('should emit error on role update failure', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      const account: IAuthentication = { id: '123' } as IAuthentication;
      mockUserAdministrationService.changeRole.and.returnValue(
        throwError(() => new Error('Update failed'))
      );

      service.updateAccountRole(account, 'Authorised', false);

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.ERROR,
          jasmine.objectContaining({
            code: 'ACCOUNT_ROLE_UPDATE_ERROR',
          })
        );
        done();
      }, 3500);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      const passwordChange: ChangePassword = {
        email: 'test@test.com',
      } as ChangePassword;

      mockUserAdministrationService.ChangePassword.and.returnValue(
        of({ success: true, expires: undefined, isAdmin: false, isAuthorised: false })
      );

      service.sendPasswordResetEmail(passwordChange);

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.INFO,
          jasmine.objectContaining({ context: 'REGISTER_SEND_PASSWORD' })
        );
        done();
      }, 100);
    });

    it('should handle password reset email failure', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      const passwordChange: ChangePassword = {
        email: 'test@test.com',
      } as ChangePassword;

      mockUserAdministrationService.ChangePassword.and.returnValue(
        of({ success: false, expires: undefined, isAdmin: false, isAuthorised: false })
      );

      service.sendPasswordResetEmail(passwordChange);

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.INFO,
          jasmine.objectContaining({ context: 'REGISTER_SEND_PASSWORD_ERROR' })
        );
        done();
      }, 100);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      mockUserAdministrationService.requestPasswordReset.and.returnValue(of(null));

      service.requestPasswordReset('test@test.com');

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.INFO,
          jasmine.objectContaining({ context: 'PASSWORD_RESET_EMAIL_SENT' })
        );
        done();
      }, 100);
    });

    it('should handle password reset request failure', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      mockUserAdministrationService.requestPasswordReset.and.returnValue(
        throwError(() => new Error('Reset failed'))
      );

      service.requestPasswordReset('test@test.com');

      setTimeout(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          DomainEventType.INFO,
          jasmine.objectContaining({ context: 'PASSWORD_RESET_EMAIL_ERROR' })
        );
        done();
      }, 3500);
    });
  });

  describe('isLoading signal', () => {
    it('should set isLoading to true during operations', (done) => {
      service = TestBed.inject(UserAdministrationManagementService);

      let wasLoadingSet = false;
      mockUserAdministrationService.deleteAccount.and.callFake(() => {
        wasLoadingSet = service.isLoading();
        return of({} as IAuthentication);
      });

      expect(service.isLoading()).toBe(false);
      service.deleteAccount('123');

      setTimeout(() => {
        expect(wasLoadingSet).toBe(true);
        done();
      }, 50);
    });
  });
});
