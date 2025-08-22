import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { DataManagementBreakService } from './data-management-break.service';
import { ToastShowService } from '../../presentation/toast/toast-show.service';
import { DataBreakService } from '../../infrastructure/api/data-break.service';
import { IClientBreak, IMembership } from '../models/client-class';
import { IBreak } from '../models/break-class';

describe('DataManagementBreakService', () => {
  let service: DataManagementBreakService;
  let mockToastShowService: jasmine.SpyObj<ToastShowService>;
  let mockDataBreakService: jasmine.SpyObj<DataBreakService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastShowService', ['showError']);
    const dataSpy = jasmine.createSpyObj('DataBreakService', [
      'addBreak',
      'updateBreak',
      'deleteBreak',
    ]);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['get']);

    TestBed.configureTestingModule({
      imports: [HttpClientModule, TranslateModule.forRoot()],
      providers: [
        DataManagementBreakService,
        { provide: ToastShowService, useValue: toastSpy },
        { provide: DataBreakService, useValue: dataSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
    });

    service = TestBed.inject(DataManagementBreakService);
    mockToastShowService = TestBed.inject(
      ToastShowService
    ) as jasmine.SpyObj<ToastShowService>;
    mockDataBreakService = TestBed.inject(
      DataBreakService
    ) as jasmine.SpyObj<DataBreakService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    mockTranslateService.get.and.returnValue(of('Translated message {0} {1}'));
    mockDataBreakService.addBreak.and.returnValue(
      of({ id: '1', from: new Date(), until: new Date() } as IBreak)
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Membership validation', () => {
    let clientWithMembership: IClientBreak;
    let clientWithoutMembership: IClientBreak;
    let validBreak: IBreak;
    let invalidBreakBefore: IBreak;
    let invalidBreakAfter: IBreak;

    beforeEach(() => {
      const membership: IMembership = {
        id: '1',
        clientId: 'client1',
        client: undefined,
        validFrom: new Date('2024-03-01'),
        validUntil: new Date('2024-11-30'),
        type: 1,
        internalValidFrom: undefined,
        internalValidUntil: undefined,
      };

      clientWithMembership = {
        id: 'client1',
        idNumber: 1001,
        firstName: 'John',
        name: 'Doe',
        secondName: '',
        maidenName: '',
        title: '',
        company: '',
        birthdate: undefined,
        gender: '0',
        legalEntity: false,
        type: 0,
        breaks: [],
        membership: membership,
      } as IClientBreak;

      clientWithoutMembership = {
        id: 'client2',
        idNumber: 1002,
        firstName: 'Jane',
        name: 'Smith',
        secondName: '',
        maidenName: '',
        title: '',
        company: '',
        birthdate: undefined,
        gender: '0',
        legalEntity: false,
        type: 0,
        breaks: [],
        membership: undefined,
      } as IClientBreak;

      validBreak = {
        id: undefined,
        clientId: 'client1',
        from: new Date('2024-06-01'),
        until: new Date('2024-06-07'),
        absenceId: 'absence1',
      } as IBreak;

      invalidBreakBefore = {
        id: undefined,
        clientId: 'client1',
        from: new Date('2024-01-01'),
        until: new Date('2024-01-07'),
        absenceId: 'absence1',
      } as IBreak;

      invalidBreakAfter = {
        id: undefined,
        clientId: 'client1',
        from: new Date('2024-12-01'),
        until: new Date('2024-12-07'),
        absenceId: 'absence1',
      } as IBreak;

      service.clients = [clientWithMembership, clientWithoutMembership];
    });

    it('should allow break creation for client without membership', () => {
      const result = service.addBreak(1, validBreak);

      expect(result).toBe(true);
      expect(mockDataBreakService.addBreak).toHaveBeenCalled();
      expect(mockToastShowService.showError).not.toHaveBeenCalled();
    });

    it('should allow valid break creation within membership period', () => {
      const result = service.addBreak(0, validBreak);

      expect(result).toBe(true);
      expect(mockDataBreakService.addBreak).toHaveBeenCalled();
      expect(mockToastShowService.showError).not.toHaveBeenCalled();
    });

    it('should reject break creation before membership start', () => {
      const result = service.addBreak(0, invalidBreakBefore);

      expect(result).toBe(false);
      expect(mockDataBreakService.addBreak).not.toHaveBeenCalled();
      expect(mockTranslateService.get).toHaveBeenCalledWith(
        'absence-gantt.validation.membership.before-start'
      );
      expect(mockToastShowService.showError).toHaveBeenCalled();
    });

    it('should reject break creation after membership end', () => {
      const result = service.addBreak(0, invalidBreakAfter);

      expect(result).toBe(false);
      expect(mockDataBreakService.addBreak).not.toHaveBeenCalled();
      expect(mockTranslateService.get).toHaveBeenCalledWith(
        'absence-gantt.validation.membership.after-end'
      );
      expect(mockToastShowService.showError).toHaveBeenCalled();
    });

    it('should reject break spanning outside membership period', () => {
      const invalidBreakSpanning: IBreak = {
        id: undefined,
        clientId: 'client1',
        from: new Date('2024-02-01'),
        until: new Date('2024-12-31'),
        absenceId: 'absence1',
      } as IBreak;

      const result = service.addBreak(0, invalidBreakSpanning);

      expect(result).toBe(false);
      expect(mockDataBreakService.addBreak).not.toHaveBeenCalled();
      // The validation logic checks for "before-start" first, so spanning breaks get that message
      expect(mockTranslateService.get).toHaveBeenCalledWith(
        'absence-gantt.validation.membership.before-start'
      );
      expect(mockToastShowService.showError).toHaveBeenCalled();
    });

    it('should return false for invalid client index', () => {
      const result = service.addBreak(999, validBreak);

      expect(result).toBe(false);
      expect(mockDataBreakService.addBreak).not.toHaveBeenCalled();
      expect(mockToastShowService.showError).not.toHaveBeenCalled();
    });

    it('should format error messages with date parameters', () => {
      service.addBreak(0, invalidBreakBefore);

      expect(mockTranslateService.get).toHaveBeenCalledWith(
        'absence-gantt.validation.membership.before-start'
      );
      expect(mockToastShowService.showError).toHaveBeenCalledWith(
        jasmine.stringContaining('2024'),
        'membership-validation-error'
      );
    });

    it('should validate membership with only validFrom date', () => {
      clientWithMembership.membership!.validUntil = undefined;

      const result = service.addBreak(0, validBreak);

      expect(result).toBe(true);
      expect(mockDataBreakService.addBreak).toHaveBeenCalled();
    });

    it('should validate membership with only validUntil date', () => {
      clientWithMembership.membership!.validFrom = undefined as any;

      const result = service.addBreak(0, validBreak);

      expect(result).toBe(true);
      expect(mockDataBreakService.addBreak).toHaveBeenCalled();
    });
  });

  describe('updateBreak validation', () => {
    let clientWithMembership: IClientBreak;
    let invalidBreak: IBreak;

    beforeEach(() => {
      const membership: IMembership = {
        id: '1',
        clientId: 'client1',
        client: undefined,
        validFrom: new Date('2024-03-01'),
        validUntil: new Date('2024-11-30'),
        type: 1,
        internalValidFrom: undefined,
        internalValidUntil: undefined,
      };

      clientWithMembership = {
        id: 'client1',
        idNumber: 1001,
        firstName: 'John',
        name: 'Doe',
        secondName: '',
        maidenName: '',
        title: '',
        company: '',
        birthdate: undefined,
        gender: '0',
        legalEntity: false,
        type: 0,
        breaks: [],
        membership: membership,
      } as IClientBreak;

      invalidBreak = {
        id: '1',
        clientId: 'client1',
        from: new Date('2024-01-01'),
        until: new Date('2024-01-07'),
        absenceId: 'absence1',
      } as IBreak;

      service.clients = [clientWithMembership];
      mockDataBreakService.updateBreak.and.returnValue(of({} as IBreak));
    });

    it('should reject break update outside membership period', async () => {
      await service.updateBreak(0, invalidBreak);

      expect(mockDataBreakService.updateBreak).not.toHaveBeenCalled();
      expect(mockTranslateService.get).toHaveBeenCalledWith(
        'absence-gantt.validation.membership.before-start'
      );
      expect(mockToastShowService.showError).toHaveBeenCalled();
    });
  });
});
