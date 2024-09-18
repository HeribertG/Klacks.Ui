import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftHomeComponent } from './edit-shift-home.component';

describe('EditShiftHomeComponent', () => {
  let component: EditShiftHomeComponent;
  let fixture: ComponentFixture<EditShiftHomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftHomeComponent],
    });
    fixture = TestBed.createComponent(EditShiftHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
