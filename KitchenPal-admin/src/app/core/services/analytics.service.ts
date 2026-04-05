import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/analytics`;

  getDashboardStats(branchId?: number): Observable<any> {
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    return this.http.get(`${this.base}/dashboard-stats`, { params });
  }

  getMonthlySummary(months = 6, branchId?: number): Observable<any> {
    let params = new HttpParams().set('months', months.toString());
    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    return this.http.get(`${this.base}/monthly-summary`, { params });
  }

  getTopWasted(dateRange = 'last_30_days', branchId?: number): Observable<any> {
    let params = new HttpParams().set('date_range', dateRange);
    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    return this.http.get(`${this.base}/top-wasted`, { params });
  }

  getRecentActivity(branchId?: number): Observable<any> {
    let params = new HttpParams();
    if (branchId) {
      params = params.set('branch_id', branchId.toString());
    }
    return this.http.get(`${this.base}/recent-activity`, { params });
  }

  getBranches(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/common/branches`);
  }
}
