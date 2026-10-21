import { Component, Input } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-deezer-button',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './deezer-button.component.html',
  styleUrl: './deezer-button.component.css'
})
export class DeezerButtonComponent {
  @Input({ required: true }) href!: string;
  /** Defaults to the translated "Listen on Deezer". */
  @Input() label?: string;
}
