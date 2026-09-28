// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateStringConstantsService } from './translate-string-constants.service';
import { TranslateService } from '@ngx-translate/core';

describe('TranslateStringConstantsService', () => {
    let service: TranslateStringConstantsService;

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
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
