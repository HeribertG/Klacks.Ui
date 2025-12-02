import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

import { ErrorComponent } from './error.component';

@Component({
    template: '<div>Test Component</div>'
})
class TestComponent {
}

describe('ErrorComponent', () => {
    let component: ErrorComponent;
    let fixture: ComponentFixture<ErrorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                ErrorComponent,
                TranslateModule.forRoot(),
                RouterTestingModule.withRoutes([
                    { path: '', component: TestComponent }
                ])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ErrorComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render error headline with translation', () => {
        fixture.detectChanges();

        const headlineElement = fixture.nativeElement.querySelector('.healine');
        expect(headlineElement).toBeTruthy();
        expect(headlineElement.textContent).toContain('error.headline');
    });

    it('should render error message with translation', () => {
        fixture.detectChanges();

        const messageElement = fixture.nativeElement.querySelector('.info p');
        expect(messageElement).toBeTruthy();
        expect(messageElement.textContent.trim()).toContain('error.message');
    });

    it('should render button with translation', () => {
        fixture.detectChanges();

        const buttonElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement).toBeTruthy();
        expect(buttonElement.textContent.trim()).toContain('error.button');
        expect(buttonElement.classList.contains('btn')).toBe(true);
        expect(buttonElement.classList.contains('btn-primary')).toBe(true);
    });

    it('should have proper CSS classes', () => {
        fixture.detectChanges();

        const mainElement = fixture.nativeElement.querySelector('.main');
        const headlineElement = fixture.nativeElement.querySelector('.healine');
        const infoElement = fixture.nativeElement.querySelector('.info');
        const buttonElement = fixture.nativeElement.querySelector('button');

        expect(mainElement).toBeTruthy();
        expect(headlineElement).toBeTruthy();
        expect(infoElement).toBeTruthy();
        expect(buttonElement.classList.contains('btn')).toBe(true);
        expect(buttonElement.classList.contains('btn-primary')).toBe(true);
        expect(buttonElement.classList.contains('center')).toBe(true);
    });

    it('should render SVG illustration', () => {
        fixture.detectChanges();

        const svgElement = fixture.nativeElement.querySelector('svg');
        expect(svgElement).toBeTruthy();
        expect(svgElement.classList.contains('imgzentriert')).toBe(true);
        expect(svgElement.getAttribute('viewBox')).toBe('0 0 1920 1080');
    });

    it('should have complete template structure', () => {
        fixture.detectChanges();

        const compiled = fixture.nativeElement;

        // Check main structure
        expect(compiled.querySelector('.main')).toBeTruthy();
        expect(compiled.querySelector('.healine')).toBeTruthy();
        expect(compiled.querySelector('.info')).toBeTruthy();

        // Check multiple paragraphs in info section
        const paragraphs = compiled.querySelectorAll('.info p');
        expect(paragraphs.length).toBeGreaterThanOrEqual(3);

        // Check button
        expect(compiled.querySelector('button')).toBeTruthy();

        // Check SVG
        expect(compiled.querySelector('svg')).toBeTruthy();
    });
});
