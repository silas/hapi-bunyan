'use strict';

/**
 * Module dependencies.
 */

var hoek = require('hoek');

/**
 * Constants.
 */

var LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Event logger.
 */

function logEvent(ctx, data, request) {
  var obj = {};
  var msg = '';

  if (ctx.includeTags) {
    obj.tags = ctx.joinTags ? data.tags.join(ctx.joinTags) : data.tags;
  }

  if (request) obj.req_id = request.id;

  if (typeof data.data === 'string') {
    msg = data.data;
  } else if (ctx.includeData && data.data !== undefined) {
    if (ctx.mergeData) {
      try {
        hoek.merge(obj, data.data);

        if (obj.id === obj.req_id) delete obj.id;
      } catch (err) {
        obj.data = data.data;
      }
    } else {
      obj.data = data.data;
    }
  } else if (ctx.skipUndefined) {
    return;
  }

  ctx.log[ctx.level](obj, msg);
}

/**
 * Plugin.
 */

function register(server, options, next) {
  if (!options.logger) {
    return next(new Error('logger required'));
  }

  var log = options.logger;
  var handler = options.handler || function() {};

  delete options.logger;
  delete options.handler;

  options = hoek.applyToDefaults({
    includeTags: false,
    includeData: true,
    mergeData: false,
    skipUndefined: true,
  }, options);

  server.ext('onRequest', function(request, next) {
    var rlog = request.log;

    request.bunyan = log.child({ req_id: request.id });

    request.log = function() {
      rlog.apply(request, arguments);
    };

    LEVELS.forEach(function(level) {
      request.log[level] = request.bunyan[level].bind(request.bunyan);
    });

    next();
  });

  exports.register.attributes = {
    name: 'hapi-bunyan'
  };

  server.events.on('log', function(data, tags) {
    var ctx = {
      level: tags.error ? 'error' : 'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      joinTags: options.joinTags,
    };

    if (handler.call(ctx, 'log', data, tags)) {
      return;
    }

    logEvent(ctx, data);
  });

  server.events.on('request', function(request, data, tags) {
    var ctx = {
      level: tags.error ? 'warn' : 'info',
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      joinTags: options.joinTags,
    };

    if (handler.call(ctx, 'request', request, data, tags)) {
      return;
    }

    logEvent(ctx, data, request);
  });

  next();
}

/**
 * Attributes.
 */

register.attributes = {
  pkg: require('../package.json'),
};

/**
 * Module exports.
 */

exports.register = register;
