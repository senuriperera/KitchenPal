import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Skip token attachment for auth endpoints (login, register, refresh)
    if (req.url.includes('/auth/login') || 
        req.url.includes('/auth/register') || 
        req.url.includes('/auth/refresh')) {
        return next(req);
    }

    // Clone request and add access token
    const accessToken = authService.getAccessToken();
    if (accessToken) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    }

    // Handle the request and catch 401 errors
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // If 401 Unauthorized, try to refresh the token
            if (error.status === 401 && !req.url.includes('/auth/refresh')) {
                return authService.refreshToken().pipe(
                    switchMap((newAccessToken) => {
                        // Retry the original request with the new access token
                        const retryReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${newAccessToken}`
                            }
                        });
                        return next(retryReq);
                    }),
                    catchError((refreshError) => {
                        // If refresh fails, logout and redirect to login
                        authService.logout();
                        router.navigate(['/login']);
                        return throwError(() => refreshError);
                    })
                );
            }

            return throwError(() => error);
        })
    );
};
