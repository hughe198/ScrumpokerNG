import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { TimerComponent } from './timer.component';
import { ApiService } from '../../api.service';
import { LocalStorageService } from '../../local-storage.service';
import { DEFAULT_SETTINGS, ISettings } from '../../i-settings';
import { ITimerState } from '../../i-timer';

describe('TimerComponent', () => {
  let component: TimerComponent;
  let fixture: ComponentFixture<TimerComponent>;
  let settings$: BehaviorSubject<ISettings>;
  let api: ApiService;
  let storage: LocalStorageService;
  const START = new Date(2026, 9, 23, 12, 0, 0);

  function running(endsInMs: number): ITimerState {
    return { state: 'running', endsAt: Date.now() + endsInMs, remainingMs: null, duration: 180, startedBy: 'Alice' };
  }

  function push(timer: ITimerState | null, serverTime = Date.now()): void {
    settings$.next({ ...DEFAULT_SETTINGS, timer, serverTime });
    fixture.detectChanges();
  }

  function advance(ms: number): void {
    jasmine.clock().tick(ms);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(START);

    await TestBed.configureTestingModule({
      imports: [TimerComponent]
    })
    .compileComponents();

    settings$ = new BehaviorSubject<ISettings>(DEFAULT_SETTINGS);
    api = TestBed.inject(ApiService);
    spyOn(api, 'getSettings').and.returnValue(settings$);
    spyOn(api, 'sendTimer');
    storage = TestBed.inject(LocalStorageService);
    spyOn(storage, 'isTimerAlarmMuted').and.returnValue(false);
    spyOn(storage, 'setTimerAlarmMuted');

    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    spyOn(component, 'playAlarm');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    jasmine.clock().uninstall();
  });

  it('defaults to 3 minutes and starts with that when Start is pressed', () => {
    expect(component.minutes).toBe(3);
    component.togglePopover();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.timer-popover .btn-success') as HTMLButtonElement).click();

    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'start', seconds: 180 });
    expect(component.popoverOpen).toBeFalse();
  });

  it('clamps custom durations to 1-60 minutes', () => {
    component.start(0);
    component.start(90);
    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'start', seconds: 60 });
    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'start', seconds: 3600 });
  });

  it('counts down from the server end time', () => {
    push(running(180_000));
    expect(component.display).toBe('3:00');

    advance(61_000);
    expect(component.display).toBe('1:59');
  });

  it('corrects for a client clock that is behind the server', () => {
    // Server is 5s ahead of this browser: its endsAt is 3 minutes after ITS now.
    const serverNow = Date.now() + 5_000;
    push({ ...running(0), endsAt: serverNow + 180_000 }, serverNow);
    expect(component.display).toBe('3:00');
  });

  it('turns amber at 30 seconds and red at 10', () => {
    push(running(40_000));
    expect(component.warn).toBeFalse();

    advance(11_000);
    expect(component.warn).toBeTrue();

    advance(20_000);
    expect(component.warn).toBeFalse();
    expect(component.danger).toBeTrue();
  });

  it('plays the alarm once when the countdown reaches zero, then returns to idle', () => {
    push(running(5_000));
    advance(5_250);

    expect(component.playAlarm).toHaveBeenCalledTimes(1);
    expect(component.expired).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain("Time's up!");

    // A repeat settings message for the same finished timer doesn't re-alarm.
    push(settings$.value.timer);
    advance(1_000);
    expect(component.playAlarm).toHaveBeenCalledTimes(1);

    push(null);  // server drops the finished timer
    advance(8_000);
    expect(component.expired).toBeFalse();
  });

  it('does not alarm for someone who joins after the timer finished', () => {
    push(running(-2_000));
    advance(1_000);
    expect(component.playAlarm).not.toHaveBeenCalled();
    expect(component.expired).toBeFalse();
  });

  it('shows the paused remaining time without counting down', () => {
    push({ state: 'paused', endsAt: null, remainingMs: 95_000, duration: 180, startedBy: 'Alice' });
    advance(10_000);
    expect(component.display).toBe('1:35');
    expect(component.isPaused).toBeTrue();
  });

  it('control buttons send the matching actions', () => {
    component.pause();
    component.resume();
    component.addMinute();
    component.stop();

    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'pause' });
    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'resume' });
    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'add', seconds: 60 });
    expect(api.sendTimer).toHaveBeenCalledWith({ type: 'timer', action: 'stop' });
  });

  it('mute toggles and is saved', () => {
    component.toggleMute();
    expect(component.muted).toBeTrue();
    expect(storage.setTimerAlarmMuted).toHaveBeenCalledWith(true);
  });
});
