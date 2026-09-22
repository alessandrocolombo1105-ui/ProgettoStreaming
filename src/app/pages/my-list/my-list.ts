import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MyListItem } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DetailModalService } from '../../core/services/detail-modal.service';
import { MyListService } from '../../core/services/my-list.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { mediaKey } from '../../core/utils/media.util';
import { Icon } from '../../shared/components/icon/icon';

/**
 * Titoli salvati dall'utente.
 *
 * Le schede usano i dati conservati nella lista invece di rileggerli da TMDB:
 * una lista di trenta titoli produrrebbe altrettante richieste a ogni visita.
 */
@Component({
  selector: 'app-my-list',
  imports: [Icon, RouterLink],
  templateUrl: './my-list.html',
  styleUrl: './my-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyList {
  private readonly myList = inject(MyListService);
  private readonly modal = inject(DetailModalService);
  private readonly tmdb = inject(TmdbService);
  private readonly auth = inject(AuthService);

  protected readonly items = this.myList.list;
  protected readonly isEmpty = this.myList.isEmpty;
  protected readonly count = this.myList.count;
  protected readonly user = this.auth.user;

  protected posterUrl(item: MyListItem): string {
    return this.tmdb.posterUrl(item.posterPath, 'w342');
  }

  protected typeLabel(item: MyListItem): string {
    return item.mediaType === 'movie' ? 'Film' : 'Serie TV';
  }

  protected open(item: MyListItem): void {
    this.modal.openById(item.id, item.mediaType);
  }

  protected remove(item: MyListItem): void {
    this.myList.remove(item.id, item.mediaType);
  }

  protected trackItem(item: MyListItem): string {
    return mediaKey(item.id, item.mediaType);
  }
}
