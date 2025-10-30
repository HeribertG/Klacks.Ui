import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularSplitModule } from 'angular-split';
import { ShiftTemplateComponent } from './shift-template.component';

describe('ShiftTemplateComponent', () => {
  let component: ShiftTemplateComponent;
  let fixture: ComponentFixture<ShiftTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftTemplateComponent, AngularSplitModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
