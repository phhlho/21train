var secrets = require('../config/secrets');
var User = require('../models/User');
var querystring = require('querystring');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var _ = require('underscore');
var graph = require('fbgraph');
var Twit = require('twit');
var paypal = require('paypal-rest-sdk');

/**
 * GET /api
 * List of API examples.
 */

exports.getApi = function(req, res) {
  res.render('api/index', {
    title: 'API Browser'
  });
};

/**
 * GET /api/facebook
 * Facebook API example.
 */

exports.getFacebook = function(req, res, next) {
  var token = _.findWhere(req.user.tokens, { kind: 'facebook' });
  graph.setAccessToken(token.accessToken);
  async.parallel({
    getMe: function(done) {
      graph.get(req.user.facebook, function(err, me) {
        done(err, me);
      });
    },
    getMyFriends: function(done) {
      graph.get(req.user.facebook + '/friends', function(err, friends) {
        done(err, friends.data);
      });
    }
  },
  function(err, results) {
    if (err) return next(err);
    res.render('api/facebook', {
      title: 'Facebook API',
      me: results.getMe,
      friends: results.getMyFriends
    });
  });
};

/**
 * GET /api/scraping
 * Web scraping example using Cheerio library.
 */

exports.getScraping = function(req, res, next) {
  request.get('https://news.ycombinator.com/', function(err, request, body) {
    if (err) return next(err);
    var $ = cheerio.load(body);
    var links = [];
    $('.title a').each(function() {
      links.push($(this));
    });
    res.render('api/scraping', {
      title: 'Web Scraping',
      links: links
    });
  });
};

/**
 * GET /api/aviary
 * Aviary image processing example.
 */

exports.getAviary = function(req, res) {
  res.render('api/aviary', {
    title: 'Aviary API'
  });
};

/**
 * GET /api/twitter
 * Twiter API example.
 */

exports.getTwitter = function(req, res, next) {
  var token = _.findWhere(req.user.tokens, { kind: 'twitter' });
  var T = new Twit({
    consumer_key: secrets.twitter.consumerKey,
    consumer_secret: secrets.twitter.consumerSecret,
    access_token: token.accessToken,
    access_token_secret: token.tokenSecret
  });
  T.get('search/tweets', { q: 'hackathon since:2013-01-01', geocode: '40.71448,-74.00598,5mi', count: 50 }, function(err, reply) {
    if (err) return next(err);
    res.render('api/twitter', {
      title: 'Twitter API',
      tweets: reply.statuses
    });
  });
};

/**
 * GET /api/paypal
 * PayPal SDK example
 */
exports.getPayPal = function(req, res, next) {
  paypal.configure(secrets.paypal);
  var payment_details = {
    'intent': 'sale',
    'payer': {
      'payment_method': 'paypal'
    },
    'redirect_urls': {
      'return_url': secrets.paypal.returnUrl,
      'cancel_url': secrets.paypal.cancelUrl
    },
    'transactions': [{
      'description': 'Node.js Boilerplate',
      'amount': {
        'currency': 'USD',
        'total': '2.99'
      }
    }]
  };
  paypal.payment.create(payment_details, function (error, payment) {
    if(error){
      console.log(error);
    } else {
      req.session.payment_id = payment.id;
      var links = payment.links;
      for (var i = 0; i < links.length; i++) {
        if (links[i].rel === 'approval_url') {
          res.render('api/paypal', {
            approval_url: links[i].href
          });
        }
      }
    }
  });
};

/**
 * GET /api/paypal/success
 * PayPal SDK example
 */
exports.getPayPalSuccess = function(req, res, next) {
  var payment_id = req.session.payment_id;
  var payment_details = { 'payer_id': req.query.PayerID };
  paypal.payment.execute(payment_id, payment_details, function(error, payment){
    if(error){
      res.render('api/paypal', {
        result: true,
        success: false
      });
    } else {
      res.render('api/paypal', {
        result: true,
        success: true
      });
    }
  });
};

/**
 * GET /api/paypal/cancel
 * PayPal SDK example
 */
exports.getPayPalCancel = function(req, res, next) {
  req.session.payment_id = null;
  res.render('api/paypal', {
    result: true,
    canceled: true
  });
};