import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { TranslateStringConstantsService } from './translate-string-constants.service';
import { TranslateService } from '@ngx-translate/core';

describe('TranslateStringConstantsService', () => {
    let service: TranslateStringConstantsService;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let translateServiceSpy: any;

    beforeEach(() => {
        const spy = {
            get: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                TranslateStringConstantsService,
                { provide: TranslateService, useValue: spy },
            ],
        });

        service = TestBed.inject(TranslateStringConstantsService);
        translateServiceSpy = TestBed.inject(TranslateService) as any;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
