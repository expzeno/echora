import { Component } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
@Component({
  selector: "app-contacts",
  standalone: true,
  imports: [IonContent],
  template: `<ion-content><div class="page-container"><div class="dash-header"><div><h1>Contacts</h1><div class="subtitle">Customer contact directory</div></div></div><p style="color: var(--admin-text-muted); margin-top: 32px;">Phase 1 — coming soon.</p></div></ion-content>`,
})
export class ContactsPage {}
