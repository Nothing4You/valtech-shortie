var mongoUrl = process.env.MONGO_URL = 'mongodb://127.0.0.1:27017/valtech_shorties_test?w=1';

var request = require('supertest');
var assert = require('chai').assert;

var mongodb = require('mongodb');
var app = require('../../src/app');

var shortieApp = app.App;
var db, shortiesCollection;

describe('api', function () {
    before(function (done) {
        mongodb.MongoClient.connect(mongoUrl, function (err, _db) {
            if (err)
                return done(err);
            db = _db;
            shortiesCollection = db.collection('shorties');

            app.setup({ dbType: 'mongodb' }, done);
        });
    });

    beforeEach(function (done) {
        shortiesCollection.remove({ a: 1 }, { w: 1 }, done);
    });

    after(function (done) {
        db.close(true, done);
    });

    it('GET /:slug should return 404 if shortie cannot be found', function (done) {
        request(shortieApp).get('/catch-me-if-you-can').set('Accept', 'application/json').expect(404, done);
    });

    it('POST / should insert a shortie that can be GET', function (done) {
        var url = 'http://www.imdb.com/title/tt0118276/';
        request(shortieApp).post('/').send({ url: url }).set('Accept', 'application/json').expect(201).end(onCreated);

        function onCreated(err, res) {
            if (err)
                return done(err);
            var generatedSlug = res.body.slug;
            assert.isString(generatedSlug);
            assert.isTrue(generatedSlug.length > 4);
            request(shortieApp).get('/' + generatedSlug).expect('Location', url).expect(302, done);
        }
        ;
    });
});
