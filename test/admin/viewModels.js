﻿var viewModels = require('../../src/admin/viewModels');

var model = require('../../src/shorties/model');

var _ = require('underscore');
var chai = require('chai');
var sinonModule = require('sinon');

var assert = chai.assert;
var expect = chai.expect;
var sinon = sinonModule;

describe("AdminViewModel", function () {
    var models;
    var apiClient;
    var adminViewModel;

    beforeEach(function () {
        models = [
            new model.Shortie("lilla-anna", "http://sv.wikipedia.org/wiki/Lilla_Anna_och_Langa_farbrorn"),
            new model.Shortie("go-shorty", "http://rapgenius.com/50-cent-in-da-club-lyrics"),
            new model.Shortie("i-wish", "http://open.spotify.com/track/74WFSCXc8yHY7HDXREiLpM")
        ];
        apiClient = {
            sendRequest: function () {
            }
        };
        adminViewModel = new viewModels.AdminViewModel(apiClient);
    });

    describe('loadShorties()', function () {
        it("should create ShortieViewModels for all Shorties", function () {
            apiClient.sendRequest = function (request, callback) {
                callback({ status: 200, data: models });
            };

            adminViewModel.loadShorties();

            assert.equal(adminViewModel.shorties().length, 3);
        });
    });

    describe("select()", function () {
        beforeEach(function () {
            adminViewModel.shorties(_.map(models, function (m) {
                return new viewModels.ShortieViewModel(m);
            }));
        });
        it("should not deselect previous shortie if passed shortie is not part of collection", function () {
            var rogueShortie = new viewModels.ShortieViewModel(new model.Shortie("rouge", "rougheUrl"));
            var currentShortie = adminViewModel.shorties()[0];
            currentShortie.isCurrent(true);

            adminViewModel.select(rogueShortie);

            _.each(adminViewModel.shorties(), function (vm) {
                expect(currentShortie.isCurrent()).to.be.true;
            });
        });

        it("should select shortie if it is part of collection", function () {
            var current = adminViewModel.shorties()[0];

            adminViewModel.select(current);

            expect(current.isCurrent()).to.be.true;
        });

        it("should deselect the previous shortie", function () {
            var previous = adminViewModel.shorties()[0];
            var next = adminViewModel.shorties()[1];
            previous.isCurrent(true);

            adminViewModel.select(next);

            expect(previous.isCurrent()).to.be.false;
        });
    });

    describe("addNew()", function () {
        beforeEach(function () {
        });
        it("should add a new ShortieViewModel if request is OK", function () {
            adminViewModel.addNew();

            expect(adminViewModel.shorties().length).to.be.equal(1);
        });

        it("should set newly added ShortieViewModel as current", function () {
            adminViewModel.addNew();
            expect(adminViewModel.shorties()[0].isCurrent()).to.be.true;
        });

        it("should prevent creation of multiple empty shorties", function () {
            adminViewModel.addNew();
            adminViewModel.addNew();
            expect(adminViewModel.shorties().length).to.be.equal(1);
        });
    });

    describe("save()", function () {
        var sendRequestSpy;

        beforeEach(function () {
            adminViewModel.shorties(_.map(models, function (m) {
                return new viewModels.ShortieViewModel(m);
            }));
            var apiOkResponse = { status: 200, data: {} };
            apiClient.sendRequest = sendRequestSpy = sinon.spy(function (request, callback) {
                callback(apiOkResponse);
            });
        });

        it('should deselect all shorties', function () {
            var current = adminViewModel.shorties()[0];
            current.isCurrent(true);

            adminViewModel.save(current);

            _.each(adminViewModel.shorties(), function (vm) {
                expect(vm.isCurrent()).to.be.false;
            });
        });

        it('should send PUT request to save existing Shortie', function () {
            var shortie = adminViewModel.shorties()[1];
            shortie.isCurrent(true);

            adminViewModel.save(shortie);

            sinon.assert.calledWith(sendRequestSpy, { path: '/go-shorty', verb: 'PUT', data: models[1] });
        });

        it('should send PUT request to replace existing Shortie with new slug', function () {
            var shortie = adminViewModel.shorties()[1];
            shortie.slug('go-longery');
            shortie.isCurrent(true);

            adminViewModel.save(shortie);

            sinon.assert.calledWith(sendRequestSpy, { path: '/go-shorty', verb: 'PUT', data: models[1] });
        });

        it('should send PUT request to save new Shortie', function () {
            var shortie = new viewModels.ShortieViewModel();
            shortie.slug('foo');
            shortie.url('http://foobar');
            adminViewModel.shorties.push(shortie);

            adminViewModel.save(shortie);

            var expectedRequest = {
                path: '/foo',
                verb: 'PUT',
                data: {
                    slug: 'foo',
                    url: 'http://foobar'
                }
            };
            sinon.assert.calledWith(sendRequestSpy, sinon.match(expectedRequest));
        });
    });

    describe("saveByUrl()", function () {
        var sendRequestSpy;

        it("Should post the url through the api client", function () {
            var url = 'http://www.google.se';
            apiClient.sendRequest = sendRequestSpy = sinon.spy(function (request, callback) {
                callback({ status: 200, data: {} });
            });

            adminViewModel.saveByUrl(url);

            sinon.assert.called(sendRequestSpy);
        });

        it("Should create ShortieVm and add it to shorties", function () {
            var url = 'http://www.google.se';
            var generatedShortie = new model.Shortie('sluggy', url);
            apiClient.sendRequest = sendRequestSpy = sinon.spy(function (request, callback) {
                callback({ status: 200, data: generatedShortie });
            });

            adminViewModel.saveByUrl(url);

            var allShorties = _.map(adminViewModel.shorties(), function (vm) {
                return vm.shortie;
            });
            assert.equal(allShorties[0], generatedShortie);
        });
    });

    describe("remove()", function () {
        var sendRequestSpy;
        var shortie;

        beforeEach(function () {
            adminViewModel.shorties(_.map(models, function (m) {
                return new viewModels.ShortieViewModel(m);
            }));
            var apiOkResponse = { status: 200, data: {} };
            apiClient.sendRequest = sendRequestSpy = sinon.spy(function (request, callback) {
                callback(apiOkResponse);
            });
            shortie = adminViewModel.shorties()[1];
            adminViewModel.markShortieForDeletion(shortie);
        });

        it('should call the API with a DELETE request', function () {
            adminViewModel.remove();

            sinon.assert.calledWith(sendRequestSpy, sinon.match({
                path: '/' + shortie.shortie.slug,
                verb: 'DELETE'
            }));
        });

        it('should call the API with a DELETE request using the original slug', function () {
            shortie.slug('asdfasdfasdfasdf');
            adminViewModel.remove();

            sinon.assert.calledWith(sendRequestSpy, sinon.match({
                path: '/' + shortie.originalSlug,
                verb: 'DELETE'
            }));
        });

        it('should remove the shortie from the list', function () {
            adminViewModel.remove();

            expect(adminViewModel.shorties().length).to.equal(2);
        });
    });

    describe("The 'spamWarning' property", function () {
        it("Should be false if all shorties have value", function () {
            expect(adminViewModel.spamWarning()).to.be.false;
        });

        it("Should be false if one new shorties and no attempt to create new", function () {
            models.push(new model.Shortie('', ''));

            expect(adminViewModel.spamWarning()).to.be.false;
        });

        it("Should be true if one new shorties and attempt to create new is performed", function () {
            adminViewModel.addNew();

            adminViewModel.addNew();

            expect(adminViewModel.spamWarning()).to.be.true;
        });

        it("Should be false again if new slug gets values", function () {
            models.push(new model.Shortie('', ''));

            adminViewModel.addNew();
            adminViewModel.shorties()[0].slug('newSlug');
            adminViewModel.shorties()[0].url('newUrl');

            expect(adminViewModel.spamWarning()).to.be.false;
        });
    });
});
