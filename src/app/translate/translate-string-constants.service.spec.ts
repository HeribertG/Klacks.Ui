import { TestBed } from '@angular/core/testing';
import { TranslateStringConstantsService } from './translate-string-constants.service';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('TranslateStringConstantsService', () => {
  let service: TranslateStringConstantsService;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('TranslateService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        TranslateStringConstantsService,
        { provide: TranslateService, useValue: spy },
      ],
    });

    service = TestBed.inject(TranslateStringConstantsService);
    translateServiceSpy = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // it('should call translateService.get when translate is called', () => {
  //   translateServiceSpy.get.and.returnValue(of('Test Translation'));
  //   service.translate();

  //   // Assume 'UPDATE_NOT_DONE' is one of the keys you are trying to translate
  //   expect(translateServiceSpy.get.calls.count()).toBe(
  //     1,
  //     'spy method was called once'
  //   );
  //   expect(translateServiceSpy.get.calls.first().args[0]).toBe(
  //     'UPDATE_NOT_DONE',
  //     'spy method was called with correct arg'
  //   );
  // });
});
