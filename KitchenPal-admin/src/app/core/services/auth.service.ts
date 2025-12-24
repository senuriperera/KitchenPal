import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, delay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
    user_id: string; // Backend sends user_id
    email: string;
    name: string;
    role: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/auth`;
    private currentUserSubject: BehaviorSubject<User | null>;
    public currentUser$: Observable<User | null>;

    constructor(private http: HttpClient, private router: Router) {
        const savedUser = localStorage.getItem('currentUser');
        this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
        this.currentUser$ = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    login(email: string, password: string): Observable<User> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
            .pipe(
                tap(response => {
                    localStorage.setItem('accessToken', response.accessToken);
                    localStorage.setItem('refreshToken', response.refreshToken);
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    this.currentUserSubject.next(response.user);
                }),
                map(response => response.user)
            );
    }

    logout() {
        const accessToken = localStorage.getItem('accessToken');

        // Call backend logout endpoint
        if (accessToken) {
            this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
                error: (err) => console.error('Logout error:', err)
            });
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    refreshToken(): Observable<string> {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        return this.http.post<{ accessToken: string }>(`${this.apiUrl}/refresh`, { refreshToken })
            .pipe(
                tap(response => {
                    localStorage.setItem('accessToken', response.accessToken);
                }),
                map(response => response.accessToken)
            );
    }

    isAuthenticated(): boolean {
        return !!this.currentUserValue && !!localStorage.getItem('accessToken');
    }

    getAccessToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    }
}
