// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { SpinnerService } from './spinner.service';

describe('SpinnerService', () => {
    let service: SpinnerService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SpinnerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('reset clears active requests and hides the spinner', () => {
        vi.useFakeTimers();
        try {
            service.incrementRequests();
            vi.advanceTimersByTime(200);
            expect(service.showSpinner()).toBe(true);

            service.reset();
            expect(service.showSpinner()).toBe(false);

            service.incrementRequests();
            service.reset();
            vi.advanceTimersByTime(500);
            expect(service.showSpinner()).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('reset also clears the manual progress spinner', () => {
        service.showProgressSpinner = true;
        expect(service.showSpinner()).toBe(true);

        service.reset();

        expect(service.showSpinner()).toBe(false);
        expect(service.showProgressSpinner).toBe(false);
    });
});
