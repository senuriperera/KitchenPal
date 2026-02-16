import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  active?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Inventory', icon: 'inventory', route: '/inventory' },
    { label: 'Expiry Alerts', icon: 'alert', route: '/expiry-alerts' },
    { label: 'Recipes', icon: 'recipes', route: '/recipes' },
    { label: 'Discount Approvals', icon: 'discount', route: '/discount-approvals' },
    { label: 'Reports', icon: 'reports', route: '/reports' },
    { label: 'User Management', icon: 'users', route: '/user-management' }
  ];
}
