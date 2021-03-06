/// <reference path="../../../.types/underscore/underscore.d.ts"/>
/// <reference path="../../../.types/node/node.d.ts"/>
/// <reference path="../../../.types/knockout/knockout.d.ts"/>
/// <reference path="../../../.types/moment/moment.d.ts"/>

import knockout = require('knockout');
import underscore = require('underscore');
import utils = require('../../lib/UrlUtils');
import moment = require('moment');

// this is a hack for better intellisence in vs2013
var _: UnderscoreStatic = underscore;
var ko: KnockoutStatic = knockout;

import model = require('../../shorties/model');
import api = require('../api');
import UrlUtils = require('../../lib/UrlUtils');

export class ShortieViewModel {
  public shortie: model.Shortie;

  public isCurrent: KnockoutObservable<boolean>;
  public lastModifiedBy: KnockoutObservable<string>;
  public lastModifiedTime: KnockoutObservable<string>;
  public originalSlug: string;
  public slug: KnockoutObservable<string>;
  public type: KnockoutObservable<string>;
  public url: KnockoutObservable<string>;

  constructor(shortie?: model.Shortie) {
    if (!shortie) {
      shortie = new model.Shortie('', '');
    }
    this.shortie = shortie;
    this.isCurrent = ko.observable(false);
    this.lastModifiedBy = ko.observable<string>();
    this.lastModifiedTime = ko.observable<string>();
    this.originalSlug = shortie.slug;
    this.slug = ko.observable<string>();
    this.url = ko.observable<string>();
    this.type = ko.observable<string>();

    if (shortie.lastModifiedBy) {
      this.lastModifiedBy(shortie.lastModifiedBy.name);
    } else {
      this.lastModifiedBy('someone');
    }
    if (shortie.lastModifiedTimestamp) {
      this.lastModifiedTime(moment(shortie.lastModifiedTimestamp).calendar());
    } else {
      this.lastModifiedTime('sometime');
    }
    this.slug(shortie.slug);
    this.type(model.ShortieType[shortie.type]);
    this.url(shortie.url);

    this.slug.subscribe((newValue) => { shortie.slug = newValue; });
    this.url.subscribe((newValue) => { shortie.url = newValue; });
  }
}

export class FilterViewModel {
  public availableLastModifiedBy: KnockoutObservableArray<string>;
  public availableTypes: KnockoutObservableArray<string>;
  public lastModifiedBy: KnockoutObservable<string>;
  public lastModifiedSince: KnockoutObservable<number>;
  public lastModifiedUntil: KnockoutObservable<number>;
  public slug: KnockoutObservable<string>;
  public type: KnockoutObservable<model.ShortieType>;
  public url: KnockoutObservable<string>;

  constructor() {
    this.lastModifiedBy = ko.observable<string>();
    this.lastModifiedSince = ko.observable<number>();
    this.lastModifiedUntil = ko.observable<number>();
    this.slug = ko.observable<string>();
    this.type = ko.observable<model.ShortieType>();
    this.url = ko.observable<string>();
  }
}

export class PagerViewModel {
  public fromIndex: KnockoutObservable<number>;
  public pageNumber: KnockoutObservable<number>;
  public pageSize: KnockoutObservable<number>;
  public toIndex: KnockoutObservable<number>;
  public total: KnockoutObservable<number>;

  constructor() {
    this.fromIndex = ko.observable<number>();
    this.pageNumber = ko.observable<number>();
    this.pageSize = ko.observable<number>();
    this.toIndex = ko.observable<number>();
    this.total = ko.observable<number>();
  }
}

export class ListViewModel {
  public errorMessage: KnockoutObservable<string>;
  public currentShortie: KnockoutObservable<ShortieViewModel>;
  public rootUrl: KnockoutObservable<string>;
  public shorties: KnockoutObservableArray<ShortieViewModel>;
  public urlForGenerated : KnockoutObservable<string>;

  private apiClient: api.ApiClient;
  private shortieForDeletion: ShortieViewModel;

  constructor(apiClient: api.ApiClient, rootUrl: string) {
    this.apiClient = apiClient;
    this.errorMessage = ko.observable<string>();
    this.rootUrl = ko.observable<string>(rootUrl);
    this.shorties = <KnockoutObservableArray<ShortieViewModel>>ko.observableArray();
    this.urlForGenerated = ko.observable<string>();
  }

  public select(shortie: ShortieViewModel): void {
    if (!_.contains(this.shorties(), shortie))
      return;
    this.shorties().forEach(s=> s.isCurrent(false));
    shortie.isCurrent(true);
  }

  public deselect(shortie: ShortieViewModel): void {
    shortie.isCurrent(false);
  }

  public saveByUrl() {
    this.errorMessage(null);
    this.apiClient.saveNewShortie(utils.parseAndClean(this.urlForGenerated()), (res: api.ApiResponse<model.Shortie>) => {
        if(this.handleError(res))
          return;
        var newShortie = new ShortieViewModel(res.data);
        this.shorties.push(newShortie);
      });
  }

  public save(shortieVm: ShortieViewModel): void {
    this.errorMessage(null);
    if (!this.validateShortie(shortieVm)) {
      return;
    }
    shortieVm.url(utils.parseAndClean(shortieVm.shortie.url));
    var slugInPath = shortieVm.originalSlug === '' ? shortieVm.shortie.slug : shortieVm.originalSlug;
    this.apiClient.saveShortie(slugInPath, shortieVm.shortie, (res) => {
      if(this.handleError(res))
          return;
      if (res.status >= 200 && res.status <= 299) {
        this.shorties().forEach(s=> s.isCurrent(false));
      } else {
        // TODO: Do something
      }
    });
  }

  public remove(): void {
    this.errorMessage(null);
    this.apiClient.deleteShortie(this.shortieForDeletion.originalSlug, (res) => {
      if(this.handleError(res))
          return;
      if (res.status == 200) {
        this.shorties.remove(this.shortieForDeletion);
      } else {
        // TODO: Do something
      }
    });
  }

  public loadShorties() {
    this.errorMessage(null);
    this.apiClient.getShorties((res) => {
      if(this.handleError(res))
          return;
      if (res.status == 200) {
        var arrayOfVms = _.chain(res.data)
          .sortBy(item => -item.lastModifiedTimestamp)
          .map(item => new ShortieViewModel(item))
          .value();
        this.shorties(arrayOfVms);
      }
    });
  }

  public markShortieForDeletion(shortieVm: ShortieViewModel) {
    this.shortieForDeletion = shortieVm;
  }

  private handleError(res) {
    if (!res.status) {
      this.errorMessage('Unable to connect to API.');
      return true;
    }
    if (res.status >= 400 && res.status <= 599) {
      this.errorMessage(res.error);
      return true;
    }
    return false;
  }

  private validateShortie(shortieVm): boolean {
    if (!shortieVm.url()) {
      this.errorMessage('URL cannot be empty.');
      return false;
    }
    if (!shortieVm.slug()) {
      this.errorMessage('Slug cannot be empty.');
      return false;
    }
    if (_.any<ShortieViewModel>(this.shorties(), s => { return s != shortieVm && s.originalSlug === shortieVm.slug(); })) {
      this.errorMessage('Slug already exists.');
      return false;
    }
    return true;
  }
}

export class RootViewModel {
  public filter: FilterViewModel;
  public list: ListViewModel;
  public pager: PagerViewModel;

  constructor() {
    this.filter = new FilterViewModel();
    this.list = new ListViewModel(new api.ApiClient(), UrlUtils.getRootUrl());
    this.pager = new PagerViewModel();
  }
}