import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CyberZenoService {
  private get cz(): any { return (window as any).CyberZeno; }

  init() {
    const key = environment.cyberZenoKey;
    if (!key || !this.cz) return;
    this.cz.init({
      apiKey: key,
      service: 'echora-admin',
      endpoint: environment.cyberZenoEndpoint,
      analytics: true,
      captureErrors: true,
      capturePerformance: true,
      captureSpaNav: true,
    });
  }

  identify(userId: string | number, traits: Record<string, string | number | boolean> = {}) {
    this.cz?.identify(String(userId), this.sanitize(traits));
  }

  track(event: string, props: Record<string, string | number | boolean> = {}) {
    this.cz?.track(event, this.sanitize(props));
  }

  reset() { this.cz?.reset(); }

  private sanitize(obj: Record<string, any>): Record<string, string | number | boolean> {
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
    }
    return clean;
  }
}
