import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: Socket;

  constructor(private ngZone: NgZone) {
    this.socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('🔌 WebSocket connection error:', err.message);
    });
  }

  /**
   * Listen for a specific event. Automatically removes the socket listener
   * when the returned Observable is unsubscribed, preventing listener leaks.
   */
  on<T = any>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      const handler = (data: T) => {
        this.ngZone.run(() => observer.next(data));
      };
      this.socket.on(event, handler);
      // Teardown: remove listener when subscriber unsubscribes
      return () => this.socket.off(event, handler);
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
