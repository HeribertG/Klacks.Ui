// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpinnerWrapperComponent } from './spinner-wrapper.component';
import { SpinnerService } from '../spinner.service';

describe('SpinnerWrapperComponent', () => {
    let component: SpinnerWrapperComponent;
    let fixture: ComponentFixture<SpinnerWrapperComponent>;
    let spinnerService: SpinnerService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SpinnerWrapperComponent],
            providers: [SpinnerService],
        }).compileComponents();

        fixture = TestBed.createComponent(SpinnerWrapperComponent);
        component = fixture.componentInstance;
        spinnerService = TestBed.inject(SpinnerService);
        fixture.detectChanges();
    });

    it('should create', () => {
        // Arrange
        // Act
        // Assert
        expect(component).toBeTruthy();
    });

    it('should not show spinner when showProgressSpinner is false', () => {
        // Arrange
        spinnerService.showProgressSpinner = false;

        // Act
        fixture.detectChanges();

        // Assert
        const spinnerElement = fixture.nativeElement.querySelector('.loading-indicator');
        expect(spinnerElement).toBeFalsy();
    });

    it('should show spinner when showProgressSpinner is true', () => {
        // Arrange
        spinnerService.showProgressSpinner = true;

        // Act
        fixture.detectChanges();

        // Assert
        const spinnerElement = fixture.nativeElement.querySelector('.loading-indicator');
        expect(spinnerElement).toBeTruthy();
    });
});
