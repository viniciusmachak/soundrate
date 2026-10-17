import { Component, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollageAlbum, FEATURED_ALBUMS } from './featured-albums';

interface CollageRow {
  albums: CollageAlbum[];
  reverse: boolean;
  duration: number;
}

/**
 * Full-width hero made of album covers scrolling in rows, collage style.
 * Starts from a curated list and mixes in community favorites when they exist.
 */
@Component({
  selector: 'app-cover-collage',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cover-collage.component.html',
  styleUrl: './cover-collage.component.css'
})
export class CoverCollageComponent implements OnChanges {
  /** Extra albums (e.g. highest rated) merged after the curated ones. */
  @Input() extraAlbums: CollageAlbum[] = [];

  rows: CollageRow[] = this.buildRows(FEATURED_ALBUMS);
  isPaused = false;

  ngOnChanges(): void {
    const seen = new Set(FEATURED_ALBUMS.map(album => String(album.id)));
    const extras = this.extraAlbums.filter(album => album.cover && !seen.has(String(album.id)));
    this.rows = this.buildRows([...FEATURED_ALBUMS, ...extras]);
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  /** 500px version of a Deezer cover, for sharp tiles on high-density screens. */
  largeCover(url: string): string {
    return url.replace('/250x250-', '/500x500-');
  }

  /**
   * Every row shows the whole list (rotated), so a single copy is always wider
   * than the screen and the loop never leaves a gap.
   */
  private buildRows(albums: CollageAlbum[]): CollageRow[] {
    const rotate = (offset: number) => albums.map((_, index) => albums[(index + offset) % albums.length]);
    return [
      { albums: rotate(0), reverse: false, duration: 90 },
      { albums: rotate(Math.floor(albums.length / 3)).reverse(), reverse: true, duration: 110 },
      { albums: rotate(Math.floor((albums.length * 2) / 3)), reverse: false, duration: 100 }
    ];
  }
}
