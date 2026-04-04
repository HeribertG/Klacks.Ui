// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VScrollbarComponent } from './v-scrollbar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ScrollbarService } from '../scrollbar/scrollbar.service';

describe('VScrollbarComponent', () => {
    let component: VScrollbarComponent;
    let fixture: ComponentFixture<VScrollbarComponent>;
    let _domSanitizer: any;

    beforeEach(async () => {
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

        domSanitizerSpy.bypassSecurityTrustHtml.mockReturnValue('safe html' as any);

        await TestBed.configureTestingModule({
            imports: [VScrollbarComponent],
            providers: [
                { provide: ScrollbarService, useValue: scrollbarServiceSpy },
                { provide: DomSanitizer, useValue: domSanitizerSpy },
            ],
        }).compileComponents();

        _domSanitizer = TestBed.inject(DomSanitizer) as any;

        fixture = TestBed.createComponent(VScrollbarComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.value).toBe(0);
        expect(component.maxValue).toBe(365);
        expect(component.visibleValue).toBe(180);
    });

    it('should emit valueChange when value changes', () => {
        vi.spyOn(component.valueChange, 'emit');

        component.onValueChange(50);

        expect(component.valueChange.emit).toHaveBeenCalledWith(50);
    });

    it('should update internal value on onValueChange', () => {
        component.onValueChange(42);
        expect(component.value).toBe(42);
    });
});
