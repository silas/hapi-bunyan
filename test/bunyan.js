'use strict';

/* jshint expr: true */

/**
 * Module dependencies.
 */

var hapi = require('hapi');

/**
 * Logger.
 */

var LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function Logger() {
  this.data = {};
  this.reset();
}

Logger.prototype.reset = function() {
  var self = this;

  LEVELS.forEach(function(level) {
    self[level] = self.log(level);
  });
};

Logger.prototype.log = function(level) {
  var data = this.data[level] = [];

  return function() {
    data.push(Array.prototype.slice.call(arguments));
  };
};

Logger.prototype.child = function() {
  return this;
};

/**
 * Lab.
 */

var lab = exports.lab = require('lab').script();
var expect = require('lab').expect;

/**
 * Plugin.
 */

lab.experiment('bunyan', function() {

  lab.test('logger requirement', function(done) {
    var server = new hapi.Server();
    server.connection();

    server.register({
      register: require('../lib'),
    }, function(err) {
      expect(err).to.exist;

      done();
    });
  });

  lab.test('logger requirement', function(done) {
    var server = new hapi.Server();
    server.connection();

    server.register({
      register: require('../lib'),
    }, function(err) {
      expect(err).to.exist;

      done();
    });
  });

  lab.test('log event', function(done) {
    var logger = new Logger();
    var server = new hapi.Server();
    server.connection();

    var last;

    function handler() {
      last = Array.prototype.slice.call(arguments);
    }

    server.register({
      register: require('../lib'),
      options: {
        handler: handler,
        logger: logger,
      },
    }, function(err) {
      expect(err).not.to.exist;

      server.log(['test'], 'server-test');
      server.log(['error'], 'server-error');

      expect(last).to.be.an('array');
      expect(last.length).to.equal(3);
      expect(last[0]).to.equal('log');
      expect(last[1]).to.be.an('object');
      expect(last[1].data).to.equal('server-error');
      expect(last[2]).to.be.an('object');
      expect(last[2]).to.have.property('error');
      expect(last[2].error).to.equal(true);

      done();
    });
  });

  lab.test('request event', function(done) {
    var logger = new Logger();
    var server = new hapi.Server();
    server.connection();

    server.route({
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        request.log(['tester'], 'hello world');
        request.log.trace('test-trace');

        LEVELS.forEach(function(level) {
          expect(request.log).to.have.property(level);
        });

        reply({ hello: 'world' });
      },
    });

    server.register({
      register: require('../lib'),
      options: {
        logger: logger,
      },
    }, function(err) {
      expect(err).not.to.exist;

      server.inject('/', function() {
        var helloEntry;

        logger.data.info.forEach(function(data) {
          expect(data).to.be.an('array');
          expect(data).to.not.be.empty;
          expect(data[0]).to.have.property('req_id');

          if (data[1]) helloEntry = data;
        });

        expect(helloEntry[1]).to.equal('hello world');

        var trace = logger.data.trace;

        expect(trace).to.be.an('array');
        expect(trace).to.not.be.empty;
        expect(trace[0][0]).to.equal('test-trace');

        done();
      });
    });
  });
});
