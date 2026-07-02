// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { OriginalTableComponent } from './original-table.component';
import { Shift } from 'src/app/domain/models/shift/shift-class';

describe('OriginalTableComponent', () => {
  let component: OriginalTableComponent;
  let fixture: ComponentFixture<OriginalTableComponent>;
  let mockSortingService: any;

  beforeEach(async () => {
    mockSortingService = {
      getArrow: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OriginalTableComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(OriginalTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sortingService', mockSortingService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onShowInfo', () => {
    it('emits infoClicked with the shift and stops row-click propagation', () => {
      const shift = new Shift();
      shift.id = 'shift-1';
      const mockEvent = new MouseEvent('click');
      const stopPropagationSpy = vi.spyOn(mockEvent, 'stopPropagation');
      const emitSpy = vi.spyOn(component.infoClicked, 'emit');

      component.onShowInfo(shift, mockEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(shift);
    });
  });
});
