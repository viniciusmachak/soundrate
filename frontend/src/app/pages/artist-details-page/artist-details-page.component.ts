import { ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, distinctUntilChanged, EMPTY, map, Observable, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { AlbumCardComponent } from '../../components/album-card/album-card.component';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { ArtistPage } from '../../models/artist-page.model';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { AudioService } from '../../services/audio.service';
import { FeedbackService } from '../../services/feedback.service';
import { DeezerTrack } from '../../models/deezer.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { LocalDatePipe, LocalNumberPipe } from '../../i18n/locale-pipes';
import { TranslationKey } from '../../i18n/translation.types';
import { TranslatedTitleStrategy } from '../../i18n/translated-title.strategy';
import { NotFoundPageComponent } from '../not-found-page/not-found-page.component';
import { isNotFoundError } from '../../utils/http-errors';

interface Pageable {
  page: number;
  size: number;
  category: DiscographyCategory;
  sort: DiscographySort;
  direction: DiscographyDirection;
}

type DiscographyCategory = 'popular' | 'albums' | 'singles' | 'compilations';
type DiscographySort = 'release' | 'popularity' | 'community';
type DiscographyDirection = 'asc' | 'desc';

import { DeezerButtonComponent } from '../../components/deezer-button/deezer-button.component';

import { extractBackdropColor } from '../../utils/dominant-color';
import { TRANSLATED_PAGINATOR } from '../../i18n/paginator-intl';

@Component({
  selector: 'app-artist-details-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AlbumCardComponent,
    StarRatingComponent,
    MatIconModule,
    MatPaginatorModule,
    MatButtonModule,
    SkeletonLoaderComponent,
    DeezerButtonComponent,
    TranslatePipe,
    LocalDatePipe,
    LocalNumberPipe,
    NotFoundPageComponent
  ],
  providers: [TRANSLATED_PAGINATOR],
  templateUrl: './artist-details-page.component.html',
  styleUrl: './artist-details-page.component.css'
})
export class ArtistDetailsPageComponent implements OnInit {
  accentColor = 'var(--accent-color)';
  private accentSourceUrl = '';
  artistPage$!: Observable<ArtistPage | null>;
  loadState: 'loading' | 'loaded' | 'not-found' | 'error' = 'loading';
  private pageableSubject = new BehaviorSubject<Pageable>({
    page: 0,
    size: 12,
    category: 'popular',
    sort: 'popularity',
    direction: 'desc'
  });
  isFollowed = false;
  followersCount = 0;
  followRequestPending = false;
  selectedCategory: DiscographyCategory = 'popular';
  readonly categories: { value: DiscographyCategory }[] = [
    { value: 'popular' },
    { value: 'albums' },
    { value: 'singles' },
    { value: 'compilations' }
  ];
  selectedSort: DiscographySort = 'popularity';
  selectedDirection: DiscographyDirection = 'desc';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    public authService: AuthService,
    public audioService: AudioService,
    private feedback: FeedbackService,
    private destroyRef: DestroyRef,
    private changeDetectorRef: ChangeDetectorRef,
    private i18n: I18nService,
    private titleStrategy: TranslatedTitleStrategy
  ) { }

  ngOnInit(): void {
    this.artistPage$ = this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      distinctUntilChanged(),
      switchMap(artistId => {
        this.setLoadState('loading');
        this.selectedCategory = 'popular';
        this.selectedSort = 'popularity';
        this.selectedDirection = 'desc';
        this.pageableSubject.next({
          page: 0,
          size: 12,
          category: 'popular',
          sort: 'popularity',
          direction: 'desc'
        });
        return this.pageableSubject.pipe(
          switchMap(pageable => this.apiService.getArtistPage(
            artistId,
            pageable.page,
            pageable.size,
            pageable.category,
            pageable.sort,
            pageable.direction
          ).pipe(
            catchError(error => {
              this.handleLoadError(error);
              return EMPTY;
            })
          )),
          tap(page => {
            this.setLoadState('loaded');
            this.isFollowed = page.isFollowedByCurrentUser;
            this.followersCount = page.followersCount;
            this.updateAccentColor(page.artistDetails.picture_xl);
          }),
          // Clears the previous artist while the next one loads (or turns out not to exist).
          startWith(null)
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  retryLoad(): void {
    this.setLoadState('loading');
    this.pageableSubject.next({ ...this.pageableSubject.value });
  }

  onPageChange(event: PageEvent): void {
    const newPageable: Pageable = {
      page: event.pageIndex,
      size: event.pageSize,
      category: this.selectedCategory,
      sort: this.selectedSort,
      direction: this.selectedDirection
    };
    this.pageableSubject.next(newPageable);
  }

  selectCategory(category: DiscographyCategory): void {
    if (category === this.selectedCategory) return;
    this.selectedCategory = category;
    this.updateDiscographyQuery();
  }

  onSortChange(sort: DiscographySort): void {
    if (sort === this.selectedSort) return;
    this.selectedSort = sort;
    this.updateDiscographyQuery();
  }

  toggleSortDirection(): void {
    this.selectedDirection = this.selectedDirection === 'desc' ? 'asc' : 'desc';
    this.updateDiscographyQuery();
  }

  categoryLabel(category: { value: DiscographyCategory }): string {
    return this.i18n.t(`artist.categories.${category.value}`);
  }

  get emptyCategoryMessage(): string {
    return this.i18n.t(`artist.emptyCategory.${this.selectedCategory}`);
  }

  releaseYear(releaseDate?: string): string | null {
    return releaseDate?.slice(0, 4) || null;
  }

  formatRecordType(recordType?: string): string {
    const keys: Record<string, TranslationKey> = {
      album: 'artist.recordType.album',
      single: 'artist.recordType.single',
      ep: 'artist.recordType.ep',
      compile: 'artist.recordType.compilation',
      compilation: 'artist.recordType.compilation'
    };
    return this.i18n.t(keys[recordType?.toLowerCase() ?? ''] ?? 'artist.recordType.release');
  }

  togglePopularPlayback(tracks: DeezerTrack[]): void {
    this.audioService.toggleQueue(tracks);
  }

  hasPlayableTracks(tracks: DeezerTrack[]): boolean {
    return tracks.some(track => track.readable !== false && Boolean(track.preview));
  }

  toggleFollow(artistId: number, artistName: string): void {
    if (!this.authService.isAuthenticated()) {
      this.feedback.warning(
        this.i18n.t('artist.feedback.signInToFollow'),
        this.i18n.t('artist.feedback.signInToFollowMessage', { name: artistName })
      );
      return;
    }
    if (this.followRequestPending) return;

    const previousState = this.isFollowed;
    this.followRequestPending = true;
    this.isFollowed = !previousState;
    this.followersCount = Math.max(0, this.followersCount + (previousState ? -1 : 1));

    const request = previousState
      ? this.apiService.unfollowArtist(artistId)
      : this.apiService.followArtist(artistId);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.followRequestPending = false;
        this.feedback.success(
          this.i18n.t(previousState ? 'artist.feedback.unfollowed' : 'artist.feedback.followed', { name: artistName }),
          this.i18n.t(previousState ? 'artist.feedback.unfollowedMessage' : 'artist.feedback.followedMessage')
        );
      },
      error: () => {
        this.isFollowed = previousState;
        this.followersCount = Math.max(0, this.followersCount + (previousState ? 1 : -1));
        this.followRequestPending = false;
        this.feedback.error(
          this.i18n.t(previousState ? 'artist.feedback.unfollowError' : 'artist.feedback.followError', { name: artistName }),
          this.i18n.t('artist.feedback.followErrorMessage')
        );
      }
    });
  }

  async shareArtist(name: string): Promise<void> {
    const shareData = {
      title: this.i18n.t('artist.feedback.shareTitle', { name }),
      text: this.i18n.t('artist.feedback.shareText', { name }),
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        this.feedback.success(
          this.i18n.t('artist.feedback.shared', { name }),
          this.i18n.t('artist.feedback.sharedMessage')
        );
        return;
      }

      await navigator.clipboard.writeText(shareData.url);
      this.feedback.success(
        this.i18n.t('artist.feedback.linkCopied'),
        this.i18n.t('artist.feedback.linkCopiedMessage', { name })
      );
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        this.feedback.error(
          this.i18n.t('artist.feedback.shareError', { name }),
          this.i18n.t('artist.feedback.shareErrorMessage')
        );
      }
    }
  }

  formatCompact(value: number): string {
    return this.i18n.formatNumber(value, {
      notation: 'compact',
      maximumFractionDigits: 1
    });
  }

  private handleLoadError(error: unknown): void {
    if (this.loadState === 'loaded') {
      // The artist is already on screen: only the discography page failed.
      this.feedback.error(this.i18n.t('loadError.title'), this.i18n.t('loadError.artist'));
      return;
    }
    this.setLoadState(isNotFoundError(error) ? 'not-found' : 'error');
  }

  private setLoadState(state: ArtistDetailsPageComponent['loadState']): void {
    if (state === this.loadState) return;
    this.loadState = state;
    this.titleStrategy.setPageTitle(state === 'not-found' ? 'titles.artistNotFound' : null);
  }

  private updateDiscographyQuery(): void {
    const current = this.pageableSubject.value;
    this.pageableSubject.next({
      page: 0,
      size: current.size,
      category: this.selectedCategory,
      sort: this.selectedSort,
      direction: this.selectedDirection
    });
  }

  private updateAccentColor(imageUrl: string): void {
    if (imageUrl === this.accentSourceUrl) return;
    this.accentSourceUrl = imageUrl;
    this.accentColor = 'var(--accent-color)';

    extractBackdropColor(imageUrl).then(color => {
      if (imageUrl !== this.accentSourceUrl) return;
      this.accentColor = color ?? 'var(--accent-color)';
      this.changeDetectorRef.markForCheck();
    });
  }
}
