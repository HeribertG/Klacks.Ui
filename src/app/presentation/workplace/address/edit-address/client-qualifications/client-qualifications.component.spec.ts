// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ClientQualificationsComponent } from './client-qualifications.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';

describe('ClientQualificationsComponent', () => {
  let component: ClientQualificationsComponent;
  let fixture: ComponentFixture<ClientQualificationsComponent>;
  let mockDataManagementClientService: any;
  let mockQualificationService: any;
  let mockAuthorizationService: any;
  let editClientSignal: WritableSignal<any>;
  let editClientDeletedSignal: WritableSignal<boolean>;

  const timeLimited: IQualification = {
    id: 'q-time',
    name: { de: 'Erste Hilfe', en: 'First aid' },
    emoji: '🚑',
    isTimeLimited: true,
    type: QualificationType.Work,
    countries: [],
    category: QualificationCategory.None,
  };
  const permanent: IQualification = {
    id: 'q-perm',
    name: { de: 'Diplom', en: 'Diploma' },
    emoji: '🎓',
    isTimeLimited: false,
    type: QualificationType.Work,
    countries: [],
    category: QualificationCategory.None,
  };

  beforeEach(async () => {
    editClientSignal = signal({
      id: '123',
      qualifications: [
        { id: '1', clientId: '123', qualificationId: 'q-time', level: 2, validUntil: undefined },
      ],
    });
    editClientDeletedSignal = signal(false);

    mockDataManagementClientService = {
      editClient: editClientSignal,
      editClientDeleted: editClientDeletedSignal,
      addQualification: vi.fn(),
      clientEditService: {
        editClient: editClientSignal,
      },
    };

    mockQualificationService = {
      getQualificationList: vi.fn().mockReturnValue(of([timeLimited, permanent])),
    };

    mockAuthorizationService = {
      isAdmin: true,
    };

    await TestBed.configureTestingModule({
      imports: [
        ClientQualificationsComponent,
        TranslateModule.forRoot(),
        FormsModule,
        NgbModule,
      ],
      providers: [
        { provide: DataManagementClientService, useValue: mockDataManagementClientService },
        { provide: DataQualificationService, useValue: mockQualificationService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientQualificationsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the qualification master list on init', () => {
    expect(mockQualificationService.getQualificationList).toHaveBeenCalled();
    expect(component.qualifications.length).toBe(2);
    expect(component.hasMasterQualifications()).toBe(true);
  });

  describe('isDisabled', () => {
    it('should be true when client is deleted', () => {
      editClientDeletedSignal.set(true);
      expect(component.isDisabled()).toBe(true);
    });

    it('should be true when not admin', () => {
      mockAuthorizationService.isAdmin = false;
      expect(component.isDisabled()).toBe(true);
    });

    it('should be false when admin and client not deleted', () => {
      mockAuthorizationService.isAdmin = true;
      editClientDeletedSignal.set(false);
      expect(component.isDisabled()).toBe(false);
    });
  });

  describe('lookups', () => {
    it('should resolve the emoji of the selected qualification', () => {
      const row = editClientSignal().qualifications[0];
      expect(component.getEmoji(row)).toBe('🚑');
    });

    it('should report time-limited state from the master entry', () => {
      const row = editClientSignal().qualifications[0];
      expect(component.isTimeLimited(row)).toBe(true);
    });

    it('should return empty emoji for an unpicked row', () => {
      expect(component.getEmoji({ level: 2 } as any)).toBe('');
    });
  });

  describe('availableQualifications', () => {
    it('should exclude qualifications already used by other rows', () => {
      editClientSignal.set({
        id: '123',
        qualifications: [
          { qualificationId: 'q-time', level: 2 },
          { qualificationId: undefined, level: 2 },
        ],
      });
      const newRow = editClientSignal().qualifications[1];
      const available = component.availableQualifications(newRow);
      expect(available.map((q) => q.id)).toEqual(['q-perm']);
    });

    it('should keep the row own current selection in the list', () => {
      const row = editClientSignal().qualifications[0];
      const available = component.availableQualifications(row);
      expect(available.map((q) => q.id)).toContain('q-time');
    });
  });

  describe('addQualification', () => {
    it('should delegate to the data management service and emit change', () => {
      const spy = vi.spyOn(component.isChangingEvent, 'emit');
      component.addQualification();
      expect(mockDataManagementClientService.addQualification).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('removeQualification', () => {
    it('should remove the row at the given index', () => {
      expect(editClientSignal().qualifications.length).toBe(1);
      component.removeQualification(0);
      expect(editClientSignal().qualifications.length).toBe(0);
    });
  });

  describe('onQualificationChange', () => {
    it('should set the qualification id and emit change', () => {
      const spy = vi.spyOn(component.isChangingEvent, 'emit');
      component.onQualificationChange(0, 'q-perm');
      expect(editClientSignal().qualifications[0].qualificationId).toBe('q-perm');
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('should clear the expiry date when the new qualification is not time-limited', () => {
      const row = editClientSignal().qualifications[0];
      row.validUntil = new Date('2030-01-01');
      component.onQualificationChange(0, 'q-perm');
      expect(editClientSignal().qualifications[0].validUntil).toBeUndefined();
    });
  });

  describe('onLevelChange', () => {
    it('should set the level and emit change', () => {
      const spy = vi.spyOn(component.isChangingEvent, 'emit');
      component.onLevelChange(0, 4);
      expect(editClientSignal().qualifications[0].level).toBe(4);
      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('setValidUntil', () => {
    it('should convert the picker value to a date and emit change', () => {
      const spy = vi.spyOn(component.isChangingEvent, 'emit');
      const row = editClientSignal().qualifications[0];
      component.setValidUntil(row, { year: 2030, month: 6, day: 15 });
      expect(row.validUntil).toBeInstanceOf(Date);
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('should reset the date when the picker is cleared', () => {
      const row = editClientSignal().qualifications[0];
      component.setValidUntil(row, undefined);
      expect(row.validUntil).toBeUndefined();
    });
  });

  describe('trackByIndex', () => {
    it('should return the index', () => {
      expect(component.trackByIndex(3)).toBe(3);
    });
  });
});
