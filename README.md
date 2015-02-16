# Hapi Bunyan [![Build Status](https://travis-ci.org/silas/hapi-bunyan.png?branch=master)](https://travis-ci.org/silas/hapi-bunyan)

This a simple [Bunyan][bunyan] plugin for Hapi.

## Documentation

Options

 * logger (Object): Bunyan logger object
 * handler (Function, optional): custom event handler, this function can return `true` if it handled the event.
 * skipUndefined (Boolean, default: true): don't log events with `undefined` data.
 * includeData (Boolean, default: true): include data in log events.
 * mergeData (Boolean, default: false): when the event data is an object merge it into the log data.
 * includeTags (Boolean, default: false): include tags in log event.
 * joinTags (String, optional): join tags using the specified character.

## Example

``` javascript
var bunyan = require('bunyan');
var hapi = require('hapi');

var server = new hapi.Server();
server.connection({ port: 8000 });

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    request.log.info('just a test');

    reply({ hello: 'world' });
  },
});

var config = {
  register: require('hapi-bunyan'),
  options: {
    logger: bunyan.createLogger({ name: 'test', level: 'debug' }),
  },
};

server.register(config, function(err) {
  if (err) throw err;
});

server.start();
```

## License

This work is licensed under the MIT License (see the LICENSE file).

[bunyan]: https://www.npmjs.org/package/bunyan
