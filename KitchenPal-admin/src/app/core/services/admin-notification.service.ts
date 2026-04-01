import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminNotification {
  notification_id: number;
  title: string;
  message: string;
  notification_type: string;
  status: string;
  is_read: boolean;
  created_at: string;
  branch_name?: string;
}

export interface AdminBellNotificationsResponse {
  notifications: AdminNotification[];
  unread_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminNotificationService {
  private apiUrl = `${environment.apiUrl}/admin/notifications/bell`;

  constructor(private http: HttpClient) {}

  getBellNotifications(): Observable<AdminBellNotificationsResponse> {
    return this.http.get<AdminBellNotificationsResponse>(this.apiUrl);
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/read-all`, {});
  }
}
