import { Injectable, inject } from '@angular/core';
import { ToastController, LoadingController, AlertController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  private loadingEl: HTMLIonLoadingElement | null = null;

  async toast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'success', duration = 2000): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom' });
    await toast.present();
  }

  async success(message: string): Promise<void> { return this.toast(message, 'success'); }
  async error(message: string): Promise<void> { return this.toast(message, 'danger', 3000); }
  async warn(message: string): Promise<void> { return this.toast(message, 'warning'); }

  async showLoading(message = 'Loading...'): Promise<void> {
    this.loadingEl = await this.loadingCtrl.create({ message, spinner: 'crescent' });
    await this.loadingEl.present();
  }

  async hideLoading(): Promise<void> {
    if (this.loadingEl) { await this.loadingEl.dismiss(); this.loadingEl = null; }
  }

  async confirm(header: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header, message,
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
          { text: 'Confirm', handler: () => resolve(true) },
        ],
      });
      await alert.present();
    });
  }
}
