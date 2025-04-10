import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllShiftNavComponent } from './all-shift-nav.component';

describe('AllShiftNavComponent', () => {
  let component: AllShiftNavComponent;
  let fixture: ComponentFixture<AllShiftNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllShiftNavComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllShiftNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
