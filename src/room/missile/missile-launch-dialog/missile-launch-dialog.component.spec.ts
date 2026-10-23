import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissileLaunchDialogComponent } from './missile-launch-dialog.component';

describe('MissileLaunchDialogComponent', () => {
  let component: MissileLaunchDialogComponent;
  let fixture: ComponentFixture<MissileLaunchDialogComponent>;

  function buttonWithText(text: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    return buttons.find(b => b.textContent?.includes(text))!;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissileLaunchDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissileLaunchDialogComponent);
    component = fixture.componentInstance;
    component.targetName = 'Bob';
    fixture.detectChanges();
  });

  it('starts with the target named in the warning', () => {
    expect(fixture.nativeElement.textContent)
      .toContain('Are you sure you want to launch your missile at Bob?');
  });

  it('needs Arm and then LAUNCH before it emits launch', () => {
    spyOn(component.launch, 'emit');

    buttonWithText('Arm missile').click();
    fixture.detectChanges();
    expect(component.launch.emit).not.toHaveBeenCalled();
    expect(component.stage).toBe('armed');

    buttonWithText('LAUNCH').click();
    expect(component.launch.emit).toHaveBeenCalledTimes(1);
  });

  it('Cancel, Abort, Escape and the backdrop all emit cancel', () => {
    spyOn(component.cancel, 'emit');

    buttonWithText('Cancel').click();
    component.arm();
    fixture.detectChanges();
    buttonWithText('Abort').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (fixture.nativeElement.querySelector('.launch-backdrop') as HTMLElement).click();

    expect(component.cancel.emit).toHaveBeenCalledTimes(4);
  });
});
