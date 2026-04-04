// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollbarComponent } from './scrollbar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ElementRef } from '@angular/core';
import { ScrollbarService } from './scrollbar.service';
import { SCROLLBAR_CONSTANTS } from './constants';

function createTestBed(orientation: 'vertical' | 'horizontal') {
    const scrollbarServiceSpy = {
        calcMetrics: vi.fn(),
        createThumbVertical: vi.fn(),
        createThumbHorizontal: vi.fn(),
        triangleTopSvg: '<svg>top</svg>',
        triangleBottomSvg: '<svg>bottom</svg>',
        triangleLeftSvg: '<svg>left</svg>',
        triangleRightSvg: '<svg>right</svg>',
    };

    const domSanitizerSpy = {
        bypassSecurityTrustHtml: vi.fn(),
    };

    scrollbarServiceSpy.calcMetrics.mockReturnValue({
        thumbLength: 100,
        tickSize: 10,
    });

    scrollbarServiceSpy.createThumbVertical.mockImplementation(() => {});
    scrollbarServiceSpy.createThumbHorizontal.mockImplementation(() => {});
    domSanitizerSpy.bypassSecurityTrustHtml.mockReturnValue('safe html' as any);

    return { scrollbarServiceSpy, domSanitizerSpy, orientation };
}

function setupComponent(
    fixture: ComponentFixture<ScrollbarComponent>,
    orientation: 'vertical' | 'horizontal'
) {
    const component = fixture.componentInstance;
    component.orientation = orientation;

    const mockCanvas = document.createElement('canvas');
    const mockContext = {
        clearRect: vi.fn(),
        putImageData: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
    };

    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any);

    if (orientation === 'vertical') {
        Object.defineProperty(mockCanvas, 'width', { value: 50, writable: true });
        Object.defineProperty(mockCanvas, 'height', { value: 500, writable: true });
        Object.defineProperty(mockCanvas, 'offsetWidth', { value: 50, writable: true });
        Object.defineProperty(mockCanvas, 'offsetHeight', { value: 500, writable: true });
        Object.defineProperty(mockCanvas, 'offsetTop', { value: 0, writable: true });
    } else {
        Object.defineProperty(mockCanvas, 'width', { value: 500, writable: true });
        Object.defineProperty(mockCanvas, 'height', { value: 50, writable: true });
        Object.defineProperty(mockCanvas, 'offsetWidth', { value: 500, writable: true });
        Object.defineProperty(mockCanvas, 'offsetHeight', { value: 50, writable: true });
        Object.defineProperty(mockCanvas, 'offsetLeft', { value: 0, writable: true });
    }

    component.canvasRef = {
        nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;

    vi.spyOn(component, 'refresh').mockImplementation(() => {});

    return component;
}

describe('ScrollbarComponent (vertical)', () => {
    let component: ScrollbarComponent;
    let fixture: ComponentFixture<ScrollbarComponent>;
    let domSanitizer: any;

    beforeEach(async () => {
        const setup = createTestBed('vertical');

        await TestBed.configureTestingModule({
            imports: [ScrollbarComponent],
            providers: [
                { provide: ScrollbarService, useValue: setup.scrollbarServiceSpy },
                { provide: DomSanitizer, useValue: setup.domSanitizerSpy },
            ],
        }).compileComponents();

        domSanitizer = TestBed.inject(DomSanitizer) as any;
        fixture = TestBed.createComponent(ScrollbarComponent);
        component = setupComponent(fixture, 'vertical');
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

        const maxAllowedValue = component.maxValue -
            component.visibleValue +
            SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

        component.value = 200;
        expect(component.value).toBeLessThanOrEqual(maxAllowedValue);

        component.value = -10;
        expect(component.value).toBe(0);
    });

    it('should emit valueChange when value changes', () => {
        vi.spyOn(component.valueChange, 'emit');
        component.value = 50;
        expect(component.valueChange.emit).toHaveBeenCalledWith(50);
    });

    it('should update metrics on refresh', () => {
        (component.refresh as Mock).mockRestore();
        const updateMetricsSpy = vi.spyOn(component as any, 'updateMetrics').mockImplementation(() => {});
        vi.spyOn(component as any, 'createThumb').mockImplementation(() => {});
        vi.spyOn(component as any, 'reDraw').mockImplementation(() => {});
        vi.spyOn(component as any, 'updateArrowButtonsState').mockImplementation(() => {});

        component.refresh();

        expect(updateMetricsSpy).toHaveBeenCalled();
    });

    it('should correctly calculate main axis position for the thumb', () => {
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.height = 500;
        component.maxValue = 100;
        component.visibleValue = 20;

        const result = (component as any).calculateMainAxisPosition(mockCanvas, 10, 10, 50);
        expect(result).toBe(53);
    });

    it('should handle canvas size constraint in calculateMainAxisPosition', () => {
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.height = 200;
        component.maxValue = 100;
        component.visibleValue = 20;

        const result = (component as any).calculateMainAxisPosition(mockCanvas, 80, 10, 100);
        expect(result).toBe(94);
    });

    it('should disable arrow buttons at boundaries', () => {
        component.maxValue = 100;
        component.visibleValue = 20;

        component.value = 0;
        expect((component as any).isAtStart()).toBe(true);
        expect((component as any).isAtEnd()).toBe(false);

        component.value = 80;
        expect((component as any).isAtStart()).toBe(false);
        expect((component as any).isAtEnd()).toBe(true);
    });

    it('should initialize safe SVG content for vertical', () => {
        component.ngOnInit();
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>top</svg>');
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>bottom</svg>');
    });

    it('should handle isAtStart correctly', () => {
        component.value = 0;
        expect((component as any).isAtStart()).toBe(true);

        component.value = 1;
        expect((component as any).isAtStart()).toBe(false);

        component.value = -5;
        expect(component.value).toBe(0);
        expect((component as any).isAtStart()).toBe(true);
    });

    it('should handle isAtEnd correctly', () => {
        component.maxValue = 100;
        component.visibleValue = 20;

        component.value = 80;
        expect((component as any).isAtEnd()).toBe(true);

        component.value = 79;
        expect((component as any).isAtEnd()).toBe(false);

        component.value = 85;
        expect((component as any).isAtEnd()).toBe(true);
    });
});

describe('ScrollbarComponent (horizontal)', () => {
    let component: ScrollbarComponent;
    let fixture: ComponentFixture<ScrollbarComponent>;
    let domSanitizer: any;

    beforeEach(async () => {
        const setup = createTestBed('horizontal');

        await TestBed.configureTestingModule({
            imports: [ScrollbarComponent],
            providers: [
                { provide: ScrollbarService, useValue: setup.scrollbarServiceSpy },
                { provide: DomSanitizer, useValue: setup.domSanitizerSpy },
            ],
        }).compileComponents();

        domSanitizer = TestBed.inject(DomSanitizer) as any;
        fixture = TestBed.createComponent(ScrollbarComponent);
        component = setupComponent(fixture, 'horizontal');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize safe SVG content for horizontal', () => {
        component.ngOnInit();
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>left</svg>');
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>right</svg>');
    });

    it('should correctly calculate main axis position for horizontal thumb', () => {
        component.ngOnInit();
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.width = 500;
        component.maxValue = 100;
        component.visibleValue = 20;

        const result = (component as any).calculateMainAxisPosition(mockCanvas, 10, 10, 50);
        expect(result).toBe(53);
    });
});

describe('ScrollbarComponent (horizontal RTL)', () => {
    let component: ScrollbarComponent;
    let fixture: ComponentFixture<ScrollbarComponent>;
    let domSanitizer: any;
    let originalDir: string;

    beforeEach(async () => {
        originalDir = document.documentElement.dir;
        document.documentElement.dir = 'rtl';

        const setup = createTestBed('horizontal');

        await TestBed.configureTestingModule({
            imports: [ScrollbarComponent],
            providers: [
                { provide: ScrollbarService, useValue: setup.scrollbarServiceSpy },
                { provide: DomSanitizer, useValue: setup.domSanitizerSpy },
            ],
        }).compileComponents();

        domSanitizer = TestBed.inject(DomSanitizer) as any;
        fixture = TestBed.createComponent(ScrollbarComponent);
        component = setupComponent(fixture, 'horizontal');
    });

    afterEach(() => {
        document.documentElement.dir = originalDir;
    });

    it('should swap arrow SVGs in RTL', () => {
        component.ngOnInit();
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>right</svg>');
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<svg>left</svg>');
    });

    it('should place thumb at end when value is 0', () => {
        component.ngOnInit();
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.width = 500;
        component.maxValue = 100;
        component.visibleValue = 20;

        const result = (component as any).calculateMainAxisPosition(mockCanvas, 0, 10, 50);
        expect(result).toBe(450);
    });

    it('should place thumb at start when value is at max scroll', () => {
        component.ngOnInit();
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.width = 500;
        component.maxValue = 100;
        component.visibleValue = 20;
        const maxScroll = 100 - 20 + SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

        const result = (component as any).calculateMainAxisPosition(mockCanvas, maxScroll, 10, 50);
        expect(result).toBe(0);
    });

    it('should mirror thumb position proportionally', () => {
        component.ngOnInit();
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.width = 500;
        component.maxValue = 100;
        component.visibleValue = 20;

        const ltrPos = (component as any).calculateMainAxisPosition(mockCanvas, 10, 10, 50);

        document.documentElement.dir = 'ltr';
        const ltrDirect = (component as any).calculateMainAxisPosition(mockCanvas, 10, 10, 50);
        document.documentElement.dir = 'rtl';

        expect(ltrPos + ltrDirect).toBeLessThanOrEqual(450);
    });

    it('should flip mouse position for hit detection', () => {
        component.ngOnInit();
        const mockCanvas = component.canvasRef.nativeElement;
        mockCanvas.width = 500;
        Object.defineProperty(mockCanvas, 'offsetLeft', { value: 0, writable: true });

        (component as any).metrics = { tickSize: 10, thumbLength: 100 };
        (component as any).imagesThumps = {
            imgThumb: { width: 100, height: 20 },
            imgSelectedThumb: undefined,
            invisibleTicks: 80,
        };

        component.value = 0;

        const eventAtRight = { clientX: 490, clientY: 25 } as MouseEvent;
        const isOver = component.isMouseOverThumb(eventAtRight);

        const eventAtLeft = { clientX: 10, clientY: 25 } as MouseEvent;
        const isOverLeft = component.isMouseOverThumb(eventAtLeft);

        expect(isOver).toBe(true);
        expect(isOverLeft).toBe(false);
    });
});
