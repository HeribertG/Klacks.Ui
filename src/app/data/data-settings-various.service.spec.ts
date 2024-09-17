import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { DataSettingsVariousService } from './data-settings-various.service';
import { ISetting } from '../core/settings-various-class';
import { environment } from 'src/environments/environment';

describe('DataSettingsVariousService', () => {
  let service: DataSettingsVariousService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataSettingsVariousService],
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

    const req = httpTestingController.expectOne(
      `${environment.baseUrl}Settings/GetSetting/${settingValue}`
    );
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

    const req = httpTestingController.expectOne(
      `${environment.baseUrl}Settings/PutSetting/`
    );
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

    const req = httpTestingController.expectOne(
      `${environment.baseUrl}Settings/AddSetting/`
    );
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

    const req = httpTestingController.expectOne(
      `${environment.baseUrl}Settings/GetSettingsList`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockSettings);
  });
});
