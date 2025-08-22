/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SimplePaginationComponent } from './simple-pagination.component';

// Mock TranslateLoader
class MockTranslateLoader implements TranslateLoader {
  getTranslation(lang: string) {
    return of({
      'pagination.sum': 'Total',
    });
  }
}

describe('SimplePaginationComponent', () => {
  let component: SimplePaginationComponent;
  let fixture: ComponentFixture<SimplePaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SimplePaginationComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: MockTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SimplePaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
