import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { ToastShowService } from './toast/toast-show.service';

class MockToastService {
  // Optional: Füge Mock-Methoden hinzu, falls benötigt
}

describe('AppComponent', () => {
  let mockToastService: MockToastService;

  beforeEach(() => {
    mockToastService = new MockToastService();

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppModule], // AppModule importieren
      providers: [{ provide: ToastShowService, useValue: mockToastService }], // Mock für ToastService
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'klacks'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('klacks');
  });

  it('should render the content correctly', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-toasts')).not.toBeNull();
  });
});
