import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../api.service';
import { LocalStorageService } from '../../local-storage.service';
import { ISettings } from '../../i-settings';
import { ITimerState, TimerAction } from '../../i-timer';

export const DEFAULT_TIMER_MINUTES = 3;
const WARN_MS = 30_000;
const DANGER_MS = 10_000;
const EXPIRED_DISPLAY_MS = 8_000;

// Shared discussion countdown. The server only stores the end time; each
// client ticks locally (corrected for clock differences via serverTime)
// and plays the gong itself when it sees the countdown reach zero.
@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.css'
})
export class TimerComponent implements OnInit, OnDestroy {
  timer: ITimerState | null = null;
  remainingMs = 0;
  expired = false;
  popoverOpen = false;
  minutes = DEFAULT_TIMER_MINUTES;
  readonly presets = [1, 2, 3, 5, 10];
  muted: boolean;
  // Screen-reader text. Only updated at one minute left and at zero,
  // not every second.
  announcement = '';

  private destroy$ = new Subject<void>();
  private clockOffset = 0;  // server clock minus this browser's clock
  private interval?: ReturnType<typeof setInterval>;
  private expiredTimeout?: ReturnType<typeof setTimeout>;
  // endsAt of the countdown we've seen running with time left. The alarm
  // only fires for that one, so joining after a timer finished (or a
  // repeat settings message) never sets it off.
  private armedFor: number | null = null;
  private announcedLastMinute = false;
  private gong?: HTMLAudioElement;

  constructor(
    private api: ApiService,
    private localStorage: LocalStorageService,
    private host: ElementRef<HTMLElement>,
  ) {
    this.muted = localStorage.isTimerAlarmMuted();
  }

  ngOnInit(): void {
    this.api.getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => this.onSettings(settings));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTicking();
    clearTimeout(this.expiredTimeout);
  }

  get isRunning(): boolean {
    return this.timer?.state === 'running';
  }

  get isPaused(): boolean {
    return this.timer?.state === 'paused';
  }

  get warn(): boolean {
    return this.isRunning && this.remainingMs <= WARN_MS && this.remainingMs > DANGER_MS;
  }

  get danger(): boolean {
    return this.isRunning && this.remainingMs <= DANGER_MS;
  }

  get display(): string {
    const totalSeconds = Math.ceil(this.remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  onSettings(settings: ISettings): void {
    if (settings.serverTime) {
      this.clockOffset = settings.serverTime - Date.now();
    }
    this.timer = settings.timer ?? null;

    if (!this.timer) {
      // Stopped, cleared, or dropped by the server after finishing.
      // Leave any "Time's up" display to run out on its own.
      this.stopTicking();
      this.armedFor = null;
      this.remainingMs = 0;
      return;
    }

    this.dismissExpired();
    if (this.timer.state === 'paused') {
      this.stopTicking();
      this.remainingMs = this.timer.remainingMs ?? 0;
      return;
    }
    this.startTicking();
    this.tick();
  }

  tick(): void {
    const timer = this.timer;
    if (!timer || timer.state !== 'running' || timer.endsAt === null) {
      return;
    }
    const remaining = timer.endsAt - (Date.now() + this.clockOffset);
    this.remainingMs = Math.max(0, remaining);

    if (remaining > 0) {
      if (this.armedFor !== timer.endsAt) {
        this.armedFor = timer.endsAt;
        this.announcedLastMinute = remaining <= 60_000;
      }
      if (!this.announcedLastMinute && remaining <= 60_000) {
        this.announcedLastMinute = true;
        this.announcement = 'One minute left on the discussion timer';
      }
      return;
    }

    this.stopTicking();
    if (this.armedFor === timer.endsAt) {
      this.armedFor = null;
      this.onExpired();
    }
  }

  // -- Controls ---------------------------------------------------------

  togglePopover(): void {
    this.popoverOpen = !this.popoverOpen;
  }

  start(minutes: number = this.minutes): void {
    const clamped = Math.min(60, Math.max(1, Math.round(minutes)));
    this.send('start', clamped * 60);
    this.minutes = clamped;
    this.popoverOpen = false;
  }

  addMinute(): void {
    this.send('add', 60);
  }

  pause(): void {
    this.send('pause');
  }

  resume(): void {
    this.send('resume');
  }

  stop(): void {
    this.send('stop');
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.localStorage.setTimerAlarmMuted(this.muted);
    if (this.muted) {
      this.gong?.pause();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.popoverOpen && !this.host.nativeElement.contains(event.target as Node)) {
      this.popoverOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.popoverOpen = false;
  }

  // -- Internals --------------------------------------------------------

  private send(action: TimerAction, seconds?: number): void {
    this.api.sendTimer(seconds === undefined
      ? { type: 'timer', action }
      : { type: 'timer', action, seconds });
  }

  private onExpired(): void {
    this.expired = true;
    this.announcement = "Time's up!";
    this.playAlarm();
    clearTimeout(this.expiredTimeout);
    this.expiredTimeout = setTimeout(() => this.expired = false, EXPIRED_DISPLAY_MS);
  }

  private dismissExpired(): void {
    this.expired = false;
    clearTimeout(this.expiredTimeout);
  }

  playAlarm(): void {
    if (this.muted) {
      return;
    }
    this.gong ??= new Audio('assets/sounds/gong.mp3');
    this.gong.currentTime = 0;
    // Browsers block audio until the user has interacted with the page.
    this.gong.play().catch(err => console.warn('Timer alarm blocked', err));
  }

  private startTicking(): void {
    if (!this.interval) {
      // 250ms keeps the seconds display from visibly skipping.
      this.interval = setInterval(() => this.tick(), 250);
    }
  }

  private stopTicking(): void {
    clearInterval(this.interval);
    this.interval = undefined;
  }
}
