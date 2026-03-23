import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';

  constructor(private authService: AuthService) { }

  get currentUser$() {
    return this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }
}
