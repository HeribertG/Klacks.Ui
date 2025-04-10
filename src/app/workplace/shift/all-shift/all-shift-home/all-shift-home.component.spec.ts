import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllShiftHomeComponent } from './all-shift-home.component';

describe('AllShiftHomeComponent', () => {
  let component: AllShiftHomeComponent;
  let fixture: ComponentFixture<AllShiftHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllShiftHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllShiftHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
