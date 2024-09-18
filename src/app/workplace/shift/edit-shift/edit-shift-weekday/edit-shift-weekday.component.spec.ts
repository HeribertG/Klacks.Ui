import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftWeekdayComponent } from './edit-shift-weekday.component';

describe('EditShiftWeekdayComponent', () => {
  let component: EditShiftWeekdayComponent;
  let fixture: ComponentFixture<EditShiftWeekdayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftWeekdayComponent],
    });
    fixture = TestBed.createComponent(EditShiftWeekdayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
