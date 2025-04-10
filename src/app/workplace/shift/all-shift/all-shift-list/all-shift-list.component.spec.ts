import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllShiftListComponent } from './all-shift-list.component';

describe('AllShiftListComponent', () => {
  let component: AllShiftListComponent;
  let fixture: ComponentFixture<AllShiftListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllShiftListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllShiftListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
