import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResizeObserverDirective } from './resize-observer.directive';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

// Mock für ResizeObserver
class ResizeObserverMock {
  observe = jasmine.createSpy('observe');
  unobserve = jasmine.createSpy('unobserve');
}

@Component({
  template: `<div resizeObserver (resizeElement)="onResize($event)"></div>`,
  standalone: true,
  imports: [CommonModule],
})
class TestComponent {
  onResize(entry: any) {}
}

describe('ResizeObserverDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let resizeObserverInstance: ResizeObserverMock;

  beforeEach(async () => {
    resizeObserverInstance = new ResizeObserverMock();

    // Ersetzen Sie das globale ResizeObserver-Objekt durch den Mock
    (window as any).ResizeObserver = jasmine
      .createSpy()
      .and.returnValue(resizeObserverInstance);

    await TestBed.configureTestingModule({
      declarations: [TestComponent, ResizeObserverDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    const directiveEl = fixture.debugElement.query(
      By.directive(ResizeObserverDirective)
    );
    expect(directiveEl).not.toBeNull();
  });
});
