// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonNewComponent } from './button-new.component';

describe('ButtonNewComponent', () => {
    let component: ButtonNewComponent;
    let fixture: ComponentFixture<ButtonNewComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonNewComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ButtonNewComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render button with correct classes', () => {
        fixture.detectChanges();

        const buttonElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement).toBeTruthy();
        expect(buttonElement.classList.contains('btn')).toBe(true);
        expect(buttonElement.classList.contains('ownStyle-button')).toBe(true);
    });

    it('should have correct button role', () => {
        fixture.detectChanges();

        const buttonElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement.getAttribute('role')).toBe('button');
    });

    it('should render SVG icon', () => {
        fixture.detectChanges();

        const svgElement = fixture.nativeElement.querySelector('svg');
        expect(svgElement).toBeTruthy();
        expect(svgElement.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svgElement.getAttribute('width')).toBe('20');
        expect(svgElement.getAttribute('height')).toBe('20');
    });

    it('should have correct SVG rects', () => {
        fixture.detectChanges();

        const rectElements = fixture.nativeElement.querySelectorAll('svg rect');
        expect(rectElements.length).toBe(2);

        const verticalRect = rectElements[0];
        expect(verticalRect.getAttribute('x')).toBe('10');
        expect(verticalRect.getAttribute('y')).toBe('2');
        expect(verticalRect.getAttribute('width')).toBe('4');
        expect(verticalRect.getAttribute('height')).toBe('20');

        const horizontalRect = rectElements[1];
        expect(horizontalRect.getAttribute('x')).toBe('2');
        expect(horizontalRect.getAttribute('y')).toBe('10');
        expect(horizontalRect.getAttribute('width')).toBe('20');
        expect(horizontalRect.getAttribute('height')).toBe('4');
    });

    it('should have proper styling structure', () => {
        fixture.detectChanges();

        const iconContainer = fixture.nativeElement.querySelector('button div');
        expect(iconContainer).toBeTruthy();
        expect(iconContainer.style.marginTop).toBe('-2px');
        expect(iconContainer.style.marginLeft).toBe('-6px');
    });

    it('should have correct SVG attributes', () => {
        fixture.detectChanges();

        const svgElement = fixture.nativeElement.querySelector('svg');
        expect(svgElement.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
        expect(svgElement.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svgElement.getAttribute('fill')).toBe('var(--standartGreenColor)');
    });

    it('should have complete template structure', () => {
        fixture.detectChanges();

        const compiled = fixture.nativeElement;

        // Check button exists
        expect(compiled.querySelector('button')).toBeTruthy();

        // Check div container
        expect(compiled.querySelector('button div')).toBeTruthy();

        // Check SVG and rects
        expect(compiled.querySelector('svg')).toBeTruthy();
        expect(compiled.querySelectorAll('svg rect').length).toBe(2);
    });
});
