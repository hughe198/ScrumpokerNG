import { Component, OnInit, OnDestroy } from '@angular/core';
import { ThemeService } from '../../theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.css'
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  private destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.isDarkMode = theme === 'dark';
      });

    // Start watching for system theme changes
    this.themeService.watchSystemTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToggle(): void {
    this.themeService.toggleTheme();
  }
}
