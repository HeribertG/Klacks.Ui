import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsenceGanttPdfPreviewComponent } from './absence-gantt-pdf-preview.component';

describe('AbsenceGanttPdfPreviewComponent', () => {
  let component: AbsenceGanttPdfPreviewComponent;
  let fixture: ComponentFixture<AbsenceGanttPdfPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AbsenceGanttPdfPreviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbsenceGanttPdfPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
