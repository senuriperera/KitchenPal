import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../shared/components/header/header';
import { AnalyticsService } from '../../core/services/analytics.service';
import { forkJoin } from 'rxjs';

declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private analyticsService = inject(AnalyticsService);
  
  stats: any = null;
  summary: any = null;
  activities: any[] = [];
  isLoading = true;
  errorMessage = '';
  selectedFamily: 'weight' | 'volume' | 'count' = 'weight';
  areaChart: any = null;
  chartReady = false;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.chartReady = true;
    if (this.summary?.monthlyData) {
      this.renderAreaChart();
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      stats: this.analyticsService.getDashboardStats(),
      summary: this.analyticsService.getMonthlySummary(6),
      activity: this.analyticsService.getRecentActivity()
    }).subscribe({
      next: ({ stats, summary, activity }) => {
        this.stats = stats;
        this.summary = summary;
        this.activities = activity.activities || [];
        this.isLoading = false;
        if (this.chartReady) {
          setTimeout(() => this.renderAreaChart(), 0);
        }
      },
      error: (err) => {
        console.error('Failed to load dashboard data:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error response:', err.error);
        this.errorMessage = 'Failed to load dashboard data';
        this.isLoading = false;
      }
    });
  }

  renderAreaChart(): void {
    const canvas = document.getElementById('areaChart') as HTMLCanvasElement;
    if (!canvas || !this.summary?.monthlyData || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = this.summary.monthlyData.map((d: any) => {
      const date = new Date(d.month);
      return date.toLocaleString('default', { month: 'short' });
    });

    const wastedData = this.summary.monthlyData.map((d: any) =>
      d.wasted[this.selectedFamily].value
    );

    const savedData = this.summary.monthlyData.map((d: any) =>
      d.saved[this.selectedFamily].value
    );

    const unitLabel = this.summary.monthlyData[0]
      ?.wasted[this.selectedFamily]?.unit || 'kg';

    if (this.areaChart) {
      this.areaChart.destroy();
    }

    this.areaChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Food Saved (${unitLabel})`,
            data: savedData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16,185,129,0.15)',
            fill: true,
            tension: 0.4
          },
          {
            label: `Food Wasted (${unitLabel})`,
            data: wastedData,
            borderColor: '#F87171',
            backgroundColor: 'rgba(248,113,113,0.15)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  switchFamily(family: 'weight' | 'volume' | 'count'): void {
    this.selectedFamily = family;
    this.renderAreaChart();
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'sale':
        return 'receipt';
      case 'approval':
        return 'thumb_up';
      case 'expiry_alert':
        return 'access_time';
      default:
        return 'info';
    }
  }
}
