import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

type LaunchStage = 'confirm' | 'armed';

// Two-step launch: confirm the target, then press the big red button.
// Purely presentational -- the parent sends the reaction on (launch).
@Component({
  selector: 'app-missile-launch-dialog',
  standalone: true,
  imports: [],
  templateUrl: './missile-launch-dialog.component.html',
  styleUrl: './missile-launch-dialog.component.css'
})
export class MissileLaunchDialogComponent implements AfterViewInit {
  @Input() targetName: string = '';
  @Output() launch = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  stage: LaunchStage = 'confirm';

  // Focus the main action of each stage, so Enter/Space work without
  // reaching for the mouse and screen readers land on the dialog.
  @ViewChild('primaryAction') primaryAction?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    this.focusPrimary();
  }

  arm(): void {
    this.stage = 'armed';
    this.focusPrimary();
  }

  fire(): void {
    this.launch.emit();
  }

  abort(): void {
    this.cancel.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.abort();
  }

  private focusPrimary(): void {
    // The button for the new stage only exists after the next render.
    setTimeout(() => this.primaryAction?.nativeElement.focus());
  }
}
