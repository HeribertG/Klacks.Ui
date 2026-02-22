// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpandableCardComponent } from './expandable-card.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('ExpandableCardComponent', () => {
    let component: ExpandableCardComponent;
    let fixture: ComponentFixture<ExpandableCardComponent>;
    let compiled: DebugElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExpandableCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ExpandableCardComponent);
        component = fixture.componentInstance;
        compiled = fixture.debugElement;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should set isExpanded to true', () => {
            component.ngOnInit();
            expect(component.isExpanded).toBe(true);
        });
    });

    describe('ngAfterViewInit', () => {
        it('should set viewInitialized to true', () => {
            component.ngAfterViewInit();
            expect(component['viewInitialized']).toBe(true);
        });

        it('should keep isExpanded true when initiallyExpanded is true', async () => {
            component.initiallyExpanded = true;
            component.ngAfterViewInit();
            await vi.waitFor(() => {
                expect(component.isExpanded).toBe(true);
            });
        });

        it('should set isExpanded to false when initiallyExpanded is false', async () => {
            component.initiallyExpanded = false;
            component.ngAfterViewInit();
            await vi.waitFor(() => {
                expect(component.isExpanded).toBe(false);
            });
        });
    });

    describe('toggle', () => {
        it('should toggle isExpanded from true to false', () => {
            component.isExpanded = true;
            component.toggle();
            expect(component.isExpanded).toBe(false);
        });

        it('should toggle isExpanded from false to true', () => {
            component.isExpanded = false;
            component.toggle();
            expect(component.isExpanded).toBe(true);
        });

        it('should toggle multiple times', () => {
            component.isExpanded = true;
            component.toggle();
            expect(component.isExpanded).toBe(false);
            component.toggle();
            expect(component.isExpanded).toBe(true);
            component.toggle();
            expect(component.isExpanded).toBe(false);
        });
    });

    describe('displayStyle', () => {
        it('should return "block" when viewInitialized is false', () => {
            component['viewInitialized'] = false;
            component.isExpanded = false;
            expect(component.displayStyle).toBe('block');
        });

        it('should return "block" when isExpanded is true and viewInitialized is true', () => {
            component['viewInitialized'] = true;
            component.isExpanded = true;
            expect(component.displayStyle).toBe('block');
        });

        it('should return "none" when isExpanded is false and viewInitialized is true', () => {
            component['viewInitialized'] = true;
            component.isExpanded = false;
            expect(component.displayStyle).toBe('none');
        });
    });

    describe('Input properties', () => {
        it('should set headerTitle', () => {
            component.headerTitle = 'Test Header';
            expect(component.headerTitle).toBe('Test Header');
        });

        it('should default headerTitle to empty string', () => {
            expect(component.headerTitle).toBe('');
        });

        it('should set initiallyExpanded', () => {
            component.initiallyExpanded = false;
            expect(component.initiallyExpanded).toBe(false);
        });

        it('should default initiallyExpanded to true', () => {
            expect(component.initiallyExpanded).toBe(true);
        });

        it('should set showExpandButton', () => {
            component.showExpandButton = false;
            expect(component.showExpandButton).toBe(false);
        });

        it('should default showExpandButton to true', () => {
            expect(component.showExpandButton).toBe(true);
        });
    });

    describe('Template rendering', () => {
        it('should display headerTitle', () => {
            component.headerTitle = 'Test Title';
            fixture.detectChanges();
            const headerElement = compiled.query(By.css('.container-header'));
            expect(headerElement.nativeElement.textContent).toContain('Test Title');
        });

        it('should show expand button when showExpandButton is true', () => {
            component.showExpandButton = true;
            fixture.detectChanges();
            const expandButton = compiled.query(By.css('.expand-button'));
            expect(expandButton).toBeTruthy();
        });

        it('should hide expand button when showExpandButton is false', () => {
            component.showExpandButton = false;
            fixture.detectChanges();
            const expandButton = compiled.query(By.css('.expand-button'));
            expect(expandButton).toBeFalsy();
        });

        it('should show angle down icon when expanded', () => {
            component.isExpanded = true;
            fixture.detectChanges();
            const angleDown = compiled.query(By.css('app-icon-angle-down'));
            expect(angleDown).toBeTruthy();
        });

        it('should show angle right icon when collapsed', () => {
            component.showExpandButton = true;
            component.ngOnInit();
            fixture.detectChanges();
            component['viewInitialized'] = true;
            component.isExpanded = false;
            fixture.detectChanges();
            const angleRight = compiled.query(By.css('app-icon-angle-right'));
            expect(angleRight).toBeTruthy();
        });

        it('should toggle expansion when button is clicked', () => {
            component.isExpanded = true;
            fixture.detectChanges();
            const expandButton = compiled.query(By.css('.expand-button'));

            expandButton.nativeElement.click();
            expect(component.isExpanded).toBe(false);

            expandButton.nativeElement.click();
            expect(component.isExpanded).toBe(true);
        });

        it('should apply display style to content container', async () => {
            fixture.detectChanges();
            component['viewInitialized'] = true;

            component.isExpanded = false;
            expect(component.displayStyle).toBe('none');

            component.isExpanded = true;
            expect(component.displayStyle).toBe('block');
        });
    });

    describe('Content projection', () => {
        it('should project content into default slot', () => {
            const testFixture = TestBed.createComponent(ExpandableCardComponent);
            const testComponent = testFixture.componentInstance;
            testComponent.headerTitle = 'Test';

            testFixture.detectChanges();

            expect(testFixture.nativeElement).toBeTruthy();
        });
    });

    describe('Integration tests', () => {
        it('should start expanded and allow collapsing', async () => {
            component.headerTitle = 'Integration Test';
            component.initiallyExpanded = true;
            component.ngOnInit();
            component.ngAfterViewInit();
            fixture.detectChanges();

            await vi.waitFor(() => {
                expect(component.isExpanded).toBe(true);
            });
            expect(component.displayStyle).toBe('block');

            component.toggle();
            fixture.detectChanges();

            expect(component.isExpanded).toBe(false);
            expect(component.displayStyle).toBe('none');
        });

        it('should start collapsed when initiallyExpanded is false', async () => {
            component.headerTitle = 'Collapsed Test';
            component.initiallyExpanded = false;

            fixture.detectChanges();
            component.ngOnInit();
            fixture.detectChanges();
            component.ngAfterViewInit();
            fixture.detectChanges();

            await vi.waitFor(() => {
                expect(component.isExpanded).toBe(false);
            });
            expect(component.displayStyle).toBe('none');

            component.toggle();
            fixture.detectChanges();

            expect(component.isExpanded).toBe(true);
            expect(component.displayStyle).toBe('block');
        });

        it('should maintain expanded state through multiple toggles', () => {
            component.ngOnInit();
            fixture.detectChanges();

            const initialState = component.isExpanded;

            component.toggle();
            expect(component.isExpanded).toBe(!initialState);

            component.toggle();
            expect(component.isExpanded).toBe(initialState);

            component.toggle();
            expect(component.isExpanded).toBe(!initialState);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty headerTitle', () => {
            component.headerTitle = '';
            fixture.detectChanges();
            const headerElement = compiled.query(By.css('.container-header'));
            expect(headerElement).toBeTruthy();
        });

        it('should handle very long headerTitle', () => {
            component.headerTitle = 'A'.repeat(500);
            fixture.detectChanges();
            const headerElement = compiled.query(By.css('.container-header'));
            expect(headerElement.nativeElement.textContent).toContain('A'.repeat(500));
        });

        it('should handle rapid toggles', () => {
            component.ngOnInit();

            for (let i = 0; i < 100; i++) {
                component.toggle();
            }

            expect(component.isExpanded).toBe(true);
        });
    });
});
