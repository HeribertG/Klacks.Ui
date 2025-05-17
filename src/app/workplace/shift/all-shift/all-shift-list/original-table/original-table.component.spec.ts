import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OriginalTableComponent } from './original-table.component';

describe('OriginalTableComponent', () => {
  let component: OriginalTableComponent;
  let fixture: ComponentFixture<OriginalTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OriginalTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OriginalTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
