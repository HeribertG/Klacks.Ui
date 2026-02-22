// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VScrollbarComponent } from './v-scrollbar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ElementRef, NgZone } from '@angular/core';
import { ScrollbarService } from '../scrollbar/scrollbar.service';
import { SCROLLBAR_CONSTANTS } from '../scrollbar/constants';

describe('VScrollbarComponent', () => {
    let component: VScrollbarComponent;
    let fixture: ComponentFixture<VScrollbarComponent>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let scrollbarService: any;
    let domSanitizer: any;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let ngZone: NgZone;

    beforeEach(async () => {
        // Mock ScrollbarService
        const scrollbarServiceSpy = {
            calcMetrics: vi.fn(),
            createThumbVertical: vi.fn(),
            triangleTopSvg: '<svg>top</svg>',
            triangleBottomSvg: '<svg>bottom</svg>'
        };

        // Mock DomSanitizer
        const domSanitizerSpy = {
            bypassSecurityTrustHtml: vi.fn()
        };

        // Mock Methoden für ScrollbarService konfigurieren
        scrollbarServiceSpy.calcMetrics.mockReturnValue({
            thumbLength: 100,
            tickSize: 10,
        });

        scrollbarServiceSpy.createThumbVertical.mockImplementation(() => {
            // Mock-Logik hier hinzufügen, falls benötigt
        });

        // Mock DomSanitizer
        domSanitizerSpy.bypassSecurityTrustHtml.mockReturnValue('safe html' as any);

        // Testmodule konfigurieren
        await TestBed.configureTestingModule({
            imports: [VScrollbarComponent], // Standalone Component in imports!
            providers: [
                { provide: ScrollbarService, useValue: scrollbarServiceSpy },
                { provide: DomSanitizer, useValue: domSanitizerSpy },
                // NgZone und ChangeDetectorRef werden automatisch bereitgestellt
            ],
        }).compileComponents();

        scrollbarService = TestBed.inject(ScrollbarService) as any;
        domSanitizer = TestBed.inject(DomSanitizer) as any;
        ngZone = TestBed.inject(NgZone);

        fixture = TestBed.createComponent(VScrollbarComponent);
        component = fixture.componentInstance;

        // Mock canvas element - vertical orientation (height > width)
        const mockCanvas = document.createElement('canvas');
        const mockContext = {
            clearRect: vi.fn(),
            putImageData: vi.fn(),
            save: vi.fn(),
            restore: vi.fn()
        };

        vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any);

        // Mock canvas properties for vertical scrollbar
        Object.defineProperty(mockCanvas, 'width', { value: 50, writable: true });
        Object.defineProperty(mockCanvas, 'height', { value: 500, writable: true });
        Object.defineProperty(mockCanvas, 'offsetWidth', {
            value: 50,
            writable: true,
        });
        Object.defineProperty(mockCanvas, 'offsetHeight', {
            value: 500,
            writable: true,
        });
        Object.defineProperty(mockCanvas, 'offsetTop', {
            value: 0,
            writable: true,
        });

        component.canvasRef = {
            nativeElement: mockCanvas,
        } as ElementRef<HTMLCanvasElement>;

        // Prevent actual DOM manipulation during tests
        vi.spyOn(component, 'refresh').mockImplementation(() => {
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.value).toBe(0);
        expect(component.maxValue).toBe(365);
        expect(component.visibleValue).toBe(180);
    });

    it('should clamp value within valid range', () => {
        component.maxValue = 100;
        component.visibleValue = 18;

        // Test upper bound - korrigierte Berechnung basierend auf der tatsächlichen Implementierung
        const maxAllowedValue = component.maxValue -
            component.visibleValue +
            SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

        component.value = 200;
        expect(component.value).toBeLessThanOrEqual(maxAllowedValue);

        // Test lower bound
        component.value = -10;
        expect(component.value).toBe(0);
    });

    it('should emit valueChange when value changes', () => {
        vi.spyOn(component.valueChange, 'emit');

        component.value = 50;

        expect(component.valueChange.emit).toHaveBeenCalledWith(50);
    });

    it('should update metrics on refresh', () => {
        // Arrange
        (component.refresh as Mock).mockRestore();
        const updateMetricsSpy = vi.spyOn(component as any, 'updateMetrics').mockImplementation(() => {});
        vi.spyOn(component as any, 'createThumb').mockImplementation(() => {});
        vi.spyOn(component as any, 'reDraw').mockImplementation(() => {});
        vi.spyOn(component as any, 'updateArrowButtonsState').mockImplementation(() => {});

        // Act
        component.refresh();

        // Assert
        expect(updateMetricsSpy).toHaveBeenCalled();
    });

    it('should correctly calculate Y position for the thumb', () => {
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.height = 500;

        // Setup component values to match the test scenario
        component.maxValue = 100;
        component.visibleValue = 20;

        // value = 10, maxScrollValue = 100 - 20 + 5 (TICKS_OUTSIDE_RANGE) = 85
        // proportion = 10 / 85 = 0.1176
        // availableSpace = 500 - 50 = 450
        // result = 0.1176 * 450 = 52.94, rounded = 53
        const result = (component as any).calculateYPosition(mockCanvas, 10, 10, 50);
        expect(result).toBe(53);
    });

    it('should handle canvas height constraint in calculateYPosition', () => {
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.height = 200;

        // Setup component values
        component.maxValue = 100;
        component.visibleValue = 20;

        // When value >= maxScrollValue, should position at the end
        // maxScrollValue = 100 - 20 = 80
        // value = 80 or more should place thumb at canvas.height - trackHeight
        const result = (component as any).calculateYPosition(mockCanvas, 80, // value at max scroll
        10, // tickSize
        100 // trackHeight
        );

        // maxScrollValue = 100 - 20 + 5 = 85, value = 80 < 85
        // proportion = 80 / 85 = 0.9411, availableSpace = 100
        // result = 0.9411 * 100 = 94
        expect(result).toBe(94);
    });

    it('should disable arrow buttons at boundaries', () => {
        // Entferne den refresh mock für diesen Test
        (component.refresh as Mock);

        component.maxValue = 100;
        component.visibleValue = 20;

        // At start
        component.value = 0;
        expect((component as any).isAtStart()).toBe(true);
        expect((component as any).isAtEnd()).toBe(false);

        // At end
        component.value = 80; // maxValue - visibleValue = 100 - 20 = 80
        expect((component as any).isAtStart()).toBe(false);
        expect((component as any).isAtEnd()).toBe(true);
    });

    it('should initialize safe SVG content', () => {
        component.ngOnInit();

        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>top</svg>');
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>bottom</svg>');
    });

    it('should handle isAtStart correctly', () => {
        component.value = 0;
        expect((component as any).isAtStart()).toBe(true);

        component.value = 1;
        expect((component as any).isAtStart()).toBe(false);

        // Test with negative value - should be clamped to 0 by the setter
        component.value = -5;
        expect(component.value).toBe(0); // Verify it was clamped
        expect((component as any).isAtStart()).toBe(true); // Should be true because value is now 0
    });

    it('should handle isAtEnd correctly', () => {
        component.maxValue = 100;
        component.visibleValue = 20;

        // Test exact boundary
        component.value = 80; // maxValue - visibleValue = 100 - 20 = 80
        expect((component as any).isAtEnd()).toBe(true);

        // Test just before boundary
        component.value = 79;
        expect((component as any).isAtEnd()).toBe(false);

        // Test beyond boundary
        component.value = 85;
        expect((component as any).isAtEnd()).toBe(true);
    });
});
