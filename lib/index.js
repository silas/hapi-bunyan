'use strict';

/**
 * Module dependencies.
 */

var lodash = require('lodash');

/**
 * Constants.
 */

var LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Event logger.
 */

function logEvent(ctx, data, request) {
  if (!data) return;

  var obj = {};
  var msg = '';

  if (ctx.includeTags && Array.isArray(data.tags)) {
    obj.tags = ctx.joinTags ? data.tags.join(ctx.joinTags) : data.tags;
  }

  if (request) obj.req_id = request.id;

  if (data instanceof Error) {
    ctx.log.child(obj)[ctx.level](data);
    return;
  }

  var type = typeof data.data;

  if (type === 'string') {
    msg = data.data;
  } else if (ctx.includeData && data.data !== undefined) {
    if (ctx.mergeData && type === 'object' && !Array.isArray(data.data)) {
      lodash.assign(obj, data.data);

      if (obj.id === obj.req_id) delete obj.id;
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

  options = lodash.defaults(
    lodash.omit(options, ['logger', 'handler']), {
      includeTags: false,
      includeData: true,
      mergeData: false,
      skipUndefined: true,
  });

  var makeCtx = function(tags, level) {
    if (tags.fatal) {
      level = 'fatal';
    } else if (tags.error) {
      level = 'error';
    } else if (tags.warn) {
      level = 'warn';
    } else if (tags.info) {
      level = 'info';
    } else if (tags.debug) {
      level = 'debug';
    } else if (tags.trace) {
      level = 'trace';
    }

    return {
      level: level,
      log: log,
      includeTags: options.includeTags,
      includeData: options.includeData,
      mergeData: options.mergeData,
      skipUndefined: options.skipUndefined,
      joinTags: options.joinTags,
    };
  };

  server.ext('onRequest', function(request, reply) {
    var rlog = request.log;

    request.bunyan = log.child({ req_id: request.id });

    request.log = function() {
      rlog.apply(request, arguments);
    };

    LEVELS.forEach(function(level) {
      request.log[level] = function() {
        request.bunyan[level].apply(request.bunyan, arguments);
      };
    });

    return reply.continue();
  });

  server.on('log', function(data, tags) {
    var ctx = makeCtx(tags, 'info');

    if (handler.call(ctx, 'log', data, tags)) {
      return;
    }

    logEvent(ctx, data);
  });

  server.on('request', function(request, data, tags) {
    var ctx = makeCtx(tags, 'info');

    if (handler.call(ctx, 'request', request, data, tags)) {
      return;
    }

    logEvent(ctx, data, request);
  });

  server.on('request-internal', function(request, data, tags) {
    var ctx = makeCtx(tags, 'debug');

    if (handler.call(ctx, 'request-internal', request, data, tags)) {
      return;
    }

    logEvent(ctx, data, request);
  });

  server.on('request-error', function(request, err) {
    var tags = {};
    var ctx = makeCtx(tags, 'error');

    if (handler.call(ctx, 'request-error', request, err, tags)) {
      return;
    }

    logEvent(ctx, err, request);
  });

  next();
}

/**
 * Attributes.
 */

register.attributes = {
  pkg: require('../package.json'),
  name: 'hapi-bunyan',
};

/**
 * Module exports.
 */

exports.log = logEvent;
exports.register = register;
