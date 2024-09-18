import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftItemComponent } from './edit-shift-item.component';

describe('EditShiftItemComponent', () => {
  let component: EditShiftItemComponent;
  let fixture: ComponentFixture<EditShiftItemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftItemComponent],
    });
    fixture = TestBed.createComponent(EditShiftItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
