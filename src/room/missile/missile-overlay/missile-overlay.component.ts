import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../api.service';
import { IMissileLaunch } from '../../../i-missile';
import { MissileService } from '../missile.service';

const FLIGHT_MS = 1400;
const BANNER_AFTER_IMPACT_MS = 1800;

// Full-screen layer that plays every missile launch for everyone in the
// room: banner, rocket flying from the sender's card to the target's,
// explosion, screen flash and a shake of the target card.
//
// The rocket, explosion and flash are short-lived DOM elements created
// directly on this component's host and animated with the Web Animations
// API: they need pixel positions measured from the live card elements,
// which a template binding can't easily provide mid-flight.
@Component({
  selector: 'app-missile-overlay',
  standalone: true,
  imports: [],
  templateUrl: './missile-overlay.component.html',
  styleUrl: './missile-overlay.component.css'
})
export class MissileOverlayComponent implements OnInit, OnDestroy {
  banner: string | null = null;
  bannerImpact = false;

  private destroy$ = new Subject<void>();
  private bannerTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private api: ApiService,
    private missiles: MissileService,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.api.getMissileLaunches()
      .pipe(takeUntil(this.destroy$))
      .subscribe(launch => this.play(launch));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.bannerTimer);
  }

  play(launch: IMissileLaunch): void {
    this.missiles.startFlight(launch.reactionID);
    this.missiles.playLaunch();
    this.showBanner(`🚀 ${launch.fromName || 'Someone'} launched a missile at ${launch.toName || 'someone'}!`, false);

    const target = this.cardFor(launch.toVoter);
    const source = this.cardFor(launch.fromVoter);

    if (!target || this.reducedMotion()) {
      // No flight path to draw (target scrolled away/left, or the user
      // prefers reduced motion) -- go straight to a short delayed impact.
      setTimeout(() => this.impact(launch, target), 600);
      return;
    }
    this.fly(source, target).then(() => this.impact(launch, target));
  }

  private fly(source: HTMLElement | null, target: HTMLElement): Promise<void> {
    const end = this.centre(target);
    // A sender who has left has no card; launch from the bottom of the screen.
    const start = source ? this.centre(source) : { x: window.innerWidth / 2, y: window.innerHeight + 40 };
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const peak = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - Math.max(120, distance * 0.35),
    };

    const rocket = this.spawn('rocket', '🚀');
    // 🚀 is drawn pointing up-right (45°), so add 45° to the travel angle.
    const angle = (from: { x: number, y: number }, to: { x: number, y: number }) =>
      Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI + 45;
    const at = (p: { x: number, y: number }, deg: number, scale: number) =>
      `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${deg}deg) scale(${scale})`;

    const animation = rocket.animate([
      { transform: at(start, angle(start, peak), 0.6) },
      { transform: at(peak, angle(start, end), 1.4), offset: 0.5 },
      { transform: at(end, angle(peak, end), 1) },
    ], { duration: FLIGHT_MS, easing: 'ease-in' });

    return animation.finished
      .catch(() => undefined)  // cancelled (e.g. page left) -- still clean up
      .then(() => rocket.remove());
  }

  private impact(launch: IMissileLaunch, target: HTMLElement | null): void {
    this.missiles.playBoom();
    this.missiles.land(launch.reactionID);
    this.showBanner(`💥 Direct hit on ${launch.toName || 'someone'}!`, true);

    const flash = this.spawn('flash', '');
    flash.animate([{ opacity: 0.45 }, { opacity: 0 }], { duration: 350, easing: 'ease-out' })
      .finished.catch(() => undefined).then(() => flash.remove());

    if (!target) {
      return;
    }
    const centre = this.centre(target);
    const placed = `translate(${centre.x}px, ${centre.y}px) translate(-50%, -50%)`;

    const blast = this.spawn('blast', '💥');
    blast.animate([
      { transform: `${placed} scale(0.2)`, opacity: 1 },
      { transform: `${placed} scale(2.6)`, opacity: 1, offset: 0.4 },
      { transform: `${placed} scale(3.2)`, opacity: 0 },
    ], { duration: 900, easing: 'ease-out' })
      .finished.catch(() => undefined).then(() => blast.remove());

    const ring = this.spawn('shockwave', '');
    ring.animate([
      { transform: `${placed} scale(0.1)`, opacity: 0.9 },
      { transform: `${placed} scale(4)`, opacity: 0 },
    ], { duration: 700, easing: 'ease-out' })
      .finished.catch(() => undefined).then(() => ring.remove());

    if (!this.reducedMotion()) {
      target.animate([
        { transform: 'translate(0, 0) rotate(0)' },
        { transform: 'translate(-8px, 2px) rotate(-4deg)' },
        { transform: 'translate(7px, -3px) rotate(3deg)' },
        { transform: 'translate(-5px, 1px) rotate(-2deg)' },
        { transform: 'translate(3px, 0) rotate(1deg)' },
        { transform: 'translate(0, 0) rotate(0)' },
      ], { duration: 550, easing: 'ease-out' });
    }
  }

  private showBanner(text: string, impact: boolean): void {
    this.banner = text;
    this.bannerImpact = impact;
    clearTimeout(this.bannerTimer);
    // Safety net in case impact never fires; impact resets the timer.
    this.bannerTimer = setTimeout(() => this.banner = null,
      impact ? BANNER_AFTER_IMPACT_MS : FLIGHT_MS + BANNER_AFTER_IMPACT_MS);
  }

  private spawn(className: string, text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `missile-fx ${className}`;
    el.textContent = text;
    el.setAttribute('aria-hidden', 'true');
    this.host.nativeElement.appendChild(el);
    return el;
  }

  private cardFor(voterId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`.player-card[data-voter-id="${CSS.escape(voterId)}"]`);
  }

  private centre(el: HTMLElement): { x: number, y: number } {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  private reducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
