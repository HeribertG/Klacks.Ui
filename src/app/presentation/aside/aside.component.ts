import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  ElementRef,
  Renderer2,
  ViewChild,
  effect,
} from '@angular/core';
import { AsideService } from './aside.service';
import { LLMChatComponent } from './llm-chat/llm-chat.component';
import { TrashIconRedComponent } from '../icons/trash-icon-red.component';
import { TranslateModule } from '@ngx-translate/core';
import { FocusTrapDirective } from '../directives/focus-trap.directive';

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LLMChatComponent,
    TrashIconRedComponent,
    TranslateModule,
    FocusTrapDirective,
  ],
})
export class AsideComponent {
  @ViewChild(LLMChatComponent) llmChatComponent!: LLMChatComponent;

  private asideService = inject(AsideService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  isVisible = this.asideService.isVisible;

  constructor() {
    effect(() => {
      const visible = this.isVisible();

      if (visible) {
        this.renderer.addClass(this.elementRef.nativeElement, 'visible');
      } else {
        this.renderer.removeClass(this.elementRef.nativeElement, 'visible');
      }
    });
  }

  close(): void {
    this.asideService.hide();
  }

  clearChat(): void {
    setTimeout(() => {
      if (this.llmChatComponent) {
        this.llmChatComponent.clearChat();
      }
    }, 0);
  }
}
