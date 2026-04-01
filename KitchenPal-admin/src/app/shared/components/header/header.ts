import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminNotificationService, AdminBellNotificationsResponse } from '../../../core/services/admin-notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() subtitle: string = '';

  unreadCount = 0;
  isDropdownOpen = false;
  notifications: any[] = [];
  isLoadingNotifications = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private adminNotificationService: AdminNotificationService,
    private webSocketService: WebSocketService,
    private router: Router
  ) { }

  get currentUser$() {
    return this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadNotifications();
    this.subscribeToNotificationChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const bellContainer = document.querySelector('.notification-bell-container');
    if (bellContainer && !bellContainer.contains(target)) {
      this.closeDropdown();
    }
  }

  loadNotifications(): void {
    this.isLoadingNotifications = true;
    this.adminNotificationService.getBellNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AdminBellNotificationsResponse) => {
          this.notifications = response.notifications;
          this.unreadCount = response.unread_count;
          this.isLoadingNotifications = false;
        },
        error: (err) => {
          console.error('Failed to load notifications:', err);
          this.isLoadingNotifications = false;
        }
      });
  }

  subscribeToNotificationChanges(): void {
    this.webSocketService.notificationsChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadNotifications();
      });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  markAsRead(notification: any, index: number): void {
    this.adminNotificationService.markAsRead(notification.notification_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications[index].is_read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          // Navigate to discount approvals
          this.navigateToDiscountApprovals();
          this.closeDropdown();
        },
        error: (err) => {
          console.error('Failed to mark notification as read:', err);
        }
      });
  }

  markAllAsRead(): void {
    this.adminNotificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.forEach(n => n.is_read = true);
          this.unreadCount = 0;
        },
        error: (err) => {
          console.error('Failed to mark all as read:', err);
        }
      });
  }

  navigateToDiscountApprovals(): void {
    // Navigate to discount approvals section
    this.router.navigate(['/admin/discount-approval']);
  }

  getTimeAgo(createdAt: string): string {
    const createdTime = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays} days ago`;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
