// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { NoAccessComponent } from './no-access.component';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import {
    NO_ACCESS_FEATURE_DISABLED_KEY,
    NO_ACCESS_PERMISSION_KEY,
    NO_ACCESS_REASON_FEATURE,
    NO_ACCESS_REASON_PERMISSION,
    NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<div>Test Component</div>',
})
class TestComponent {
}

describe('NoAccessComponent', () => {
    let component: NoAccessComponent;
    let fixture: ComponentFixture<NoAccessComponent>;
    let navigationService: any;
    let queryParamMap: BehaviorSubject<ParamMap>;

    const messageText = (): string =>
        fixture.nativeElement.querySelector('.message').textContent.trim();

    beforeEach(async () => {
        const navigationServiceSpy = {
            navigateToRoot: vi.fn()
        };
        queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({}));

        await TestBed.configureTestingModule({
            imports: [
                NoAccessComponent,
                TranslateModule.forRoot(),
                RouterTestingModule.withRoutes([
                    { path: '', component: TestComponent },
                ]),
            ],
            providers: [
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: ActivatedRoute, useValue: { queryParamMap } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NoAccessComponent);
        component = fixture.componentInstance;
        navigationService = TestBed.inject(NavigationService) as any;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have NavigationService injected', () => {
        expect(component['navigationService']).toBeTruthy();
    });

    it('should call navigationService.navigateToRoot when onClick is called', () => {
        component.onClick();

        expect(navigationService.navigateToRoot).toHaveBeenCalled();
    });

    it('should render lock icon SVG', () => {
        fixture.detectChanges();

        const svgElement = fixture.nativeElement.querySelector('svg');
        expect(svgElement).toBeTruthy();
        expect(svgElement.getAttribute('width')).toBe('120');
        expect(svgElement.getAttribute('height')).toBe('120');
        expect(svgElement.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('should render no-access message with translation', () => {
        fixture.detectChanges();

        const messageElement = fixture.nativeElement.querySelector('.message');
        expect(messageElement).toBeTruthy();
        expect(messageElement.textContent.trim()).toContain(NO_ACCESS_PERMISSION_KEY);
    });

    it('should render button with translation and click handler', () => {
        fixture.detectChanges();

        const buttonElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement).toBeTruthy();
        expect(buttonElement.classList.contains('btn')).toBe(true);
        expect(buttonElement.classList.contains('btn-primary')).toBe(true);
        expect(buttonElement.classList.contains('center')).toBe(true);
        expect(buttonElement.textContent.trim()).toContain('error.button');
    });

    it('should call onClick when button is clicked', () => {
        vi.spyOn(component, 'onClick');
        fixture.detectChanges();

        const buttonElement = fixture.nativeElement.querySelector('button');
        buttonElement.click();

        expect(component.onClick).toHaveBeenCalled();
    });

    it('should have proper container CSS class', () => {
        fixture.detectChanges();

        const containerElement = fixture.nativeElement.querySelector('.no-access-container');
        expect(containerElement).toBeTruthy();
    });

    it('should have complete template structure', () => {
        fixture.detectChanges();

        const compiled = fixture.nativeElement;

        // Check main container
        expect(compiled.querySelector('.no-access-container')).toBeTruthy();

        // Check SVG icon
        expect(compiled.querySelector('svg')).toBeTruthy();

        // Check message paragraph
        expect(compiled.querySelector('.message')).toBeTruthy();

        // Check empty paragraphs for spacing
        const paragraphs = compiled.querySelectorAll('p');
        expect(paragraphs.length).toBeGreaterThanOrEqual(3);

        // Check button
        expect(compiled.querySelector('button')).toBeTruthy();
    });

    it('shows the feature wording when the guard refused for a feature that is not activated', () => {
        queryParamMap.next(
            convertToParamMap({ [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_FEATURE }),
        );
        fixture.detectChanges();

        expect(component.messageKey()).toBe(NO_ACCESS_FEATURE_DISABLED_KEY);
        expect(messageText()).toContain(NO_ACCESS_FEATURE_DISABLED_KEY);
        expect(messageText()).not.toContain(NO_ACCESS_PERMISSION_KEY);
    });

    it('keeps the rights wording for the permission reason', () => {
        queryParamMap.next(
            convertToParamMap({ [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_PERMISSION }),
        );
        fixture.detectChanges();

        expect(component.messageKey()).toBe(NO_ACCESS_PERMISSION_KEY);
    });

    it('keeps the rights wording for an unknown reason value', () => {
        queryParamMap.next(convertToParamMap({ [NO_ACCESS_REASON_QUERY_PARAM]: 'whatever' }));
        fixture.detectChanges();

        expect(component.messageKey()).toBe(NO_ACCESS_PERMISSION_KEY);
    });

    it('follows a second redirect with a different reason instead of keeping a stale snapshot', () => {
        queryParamMap.next(
            convertToParamMap({ [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_FEATURE }),
        );
        fixture.detectChanges();
        expect(component.messageKey()).toBe(NO_ACCESS_FEATURE_DISABLED_KEY);

        queryParamMap.next(
            convertToParamMap({ [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_PERMISSION }),
        );
        fixture.detectChanges();

        expect(component.messageKey()).toBe(NO_ACCESS_PERMISSION_KEY);
        expect(messageText()).toContain(NO_ACCESS_PERMISSION_KEY);
    });

    it('should have lock icon with proper path and styling', () => {
        fixture.detectChanges();

        const pathElement = fixture.nativeElement.querySelector('svg path');
        expect(pathElement).toBeTruthy();
        expect(pathElement.getAttribute('fill')).toBe('var(--iconStandartColor)');
        expect(pathElement.getAttribute('d')).toContain('M6 10V8C6 4.6863');
    });
});
