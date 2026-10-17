import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, finalize, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlbumDetails } from '../../models/album-details.model';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AlbumReview } from '../../models/review.model';
import { AudioService } from '../../services/audio.service';
import { CommonModule, DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { ReviewDialogComponent } from '../../components/review-dialog/review-dialog.component';
import { ReviewListComponent } from '../../components/review-list/review-list.component';
import { FormatDurationPipe } from '../../pipes/format-duration.pipe';
import { RatingRequest } from '../../models/rating.model';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';
import { AlbumCoverDialogComponent } from '../../components/album-cover-dialog/album-cover-dialog.component';
import { DeezerAlbum, DeezerContributor, DeezerTrack } from '../../models/deezer.model';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { FeedbackService } from '../../services/feedback.service';

interface AlbumParticipant {
  id: number | null;
  name: string;
  link: string;
  picture_medium: string;
  role: string;
}

import { DeezerButtonComponent } from '../../components/deezer-button/deezer-button.component';

import { extractBackdropColor } from '../../utils/dominant-color';

@Component({
  selector: 'app-album-details-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule,
    StarRatingComponent, MatButtonModule, MatDialogModule,
    ReviewListComponent, FormatDurationPipe,
    DecimalPipe, SlicePipe, SkeletonLoaderComponent, DeezerButtonComponent
  ],
  templateUrl: './album-details-page.component.html',
  styleUrl: './album-details-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumDetailsPageComponent implements OnInit {
  accentColor = 'var(--accent-color)';
  private accentSourceUrl = '';
  private albumDetailsSubject = new BehaviorSubject<AlbumDetails | null>(null);
  private trackRatingsById = new Map<string, number>();
  albumDetails$ = this.albumDetailsSubject.asObservable();
  albumId!: string;
  albumContributors: AlbumParticipant[] = [];
  deletingReviewIds: ReadonlySet<number> = new Set<number>();
  isSavingReview = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private feedback: FeedbackService,
    public authService: AuthService,
    public audioService: AudioService,
    private dialog: MatDialog,
    private destroyRef: DestroyRef,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) throw new Error('Album ID not found');
        this.albumId = id;
        return this.apiService.getAlbumDetails(this.albumId);
      })
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(details => this.setAlbumDetails(details));
  }

  loadAlbumDetails(): void {
    this.apiService.getAlbumDetails(this.albumId).subscribe(details => {
      this.setAlbumDetails(details);
    });
  }

  toggleLike(): void {
    const currentDetails = this.albumDetailsSubject.getValue();
    if (!currentDetails) return;

    const isCurrentlyLiked = currentDetails.isLikedByCurrentUser;

    this.albumDetailsSubject.next({
      ...currentDetails,
      isLikedByCurrentUser: !isCurrentlyLiked,
      likesCount: isCurrentlyLiked ? currentDetails.likesCount - 1 : currentDetails.likesCount + 1
    });

    const apiCall = isCurrentlyLiked
      ? this.apiService.unlikeAlbum(this.albumId)
      : this.apiService.likeAlbum(this.albumId);

    apiCall.subscribe({
      next: () => this.feedback.success(
        isCurrentlyLiked ? 'Removed from your likes' : 'Added to your likes',
        `${currentDetails.deezerDetails.title} ${isCurrentlyLiked ? 'is no longer' : 'is now'} in your liked albums.`
      ),
      error: () => {
        this.albumDetailsSubject.next(currentDetails);
        this.feedback.error(
          'Couldn’t update your likes',
          `${currentDetails.deezerDetails.title} kept its previous like status.`
        );
      }
    });
  }

  toggleListenLater(): void {
    const currentDetails = this.albumDetailsSubject.getValue();
    if (!currentDetails) return;

    const isOnList = currentDetails.isOnListenLaterList;
    const apiCall = isOnList ? this.apiService.removeFromListenLater(this.albumId) : this.apiService.addToListenLater(this.albumId);

    this.albumDetailsSubject.next({
      ...currentDetails,
      isOnListenLaterList: !isOnList,
    });

    apiCall.subscribe({
      next: () => this.feedback.success(
        isOnList ? 'Removed from Listen Later' : 'Saved for later',
        `${currentDetails.deezerDetails.title} ${isOnList ? 'was removed from' : 'was added to'} your listening queue.`
      ),
      error: () => {
        this.albumDetailsSubject.next(currentDetails);
        this.feedback.error(
          'Couldn’t update Listen Later',
          `${currentDetails.deezerDetails.title} kept its previous list status.`
        );
      }
    });
  }

  onAlbumRatingChanged(newRating: number | null): void {
    const currentDetails = this.albumDetailsSubject.getValue();
    if (!currentDetails) return;

    const oldRating = currentDetails.currentUserRating;

    this.albumDetailsSubject.next({
      ...currentDetails,
      currentUserRating: newRating,
    });

    if (newRating === null) {
      this.apiService.deleteRating(this.albumId).subscribe({
        next: () => {
          this.feedback.success(
            'Rating removed',
            `Your rating for ${currentDetails.deezerDetails.title} was cleared.`
          );
          this.loadAlbumDetails();
        },
        error: (err) => {
          this.albumDetailsSubject.next({ ...currentDetails, currentUserRating: oldRating });
          this.feedback.error(
            'Couldn’t remove your rating',
            `Your previous rating for ${currentDetails.deezerDetails.title} was restored.`
          );
        }
      });
    } else {
      const ratingDto: RatingRequest = { albumId: this.albumId, rating: newRating };
      this.apiService.rateAlbumOrTrack(ratingDto).subscribe({
        next: () => {
          this.feedback.success(
            'Rating saved',
            `You gave ${currentDetails.deezerDetails.title} ${newRating} out of 5 stars.`
          );
          this.loadAlbumDetails();
        },
        error: (err) => {
          this.albumDetailsSubject.next({ ...currentDetails, currentUserRating: oldRating });
          this.feedback.error(
            'Couldn’t save your rating',
            `Your previous rating for ${currentDetails.deezerDetails.title} was restored.`
          );
        }
      });
    }
  }

  onTrackRatingChanged(newRating: number | null, trackId: string): void {
    const currentDetails = this.albumDetailsSubject.getValue();
    if (!currentDetails) return;
    const trackTitle = currentDetails.deezerDetails.tracks.data.find(track => track.id.toString() === trackId)?.title
      ?? 'this track';

    if (newRating === null) {
      this.apiService.deleteRating(undefined, trackId).subscribe({
        next: () => {
          this.feedback.success('Track rating removed', `Your rating for ${trackTitle} was cleared.`);
          this.loadAlbumDetails();
        },
        error: (err) => {
          this.feedback.error('Couldn’t remove the track rating', `${trackTitle} kept its previous rating.`);
        }
      });
    } else {
      this.apiService.rateAlbumOrTrack({ albumId: this.albumId, trackId: trackId, rating: newRating }).subscribe({
        next: () => {
          this.feedback.success('Track rating saved', `You gave ${trackTitle} ${newRating} out of 5 stars.`);
          this.loadAlbumDetails();
        },
        error: () => this.feedback.error('Couldn’t save the track rating', `Please try rating ${trackTitle} again.`)
      });
    }
  }

  openReviewDialog(reviewToEdit?: AlbumReview): void {
    const currentDetails = this.albumDetailsSubject.getValue();
    if (!currentDetails || this.isSavingReview) return;

    if (!currentDetails.currentUserRating || currentDetails.currentUserRating === 0) {
      this.feedback.warning(
        'Rate the album first',
        `Add a star rating for ${currentDetails.deezerDetails.title} before writing your review.`
      );
      return;
    }

    const dialogRef = this.dialog.open(ReviewDialogComponent, {
      width: '600px',
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'review-dialog-container',
      data: {
        existingText: reviewToEdit?.text,
      }
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result && result.text !== undefined) {

        const request = {
          albumId: this.albumId,
          text: result.text,
          rating: currentDetails.currentUserRating!
        };

        const apiCall = reviewToEdit ? this.apiService.updateReview(reviewToEdit.id, request) : this.apiService.createReview(request);

        this.isSavingReview = true;
        this.changeDetectorRef.markForCheck();
        const savingFeedback = this.feedback.loading(
          reviewToEdit ? 'Updating your review' : 'Publishing your review',
          `Saving your thoughts on ${currentDetails.deezerDetails.title}…`
        );

        apiCall.pipe(
          finalize(() => {
            savingFeedback.dismiss();
            this.isSavingReview = false;
            this.changeDetectorRef.markForCheck();
          }),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => {
            this.feedback.success(
              reviewToEdit ? 'Review updated' : 'Review published',
              `Your review of ${currentDetails.deezerDetails.title} is now part of the community.`
            );
            this.loadAlbumDetails();
          },
          error: () => this.feedback.error(
            reviewToEdit ? 'Couldn’t update your review' : 'Couldn’t publish your review',
            'Your text is safe in the editor. Please try again.'
          )
        });
      }
    });
  }

  onDeleteReview(reviewId: number): void {
    if (this.deletingReviewIds.has(reviewId)) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      panelClass: ['review-dialog-container', 'review-confirmation-dialog'],
      data: {
        title: 'Delete review?',
        message: 'This review will be permanently removed. This action cannot be undone.',
        confirmLabel: 'Delete review'
      }
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(confirmed => {
      if (!confirmed) return;

      this.deletingReviewIds = new Set([...this.deletingReviewIds, reviewId]);
      const deletingFeedback = this.feedback.loading(
        'Deleting your review',
        'Removing it from the Soundrate community…'
      );

      this.apiService.deleteReview(reviewId).pipe(
        finalize(() => {
          deletingFeedback.dismiss();
          const pendingIds = new Set(this.deletingReviewIds);
          pendingIds.delete(reviewId);
          this.deletingReviewIds = pendingIds;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          this.feedback.success('Review deleted', 'Your review was permanently removed.');
          this.loadAlbumDetails();
        },
        error: () => this.feedback.error(
          'Couldn’t delete your review',
          'The review is still visible and no content was removed.'
        )
      });
    });
  }

  getAlbumCover(albumDetails: AlbumDetails | null): string {
    return albumDetails?.deezerDetails.cover_xl
      || albumDetails?.deezerDetails?.cover_medium
      || 'https://placehold.co/300x300?text=No+Image';
  }

  openAlbumCover(details: AlbumDetails): void {
    this.dialog.open(AlbumCoverDialogComponent, {
      data: {
        imageUrl: this.getAlbumCover(details),
        title: details.deezerDetails.title,
        artistName: details.deezerDetails.artist?.name
      },
      panelClass: 'image-dialog-panel',
      maxWidth: '95vw',
      maxHeight: '95vh',
      autoFocus: false
    });
  }

  toggleAlbumPlayback(tracks: DeezerTrack[]): void {
    this.audioService.toggleQueue(tracks);
  }

  toggleTrackPlayback(tracks: DeezerTrack[], track: DeezerTrack): void {
    this.audioService.toggleTrackInQueue(tracks, track.id);
  }

  hasPlayableTracks(tracks: DeezerTrack[]): boolean {
    return tracks.some(track => track.readable !== false && Boolean(track.preview));
  }

  getUserRatingForTrack(trackId: string): number {
    return this.trackRatingsById.get(trackId) ?? 0;
  }

  private setAlbumDetails(details: AlbumDetails): void {
    this.trackRatingsById = new Map(
      details.currentUserTrackRatings.map(rating => [rating.trackId, rating.rating])
    );
    this.albumContributors = this.collectAlbumContributors(details.deezerDetails);
    this.albumDetailsSubject.next(details);
    this.updateAccentColor(this.getAlbumCover(details));
  }

  private updateAccentColor(coverUrl: string): void {
    if (coverUrl === this.accentSourceUrl) return;
    this.accentSourceUrl = coverUrl;
    this.accentColor = 'var(--accent-color)';

    extractBackdropColor(coverUrl).then(color => {
      if (coverUrl !== this.accentSourceUrl) return;
      this.accentColor = color ?? 'var(--accent-color)';
      this.changeDetectorRef.markForCheck();
    });
  }

  private collectAlbumContributors(album: DeezerAlbum): AlbumParticipant[] {
    const contributors: AlbumParticipant[] = [];
    const contributorIndexById = new Map<number, number>();
    const contributorIndexByName = new Map<string, number>();

    const normalizeName = (name: string): string => name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();

    const addContributor = (
      contributor: DeezerContributor | AlbumParticipant,
      fromTrack = false
    ): void => {
      if (!contributor?.name) return;

      const id = contributor.id || null;
      const normalizedName = normalizeName(contributor.name);
      const existingIndex = (id ? contributorIndexById.get(id) : undefined)
        ?? contributorIndexByName.get(normalizedName);
      const existing = existingIndex !== undefined ? contributors[existingIndex] : undefined;
      const role = contributor.id === album.artist?.id
        ? 'Main artist'
        : fromTrack
          ? 'Featured artist'
          : contributor.role || 'Contributor';

      const merged: AlbumParticipant = {
        ...existing,
        ...contributor,
        id,
        picture_medium: contributor.picture_medium || existing?.picture_medium || '',
        link: contributor.link || existing?.link || '',
        role: existing?.role === 'Main artist' ? existing.role : role
      };

      const index = existingIndex ?? contributors.length;
      if (existingIndex === undefined) contributors.push(merged);
      else contributors[index] = merged;

      if (id) contributorIndexById.set(id, index);
      contributorIndexByName.set(normalizedName, index);
    };

    album.contributors?.forEach(contributor => addContributor(contributor));

    album.tracks.data.forEach(track => {
      track.contributors?.forEach(contributor => addContributor(contributor, true));

      if (track.artist && track.artist.id !== album.artist?.id) {
        addContributor({
          id: track.artist.id,
          name: track.artist.name,
          link: '',
          picture_medium: track.artist.picture_medium || track.artist.picture || '',
          role: 'Featured artist'
        }, true);
      }

      this.extractFeaturedArtistNames(track).forEach(name => addContributor({
        id: null,
        name,
        link: '',
        picture_medium: '',
        role: 'Featured artist'
      }, true));
    });

    return contributors;
  }

  private extractFeaturedArtistNames(track: DeezerTrack): string[] {
    const creditText = `${track.title_version ?? ''} ${track.title ?? ''}`;
    const names: string[] = [];
    const featuredArtistPattern = /(?:feat(?:uring)?\.?|ft\.?)\s+([^\)\]}]+)|\(\s*with\s+([^\)\]}]+)/gi;

    for (const match of creditText.matchAll(featuredArtistPattern)) {
      (match[1] ?? match[2])
        .split(/\s*(?:,|&|\bx\b|\band\b)\s*/i)
        .map(name => name.trim().replace(/[.\s]+$/, ''))
        .filter(Boolean)
        .forEach(name => names.push(name));
    }

    return [...new Set(names)];
  }
}
