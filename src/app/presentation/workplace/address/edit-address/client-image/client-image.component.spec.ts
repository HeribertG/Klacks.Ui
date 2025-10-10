/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientImageComponent } from './client-image.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';

describe('ClientImageComponent', () => {
  let component: ClientImageComponent;
  let fixture: ComponentFixture<ClientImageComponent>;
  let mockDataManagementClientService: any;
  let mockDataLoadFileService: jasmine.SpyObj<DataLoadFileService>;
  let editClientSignal: WritableSignal<any>;

  beforeEach(async () => {
    editClientSignal = signal({
      id: '123',
      clientImage: undefined,
    });

    mockDataManagementClientService = {
      editClient: editClientSignal,
    };

    mockDataLoadFileService = jasmine.createSpyObj('DataLoadFileService', [
      'uploadFile',
    ]);

    await TestBed.configureTestingModule({
      imports: [ClientImageComponent, TranslateModule.forRoot(), FormsModule],
      providers: [
        {
          provide: DataManagementClientService,
          useValue: mockDataManagementClientService,
        },
        { provide: DataLoadFileService, useValue: mockDataLoadFileService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

      spyOn(component.isChangingEvent, 'emit');

      component.onClickDeleteImage();

      expect(component.imageUrl()).toBeUndefined();
      expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('onClickVisibleTable', () => {
    it('should toggle visibleTable between inline and none', () => {
      expect(component.visibleTable).toBe('inline');
      component.onClickVisibleTable();
      expect(component.visibleTable).toBe('none');
      component.onClickVisibleTable();
      expect(component.visibleTable).toBe('inline');
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
      const mockEffect = jasmine.createSpyObj('EffectRef', ['destroy']);
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

      spyOn(console, 'error');
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
