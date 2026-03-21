// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import {
  Component,
  inject,
  ElementRef,
  Renderer2,
  ViewChild,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AsideService } from './aside.service';
import { AssistantChatComponent } from './assistant-chat/assistant-chat.component';
import { TrashIconRedComponent } from '../icons/trash-icon-red.component';
import { TranslateModule } from '@ngx-translate/core';
import { FocusTrapDirective } from '../directives/focus-trap.directive';

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss'],
  standalone: true,
  imports: [
    AssistantChatComponent,
    TrashIconRedComponent,
    TranslateModule,
    FocusTrapDirective
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsideComponent {
  @ViewChild(AssistantChatComponent) assistantChatComponent!: AssistantChatComponent;

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
      if (this.assistantChatComponent) {
        this.assistantChatComponent.clearChat();
      }
    }, 0);
  }
}
