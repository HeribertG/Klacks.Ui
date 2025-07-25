import { Component, inject, OnInit } from '@angular/core';
import { ApplicationInitService } from './services/application-init.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  
  public title = 'klacks';

  ngOnInit(): void {
    // Initialize application-wide settings once at app start
    this.applicationInitService.initialize();
  }
}
