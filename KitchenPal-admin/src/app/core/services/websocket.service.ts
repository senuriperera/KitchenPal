import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: Socket;
  private notificationsChangedSubject = new Subject<void>();
  private recipeGeneratedSubject = new Subject<any>();
  private recipeApprovedSubject = new Subject<any>();
  private recipeRejectedSubject = new Subject<any>();

  notificationsChanged$ = this.notificationsChangedSubject.asObservable();
  recipeGenerated$ = this.recipeGeneratedSubject.asObservable();
  recipeApproved$ = this.recipeApprovedSubject.asObservable();
  recipeRejected$ = this.recipeRejectedSubject.asObservable();

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

    // Listen for notifications changed event
    this.socket.on('notifications:changed', () => {
      this.ngZone.run(() => {
        this.notificationsChangedSubject.next();
      });
    });

    // Listen for new generated recipes
    this.socket.on('recipe:generated', (data) => {
      this.ngZone.run(() => {
        this.recipeGeneratedSubject.next(data);
      });
    });

    // Listen for recipe approvals
    this.socket.on('recipe:approved', (data) => {
      this.ngZone.run(() => {
        this.recipeApprovedSubject.next(data);
      });
    });

    // Listen for recipe rejections
    this.socket.on('recipe:rejected', (data) => {
      this.ngZone.run(() => {
        this.recipeRejectedSubject.next(data);
      });
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
