import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftNavComponent } from './edit-shift-nav.component';

describe('EditShiftNavComponent', () => {
  let component: EditShiftNavComponent;
  let fixture: ComponentFixture<EditShiftNavComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftNavComponent],
    });
    fixture = TestBed.createComponent(EditShiftNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
