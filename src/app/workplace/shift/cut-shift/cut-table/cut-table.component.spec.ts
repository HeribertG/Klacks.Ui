import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CutTableComponent } from './cut-table.component';

describe('CutTableComponent', () => {
  let component: CutTableComponent;
  let fixture: ComponentFixture<CutTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CutTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CutTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
