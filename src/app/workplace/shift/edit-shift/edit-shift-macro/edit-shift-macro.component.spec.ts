import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftMacroComponent } from './edit-shift-macro.component';

describe('EditShiftMacroComponent', () => {
  let component: EditShiftMacroComponent;
  let fixture: ComponentFixture<EditShiftMacroComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftMacroComponent]
    });
    fixture = TestBed.createComponent(EditShiftMacroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
