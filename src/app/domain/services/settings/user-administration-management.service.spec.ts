import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserAdministrationManagementService } from './user-administration-management.service';
import { UserAdministrationService } from 'src/app/infrastructure/api/user-administration.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { IAuthentication, ChangePassword } from 'src/app/domain/models/authentification-class';
import { DomainEventType } from 'src/app/domain/events/domain-events';

describe('UserAdministrationManagementService', () => {
    let service: UserAdministrationManagementService;
    let mockUserAdministrationService: any;
    let mockEventBus: any;

    beforeEach(() => {
        mockUserAdministrationService = {
            readAccountsList: vi.fn(),
            addAccount: vi.fn(),
            deleteAccount: vi.fn(),
            changeRole: vi.fn(),
            ChangePassword: vi.fn(),
            requestPasswordReset: vi.fn()
        };

        mockEventBus = {
            emit: vi.fn(),
            on: vi.fn(),
            onAny: vi.fn()
        };

        mockUserAdministrationService.readAccountsList.mockReturnValue(of([]));

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
        it('should load and sort accounts list', async () => {
            const mockAccounts: IAuthentication[] = [
                { id: '2', firstName: 'Bob', lastName: 'Smith', email: 'bob@test.com' } as IAuthentication,
                { id: '1', firstName: 'Alice', lastName: 'Johnson', email: 'alice@test.com' } as IAuthentication,
            ];

            mockUserAdministrationService.readAccountsList.mockReturnValue(of(mockAccounts));

            service = TestBed.inject(UserAdministrationManagementService);

            await new Promise(resolve => setTimeout(resolve, 110));
            const accounts = service.accountsList();
            expect(accounts.length).toBe(2);
            expect(accounts[0].firstName).toBe('Alice');
            expect(accounts[1].firstName).toBe('Bob');
        });

        it('should emit error event on load failure', async () => {
            mockUserAdministrationService.readAccountsList.mockReturnValue(throwError(() => new Error('Network error')));

            service = TestBed.inject(UserAdministrationManagementService);

            await new Promise(resolve => setTimeout(resolve, 3510));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.ERROR, expect.objectContaining({
                code: 'ACCOUNTS_LOAD_ERROR',
            }));
        });
    });

    describe('addAccount', () => {
        it('should add account and reload list on success', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            const newAccount: IAuthentication = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
            } as IAuthentication;

            mockUserAdministrationService.addAccount.mockReturnValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            of({ id: '123', mailSuccess: true } as any));

            service.addAccount(newAccount);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockUserAdministrationService.addAccount).toHaveBeenCalledWith(newAccount);
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({ context: 'REGISTER' }));
        });

        it('should handle 400 error with validation message', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            const newAccount: IAuthentication = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
            } as IAuthentication;

            const error = { status: 400, error: 'Invalid email' };
            mockUserAdministrationService.addAccount.mockReturnValue(throwError(() => error));

            service.addAccount(newAccount);

            await new Promise(resolve => setTimeout(resolve, 3510));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.ERROR, expect.objectContaining({
                code: expect.any(String),
            }));
        });
    });

    describe('deleteAccount', () => {
        it('should delete account and reload list', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            mockUserAdministrationService.deleteAccount.mockReturnValue(of({} as IAuthentication));

            service.deleteAccount('123');

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockUserAdministrationService.deleteAccount).toHaveBeenCalledWith('123');
            expect(mockUserAdministrationService.readAccountsList).toHaveBeenCalled();
        });

        it('should emit error event on delete failure', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            mockUserAdministrationService.deleteAccount.mockReturnValue(throwError(() => new Error('Delete failed')));

            service.deleteAccount('123');

            await new Promise(resolve => setTimeout(resolve, 3510));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.ERROR, expect.objectContaining({
                code: 'ACCOUNT_DELETE_ERROR',
            }));
        });
    });

    describe('updateAccountRole', () => {
        it('should update admin role', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            const account: IAuthentication = { id: '123' } as IAuthentication;
            mockUserAdministrationService.changeRole.mockReturnValue(of(true));

            service.updateAccountRole(account, 'Admin', true);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockUserAdministrationService.changeRole).toHaveBeenCalledWith(expect.objectContaining({
                userId: '123',
                roleName: 'Admin',
                isSelected: true,
            }));
        });

        it('should emit error on role update failure', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            const account: IAuthentication = { id: '123' } as IAuthentication;
            mockUserAdministrationService.changeRole.mockReturnValue(throwError(() => new Error('Update failed')));

            service.updateAccountRole(account, 'Authorised', false);

            await new Promise(resolve => setTimeout(resolve, 3510));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.ERROR, expect.objectContaining({
                code: 'ACCOUNT_ROLE_UPDATE_ERROR',
            }));
        });
    });

    describe('sendPasswordResetEmail', () => {
        it('should send password reset email successfully', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            const passwordChange: ChangePassword = {
                email: 'test@test.com',
            } as ChangePassword;

            mockUserAdministrationService.ChangePassword.mockReturnValue(of({ success: true, expires: undefined, isAdmin: false, isAuthorised: false }));

            service.sendPasswordResetEmail(passwordChange);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({ context: 'REGISTER_SEND_PASSWORD' }));
        });

        it('should handle password reset email failure', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            const passwordChange: ChangePassword = {
                email: 'test@test.com',
            } as ChangePassword;

            mockUserAdministrationService.ChangePassword.mockReturnValue(of({ success: false, expires: undefined, isAdmin: false, isAuthorised: false }));

            service.sendPasswordResetEmail(passwordChange);

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({ context: 'REGISTER_SEND_PASSWORD_ERROR' }));
        });
    });

    describe('requestPasswordReset', () => {
        it('should request password reset successfully', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            mockUserAdministrationService.requestPasswordReset.mockReturnValue(of(null));

            service.requestPasswordReset('test@test.com');

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({ context: 'PASSWORD_RESET_EMAIL_SENT' }));
        });

        it('should handle password reset request failure', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            mockUserAdministrationService.requestPasswordReset.mockReturnValue(throwError(() => new Error('Reset failed')));

            service.requestPasswordReset('test@test.com');

            await new Promise(resolve => setTimeout(resolve, 3510));
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({ context: 'PASSWORD_RESET_EMAIL_ERROR' }));
        });
    });

    describe('isLoading signal', () => {
        it('should set isLoading to true during operations', async () => {
            service = TestBed.inject(UserAdministrationManagementService);

            let wasLoadingSet = false;
            mockUserAdministrationService.deleteAccount.mockImplementation(() => {
                wasLoadingSet = service.isLoading();
                return of({} as IAuthentication);
            });

            expect(service.isLoading()).toBe(false);
            service.deleteAccount('123');

            await new Promise(resolve => setTimeout(resolve, 60));
            expect(wasLoadingSet).toBe(true);
        });
    });
});
