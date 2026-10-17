import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlbumDashboard } from '../../models/album-details.model';
import { DeezerAlbum } from '../../models/deezer.model';

@Component({
  selector: 'app-album-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './album-card.component.html',
  styleUrl: './album-card.component.css'
})
export class AlbumCardComponent {
  @Input() album!: DeezerAlbum | AlbumDashboard;
  @Input() artistNameOverride?: string;

  get coverUrl(): string {
    if ('cover_medium' in this.album) {
      return this.album.cover_medium;
    }
    return this.album.coverUrl;
  }

  get title(): string {
    return this.album.title;
  }

  get artistName(): string {
    if (this.artistNameOverride) {
      return this.artistNameOverride;
    }

    if ('artist' in this.album && this.album.artist) {
      return this.album.artist.name;
    }

    if ('artistName' in this.album) {
      return this.album.artistName;
    }

    return 'Unknown Artist';
  }

  get id(): string | number {
    return this.album.id;
  }

  get averageRating(): number | null {
    if ('averageRating' in this.album) {
      return this.album.averageRating;
    }
    return null;
  }
}
