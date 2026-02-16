import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
  imageUrl: string;
  publicId: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload an image file to backend (which uploads to Cloudinary)
   * @param file The image file to upload
   * @returns Observable with the image URL
   */
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<any>(`${this.apiUrl}/image`, formData).pipe(
      map(response => response.imageUrl)
    );
  }

  /**
   * Upload multiple images to backend
   * @param files Array of image files to upload
   * @returns Observable with array of image URLs
   */
  uploadMultipleImages(files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    return this.http.post<any>(`${this.apiUrl}/images`, formData).pipe(
      map(response => response.images.map((img: any) => img.imageUrl))
    );
  }

  /**
   * Delete an image from Cloudinary
   * @param imageUrl The Cloudinary image URL
   * @returns Observable
   */
  deleteImage(imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/image`, {
      body: { imageUrl }
    });
  }
}
