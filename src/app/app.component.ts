import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { AsideService } from './presentation/aside/aside.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private applicationInitService = inject(ApplicationInitService);
  private asideService = inject(AsideService);
  private destroy$ = new Subject<void>();
  public title = 'klacks';
  asideVisible = false;

  constructor() {
    this.asideService.isVisible
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        console.log('AppComponent: aside visibility:', visible);
        this.asideVisible = visible;
        // Set CSS variable for the entire document
        document.documentElement.style.setProperty('--aside-width', visible ? '450px' : '0px');
      });
  }

  ngOnInit(): void {
    // Initialize only basic settings that don't require authentication
    this.applicationInitService.initializeBasics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
