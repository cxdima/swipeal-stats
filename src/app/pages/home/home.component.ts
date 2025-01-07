// src/app/components/home/home.component.ts

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {IdComponent} from "../id/id.component";

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, FormsModule, IdComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
    officialNickname = '';
    errorMessage = '';

    constructor(private http: HttpClient, private router: Router) {}

    onSubmit(): void {
        const nickname = this.officialNickname.trim();
        if (!nickname) {
            this.errorMessage = 'Username cannot be empty.';
            return;
        }

        const apiUrl = 'https://ozpxrqruih.execute-api.us-east-1.amazonaws.com/prod/user';
        const payload = { official_nickname: nickname };

        this.http.post<{ id: number }>(apiUrl, payload).subscribe({
            next: response => {
                if (response.id) {
                    this.router.navigate([`/stats/${response.id}`]);
                } else {
                    this.errorMessage = 'User ID not found for the provided username.';
                }
            },
            error: error => {
                console.error('Error:', error);
                if (error.status === 404) {
                    this.errorMessage = 'User not found. Please check the username.';
                } else if (error.status === 400) {
                    this.errorMessage = 'Invalid request. Please try again.';
                } else {
                    this.errorMessage = 'An unexpected error occurred. Please try again later.';
                }
            }
        });
    }
}
