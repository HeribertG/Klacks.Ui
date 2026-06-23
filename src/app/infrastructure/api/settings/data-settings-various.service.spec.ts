// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DataSettingsVariousService } from './data-settings-various.service';
import { ISetting } from 'src/app/domain/models/settings/settings-various-class';
import { environment } from 'src/environments/environment';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';

describe('DataSettingsVariousService', () => {
    let service: DataSettingsVariousService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [DataSettingsVariousService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataSettingsVariousService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should read a setting', () => {
        const settingValue = 'exampleSetting';
        const mockSetting: ISetting = {
            id: '1',
            type: 'string',
            value: 'exampleValue',
        };

        service.readSetting(settingValue).subscribe((setting) => {
            expect(setting).toEqual(mockSetting);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}GeneralSettings/GetSetting/${settingValue}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockSetting);
    });

    it('should update a setting', () => {
        const mockSetting: ISetting = {
            id: '1',
            type: 'string',
            value: 'updatedValue',
        };

        service.updateSetting(mockSetting).subscribe((setting) => {
            expect(setting).toEqual(mockSetting);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}GeneralSettings/PutSetting/`);
        expect(req.request.method).toBe('PUT');
        req.flush(mockSetting);
    });

    it('should add a setting', () => {
        const mockSetting: ISetting = {
            id: '1',
            type: 'string',
            value: 'newSetting',
        };

        service.addSetting(mockSetting).subscribe((setting) => {
            expect(setting).toEqual(mockSetting);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}GeneralSettings/AddSetting/`);
        expect(req.request.method).toBe('POST');
        req.flush(mockSetting);
    });

    it('should read a list of settings', () => {
        const mockSettings: ISetting[] = [
            { id: '1', type: 'string', value: 'setting1' },
            { id: '2', type: 'number', value: '42' },
        ];

        service.readSettingList().subscribe((settings) => {
            expect(settings).toEqual(mockSettings);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}GeneralSettings/GetSettingsList`);
        expect(req.request.method).toBe('GET');
        req.flush(mockSettings);
    });
});
