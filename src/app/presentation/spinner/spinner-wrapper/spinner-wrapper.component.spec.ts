import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpinnerWrapperComponent } from './spinner-wrapper.component';
import { SpinnerService } from '../spinner.service';

describe('SpinnerWrapperComponent', () => {
  let component: SpinnerWrapperComponent;
  let fixture: ComponentFixture<SpinnerWrapperComponent>;
  let spinnerService: SpinnerService;

  beforeEach(async () => {
    // Mock für SpinnerService
    const spinnerServiceMock = {
      showProgressSpinner: false,
    };

    await TestBed.configureTestingModule({
      imports: [SpinnerWrapperComponent], // Standalone Component in imports!
      providers: [
        {
          provide: SpinnerService,
          useValue: spinnerServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpinnerWrapperComponent);
    component = fixture.componentInstance;
    spinnerService = TestBed.inject(SpinnerService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show spinner when showProgressSpinner is false', () => {
    spinnerService.showProgressSpinner = false;
    fixture.detectChanges();

    const spinnerElement =
      fixture.nativeElement.querySelector('.loading-indicator');
    expect(spinnerElement).toBeFalsy();
  });

  it('should show spinner when showProgressSpinner is true', () => {
    spinnerService.showProgressSpinner = true;
    fixture.detectChanges();

    const spinnerElement =
      fixture.nativeElement.querySelector('.loading-indicator');
    expect(spinnerElement).toBeTruthy();
  });
});
