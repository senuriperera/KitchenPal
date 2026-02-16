import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  // Configure these with your Cloudinary account details
  private cloudName = 'your-cloud-name'; // Replace with your cloud name
  private uploadPreset = 'your-upload-preset'; // Replace with your upload preset
  private cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload an image file to Cloudinary
   * @param file The image file to upload
   * @returns Observable with the Cloudinary response containing the image URL
   */
  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'recipes'); // Organize images in a 'recipes' folder

    return this.http.post(this.cloudinaryUrl, formData);
  }

  /**
   * Set Cloudinary configuration
   * @param cloudName Your Cloudinary cloud name
   * @param uploadPreset Your upload preset name
   */
  setConfig(cloudName: string, uploadPreset: string): void {
    this.cloudName = cloudName;
    this.uploadPreset = uploadPreset;
    this.cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  }
}
