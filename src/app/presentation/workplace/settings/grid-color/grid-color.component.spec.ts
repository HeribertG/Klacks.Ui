/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GridColorComponent } from './grid-color.component';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

describe('GridColorComponent', () => {
    let component: GridColorComponent;
    let fixture: ComponentFixture<GridColorComponent>;
    let mockGridColorService: any;
    let _mockTranslateService: any;

    beforeEach(async () => {
        const gridColorServiceSpy = {
            readDataAsync: vi.fn().mockResolvedValue(undefined),
            saveData: vi.fn(),
            resetColors: vi.fn()
        };

        const translateServiceSpy = {
            instant: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

        await TestBed.configureTestingModule({
            imports: [GridColorComponent, TranslateModule.forRoot()],
            providers: [
                { provide: GridColorService, useValue: gridColorServiceSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        mockGridColorService = TestBed.inject(GridColorService) as any;
        _mockTranslateService = TestBed.inject(TranslateService) as any;

        fixture = TestBed.createComponent(GridColorComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should load grid color data on ngOnInit', async () => {
            // Arrange & Act
            await component.ngOnInit();

            // Assert
            expect(mockGridColorService.readDataAsync).toHaveBeenCalled();
        });
    });
});
