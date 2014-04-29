﻿/// <reference path="../../.types/express/express.d.ts" />

import model = require('./model');
import express = require('express');
import slugGenerator = require('../lib/SlugGenerator');
import authMiddleware = require('../auth/middleware');
var log = require('winston');

var repo;

function getHandler(req, res, next) {
  repo.getShortieBySlug(req.params.slug, function (err, shortie) {
    if (err || !shortie) return next();
    res.redirect(shortie.url);
  });
}

function listHandler(req, res, next) {
  if (req.accepts('application/json')) {
    log.info('Will fetch list of shorties from repository');
    repo.getAllShorties(function (err, shorties) {
      if (err) return next(err);
      log.info('Fetched ' + shorties.length + ' shorties from repository');
      res.send(200, shorties);
    });
    return;
  }
  else {
    next();
  }
}

function postHandler(req, res, next) {
  // return 400 on invalid data
  var url = req.body.url;
  if (isInvalidUrl(url)) return res.send(400, 'Invalid URL in request body');

  repo.getShortiesByUrl(url, function(err, shorties) {
    if (err) return next(err);
    if(shorties.length === 0) {
      var slug = slugGenerator.generate();
      var shortie = new model.Shortie(slug, url, model.ShortieType.Generated);
      repo.addShortie(shortie.slug, shortie, function(err) {
        if (err) return next(err);
        res.send(201, shortie);
      });
    } else {
      res.send(200, new model.Shortie(shorties[0].slug, shorties[0].url, shorties[0].type));
    }
  });
}

function putHandler(req, res, next) {
  var url = req.body.url;
  if (isInvalidUrl(url)) return res.send(400, 'Invalid URL in request body');
  var slugToCreateOrReplace = req.params.slug;
  if (isInvalidSlug(slugToCreateOrReplace)) return res.send(400, 'Invalid slug in request URL');
  var newSlug = req.body.slug;
  if (isInvalidSlug(newSlug)) return res.send(400, 'Invalid slug in request body');

  var shortie = new model.Shortie(newSlug , url, model.ShortieType.Manual);

  repo.addShortie(slugToCreateOrReplace, shortie, function(err) {
    if (err) return next(err);
    res.send(201, shortie);
  });
}

function deleteHandler(req, res, next) {
  var slug = req.params.slug;
  if (isInvalidSlug(slug)) return res.send(400, 'Invalid slug in request body');

  repo.removeShortie(slug, function(err, numRemoved) {
    if (err) return next(err);
    if (numRemoved != 1) return res.send(404, 'Shortie not found');
    res.send(200, 'Shortie removed');
  });
}

function isInvalidUrl(url) {
  // TODO: Write better validation
  // TODO: Move somewhere?
  if (!url || url.length === 0) return true;
}

function isInvalidSlug(url) {
  // TODO: Write better validation. Slug cannot clash with routes
  // TODO: Move somewhere
  if (!url || url.length === 0) return true;
}

export function setup(app: express.Application, options: any): void {
  repo = options.shortiesRepo;

  app.get('/', authMiddleware.requireAuthOrDeny, listHandler);
  app.get('/:slug', getHandler);
  app.post('/', authMiddleware.requireAuthOrDeny, postHandler);
  app.put('/:slug', authMiddleware.requireAuthOrDeny, putHandler);
  app.del('/:slug', authMiddleware.requireAuthOrDeny, deleteHandler);
}
