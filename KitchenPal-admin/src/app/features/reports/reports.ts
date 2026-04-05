import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService } from '../../core/services/analytics.service';
import { HeaderComponent } from '../../shared/components/header/header';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);

  selectedReportType = 'food_waste';
  selectedDateRange = 'last_30_days';
  selectedBranchId: number | null = null;
  selectedFamily = 'weight';
  selectedPieFamily = 'weight';
  
  branches: any[] = [];
  isGenerating = false;
  reportData: any = null;
  topWastedData: any = null;
  errorMessage = '';
  
  monthlyChartInstance: any = null;
  pieChartInstance: any = null;

  pieColors = ['#10B981', '#F97316', '#FCD34D', '#F87171', '#60A5FA'];

  ngOnInit(): void {
    this.analyticsService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: () => {
        this.errorMessage = 'Failed to load branches';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.monthlyChartInstance) {
      this.monthlyChartInstance.destroy();
    }
    if (this.pieChartInstance) {
      this.pieChartInstance.destroy();
    }
  }

  generateReport(): void {
    this.isGenerating = true;
    this.errorMessage = '';

    forkJoin({
      topWasted: this.analyticsService.getTopWasted(
        this.selectedDateRange,
        this.selectedBranchId || undefined
      ),
      summary: this.analyticsService.getMonthlySummary(
        6,
        this.selectedBranchId || undefined
      )
    }).subscribe({
      next: ({ topWasted, summary }) => {
        this.topWastedData = topWasted;
        this.reportData = summary;
        this.isGenerating = false;
        
        // Render charts after a short delay to ensure DOM is ready
        setTimeout(() => {
          this.renderBarChart();
          this.renderPieChart();
        }, 100);
      },
      error: (err) => {
        console.error('Failed to generate report:', err);
        this.errorMessage = 'Failed to generate report';
        this.isGenerating = false;
      }
    });
  }

  renderBarChart(): void {
    if (!this.reportData?.monthlyData) return;

    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = this.reportData.monthlyData.map((d: any) => {
      return new Date(d.month).toLocaleString('default', { month: 'short' });
    });

    const family = this.selectedFamily;
    const unitLabel = this.reportData.monthlyData[0]?.wasted?.[family]?.unit || 'kg';

    if (this.monthlyChartInstance) {
      this.monthlyChartInstance.destroy();
    }

    this.monthlyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `Food Saved (${unitLabel})`,
            data: this.reportData.monthlyData.map((d: any) => d.saved?.[family]?.value || 0),
            backgroundColor: '#10B981'
          },
          {
            label: `Food Wasted (${unitLabel})`,
            data: this.reportData.monthlyData.map((d: any) => d.wasted?.[family]?.value || 0),
            backgroundColor: '#F97316'
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
          x: { stacked: false }, 
          y: { beginAtZero: true } 
        }
      }
    });
  }

  renderPieChart(): void {
    if (!this.topWastedData?.topWasted) return;

    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!ctx) return;

    const family = this.selectedPieFamily;
    const familyItems = this.topWastedData.topWasted
      .filter((item: any) => item.unit_family === family);

    if (familyItems.length === 0) {
      if (this.pieChartInstance) {
        this.pieChartInstance.destroy();
        this.pieChartInstance = null;
      }
      return;
    }

    if (this.pieChartInstance) {
      this.pieChartInstance.destroy();
    }

    this.pieChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: familyItems.map((i: any) => i.name),
        datasets: [{
          data: familyItems.map((i: any) => i.quantity.value),
          backgroundColor: this.pieColors.slice(0, familyItems.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const item = familyItems[ctx.dataIndex];
                return `${item.name}: ${item.quantity.display} (${item.percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  onFamilyChange(): void {
    this.renderBarChart();
  }

  onPieFamilyChange(): void {
    this.renderPieChart();
  }

  get filteredPieItems(): any[] {
    if (!this.topWastedData?.topWasted) return [];
    return this.topWastedData.topWasted
      .filter((item: any) => item.unit_family === this.selectedPieFamily);
  }

  get selectedDateRangeLabel(): string {
    const labels: { [key: string]: string } = {
      'last_7_days': 'Last 7 Days',
      'last_30_days': 'Last 30 Days',
      'last_90_days': 'Last 90 Days',
      'last_year': 'Last Year'
    };
    return labels[this.selectedDateRange] || 'Last 30 Days';
  }

  exportCSV(): void {
    if (!this.topWastedData?.topWasted) return;

    const rows = [
      ['Ingredient', 'Unit Family', 'Quantity Wasted', 'Unit', 'Percentage'],
      ...this.topWastedData.topWasted.map((item: any) => [
        item.name,
        item.unit_family,
        item.quantity.value,
        item.quantity.unit,
        item.percentage + '%'
      ])
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-waste-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
