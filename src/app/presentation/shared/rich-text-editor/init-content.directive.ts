import { Directive, ElementRef, inject, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appInitContent]',
  standalone: true,
})
export class InitContentDirective implements OnInit {
  @Input() appInitContent: string | undefined;

  private el = inject(ElementRef);

  ngOnInit(): void {
    if (this.appInitContent) {
      this.el.nativeElement.innerHTML = this.appInitContent;
    }
  }
}
