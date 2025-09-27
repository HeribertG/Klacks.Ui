import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AsideService } from './aside.service';
import { LLMChatComponent } from './llm-chat/llm-chat.component';
import { TrashIconRedComponent } from '../icons/trash-icon-red.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss'],
  standalone: true,
  imports: [CommonModule, LLMChatComponent, TrashIconRedComponent, TranslateModule],
})
export class AsideComponent implements OnDestroy {
  @ViewChild(LLMChatComponent) llmChatComponent!: LLMChatComponent;
  
  private asideService = inject(AsideService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private destroy$ = new Subject<void>();
  isVisible = false;

  constructor() {
    this.asideService.isVisible
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        this.isVisible = visible;
        
        // Add/remove visible class for CSS transition
        if (visible) {
          this.renderer.addClass(this.elementRef.nativeElement, 'visible');
        } else {
          this.renderer.removeClass(this.elementRef.nativeElement, 'visible');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(): void {
    this.asideService.hide();
  }

  clearChat(): void {
    // Use setTimeout to ensure ViewChild is initialized
    setTimeout(() => {
      if (this.llmChatComponent) {
        this.llmChatComponent.clearChat();
      } else {
      }
    }, 0);
  }
}
