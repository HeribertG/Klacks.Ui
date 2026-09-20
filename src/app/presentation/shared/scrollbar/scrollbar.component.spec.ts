// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollbarComponent } from './scrollbar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ElementRef } from '@angular/core';
import { ScrollbarService } from './scrollbar.service';
import { SCROLLBAR_CONSTANTS } from './constants';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';

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

    it('should mark the host with the touch-mode class only after a finger has touched the page', () => {
        vi.stubGlobal('ResizeObserver', class {
            observe(): void { /* not needed */ }
            unobserve(): void { /* not needed */ }
            disconnect(): void { /* not needed */ }
        });
        const host = fixture.nativeElement as HTMLElement;
        const modality = TestBed.inject(InputModalityService);

        document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
        fixture.detectChanges();
        expect(modality.isTouchMode()).toBe(false);
        expect(host.classList.contains('touch-mode')).toBe(false);

        document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
        fixture.detectChanges();
        expect(host.classList.contains('touch-mode')).toBe(true);

        document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
        fixture.detectChanges();
        expect(host.classList.contains('touch-mode')).toBe(false);
        vi.unstubAllGlobals();
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

describe('ScrollbarComponent (context click guard)', () => {
    let component: ScrollbarComponent;
    let fixture: ComponentFixture<ScrollbarComponent>;
    let animation: { startBarAnimation: Mock; startArrowHoldAnimation: Mock; stopArrowHold: Mock; destroy: Mock };

    const setPlatform = (platform: string): void => {
        vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
    };

    const mouseEvent = (init: MouseEventInit): MouseEvent =>
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, ...init });

    const pointerEvent = (type: string, init: PointerEventInit): PointerEvent =>
        new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 4, ...init });

    beforeEach(async () => {
        const setup = createTestBed('horizontal');

        await TestBed.configureTestingModule({
            imports: [ScrollbarComponent],
            providers: [
                { provide: ScrollbarService, useValue: setup.scrollbarServiceSpy },
                { provide: DomSanitizer, useValue: setup.domSanitizerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ScrollbarComponent);
        component = setupComponent(fixture, 'horizontal');
        (component as any).isMouseOverThumb = vi.fn().mockReturnValue(false);
        animation = { startBarAnimation: vi.fn(), startArrowHoldAnimation: vi.fn(), stopArrowHold: vi.fn(), destroy: vi.fn() };
        (component as any).animationService = animation;
    });

    afterEach(() => vi.restoreAllMocks());

    it('track mousedown with the primary button starts the bar animation', () => {
        setPlatform('MacIntel');
        (component as any).onMouseDown(mouseEvent({ button: 0, buttons: 1, clientX: 10 }));

        expect(animation.startBarAnimation).toHaveBeenCalledTimes(1);
    });

    it('track mousedown ignores a Mac Ctrl+Click', () => {
        setPlatform('MacIntel');
        (component as any).onMouseDown(mouseEvent({ button: 0, buttons: 1, ctrlKey: true, clientX: 10 }));

        expect(animation.startBarAnimation).not.toHaveBeenCalled();
    });

    it('track mousedown ignores the secondary button', () => {
        setPlatform('Win32');
        (component as any).onMouseDown(mouseEvent({ button: 2, buttons: 2, clientX: 10 }));

        expect(animation.startBarAnimation).not.toHaveBeenCalled();
    });

    it('track mousedown on Windows with Ctrl still reacts', () => {
        setPlatform('Win32');
        (component as any).onMouseDown(mouseEvent({ button: 0, buttons: 1, ctrlKey: true, clientX: 10 }));

        expect(animation.startBarAnimation).toHaveBeenCalledTimes(1);
    });

    it('arrow pointerdown with the primary button starts the hold animation', () => {
        setPlatform('MacIntel');
        component.onArrowThumbPointerDown(pointerEvent('pointerdown', { button: 0, buttons: 1, pointerType: 'mouse' }), 1);

        expect(animation.startArrowHoldAnimation).toHaveBeenCalledTimes(1);
    });

    it('arrow pointerdown ignores a Mac Ctrl+Click', () => {
        setPlatform('MacIntel');
        component.onArrowThumbPointerDown(pointerEvent('pointerdown', { button: 0, buttons: 1, ctrlKey: true, pointerType: 'mouse' }), 1);

        expect(animation.startArrowHoldAnimation).not.toHaveBeenCalled();
    });

    it('arrow pointerdown ignores the secondary button', () => {
        setPlatform('Win32');
        component.onArrowThumbPointerDown(pointerEvent('pointerdown', { button: 2, buttons: 2, pointerType: 'mouse' }), 1);

        expect(animation.startArrowHoldAnimation).not.toHaveBeenCalled();
    });

    it('arrow pointerdown starts the hold animation for a finger, where no mousedown would arrive before the lift', () => {
        setPlatform('Win32');
        const event = pointerEvent('pointerdown', { button: 0, buttons: 1, pointerType: 'touch' });

        component.onArrowThumbPointerDown(event, -1);

        expect(animation.startArrowHoldAnimation).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
    });

    it('stops the arrow hold on pointerup and on a cancelled touch gesture', () => {
        component.onArrowThumbPointerEnd(pointerEvent('pointerup', { pointerType: 'touch' }));
        component.onArrowThumbPointerEnd(pointerEvent('pointercancel', { pointerType: 'touch' }));

        expect(animation.stopArrowHold).toHaveBeenCalledTimes(2);
    });

    it('thumb pointerdown ignores a Mac Ctrl+Click', () => {
        setPlatform('MacIntel');
        (component as any).isMouseOverThumb = vi.fn().mockReturnValue(true);
        const setPointerCapture = vi.fn();
        component.canvasRef.nativeElement.setPointerCapture = setPointerCapture;

        (component as any).onPointerDown(
            pointerEvent('pointerdown', { button: 0, buttons: 1, ctrlKey: true, pointerType: 'mouse' })
        );

        expect((component as any).mousePointThumb).toBe(false);
        expect(setPointerCapture).not.toHaveBeenCalled();
    });

    it('thumb pointerdown captures a touch pointer, so the drag survives leaving the scrollbar', () => {
        setPlatform('Win32');
        (component as any).isMouseOverThumb = vi.fn().mockReturnValue(true);
        const setPointerCapture = vi.fn();
        component.canvasRef.nativeElement.setPointerCapture = setPointerCapture;

        (component as any).onPointerDown(
            pointerEvent('pointerdown', { button: 0, buttons: 1, pointerType: 'touch' })
        );

        expect((component as any).mousePointThumb).toBe(true);
        expect(setPointerCapture).toHaveBeenCalledWith(4);
    });

    it('releases only a capture it actually holds', () => {
        const releasePointerCapture = vi.fn();
        component.canvasRef.nativeElement.hasPointerCapture = vi.fn().mockReturnValue(false);
        component.canvasRef.nativeElement.releasePointerCapture = releasePointerCapture;

        (component as any).onPointerUp(pointerEvent('pointerup', { pointerType: 'touch' }));

        expect((component as any).mousePointThumb).toBe(false);
        expect(releasePointerCapture).not.toHaveBeenCalled();
    });
});
