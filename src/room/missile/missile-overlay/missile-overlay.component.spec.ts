import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { MissileOverlayComponent } from './missile-overlay.component';
import { ApiService } from '../../../api.service';
import { MissileService } from '../missile.service';
import { IMissileLaunch } from '../../../i-missile';

describe('MissileOverlayComponent', () => {
  let component: MissileOverlayComponent;
  let fixture: ComponentFixture<MissileOverlayComponent>;
  let launches: Subject<IMissileLaunch>;
  let missiles: MissileService;

  const launch: IMissileLaunch = {
    type: 'missile', reactionID: 'r1',
    fromVoter: 'alice', toVoter: 'bob', fromName: 'Alice', toName: 'Bob',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissileOverlayComponent]
    })
    .compileComponents();

    launches = new Subject<IMissileLaunch>();
    spyOn(TestBed.inject(ApiService), 'getMissileLaunches').and.returnValue(launches);
    missiles = TestBed.inject(MissileService);
    // Keep the test run silent.
    spyOn(missiles, 'playLaunch');
    spyOn(missiles, 'playBoom');

    fixture = TestBed.createComponent(MissileOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('announces the launch to everyone and marks the missile in flight', () => {
    launches.next(launch);
    fixture.detectChanges();

    expect(missiles.playLaunch).toHaveBeenCalled();
    expect(missiles.isInFlight('r1')).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Alice launched a missile at Bob!');
  });

  it('lands the missile, plays the boom and announces the hit (no cards on screen)', fakeAsync(() => {
    launches.next(launch);
    tick(600);
    fixture.detectChanges();

    expect(missiles.playBoom).toHaveBeenCalled();
    expect(missiles.isInFlight('r1')).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Direct hit on Bob!');

    tick(2000);
    fixture.detectChanges();
    expect(component.banner).toBeNull();
  }));
});
