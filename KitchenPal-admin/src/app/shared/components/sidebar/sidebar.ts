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
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Recipes', icon: 'menu_book', route: '/recipes' },
    { label: 'Discount Approvals', icon: 'local_offer', route: '/discount-approvals' },
    { label: 'Reports', icon: 'bar_chart', route: '/reports' },
    { label: 'User Management', icon: 'group', route: '/user-management' }
  ];
}
