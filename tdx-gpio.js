var fs           = require('fs');
var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var async        = require('async');
var debug        = require('debug')('tdx-gpio');
var Epoll        = require('epoll').Epoll;
var Promise      = require('promise');

//  TODO: other boards

var PATH = '/sys/class/gpio';
var PINS = {
    colibri_imx6ull: {
        'SODIMM_2': 9,
        'SODIMM_4': 8,
        'SODIMM_6': 1,
        'SODIMM_8': 0,
        'SODIMM_19': 4,
        'SODIMM_21': 5,
        'SODIMM_23': 12,
        'SODIMM_25': 18,
        'SODIMM_27': 19,
        'SODIMM_28': 112,
        'SODIMM_29': 87,
        'SODIMM_30': 37,
        'SODIMM_31': 13,
        'SODIMM_32': 22,
        'SODIMM_33': 16,
        'SODIMM_34': 23,
        'SODIMM_35': 17,
        'SODIMM_36': 20,
        'SODIMM_37': 88,
        'SODIMM_38': 21,
        'SODIMM_43': 128,
        'SODIMM_44': 65,
        'SODIMM_45': 129,
        'SODIMM_46': 76,
        'SODIMM_47': 49,
        'SODIMM_48': 78,
        'SODIMM_49': 51,
        'SODIMM_50': 80,
        'SODIMM_51': 52,
        'SODIMM_52': 81,
        'SODIMM_53': 53,
        'SODIMM_54': 82,
        'SODIMM_55': 32,
        'SODIMM_56': 64,
        'SODIMM_57': 85,
        'SODIMM_58': 72,
        'SODIMM_59': 107,
        'SODIMM_60': 71,
        'SODIMM_61': 86,
        'SODIMM_62': 77,
        'SODIMM_63': 33,
        'SODIMM_64': 84,
        'SODIMM_65': 124,
        'SODIMM_66': 83,
        'SODIMM_67': 38,
        'SODIMM_68': 66,
        'SODIMM_69': 121,
        'SODIMM_70': 70,
        'SODIMM_71': 11,
        'SODIMM_72': 74,
        'SODIMM_73': 36,
        'SODIMM_74': 79,
        'SODIMM_75': 113,
        'SODIMM_76': 69,
        'SODIMM_77': 25,
        'SODIMM_78': 73,
        'SODIMM_79': 119,
        'SODIMM_80': 75,
        'SODIMM_81': 115,
        'SODIMM_82': 67,
        'SODIMM_85': 123,
        'SODIMM_86': 90,
        'SODIMM_88': 89,
        'SODIMM_89': 3,
        'SODIMM_90': 92,
        'SODIMM_92': 91,
        'SODIMM_93': 134,
        'SODIMM_94': 116,
        'SODIMM_95': 131,
        'SODIMM_96': 114,
        'SODIMM_97': 120,
        'SODIMM_98': 122,
        'SODIMM_99': 14,
        'SODIMM_100': 26,
        'SODIMM_101': 117,
        'SODIMM_102': 15,
        'SODIMM_103': 118,
        'SODIMM_104': 39,
        'SODIMM_105': 138,
        'SODIMM_106': 10,
        'SODIMM_107': 132,
        'SODIMM_127': 139,
        'SODIMM_129': 2,
        'SODIMM_131': 133,
        'SODIMM_133': 110,
        'SODIMM_135': 24,
        'SODIMM_137': 130,
        'SODIMM_138': 136,
        'SODIMM_178': 34,
        'SODIMM_186': 27,
        'SODIMM_188': 35,
        'SODIMM_190': 48,
        'SODIMM_192': 50,
        'SODIMM_194': 29,
        'SODIMM_196': 28
    }
};

function Gpio() {
    var currentPins;
    var exportedInputPins = {};
    var exportedOutputPins = {};
    var getPinForCurrentMode = getPinTdx;
    var pollers = {};

    this.DIR_IN   = 'in';
    this.DIR_OUT  = 'out';
    this.DIR_LOW  = 'low';
    this.DIR_HIGH = 'high';

    this.EDGE_NONE    = 'none';
    this.EDGE_RISING  = 'rising';
    this.EDGE_FALLING = 'falling';
    this.EDGE_BOTH    = 'both';

    getPinForCurrentMode = getPinTdx;

    /**
     * Setup a channel for use as an input or output
     *
     * @param {number}   channel   Reference to the pin in the current mode's schema
     * @param {string}   direction The pin direction, either 'in' or 'out'
     * @param edge       edge Informs the GPIO chip if it needs to generate interrupts. Either 'none', 'rising', 'falling' or 'both'. Defaults to 'none'
     * @param {function} onSetup   Optional callback
     */
    this.setup = function(channel, direction, edge, onSetup /*err*/) {
        if (arguments.length === 2 && typeof direction == 'function') {
            onSetup = direction;
            direction = this.DIR_OUT;
            edge = this.EDGE_NONE;
        } else if (arguments.length === 3 && typeof edge == 'function') {
            onSetup = edge;
            edge = this.EDGE_NONE;
        }
     
        direction = direction || this.DIR_OUT;
        edge = edge || this.EDGE_NONE;
        onSetup = onSetup || function() {};

        if (direction !== this.DIR_IN && direction !== this.DIR_OUT && direction !== this.DIR_LOW && direction !== this.DIR_HIGH) {
            return process.nextTick(function() {
                onSetup(new Error('Cannot set invalid direction'));
            });
        }

        if ([
            this.EDGE_NONE,
            this.EDGE_RISING,
            this.EDGE_FALLING,
            this.EDGE_BOTH
        ].indexOf(edge) == -1) {
            return process.nextTick(function() {
                onSetup(new Error('Cannot set invalid edge'));
            });
        }

        var pinForSetup;
        async.waterfall([
            setTdxModule,
            function(next) {
                pinForSetup = getPinForCurrentMode(channel);
                if (!pinForSetup) {
                    return next(new Error('Channel ' + channel + ' does not map to a GPIO pin'));
                }
                debug('set up pin %d', pinForSetup);
                isExported(pinForSetup, next);
            },
            function(isExported, next) {
                if (isExported) {
                    return unexportPin(pinForSetup, next);
                }
                return next(null);
            },
            function(next) {
                exportPin(pinForSetup, next);
            },
            function(next) {
              async.retry({times: 100, interval: 10},
                function(cb){
                  setEdge(pinForSetup, edge, cb);
                },
                function(err){
                  // wrapped here because waterfall can't handle positive result
                  next(err);
                });
            },
            function(next) {
                if (direction === this.DIR_IN) {
                    exportedInputPins[pinForSetup] = true;
                } else {
                    exportedOutputPins[pinForSetup] = true;
                }

                async.retry({times: 100, interval: 10},
                  function(cb) {
                    setDirection(pinForSetup, direction, cb);
                  },
                  function(err) {
                    // wrapped here because waterfall can't handle positive result
                    next(err);
                  });
            }.bind(this),
            function(next) {
                listen(channel, function(readChannel) {
                    this.read(readChannel, function(err, value) {
                        if (err) {
                            debug(
                                'Error reading channel value after change, %d',
                                readChannel
                            );
                            return
                        }
                        debug('emitting change on channel %s with value %s', readChannel, value);
                        this.emit('change', readChannel, value);
                    }.bind(this));
                }.bind(this));
                next()
            }.bind(this)
        ], onSetup);
    };

    /**
     * Write a value to a channel
     *
     * @param {number}   channel The channel to write to
     * @param {boolean}  value   If true, turns the channel on, else turns off
     * @param {function} cb      Optional callback
     */
    this.write = this.output = function(channel, value, cb /*err*/) {
        var pin = getPinForCurrentMode(channel);
        cb = cb || function() {}

        if (!exportedOutputPins[pin]) {
            return process.nextTick(function() {
                cb(new Error('Pin has not been exported for write'));
            });
        }

        value = (!!value && value !== '0') ? '1' : '0';

        debug('writing pin %d with value %s', pin, value);
        fs.writeFile(PATH + '/gpio' + pin + '/value', value, cb);
    };

    /**
     * Read a value from a channel
     *
     * @param {number}   channel The channel to read from
     * @param {function} cb      Callback which receives the channel's boolean value
     */
    this.read = this.input = function(channel, cb /*err,value*/) {
        if (typeof cb !== 'function') {
            throw new Error('A callback must be provided')
        }

        var pin = getPinForCurrentMode(channel);

        if (!exportedInputPins[pin] && !exportedOutputPins[pin]) {
            return process.nextTick(function() {
                cb(new Error('Pin has not been exported'));
            });
        }

        fs.readFile(PATH + '/gpio' + pin + '/value', 'utf-8', function(err, data) {
            if (err) {
                return cb(err)
            }
            data = (data + '').trim() || '0';
            debug('read pin %s with value %s', pin, data);
            return cb(null, data === '1');
        });
    };

    /**
     * Unexport any pins setup by this module
     *
     * @param {function} cb Optional callback
     */
    this.destroy = function(cb) {
        var tasks = Object.keys(exportedOutputPins)
            .concat(Object.keys(exportedInputPins))
            .map(function(pin) {
                return function(done) {
                    removeListener(pin, pollers)
                    unexportPin(pin, done);
                }
            });

        async.parallel(tasks, cb);
    };

    /**
     * Reset the state of the module
     */
    this.reset = function() {
        exportedOutputPins = {};
        exportedInputPins = {};
        this.removeAllListeners();

        currentPins = undefined;
        getPinForCurrentMode = getPinTdx;
        pollers = {}
    };

    // Init
    EventEmitter.call(this);
    this.reset();


    // Private functions requring access to state
    function setTdxModule(cb) {
        if (currentPins) {
            return cb(null);
        }
        
        fs.readFile('/proc/sys/kernel/hostname', 'utf8', function(err,data){
            if (err) return cb(err);

            // JavaScript doesn't like the dashes, replace with underscores to match the object keys defined in PINS
            var moduleName = data.replace(/-/g, '_');

            // hostname output comes with a linebreak at the end. Remove it
            moduleName = moduleName.replace(/(\r\n|\n|\r)/gm, '');            
            

            currentPins = PINS[moduleName];

            return cb(null);
        });
    };

    function getPinTdx(sodimmNumber) {
        return currentPins[sodimmNumber] + '';
    };


    /**
     * Listen for interrupts on a channel
     *
     * @param {number}      channel The channel to watch
     * @param {function}    cb Callback which receives the channel's err
     */
    function listen(channel, onChange) {
        var pin = getPinForCurrentMode(channel);

        if (!exportedInputPins[pin] && !exportedOutputPins[pin]) {
            throw new Error('Channel %d has not been exported', channel);
        }

        debug('listen for pin %d', pin);
        var poller = new Epoll(function(err, innerfd, events) {
            if (err) throw err
            clearInterrupt(innerfd);
            onChange(channel);
        });

        var fd = fs.openSync(PATH + '/gpio' + pin + '/value', 'r+');
        clearInterrupt(fd);
        poller.add(fd, Epoll.EPOLLPRI);
        // Append ready-to-use remove function
        pollers[pin] = function() {
            poller.remove(fd).close();
        }
    };
}
util.inherits(Gpio, EventEmitter);

function setEdge(pin, edge, cb) {
    debug('set edge %s on pin %d', edge.toUpperCase(), pin);
    fs.writeFile(PATH + '/gpio' + pin + '/edge', edge, function(err) {
        if (cb) return cb(err);
    });
}

function setDirection(pin, direction, cb) {
    debug('set direction %s on pin %d', direction.toUpperCase(), pin);
    fs.writeFile(PATH + '/gpio' + pin + '/direction', direction, function(err) {
        if (cb) return cb(err);
    });
}

function exportPin(pin, cb) {
    debug('export pin %d', pin);
    fs.writeFile(PATH + '/export', pin, function(err) {
        if (cb) return cb(err);
    });
}

function unexportPin(pin, cb) {
    debug('unexport pin %d', pin);
    fs.writeFile(PATH + '/unexport', pin, function(err) {
        if (cb) return cb(err);
    });
}

function isExported(pin, cb) {
    fs.exists(PATH + '/gpio' + pin, function(exists) {
        return cb(null, exists);
    });
}

function removeListener(pin, pollers) {
    if (!pollers[pin]) {
        return
    }
    debug('remove listener for pin %d', pin)
    pollers[pin]()
    delete pollers[pin]
}

function clearInterrupt(fd) {
    fs.readSync(fd, new Buffer(1), 0, 1, 0);
}

var GPIO = new Gpio();

// Promise
GPIO.promise = {

    /**
     * @see {@link Gpio.setup}
     * @param channel
     * @param direction
     * @param edge
     * @returns {Promise}
     */
    setup: function (channel, direction, edge) {
        return new Promise(function (resolve, reject) {
            function done(error) {
                if (error) return reject(error);
                resolve();
            }

            GPIO.setup(channel, direction, edge, done)
        })
    },

    /**
     * @see {@link Gpio.write}
     * @param channel
     * @param value
     * @returns {Promise}
     */
    write: function (channel, value) {
        return new Promise(function (resolve, reject) {
            function done(error) {
                if (error) return reject(error);
                resolve();
            }

            GPIO.write(channel, value, done)
        })
    },

    /**
     * @see {@link Gpio.read}
     * @param channel
     * @returns {Promise}
     */
    read: function (channel) {
        return new Promise(function (resolve, reject) {
            function done(error, result) {
                if (error) return reject(error);
                resolve(result);
            }

            GPIO.read(channel, done)
        })
    },

    /**
     * @see {@link Gpio.destroy}
     * @returns {Promise}
     */
    destroy: function () {
        return new Promise(function (resolve, reject) {
            function done(error) {
                if (error) return reject(error);
                resolve();
            }

            GPIO.destroy(done)
        })
    }
};

module.exports = GPIO;
