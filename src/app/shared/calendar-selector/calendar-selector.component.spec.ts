import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { CalendarSelectorComponent } from './calendar-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CalendarSelectorComponent', () => {
  let component: CalendarSelectorComponent;
  let fixture: ComponentFixture<CalendarSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarSelectorComponent],
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        HttpClientTestingModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not enable delete button when delButtonEnabled is false', () => {
    component.delButtonEnabled = false;
    fixture.detectChanges();
    const deleteButton = fixture.debugElement.query(
      By.css('.btn-danger.crud-button')
    );
    expect(deleteButton.properties['disabled']).toBe(true);
  });

  it('should be disabled when addButtonEnabled is false', () => {
    component.addButtonEnabled = false;
    fixture.detectChanges();
    const button =
      fixture.debugElement.nativeElement.querySelector('.btn-success');
    expect(button.disabled).toBe(true);
  });
});
