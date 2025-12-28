import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Branch {
  id: number;
  name: string;
  address: string;
  contact_email: string;
  contact_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
  contact_email: string;
  contact_number: string;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string;
  contact_email?: string;
  contact_number?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private apiUrl = `${environment.apiUrl}/common/branches`;

  constructor(private http: HttpClient) { }

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.apiUrl);
  }

  getBranchById(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/${id}`);
  }

  createBranch(branchData: CreateBranchRequest): Observable<Branch> {
    return this.http.post<Branch>(this.apiUrl, branchData);
  }

  updateBranch(id: number, branchData: UpdateBranchRequest): Observable<Branch> {
    return this.http.put<Branch>(`${this.apiUrl}/${id}`, branchData);
  }

  deleteBranch(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
