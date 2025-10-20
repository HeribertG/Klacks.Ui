 
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GridColorComponent } from './grid-color.component';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

describe('GridColorComponent', () => {
  let component: GridColorComponent;
  let fixture: ComponentFixture<GridColorComponent>;
  let mockGridColorService: jasmine.SpyObj<GridColorService>;
  let _mockTranslateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const gridColorServiceSpy = jasmine.createSpyObj('GridColorService', [
      'readData',
      'saveData',
      'resetColors',
    ]);

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    await TestBed.configureTestingModule({
      imports: [GridColorComponent, TranslateModule.forRoot()],
      providers: [
        { provide: GridColorService, useValue: gridColorServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockGridColorService = TestBed.inject(
      GridColorService
    ) as jasmine.SpyObj<GridColorService>;
    _mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(GridColorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load grid color data on ngOnInit', () => {
      // Arrange & Act
      component.ngOnInit();

      // Assert
      expect(mockGridColorService.readData).toHaveBeenCalled();
    });
  });
});
