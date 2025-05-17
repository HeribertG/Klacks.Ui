import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlannableTableComponent } from './plannable-table.component';

describe('PlannableTableComponent', () => {
  let component: PlannableTableComponent;
  let fixture: ComponentFixture<PlannableTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannableTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlannableTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
