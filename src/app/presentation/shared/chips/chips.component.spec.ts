import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { ChipsComponent } from './chips.component';

describe('ChipsComponent', () => {
  let component: ChipsComponent;
  let fixture: ComponentFixture<ChipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ChipsComponent,
        TranslateModule.forRoot(),
        FontAwesomeModule,
        NgbDropdownModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default values', () => {
    expect(component.name).toBe('');
    expect(component.key).toBe('');
  });

  it('should accept name input', () => {
    const testName = 'Test Chip';
    component.name = testName;
    
    expect(component.name).toBe(testName);
  });

  it('should accept key input', () => {
    const testKey = 'test-key-123';
    component.key = testKey;
    
    expect(component.key).toBe(testKey);
  });

  it('should display name in span element', () => {
    const testName = 'My Chip Name';
    component.name = testName;
    fixture.detectChanges();

    const spanElement = fixture.nativeElement.querySelector('span.me-2');
    expect(spanElement.textContent.trim()).toBe(testName);
  });

  it('should emit delete event with key when onDelete is called', () => {
    spyOn(component.delete, 'emit');
    const testKey = 'test-key-456';
    component.key = testKey;

    component.onDelete();

    expect(component.delete.emit).toHaveBeenCalledWith(testKey);
  });

  it('should call onDelete when delete button is clicked', () => {
    spyOn(component, 'onDelete');
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('.btn-close');
    deleteButton.click();

    expect(component.onDelete).toHaveBeenCalled();
  });

  it('should render delete button with correct attributes', () => {
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('.btn-close');
    expect(deleteButton).toBeTruthy();
    expect(deleteButton.getAttribute('aria-label')).toBe('del');
  });

  it('should have proper CSS classes', () => {
    fixture.detectChanges();

    const containerDiv = fixture.nativeElement.querySelector('div');
    expect(containerDiv.classList.contains('d-flex')).toBe(true);
    expect(containerDiv.classList.contains('rounded')).toBe(true);
    expect(containerDiv.classList.contains('p-2')).toBe(true);
    expect(containerDiv.classList.contains('mb-2')).toBe(true);
  });

  it('should have proper span classes', () => {
    fixture.detectChanges();

    const spanElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList.contains('me-2')).toBe(true);
  });

  it('should have complete template structure', () => {
    component.name = 'Test Name';
    component.key = 'test-key';
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    
    // Check main container
    expect(compiled.querySelector('div.d-flex')).toBeTruthy();
    
    // Check span with name
    expect(compiled.querySelector('span.me-2')).toBeTruthy();
    
    // Check delete button
    expect(compiled.querySelector('button.btn-close')).toBeTruthy();
  });

  it('should emit correct key when delete is triggered', () => {
    let emittedKey = '';
    component.delete.subscribe((key: string) => {
      emittedKey = key;
    });

    const testKey = 'unique-test-key';
    component.key = testKey;
    component.onDelete();

    expect(emittedKey).toBe(testKey);
  });

  it('should update displayed name when name input changes', () => {
    const initialName = 'Initial Name';
    const updatedName = 'Updated Name';
    
    component.name = initialName;
    fixture.detectChanges();
    
    let spanElement = fixture.nativeElement.querySelector('span.me-2');
    expect(spanElement.textContent.trim()).toBe(initialName);
    
    component.name = updatedName;
    fixture.detectChanges();
    
    spanElement = fixture.nativeElement.querySelector('span.me-2');
    expect(spanElement.textContent.trim()).toBe(updatedName);
  });
});