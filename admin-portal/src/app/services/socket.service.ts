import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

/**
 * Thin Socket.IO wrapper for the admin portal.
 *
 * Connects to the Echora backend host root (the same origin that serves the
 * REST API, minus the trailing `/company` admin segment). Real-time events —
 * currently `message:new` — are surfaced as Observables so components can
 * subscribe/unsubscribe with normal RxJS teardown.
 *
 * Singleton (providedIn: 'root'): one shared connection for the whole app.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly zone = inject(NgZone);

  // Host root, e.g. https://apiec.labzeno.com (strip the /company admin suffix).
  private readonly url = environment.apiUrl.replace(/\/company\/?$/, '');

  private socket: Socket | null = null;

  /** Lazily open the shared connection on first use. */
  private connect(): Socket {
    if (!this.socket) {
      // Run outside Angular's zone — socket callbacks re-enter the zone via
      // NgZone.run() in on(), so we don't trigger change detection on every
      // low-level transport event (ping/pong, etc.).
      this.socket = this.zone.runOutsideAngular(() =>
        io(this.url, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
          autoConnect: true,
        }),
      );
    }
    return this.socket;
  }

  /**
   * Join a conversation room so this client receives its `message:new` events.
   * `room` is the room name, e.g. `conversation:<id>`; the backend expects a
   * `join:conversation` event carrying the bare conversationId.
   */
  join(room: string): void {
    const conversationId = this.roomToId(room);
    this.connect().emit('join:conversation', { conversationId });
  }

  /** Leave a conversation room (stop receiving its events). */
  leave(room: string): void {
    if (!this.socket) return;
    const conversationId = this.roomToId(room);
    this.socket.emit('leave:conversation', { conversationId });
  }

  /**
   * Ensure the shared socket is open so this client is a member of the
   * company-wide `company:messages` room. The backend auto-joins every client
   * to that room on connection (see realtime/gateway.js), so the client then
   * receives `message:new` for *every* conversation — including threads that
   * aren't currently open — which is what drives the cross-thread unread
   * badges. Idempotent: call once on component init; re-calls are no-ops.
   */
  joinCompany(): void {
    this.connect();
  }

  /**
   * Stream of `message:new` events delivered via the company-wide room.
   * A semantic alias over `on('message:new')` for list-level unread tracking,
   * so callers read as "listen to the company feed" rather than the raw event.
   */
  onCompanyMessages<T = unknown>(): Observable<T> {
    return this.on<T>('message:new');
  }

  /**
   * Subscribe to a socket event. Emissions are marshalled back into Angular's
   * zone so signal updates in the callback trigger change detection. The
   * returned Observable removes the listener on unsubscribe.
   */
  on<T = unknown>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const socket = this.connect();
      const handler = (payload: T) => {
        this.zone.run(() => subscriber.next(payload));
      };
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    });
  }

  /** Strip the `conversation:` prefix to recover the bare id. */
  private roomToId(room: string): string {
    return room.startsWith('conversation:') ? room.slice('conversation:'.length) : room;
  }
}
