'use strict';

/**
 * Constants.
 */

var LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Plugin.
 */

function register(server, options, next) {
  if (!options.logger) {
    return next(new Error('logger required'));
  }

  var log = options.logger;
  var handler = options.handler || function() {};

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

  server.events.on('log', function(data, tags) {
    var ctx = {
      level: tags.error ? 'error' : 'info',
      log: log,
      logUndefined: options.logUndefined,
    };

    if (handler.call(ctx, 'log', data, tags)) {
      return;
    }

    var emit = ctx.log[ctx.level].bind(ctx.log);

    if (typeof data.data === 'string') {
      emit({ tags: data.tags }, data.data);
    } else if (data.data !== undefined) {
      emit({ data: data.data, tags: data.tags });
    } else if (ctx.logUndefined) {
      emit({ tags: data.tags });
    }
  });

  server.events.on('request', function(request, data, tags) {
    var ctx = {
      level: tags.error ? 'warn' : 'info',
      log: log,
      logUndefined: options.logUndefined,
    };

    if (handler.call(ctx, 'request', request, data, tags)) {
      return;
    }

    var emit = ctx.log[ctx.level].bind(ctx.log);

    if (typeof data.data === 'string') {
      emit({ req_id: request.id, tags: data.tags }, data.data);
    } else if (data.data !== undefined) {
      emit({ data: data.data, req_id: request.id, tags: data.tags });
    } else if (ctx.logUndefined) {
      emit({ req_id: request.id, tags: data.tags });
    }
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
