import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../shared/components/header/header';

interface DashboardStats {
  itemsNearExpiry: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
  foodWasted: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
  foodSaved: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
  activeDiscounts: {
    value: number;
  };
  profitFromDiscounts: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    itemsNearExpiry: {
      value: 24,
      change: 12,
      trend: 'down'
    },
    foodWasted: {
      value: 18,
      change: 8,
      trend: 'up'
    },
    foodSaved: {
      value: 32,
      change: 15,
      trend: 'up'
    },
    activeDiscounts: {
      value: 7
    },
    profitFromDiscounts: {
      value: 420,
      change: 22,
      trend: 'up'
    }
  };

  ngOnInit(): void {
    // Load dashboard data
  }
}
