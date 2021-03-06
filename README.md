tdx-gpio.js
==========

Control Toradex GPIO pins with node.js

This is a port of [rpi-gpio.js](https://github.com/JamesBarwell/rpi-gpio.js).

## Supported hardware

TBD

## Setup

TBD

### Dependency
Please note that this module has a dependency on [epoll](https://github.com/fivdi/epoll) and that currently it is only possible to build and develop the module on Linux systems.

If you are having trouble installing this module make sure you are running gcc/g++ `-v 4.8` or higher. [Here](https://github.com/fivdi/onoff/wiki/Node.js-v4-and-native-addons) is an installation guide.

## Usage
Before you can read or write, you must use `setup()` to open a channel, and must specify whether it will be used for input or output. Having done this, you can then read in the state of the channel or write a value to it using `read()` or `write()`.

All of the functions relating to the pin state within this module are asynchronous, so where necessary - for example in reading the value of a channel - a callback must be provided. This module inherits the standard [EventEmitter](http://nodejs.org/api/events.html), so you may use its functions to listen to events.

### Pin naming

TBD

### Running without sudo
This module will work without use of the `sudo` command, as long as the user running the node process belongs to the `gpio` group. You can check the current user's groups by running the command `groups`, or `groups <user>` for another user. If you are not already a member of the `gpio` group, you can add yourself or another user by running `sudo adduser <user> gpio`.


## API (Error-first)

The default API uses the node-style error-first callbacks to perform asynchronous functions. Most of these methods take a callback, and that callback should check for an error in its first argument. It is important to check for an error after each command, else your code will continue to run and will likely fail in hard to understand ways.

### Methods

#### setup(channel [, direction, edge], callback)
Sets up a channel for read or write. Must be done before the channel can be used.
* channel: Reference to the pin in the current mode's schema.
* direction: The pin direction, pass either DIR_IN for read mode or DIR_OUT for write mode. You can also pass DIR_LOW or DIR_HIGH to use the write mode and specify an initial state of 'off' or 'on' respectively. Defaults to DIR_OUT.
* edge: Interrupt generating GPIO chip setting, pass in EDGE_NONE for no interrupts, EDGE_RISING for interrupts on rising values, EDGE_FALLING for interrupts on falling values or EDGE_BOTH for all interrupts.
Defaults to EDGE_NONE.
* callback: Provides Error as the first argument if an error occurred.

#### read(channel, callback)
Reads the value of a channel.
* channel: Reference to the pin in the current mode's schema.
* callback: Provides Error as the first argument if an error occured, otherwise the pin value boolean as the second argument.

#### write(channel, value [, callback])
Writes the value of a channel.
* channel: Reference to the pin in the current mode's schema.
* value: Boolean value to specify whether the channel will turn on or off.
* callback: Provides Error as the first argument if an error occured.

#### setMode(mode)
Sets the channel addressing schema.
* mode: Specify either Raspberry Pi or SoC/BCM pin schemas, by passing MODE_RPI or MODE_BCM. Defaults to MODE_RPI.

#### input()
Alias of read().

#### output()
Alias of write().

#### destroy()
Tears down any previously set up channels.

#### reset()
Tears down the module state - used for testing.

### Events
See Node [EventEmitter](http://nodejs.org/api/events.html) for documentation on listening to events.

#### change
Emitted when the value of a channel changed
* channel
* value

## API (Promises)

This API exposes a Promises interface to the module. All of the same functions are available, but do not take callbacks and instead return a Promise.

The Promises interface is available in the `promise` namespace, e.g.:

```js
var gpio = require('rpi-gpio')
var gpiop = gpio.promise;

gpiop.setup(7, gpio.DIR_OUT)
    .then(() => {
        return gpiop.write(7, true)
    })
    .catch((err) => {
        console.log('Error: ', err.toString())
    })
```


## Examples

### Setup and read the value of a pin
```js
var gpio = require('rpi-gpio');

gpio.setup(7, gpio.DIR_IN, readInput);

function readInput(err) {
    if (err) throw err;
    gpio.read(7, function(err, value) {
        if (err) throw err;
        console.log('The value is ' + value);
    });
}
```

### Setup and write to a pin
```js
var gpio = require('rpi-gpio');

gpio.setup(7, gpio.DIR_OUT, write);

function write(err) {
    if (err) throw err;
    gpio.write(7, true, function(err) {
        if (err) throw err;
        console.log('Written to pin');
    });
}
```

### Setup and write to a pin that starts as on
This example shows how to setup the pin for write mode with the default state as
"on". Why do this? It can sometimes be useful to reverse the default initial
state due to wiring or uncontrollable circumstances.
```js
var gpio = require('rpi-gpio');

gpio.setup(7, gpio.DIR_HIGH, write);

function write(err) {
    if (err) throw err;
    gpio.write(7, false, function(err) {
        if (err) throw err;
        console.log('Written to pin');
    });
}
```

### Listen for changes on a pin
```js
var gpio = require('rpi-gpio');

gpio.on('change', function(channel, value) {
	console.log('Channel ' + channel + ' value is now ' + value);
});
gpio.setup(7, gpio.DIR_IN, gpio.EDGE_BOTH);
```

### Unexport pins opened by the module when finished
```js
var gpio = require('../rpi-gpio');

gpio.on('export', function(channel) {
    console.log('Channel set: ' + channel);
});

gpio.setup(7, gpio.DIR_OUT);
gpio.setup(15, gpio.DIR_OUT);
gpio.setup(16, gpio.DIR_OUT, pause);

function pause() {
    setTimeout(closePins, 2000);
}

function closePins() {
    gpio.destroy(function() {
        console.log('All pins unexported');
    });
}
```


### Voltage cycling a pin
This example shows how to set up a channel for output mode. After it is set up, it executes a callback which in turn calls another, causing the voltage to alternate up and down three times.
```js
var gpio = require('rpi-gpio');

var pin   = 7;
var delay = 2000;
var count = 0;
var max   = 3;

gpio.setup(pin, gpio.DIR_OUT, on);

function on() {
    if (count >= max) {
        gpio.destroy(function() {
            console.log('Closed pins, now exit');
        });
        return;
    }

    setTimeout(function() {
        gpio.write(pin, 1, off);
        count += 1;
    }, delay);
}

function off() {
    setTimeout(function() {
        gpio.write(pin, 0, on);
    }, delay);
}
```

### Using flow control modules
Due to the asynchronous nature of this module, using an asynchronous flow control module can help to simplify development. This example uses [async.js](https://github.com/caolan/async) to turn pins on and off in series.
```js
var gpio = require('rpi-gpio');
var async = require('async');

async.parallel([
    function(callback) {
        gpio.setup(7, gpio.DIR_OUT, callback)
    },
    function(callback) {
        gpio.setup(15, gpio.DIR_OUT, callback)
    },
    function(callback) {
        gpio.setup(16, gpio.DIR_OUT, callback)
    },
], function(err, results) {
    console.log('Pins set up');
    write();
});

function write() {
    async.series([
        function(callback) {
            delayedWrite(7, true, callback);
        },
        function(callback) {
            delayedWrite(15, true, callback);
        },
        function(callback) {
            delayedWrite(16, true, callback);
        },
        function(callback) {
            delayedWrite(7, false, callback);
        },
        function(callback) {
            delayedWrite(15, false, callback);
        },
        function(callback) {
            delayedWrite(16, false, callback);
        },
    ], function(err, results) {
        console.log('Writes complete, pause then unexport pins');
        setTimeout(function() {
            gpio.destroy(function() {
                console.log('Closed pins, now exit');
            });
        }, 500);
    });
};

function delayedWrite(pin, value, callback) {
    setTimeout(function() {
        gpio.write(pin, value, callback);
    }, 500);
}
```

## Contributing
Contributions are always appreciated, whether that's in the form of bug reports, pull requests or helping to diagnose bugs and help other users on the issues page.

Due to the nature of this project it can be quite time-consuming to test against real hardware, so the automated test suite is all the more important. I will not accept any pull requests that cause the build to fail, and probably will not accept any that do not have corresponding test coverage.

You can run the tests with npm:
```
npm test
```
and create a coverage report with:
```
npm run coverage
```
There is also an integration test that you can run on Raspberry Pi hardware, having connected two GPIO pins across a resistor. The command to run the test will provide further instructions on how to set up the hardware:
```
npm run int
```

The tests use [mochajs](http://mochajs.org) as the test framework, and [Sinon.JS](http://sinonjs.org) to stub and mock out file system calls.
