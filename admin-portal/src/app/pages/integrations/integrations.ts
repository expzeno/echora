import { Component } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
@Component({
  selector: "app-integrations",
  standalone: true,
  imports: [IonContent],
  template: `<ion-content><div class="page-container"><div class="dash-header"><div><h1>Integrations</h1><div class="subtitle">Third-party integration config</div></div></div><p style="color: var(--admin-text-muted); margin-top: 32px;">Phase 1 — coming soon.</p></div></ion-content>`,
})
export class IntegrationsPage {}
