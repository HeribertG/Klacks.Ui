// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataShiftService } from './data-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataShiftService', () => {
    let service: DataShiftService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                WorkTimeCalculationService
            ]
        });
        service = TestBed.inject(DataShiftService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
