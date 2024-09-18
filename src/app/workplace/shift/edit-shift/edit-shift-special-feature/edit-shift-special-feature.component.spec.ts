import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditShiftSpecialFeatureComponent } from './edit-shift-special-feature.component';

describe('EditShiftSpecialFeatureComponent', () => {
  let component: EditShiftSpecialFeatureComponent;
  let fixture: ComponentFixture<EditShiftSpecialFeatureComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditShiftSpecialFeatureComponent]
    });
    fixture = TestBed.createComponent(EditShiftSpecialFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
