/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { signal, computed } from '@angular/core';

import { SettingsGeneralComponent } from './settings-general.component';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';

describe('SettingsGeneralComponent', () => {
  let component: SettingsGeneralComponent;
  let fixture: ComponentFixture<SettingsGeneralComponent>;
  let mockDataLoadFileService: jasmine.SpyObj<DataLoadFileService>;
  let mockSettingsService: jasmine.SpyObj<DataManagementSettingsService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;
  let mockTitleService: jasmine.SpyObj<Title>;

  beforeEach(async () => {
    const dataLoadFileServiceSpy = jasmine.createSpyObj(
      'DataLoadFileService',
      [
        'upLoadFile',
        'downLoadIcon',
        'downLoadLogo',
        'deleteFile',
        'calculateProportionalDimensions',
      ],
      {
        logoImage$: signal('data:image/png;base64,mocklogo'),
        logoImageDimensions$: signal({ width: 200, height: 100 }),
        iconImage: undefined,
        logoImage: undefined,
      }
    );

    dataLoadFileServiceSpy.calculateProportionalDimensions.and.returnValue({
      width: 64,
      height: 32,
    });

    const settingsServiceSpy = jasmine.createSpyObj(
      'DataManagementSettingsService',
      ['loadSettings'],
      {
        settingsChangeTrigger: signal(0),
        appName: 'Klacks',
      }
    );

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    const titleServiceSpy = jasmine.createSpyObj('Title', ['setTitle']);

    await TestBed.configureTestingModule({
      imports: [SettingsGeneralComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataLoadFileService, useValue: dataLoadFileServiceSpy },
        {
          provide: DataManagementSettingsService,
          useValue: settingsServiceSpy,
        },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: Title, useValue: titleServiceSpy },
      ],
    }).compileComponents();

    mockDataLoadFileService = TestBed.inject(
      DataLoadFileService
    ) as jasmine.SpyObj<DataLoadFileService>;
    mockSettingsService = TestBed.inject(
      DataManagementSettingsService
    ) as jasmine.SpyObj<DataManagementSettingsService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;
    mockTitleService = TestBed.inject(Title) as jasmine.SpyObj<Title>;

    fixture = TestBed.createComponent(SettingsGeneralComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Settings Changes', () => {
    it('should trigger settings change on onChange', () => {
      // Arrange
      const initialValue = mockSettingsService.settingsChangeTrigger();

      // Act
      component.onChange();

      // Assert
      expect(mockSettingsService.settingsChangeTrigger()).toBeGreaterThan(
        initialValue
      );
    });

    it('should trigger settings change on onKeyUp', () => {
      // Arrange
      const initialValue = mockSettingsService.settingsChangeTrigger();

      // Act
      component.onKeyUp();

      // Assert
      expect(mockSettingsService.settingsChangeTrigger()).toBeGreaterThan(
        initialValue
      );
    });

    it('should update browser title when app name changes', () => {
      // Arrange
      mockSettingsService.appName = 'New App Name';

      // Act
      component.onChange();

      // Assert
      expect(mockTitleService.setTitle).toHaveBeenCalledWith('New App Name');
    });

    it('should not update browser title if app name is empty', () => {
      // Arrange
      mockSettingsService.appName = '';
      mockTitleService.setTitle.calls.reset();

      // Act
      component.onChange();

      // Assert
      expect(mockTitleService.setTitle).not.toHaveBeenCalled();
    });

    it('should not update browser title if app name is only whitespace', () => {
      // Arrange
      mockSettingsService.appName = '   ';
      mockTitleService.setTitle.calls.reset();

      // Act
      component.onChange();

      // Assert
      expect(mockTitleService.setTitle).not.toHaveBeenCalled();
    });
  });

  describe('Icon Upload', () => {
    it('should upload icon when file is selected', (done) => {
      // Arrange
      const mockFile = new File(['icon content'], 'test-icon.ico', {
        type: 'image/x-icon',
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      };
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onIconSelected(mockEvent);

      // Assert
      setTimeout(() => {
        expect(component.selectedFileIcon).toBeUndefined();
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadIcon).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadLogo).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should handle icon upload via onUploadIcon', (done) => {
      // Arrange
      const mockFile = new File(['icon content'], 'test-icon.ico', {
        type: 'image/x-icon',
      });
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onUploadIcon([mockFile]);

      // Assert
      setTimeout(() => {
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalledWith(
          jasmine.any(FormData)
        );
        done();
      }, 50);
    });

    it('should handle icon upload via onUploadIcon1', (done) => {
      // Arrange
      const mockFile = new File(['icon content'], 'test-icon.ico', {
        type: 'image/x-icon',
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      };
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onUploadIcon1(mockEvent);

      // Assert
      setTimeout(() => {
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should delete icon and reset to default favicon', () => {
      // Arrange
      const mockFavicon = document.createElement('link');
      mockFavicon.id = 'appIcon';
      mockFavicon.href = 'custom-icon.ico';
      document.head.appendChild(mockFavicon);

      // Act
      component.onClickDeleteIcon();

      // Assert
      expect(mockDataLoadFileService.deleteFile).toHaveBeenCalledWith(
        'own-icon.ico'
      );
      expect(mockDataLoadFileService.iconImage).toBeUndefined();
      expect(mockFavicon.href).toContain('favicon.ico');

      document.head.removeChild(mockFavicon);
    });
  });

  describe('Logo Upload', () => {
    it('should upload logo when file is selected', (done) => {
      // Arrange
      const mockFile = new File(['logo content'], 'test-logo.png', {
        type: 'image/png',
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      };
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onLogoSelected(mockEvent);

      // Assert
      setTimeout(() => {
        expect(component.selectedFileLogo).toBeUndefined();
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadIcon).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadLogo).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should handle logo upload via onUploadLogo', (done) => {
      // Arrange
      const mockFile = new File(['logo content'], 'test-logo.png', {
        type: 'image/png',
      });
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onUploadLogo([mockFile]);

      // Assert
      setTimeout(() => {
        const uploadCall = mockDataLoadFileService.upLoadFile.calls.mostRecent();
        const formData = uploadCall.args[0] as FormData;
        expect(formData).toBeInstanceOf(FormData);
        done();
      }, 50);
    });

    it('should handle logo upload via onUploadLogo1', (done) => {
      // Arrange
      const mockFile = new File(['logo content'], 'test-logo.png', {
        type: 'image/png',
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      };
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onUploadLogo1(mockEvent);

      // Assert
      setTimeout(() => {
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should delete logo', () => {
      // Arrange & Act
      component.onClickDeleteLogo();

      // Assert
      expect(mockDataLoadFileService.deleteFile).toHaveBeenCalledWith(
        'own-logo.png'
      );
      expect(mockDataLoadFileService.logoImage).toBeUndefined();
    });
  });

  describe('Logo Display', () => {
    it('should compute logo image from service', () => {
      // Arrange
      fixture.detectChanges();

      // Act
      const logoImage = component.logoImage();

      // Assert
      expect(logoImage).toBe('data:image/png;base64,mocklogo');
    });

    it('should compute logo dimensions from service', () => {
      // Arrange
      fixture.detectChanges();

      // Act
      const dimensions = component.logoDimensions();

      // Assert
      expect(dimensions).toEqual({ width: 200, height: 100 });
    });

    it('should calculate proportional logo display dimensions', () => {
      // Arrange
      fixture.detectChanges();

      // Act
      const displayDimensions = component.logoDisplayDimensions();

      // Assert
      expect(displayDimensions.width).toBe(64);
      expect(displayDimensions.height).toBe(32);
      expect(
        mockDataLoadFileService.calculateProportionalDimensions
      ).toHaveBeenCalledWith(200, 100, 64, 64, 80);
    });

    it('should calculate proportional dimensions correctly', () => {
      // Arrange
      fixture.detectChanges();

      // Act
      const displayDimensions = component.logoDisplayDimensions();

      // Assert
      expect(displayDimensions).toBeDefined();
      expect(displayDimensions.width).toBe(64);
      expect(displayDimensions.height).toBe(32);
    });
  });

  describe('Component Lifecycle', () => {
    it('should complete destroy$ subject on ngOnDestroy', () => {
      // Arrange
      const nextSpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should update app name and browser title together', () => {
      // Arrange
      const newAppName = 'My Custom App';
      mockSettingsService.appName = newAppName;

      // Act
      component.onChange();

      // Assert
      expect(mockSettingsService.settingsChangeTrigger()).toBeGreaterThan(0);
      expect(mockTitleService.setTitle).toHaveBeenCalledWith(newAppName);
    });

    it('should handle complete file upload workflow for icon', (done) => {
      // Arrange
      const mockFile = new File(['icon'], 'icon.ico', { type: 'image/x-icon' });
      const mockEvent = { target: { files: [mockFile] } };
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onIconSelected(mockEvent);

      // Assert
      setTimeout(() => {
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadIcon).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadLogo).toHaveBeenCalled();
        expect(component.selectedFileIcon).toBeUndefined();
        done();
      }, 50);
    });

    it('should handle complete file upload workflow for logo', (done) => {
      // Arrange
      const mockFile = new File(['logo'], 'logo.png', { type: 'image/png' });
      const mockEvent = { target: { files: [mockFile] } };
      mockDataLoadFileService.upLoadFile.and.returnValue(of({}));

      // Act
      component.onLogoSelected(mockEvent);

      // Assert
      setTimeout(() => {
        expect(mockDataLoadFileService.upLoadFile).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadIcon).toHaveBeenCalled();
        expect(mockDataLoadFileService.downLoadLogo).toHaveBeenCalled();
        expect(component.selectedFileLogo).toBeUndefined();
        done();
      }, 50);
    });
  });
});
