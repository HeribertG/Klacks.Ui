import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ResizeObserverDirective } from './resize-observer.directive';

// Mock for ResizeObserver
class ResizeObserverMock {
  constructor(private callback: ResizeObserverCallback) {}
  observe = jasmine.createSpy('observe');
  unobserve = jasmine.createSpy('unobserve');
  simulate(entries: ResizeObserverEntry[]) {
    this.callback(entries, this as any);
  }
}

@Component({
  template: `<div resizeObserver (resizeElement)="onResize($event)"></div>`,
  standalone: true,
  imports: [ResizeObserverDirective],
})
class TestComponent {
  resizeEntry?: DOMRectReadOnly;
  onResize(entry: DOMRectReadOnly) {
    this.resizeEntry = entry;
  }
}

describe('ResizeObserverDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let debugEl: any;
  let mockInstance: ResizeObserverMock;

  beforeEach(async () => {
    // Replace global ResizeObserver with our mock
    spyOn(window as any, 'ResizeObserver').and.callFake(
      (callback: ResizeObserverCallback) => {
        mockInstance = new ResizeObserverMock(callback);
        return mockInstance;
      }
    );

    await TestBed.configureTestingModule({
      imports: [TestComponent, ResizeObserverDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    debugEl = fixture.debugElement.query(By.directive(ResizeObserverDirective));
  });

  it('should create directive instance and observe element', () => {
    expect(debugEl).toBeTruthy();
    expect((window as any).ResizeObserver).toHaveBeenCalled();
    expect(mockInstance.observe).toHaveBeenCalledWith(debugEl.nativeElement);
  });

  it('should emit resizeElement event on callback', () => {
    const fakeRect = { width: 10, height: 20 } as DOMRectReadOnly;
    mockInstance.simulate([
      {
        target: debugEl.nativeElement,
        contentRect: fakeRect,
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      },
    ]);
    fixture.detectChanges();
    expect(component.resizeEntry).toBe(fakeRect);
  });

  it('should unobserve element on destroy', () => {
    fixture.destroy();
    expect(mockInstance.unobserve).toHaveBeenCalledWith(debugEl.nativeElement);
  });
});
