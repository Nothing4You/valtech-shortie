/// <reference path="../../.types/underscore/underscore.d.ts"/>
/// <reference path="../../.types/node/node.d.ts"/>
/// <reference path="../../.types/knockout/knockout.d.ts"/>

import ko = require('knockout');
import _ = require('underscore');
import utils = require('../lib/UrlUtils');
import api = require('./api');
import model = require('../shorties/model');

export class IndexViewModel {
  private apiClient: api.ApiClient;
  private isReusedShortie: boolean;
  private previousSlug: string;
  private rootUrl: string;

  public errorMessage: KnockoutObservable<string>;
  public isEditingSlug: KnockoutObservable<boolean>;
  public fullUrl: KnockoutObservable<string>;
  public showInfoPanel: KnockoutObservable<boolean>;
  public slug: KnockoutObservable<string>;
  public urlToShorten: KnockoutObservable<string>;

  constructor(apiClient: api.ApiClient, rootUrl: string) {
    this.apiClient = apiClient;
    this.rootUrl = rootUrl;

    this.errorMessage = ko.observable<string>();
    this.fullUrl = ko.observable<string>();
    this.isEditingSlug = ko.observable<boolean>();
    this.showInfoPanel = ko.observable<boolean>();
    this.slug = ko.observable<string>();
    this.urlToShorten = ko.observable<string>();
  }

  public generateShortie(): void {
    this.errorMessage(null);
    this.showInfoPanel(false);
    this.isEditingSlug(false);
    if (!this.validateUrl(this.urlToShorten())) {
      return;
    }
    this.apiClient.saveNewShortie(utils.parseAndClean(this.urlToShorten()), (response: api.ApiResponse<model.Shortie>) => {
        if(this.handleError(response))
          return;
        if (response.status == 200 || response.status == 201) {
          this.slug(response.data.slug);
          this.previousSlug = response.data.slug;
          this.fullUrl(this.rootUrl + response.data.slug);
          this.showInfoPanel(true);
        }
        if (response.status == 200) {
          this.isReusedShortie = true;
        }
      });
  }

  public editSlug(): void {
    this.errorMessage(null);
    this.isEditingSlug(true);
  }

  public saveSlug(): void {
    this.errorMessage(null);
    if(!this.validateUrl(this.urlToShorten()) || !this.validateSlug(this.slug())) {
      return;
    }
    // make sure slug is not already used
    this.apiClient.getShortie(this.slug(), (response) => {
      if (response.status == 200) {
        this.errorMessage('Shortie already exists.');
      } else if (response.status == 404) {
        if(!this.isReusedShortie) {
          this.apiClient.saveShortie(this.previousSlug, new model.Shortie(this.slug(), utils.parseAndClean(this.urlToShorten()), model.ShortieType.Manual), (response) => {
            if(this.handleError(response))
              return;
            this.previousSlug = response.data.slug;
            this.slug(response.data.slug);
            this.fullUrl(this.rootUrl + response.data.slug);
            this.isEditingSlug(false);
          });
        } else {
          this.apiClient.saveShortie(this.slug(), new model.Shortie(this.slug(), utils.parseAndClean(this.urlToShorten()), model.ShortieType.Manual), (response) => {
            if(this.handleError(response))
              return;
            this.isReusedShortie = false;
            this.previousSlug = response.data.slug;
            this.fullUrl(this.rootUrl + response.data.slug);
            this.isEditingSlug(false);
          });
        }
      } else {
        this.handleError(response);
      }
    });
  }

  public cancelEditSlug(): void {
    this.errorMessage(null);
    this.isEditingSlug(false);
    this.slug(this.previousSlug);
  }

  private handleError(response) {
    if (!response.status) {
      this.errorMessage('Unable to connect to API.');
      return true;
    }
    if (response.status >= 400 && response.status <= 599) {
      this.errorMessage(response.error);
      return true;
    }
    return false;
  }

  private validateUrl(url): boolean {
    if (!url) {
      this.errorMessage('URL cannot be empty.');
      return false;
    }
    return true;
  }

  private validateSlug(slug): boolean {
    if (!slug) {
      this.errorMessage('Slug cannot be empty.');
      return false;
    }
    return true;
  }
}