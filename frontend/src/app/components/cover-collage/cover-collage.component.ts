import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { CollageAlbum, FEATURED_ALBUMS } from './featured-albums';

interface CollageRow {
  albums: CollageAlbum[];
  reverse: boolean;
  duration: number;
}

const ROW_COUNT = 3;
/** Tiles per loop copy: enough to stay wider than a 2560px screen at the largest tile size. */
const MIN_TILES_PER_COPY = 14;

/**
 * Full-width hero made of album covers scrolling in rows, collage style.
 * Starts from a curated list and mixes in community favorites when they exist.
 * Each row gets its own albums, and the motion only runs while the hero is on screen.
 */
@Component({
  selector: 'app-cover-collage',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './cover-collage.component.html',
  styleUrl: './cover-collage.component.css'
})
export class CoverCollageComponent implements OnChanges, AfterViewInit, OnDestroy {
  /** Extra albums (e.g. highest rated) merged after the curated ones. */
  @Input() extraAlbums: CollageAlbum[] = [];

  rows: CollageRow[] = this.buildRows(FEATURED_ALBUMS);
  isPaused = false;
  isInView = true;

  private observer?: IntersectionObserver;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    const seen = new Set(FEATURED_ALBUMS.map(album => String(album.id)));
    const extras = this.extraAlbums.filter(album => album.cover && !seen.has(String(album.id)));
    this.rows = this.buildRows([...FEATURED_ALBUMS, ...extras]);
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(([entry]) => {
      this.isInView = entry.isIntersecting;
    });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  /** 500px version of a Deezer cover, for sharp tiles on high-density screens. */
  largeCover(url: string): string {
    return url.replace('/250x250-', '/500x500-');
  }

  /**
   * Deals albums round-robin so no album appears in two rows, then repeats each
   * row's albums until one loop copy is wider than the screen (no gap in the loop).
   */
  private buildRows(albums: CollageAlbum[]): CollageRow[] {
    const groups: CollageAlbum[][] = Array.from({ length: ROW_COUNT }, () => []);
    albums.forEach((album, index) => groups[index % ROW_COUNT].push(album));

    const settings = [
      { reverse: false, duration: 70 },
      { reverse: true, duration: 85 },
      { reverse: false, duration: 78 }
    ];

    return groups.map((group, index) => {
      const filled: CollageAlbum[] = [];
      while (group.length > 0 && filled.length < MIN_TILES_PER_COPY) {
        filled.push(...group);
      }
      return { albums: filled, ...settings[index] };
    });
  }
}
