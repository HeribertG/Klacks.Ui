import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularSplitModule } from 'angular-split';
import { ContainerTemplateComponent } from './container-template.component';

describe('ContainerTemplateComponent', () => {
  let component: ContainerTemplateComponent;
  let fixture: ComponentFixture<ContainerTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContainerTemplateComponent, AngularSplitModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContainerTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
