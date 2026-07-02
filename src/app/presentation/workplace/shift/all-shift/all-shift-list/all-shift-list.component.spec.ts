// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AllShiftListComponent } from './all-shift-list.component';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AllShiftStateService } from '../services/all-shift-state.service';
import { ShiftTableResizeService } from 'src/app/presentation/services/shift-table-resize.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { Shift } from 'src/app/domain/models/shift/shift-class';

describe('AllShiftListComponent - onClickInfo', () => {
  let component: AllShiftListComponent;
  let fixture: ComponentFixture<AllShiftListComponent>;
  let mockNavigationService: any;
  let mockAllShiftStateService: any;

  beforeEach(() => {
    mockNavigationService = {
      navigateToEditShift: vi.fn(),
    };
    mockAllShiftStateService = {
      saveCurrentFilter: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AllShiftListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementShiftService, useValue: {} },
        { provide: DataManagementShiftCutService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: LocalStorageService, useValue: {} },
        { provide: ModalService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: DataShiftService, useValue: {} },
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    }).overrideComponent(AllShiftListComponent, {
      set: {
        providers: [
          { provide: AllShiftStateService, useValue: mockAllShiftStateService },
          { provide: ShiftTableResizeService, useValue: {} },
          { provide: TableSortingService, useValue: {} },
        ],
      },
    });

    fixture = TestBed.createComponent(AllShiftListComponent);
    component = fixture.componentInstance;
  });

  it('saves the current filter and navigates to the edit-shift page in readonly mode', () => {
    const shift = new Shift();
    shift.id = 'shift-1';

    component.onClickInfo(shift);

    expect(mockAllShiftStateService.saveCurrentFilter).toHaveBeenCalled();
    expect(mockNavigationService.navigateToEditShift).toHaveBeenCalledWith('shift-1', true);
  });

  it('does nothing when the shift has no id', () => {
    const shift = new Shift();

    component.onClickInfo(shift);

    expect(mockNavigationService.navigateToEditShift).not.toHaveBeenCalled();
    expect(mockAllShiftStateService.saveCurrentFilter).not.toHaveBeenCalled();
  });
});
