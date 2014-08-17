# Hapi Bunyan

This a simple [Bunyan][bunyan] plugin for Hapi.

## Documentation

Options

 * logger (Object): Bunyan logger object
 * handler (Function, optional): Custom event handler, this function can return true if it handled the event. The call has `log`, `level`, and `logUndefined` binded to `this`. Both `level` and `logUndefined` can be modified in place.
 * logUndefined (Boolean, default: false): Show events events with no data.

## Example

``` javascript
var bunyan = require('bunyan');
var hapi = require('hapi');

var server = new hapi.Server(8000);

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    request.log.info('just a test');

    reply({ hello: 'world' });
  },
});

var config = {
  plugin: require('hapi-bunyan'),
  options: {
    logger: bunyan.createLogger({ name: 'test', level: 'debug' }),
  },
};

server.pack.register(config, function(err) {
  if (err) throw err;
});

server.start();
```

## License

This work is licensed under the MIT License (see the LICENSE file).

[bunyan]: https://www.npmjs.org/package/bunyan
