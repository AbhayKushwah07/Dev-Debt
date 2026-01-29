import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  currentUser = signal<any | null>(null);

  constructor(private router: Router) {
    this.loadUser();
  }

  loginWithGithub() {
    // Redirect to backend auth endpoint
    window.location.href = 'http://localhost:3000/auth/github';
  }

  handleCallback(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.loadUser();
    this.router.navigate(['/dashboard']);
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUser() {
    const token = this.getToken();
    if (token) {
      // simpler for now: just assume if token exists, we are logged in.
      // In real app, decode JWT or fetch profile.
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUser.set(payload);
      } catch (e) {
        console.error('Invalid token', e);
        this.logout();
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }
}
