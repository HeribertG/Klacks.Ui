// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientImageComponent } from './client-image.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';

describe('ClientImageComponent', () => {
    let component: ClientImageComponent;
    let fixture: ComponentFixture<ClientImageComponent>;
    let mockDataManagementClientService: any;
    let mockDataLoadFileService: any;
    let mockAuthorizationService: any;
    let grantedPermissions: Set<string>;
    let editClientSignal: WritableSignal<any>;
    let editClientDeletedSignal: WritableSignal<boolean>;

    beforeEach(async () => {
        editClientSignal = signal({
            id: '123',
            clientImage: undefined,
        });

        editClientDeletedSignal = signal(false);

        mockDataManagementClientService = {
            editClient: editClientSignal,
            editClientDeleted: editClientDeletedSignal,
            clientEditService: {
                editClient: editClientSignal,
            },
        };

        mockDataLoadFileService = {
            uploadFile: vi.fn()
        };

        grantedPermissions = new Set([PERMISSIONS.CanEditClients]);
        mockAuthorizationService = {
            hasPermission: (p: string) => grantedPermissions.has(p),
            hasAnyPermission: (...p: string[]) => p.some((x) => grantedPermissions.has(x)),
        };

        await TestBed.configureTestingModule({
            imports: [ClientImageComponent, TranslateModule.forRoot(), FormsModule],
            providers: [
                {
                    provide: DataManagementClientService,
                    useValue: mockDataManagementClientService,
                },
                { provide: DataLoadFileService, useValue: mockDataLoadFileService },
                { provide: AuthorizationService, useValue: mockAuthorizationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ClientImageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('isDisabled', () => {
        it('should be true for the Planer role, which lacks CanEditClients', () => {
            grantedPermissions.clear();
            expect(component.isDisabled()).toBe(true);
        });

        it('should be false for the Supervisor role, which holds CanEditClients, when client not deleted', () => {
            grantedPermissions = new Set([PERMISSIONS.CanEditClients]);
            editClientDeletedSignal.set(false);
            expect(component.isDisabled()).toBe(false);
        });
    });

    describe('loadImage', () => {
        it('should set imageUrl to undefined when no client', () => {
            editClientSignal.set(undefined);
            component.loadImage();
            expect(component.imageUrl()).toBeUndefined();
        });

        it('should set imageUrl to undefined when no clientImage', () => {
            editClientSignal.set({
                id: '123',
                clientImage: undefined,
            });
            component.loadImage();
            expect(component.imageUrl()).toBeUndefined();
        });

        it('should create blob URL when clientImage exists', () => {
            const base64Data = btoa('test image data');
            editClientSignal.set({
                id: '123',
                clientImage: {
                    id: '456',
                    imageData: base64Data,
                    contentType: 'image/png',
                    fileName: 'test.png',
                    fileSize: 1024,
                    clientId: '123',
                },
            });

            component.loadImage();
            expect(component.imageUrl()).toBeDefined();
            expect(component.imageUrl()).toContain('blob:');
        });
    });

    describe('onClickDeleteImage', () => {
        it('should clear clientImage and imageUrl', () => {
            editClientSignal.set({
                id: '123',
                clientImage: {
                    id: '456',
                    imageData: 'base64data',
                    contentType: 'image/png',
                    fileName: 'test.png',
                    fileSize: 1024,
                    clientId: '123',
                },
            });

            vi.spyOn(component.isChangingEvent, 'emit');

            component.onClickDeleteImage();

            expect(component.imageUrl()).toBeUndefined();
            expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
        });
    });

    describe('base64ToBlob', () => {
        it('should convert base64 string to Blob', () => {
            const testData = 'test data';
            const base64 = btoa(testData);
            const contentType = 'text/plain';

            const blob = (component as any).base64ToBlob(base64, contentType);

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe(contentType);
        });
    });

    describe('ngOnDestroy', () => {
        it('should destroy all effects', () => {
            const mockEffect = {
                destroy: vi.fn()
            };
            (component as any).effects = [mockEffect];

            component.ngOnDestroy();

            expect(mockEffect.destroy).toHaveBeenCalled();
            expect((component as any).effects.length).toBe(0);
        });
    });

    describe('error handling', () => {
        it('should handle image conversion errors', () => {
            editClientSignal.set({
                id: '123',
                clientImage: {
                    id: '456',
                    imageData: 'invalid-base64',
                    contentType: 'image/png',
                    fileName: 'test.png',
                    fileSize: 1024,
                    clientId: '123',
                },
            });

            vi.spyOn(console, 'error');
            component.loadImage();

            expect(console.error).toHaveBeenCalled();
            expect(component.imageUrl()).toBeUndefined();
        });
    });

    describe('signals', () => {
        it('should initialize signals with correct default values', () => {
            expect(component.imageUrl()).toBeUndefined();
            expect(component.isLoading()).toBe(false);
            expect(component.errorMessage()).toBeUndefined();
        });

        it('should update isLoading signal', () => {
            component.isLoading.set(true);
            expect(component.isLoading()).toBe(true);
        });

        it('should update errorMessage signal', () => {
            const errorMsg = 'Test error';
            component.errorMessage.set(errorMsg);
            expect(component.errorMessage()).toBe(errorMsg);
        });
    });
});
