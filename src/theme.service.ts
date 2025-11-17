import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'scrumpoker-theme';
  private readonly themeSubject = new BehaviorSubject<'light' | 'dark'>('light');

  constructor() {
    this.initializeTheme();
  }

  get currentTheme$(): Observable<'light' | 'dark'> {
    return this.themeSubject.asObservable();
  }

  get currentTheme(): 'light' | 'dark' {
    return this.themeSubject.value;
  }

  private initializeTheme(): void {
    // Check localStorage first
    const savedTheme = localStorage.getItem(this.THEME_KEY) as 'light' | 'dark' | null;
    
    // Fall back to system preference if no saved theme
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    const theme = savedTheme || systemPreference;
    this.setTheme(theme);
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: 'light' | 'dark'): void {
    // Apply to document
    document.documentElement.setAttribute('data-bs-theme', theme);
    
    // Save to localStorage
    localStorage.setItem(this.THEME_KEY, theme);
    
    // Update observable
    this.themeSubject.next(theme);
  }

  // Listen for system theme changes
  watchSystemTheme(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(this.THEME_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}