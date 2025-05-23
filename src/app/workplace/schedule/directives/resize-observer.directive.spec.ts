import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ResizeObserverDirective } from './resize-observer.directive';

@Component({
  standalone: true,
  imports: [ResizeObserverDirective],
  template: `<div appResizeObserver (resizeElement)="onResize($event)"></div>`,
})
class TestComponent {
  resizeEntry: DOMRectReadOnly | null = null;
  onResize(entry: DOMRectReadOnly) {
    this.resizeEntry = entry;
  }
}

describe('ResizeObserverDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let directiveDebugEl: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    directiveDebugEl = fixture.debugElement.query(
      By.directive(ResizeObserverDirective)
    );
  });

  it('should create the directive instance', () => {
    expect(directiveDebugEl).toBeTruthy();
  });

  it('should emit resizeElement event when resizeCallback is called', () => {
    spyOn(component, 'onResize');

    const directiveInstance = directiveDebugEl.injector.get(
      ResizeObserverDirective
    );
    const fakeRect = { width: 42, height: 84 } as DOMRectReadOnly;
    directiveInstance.resizeCallback({
      target: directiveDebugEl.nativeElement,
      contentRect: fakeRect,
    });
    fixture.detectChanges();

    expect(component.onResize).toHaveBeenCalledWith(fakeRect);
  });

  it('should destroy without errors', () => {
    const directiveInstance = directiveDebugEl.injector.get(
      ResizeObserverDirective
    );
    expect(() => directiveInstance.ngOnDestroy()).not.toThrow();
  });
});
