import { Component, Input } from '@angular/core';
import { DeezerArtist } from '../../models/deezer.model';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-artist-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './artist-card.component.html',
  styleUrl: '../entity-card.shared.css'
})
export class ArtistCardComponent {
  @Input() artist!: DeezerArtist;
}
