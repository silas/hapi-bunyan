'use strict';

/**
 * Module dependencies.
 */

var bunyan = require('bunyan');
var expect = require('code').expect;
var hapi = require('hapi');

/**
 * Lab.
 */

var lab = exports.lab = require('lab').script();

/**
 * Helpers
 */

function make() {
  var buffer = new bunyan.RingBuffer({ limit: 100 });

  var logger = bunyan.createLogger({
    name: 'test',
    streams: [
      {
        level: 'trace',
        type: 'raw',
        stream: buffer,
      },
    ],
  });

  logger.buffer = buffer;

  return logger;
}

/**
 * Plugin.
 */

lab.experiment('bunyan', function() {

  lab.test('logger requirement', function(done) {
    var server = new hapi.Server();
    server.connection();

    server.register({ register: require('../lib') }, function(err) {
      expect(err).to.exist();

      done();
    });
  });

  lab.test('logger requirement', function(done) {
    var server = new hapi.Server();
    server.connection();

    server.register({ register: require('../lib') }, function(err) {
      expect(err).to.exist();

      done();
    });
  });

  lab.test('log event', function(done) {
    var logger = make();
    var server = new hapi.Server();
    server.connection();

    var last;

    var handler = function() {
      last = Array.prototype.slice.call(arguments);
    };

    server.register({
      register: require('../lib'),
      options: { logger: logger, handler: handler },
    }, function(err) {
      expect(err).not.to.exist();

      server.log(['test'], 'server-test');
      server.log(['error'], 'server-error');

      expect(last).to.be.an.array();
      expect(last.length).to.equal(3);
      expect(last[0]).to.equal('log');
      expect(last[1]).to.be.an.object();
      expect(last[1].data).to.equal('server-error');
      expect(last[2]).to.be.an.object();
      expect(last[2]).to.have.include('error');
      expect(last[2].error).to.equal(true);

      done();
    });
  });

  lab.test('request event', function(done) {
    var logger = make();
    var server = new hapi.Server();
    server.connection();

    server.route({
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        request.log(['tester'], 'hello world');
        request.log.trace('test-trace');
        request.log.error('test-error');

        reply({ hello: 'world' });
      },
    });

    server.register({
      register: require('../lib'),
      options: { logger: logger },
    }, function(err) {
      expect(err).not.to.exist();

      server.inject('/', function() {
        var records = logger.buffer.records;

        expect(records[0].level).to.equal(20);
        expect(records[0].data).to.include('method');
        expect(records[0].data).to.include('url');
        expect(records[0].data).to.include('agent');
        expect(records[0].msg).to.equal('');

        expect(records[1].level).to.equal(30);
        expect(records[1].msg).to.equal('hello world');

        expect(records[2].level).to.equal(10);
        expect(records[2].msg).to.equal('test-trace');

        expect(records[3].level).to.equal(50);
        expect(records[3].msg).to.equal('test-error');

        expect(records[4].level).to.equal(20);
        expect(records[4].data).to.include('msec');
        expect(records[4].msg).to.equal('');

        done();
      });
    });
  });

  lab.test('request error', function(done) {
    var logger = make();
    var server = new hapi.Server({ debug: false });
    server.connection();

    server.route({
      method: 'GET',
      path: '/',
      handler: function() {
        throw new Error('fail');
      },
    });

    server.register({
      register: require('../lib'),
      options: { logger: logger },
    }, function(err) {
      expect(err).not.to.exist();

      server.inject('/', function() {
        var records = logger.buffer.records;

        expect(records[1].level).to.equal(50);

        expect(records[1]).to.include('err');
        expect(records[1].err.message).to.equal('Uncaught error: fail');
        expect(records[1].err.name).to.include('Error');
        expect(records[1].err).to.include('stack');
        expect(records[1].msg).to.equal('Uncaught error: fail');

        done();
      });
    });
  });

  lab.test('handle bad data', function(done) {
    var logger = make();
    var server = new hapi.Server();
    server.connection();

    server.route({
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        request.connection.emit('request-internal', request, null, true);

        reply({ hello: 'world' });
      },
    });

    server.register({
      register: require('../lib'),
      options: { logger: logger },
    }, function(err) {
      expect(err).not.to.exist();

      server.inject('/', function() {
        done();
      });
    });
  });

  lab.test('handle ctx options', function(done) {
    var logger = make();
    var server = new hapi.Server();
    server.connection();

    server.route({
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        request.log(['trace'], { test: 'includeTags' });
        request.log(['debug'], { test: 'joinTags' });
        request.log(['info'], { test: 'includeData' });
        request.log(['warn'], { test: 'mergeData' });
        request.log(['error'], { test: 'mergeData delete id' });
        request.log(['fatal'], { test: 'mergeData not object' });
        request.log(['fatal'], { test: 'mergeData array' });
        request.log(['fatal'], { test: 'skipUndefined' });

        reply({ hello: 'world' });
      },
    });

    var handler = function(type, request, data) {
      if (type === 'request' && data.data.test) {
        switch (data.data.test) {
          case 'includeTags':
            this.includeTags = true;
            this.joinTags = false;
            break;
          case 'joinTags':
            this.includeTags = true;
            this.joinTags = true;
            break;
          case 'includeData':
            this.includeData = false;
            break;
          case 'mergeData':
            this.mergeData = true;
            break;
          case 'mergeData delete id':
            this.mergeData = true;
            data.data.id = request.id;
            break;
          case 'mergeData not object':
            this.mergeData = true;
            data.data = 123;
            break;
          case 'mergeData array':
            this.mergeData = true;
            data.data = [1, 2, 3];
            break;
          case 'skipUndefined':
            this.skipUndefined = false;
            data.data = undefined;
            break;
        }
      }
    };

    server.register({
      register: require('../lib'),
      options: { logger: logger, handler: handler },
    }, function(err) {
      expect(err).not.to.exist();

      server.inject('/', function() {
        done();
      });
    });
  });

  lab.test('skip log handling', function(done) {
    var logger = make();
    var server = new hapi.Server();
    server.connection();

    server.route({
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        var tags = {};

        request.connection.emit('log', 'skip', tags);
        request.connection.emit('request', request, 'skip', tags);
        request.connection.emit('request-internal', request, 'skip', tags);
        request.connection.emit('request-error', request, 'skip', tags);

        reply({ hello: 'world' });
      },
    });

    var handler = function() {
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] === 'skip') {
          return true;
        }
      }
    };

    server.register({
      register: require('../lib'),
      options: { logger: logger, handler: handler },
    }, function(err) {
      expect(err).not.to.exist();

      server.inject('/', function() {
        var records = logger.buffer.records;

        expect(records.length).to.equal(2);

        done();
      });
    });
  });
});
