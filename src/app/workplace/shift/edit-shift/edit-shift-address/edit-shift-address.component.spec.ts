import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftAddressComponent } from './edit-shift-address.component';

describe('EditShiftAddressComponent', () => {
  let component: EditShiftAddressComponent;
  let fixture: ComponentFixture<EditShiftAddressComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftAddressComponent],
    });
    fixture = TestBed.createComponent(EditShiftAddressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
