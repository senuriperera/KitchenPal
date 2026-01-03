import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    branch: string;
    lastLogin: string;
}

export interface CreateUserRequest {
    name: string;
    email: string;
    role: string;
    password: string;
}

export interface UpdateUserRequest {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
}

export interface UserResponse {
    message: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = `${environment.apiUrl}/users`;

    constructor(private http: HttpClient) { }

    /**
     * Get all users
     */
    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
    }

    /**
     * Create a new user
     */
    createUser(userData: CreateUserRequest): Observable<UserResponse> {
        return this.http.post<UserResponse>(this.apiUrl, userData);
    }

    /**
     * Update an existing user
     */
    updateUser(id: number, userData: UpdateUserRequest): Observable<UserResponse> {
        return this.http.put<UserResponse>(`${this.apiUrl}/${id}`, userData);
    }

    /**
     * Delete a user
     */
    deleteUser(id: number): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }
}
