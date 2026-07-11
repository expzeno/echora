import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';
import { FeedbackFabComponent } from './components/feedback-fab/feedback-fab';
import { CyberZenoService } from './services/cyberzeno.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, FeedbackFabComponent],
  template: `
    <ion-app>
      <ion-router-outlet />
      @if (showFeedback) {
        <app-feedback-fab />
      }
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  showFeedback = !environment.production;
  private readonly cz = inject(CyberZenoService);

  constructor() {
    addIcons(allIcons);
  }

  ngOnInit() {
    this.cz.init();
  }
}
