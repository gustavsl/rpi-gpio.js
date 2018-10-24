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
    },
    apalis_imx6: {
        'MXM3_1' : 36,
        'MXM3_2' : 9,
        'MXM3_3' : 37,
        'MXM3_4' : 1,
        'MXM3_5' : 38,
        'MXM3_6' : 41,
        'MXM3_7' : 39,
        'MXM3_8' : 42,
        'MXM3_11' : 170,
        'MXM3_12' : 8,
        'MXM3_13' : 169,
        'MXM3_14' : 7,
        'MXM3_15' : 2,
        'MXM3_16' : 111,
        'MXM3_17' : 6,
        'MXM3_18' : 110,
        'MXM3_35' : 79,
        'MXM3_37' : 4,
        'MXM3_72' : 24,
        'MXM3_77' : 148,
        'MXM3_79' : 171,
        'MXM3_83' : 167,
        'MXM3_84' : 0,
        'MXM3_85' : 202,
        'MXM3_89' : 176,
        'MXM3_91' : 168,
        'MXM3_95' : 40,
        'MXM3_96' : 3,
        'MXM3_99' : 201,
        'MXM3_110' : 88,
        'MXM3_112' : 157,
        'MXM3_114' : 84,
        'MXM3_116' : 83,
        'MXM3_118' : 156,
        'MXM3_120' : 89,
        'MXM3_122' : 63,
        'MXM3_123' : 43,
        'MXM3_124' : 87,
        'MXM3_126' : 44,
        'MXM3_128' : 45,
        'MXM3_130' : 46,
        'MXM3_132' : 47,
        'MXM3_134' : 103,
        'MXM3_135' : 93,
        'MXM3_136' : 102,
        'MXM3_138' : 105,
        'MXM3_140' : 104,
        'MXM3_144' : 19,
        'MXM3_146' : 21,
        'MXM3_148' : 32,
        'MXM3_150' : 18,
        'MXM3_152' : 33,
        'MXM3_154' : 20,
        'MXM3_156' : 34,
        'MXM3_158' : 35,
        'MXM3_159' : 128,
        'MXM3_160' : 16,
        'MXM3_162' : 17,
        'MXM3_164' : 116,
        'MXM3_173' : 165,
        'MXM3_175' : 164,
        'MXM3_176' : 13,
        'MXM3_177' : 163,
        'MXM3_178' : 12,
        'MXM3_179' : 162,
        'MXM3_180' : 11,
        'MXM3_181' : 161,
        'MXM3_183' : 160,
        'MXM3_184' : 10,
        'MXM3_185' : 159,
        'MXM3_186' : 15,
        'MXM3_187' : 158,
        'MXM3_188' : 14,
        'MXM3_190' : 174,
        'MXM3_191' : 146,
        'MXM3_193' : 175,
        'MXM3_194' : 101,
        'MXM3_195' : 149,
        'MXM3_196' : 139,
        'MXM3_197' : 147,
        'MXM3_198' : 59,
        'MXM3_200' : 138,
        'MXM3_201' : 82,
        'MXM3_202' : 141,
        'MXM3_203' : 81,
        'MXM3_204' : 140,
        'MXM3_205' : 80,
        'MXM3_207' : 62,
        'MXM3_209' : 154,
        'MXM3_211' : 155,
        'MXM3_214' : 114,
        'MXM3_215' : 204,
        'MXM3_216' : 115,
        'MXM3_217' : 203,
        'MXM3_220' : 107,
        'MXM3_221' : 150,
        'MXM3_223' : 152,
        'MXM3_225' : 151,
        'MXM3_227' : 153,
        'MXM3_229' : 57,
        'MXM3_231' : 56,
        'MXM3_233' : 58,
        'MXM3_235' : 55,
        'MXM3_239' : 78,
        'MXM3_243' : 54,
        'MXM3_245' : 76,
        'MXM3_247' : 75,
        'MXM3_249' : 74,
        'MXM3_251' : 49,
        'MXM3_253' : 48,
        'MXM3_255' : 166,
        'MXM3_257' : 132,
        'MXM3_259' : 95,
        'MXM3_261' : 94,
        'MXM3_262' : 85,
        'MXM3_263' : 90,
        'MXM3_265' : 91,
        'MXM3_269' : 65,
        'MXM3_271' : 64,
        'MXM3_273' : 61,
        'MXM3_274' : 86,
        'MXM3_275' : 60,
        'MXM3_277' : 53,
        'MXM3_279' : 52,
        'MXM3_281' : 51,
        'MXM3_283' : 50,
        'MXM3_286' : 77,
        'MXM3_287' : 73,
        'MXM3_289' : 72,
        'MXM3_291' : 71,
        'MXM3_293' : 70,
        'MXM3_295' : 69,
        'MXM3_297' : 68,
        'MXM3_299' : 67,
        'MXM3_301' : 66
    },
    apalis_t30: {
        'MXM3_1' : 146,
        'MXM3_2' : 166,
        'MXM3_3' : 147,
        'MXM3_4' : 165,
        'MXM3_5' : 148,
        'MXM3_6' : 164,
        'MXM3_7' : 149,
        'MXM3_8' : 163,
        'MXM3_11' : 150,
        'MXM3_13' : 128,
        'MXM3_15' : 151,
        'MXM3_17' : 129,
        'MXM3_26' : 68,
        'MXM3_35' : 232,
        'MXM3_37' : 169,
        'MXM3_63' : 65,
        'MXM3_84' : 233,
        'MXM3_87' : 135,
        'MXM3_96' : 234,
        'MXM3_99' : 133,
        'MXM3_110' : 112,
        'MXM3_112' : 113,
        'MXM3_114' : 116,
        'MXM3_116' : 115,
        'MXM3_118' : 114,
        'MXM3_120' : 119,
        'MXM3_122' : 117,
        'MXM3_123' : 134,
        'MXM3_124' : 118,
        'MXM3_126' : 192,
        'MXM3_128' : 195,
        'MXM3_130' : 194,
        'MXM3_132' : 193,
        'MXM3_134' : 18,
        'MXM3_135' : 144,
        'MXM3_136' : 19,
        'MXM3_138' : 182,
        'MXM3_140' : 183,
        'MXM3_144' : 13,
        'MXM3_146' : 12,
        'MXM3_148' : 25,
        'MXM3_150' : 7,
        'MXM3_152' : 24,
        'MXM3_154' : 6,
        'MXM3_156' : 27,
        'MXM3_158' : 28,
        'MXM3_159' : 145,
        'MXM3_160' : 15,
        'MXM3_162' : 14,
        'MXM3_164' : 171,
        'MXM3_173' : 143,
        'MXM3_175' : 142,
        'MXM3_176' : 197,
        'MXM3_177' : 141,
        'MXM3_178' : 196,
        'MXM3_179' : 140,
        'MXM3_180' : 201,
        'MXM3_181' : 139,
        'MXM3_183' : 138,
        'MXM3_184' : 200,
        'MXM3_185' : 137,
        'MXM3_186' : 199,
        'MXM3_187' : 136,
        'MXM3_188' : 198,
        'MXM3_190' : 229,
        'MXM3_191' : 130,
        'MXM3_193' : 224,
        'MXM3_194' : 181,
        'MXM3_195' : 131,
        'MXM3_196' : 106,
        'MXM3_197' : 132,
        'MXM3_198' : 242,
        'MXM3_200' : 107,
        'MXM3_201' : 218,
        'MXM3_202' : 105,
        'MXM3_203' : 217,
        'MXM3_204' : 104,
        'MXM3_205' : 173,
        'MXM3_207' : 172,
        'MXM3_209' : 21,
        'MXM3_211' : 20,
        'MXM3_214' : 174,
        'MXM3_215' : 85,
        'MXM3_216' : 175,
        'MXM3_217' : 86,
        'MXM3_220' : 243,
        'MXM3_221' : 189,
        'MXM3_223' : 191,
        'MXM3_225' : 188,
        'MXM3_227' : 190,
        'MXM3_229' : 202,
        'MXM3_231' : 109,
        'MXM3_232' : 111,
        'MXM3_233' : 108,
        'MXM3_235' : 204,
        'MXM3_239' : 16,
        'MXM3_243' : 11,
        'MXM3_245' : 76,
        'MXM3_247' : 75,
        'MXM3_249' : 73,
        'MXM3_251' : 102,
        'MXM3_253' : 103,
        'MXM3_255' : 44,
        'MXM3_257' : 45,
        'MXM3_259' : 46,
        'MXM3_261' : 47,
        'MXM3_262' : 158,
        'MXM3_263' : 96,
        'MXM3_265' : 97,
        'MXM3_269' : 100,
        'MXM3_271' : 101,
        'MXM3_273' : 38,
        'MXM3_274' : 157,
        'MXM3_275' : 39,
        'MXM3_277' : 40,
        'MXM3_279' : 41,
        'MXM3_281' : 42,
        'MXM3_283' : 43,
        'MXM3_286' : 170,
        'MXM3_287' : 98,
        'MXM3_289' : 99,
        'MXM3_291' : 32,
        'MXM3_293' : 33,
        'MXM3_295' : 34,
        'MXM3_297' : 35,
        'MXM3_299' : 36,
        'MXM3_301' : 37
    },
    apalis_tk1: {
        'MXM3_1' : 250,
    'MXM3_3' : 248,
    'MXM3_5' : 108,
    'MXM3_7' : 109,
    'MXM3_11' : 237,
    'MXM3_13' : 238,
    'MXM3_15' : 233,
    'MXM3_17' : 234,
    'MXM3_37' : 235,
    'MXM3_144' : 197,
    'MXM3_146' : 196,
    'MXM3_148' : 229,
    'MXM3_150' : 201,
    'MXM3_152' : 181,
    'MXM3_154' : 200,
    'MXM3_156' : 245,
    'MXM3_158' : 249,
    'MXM3_160' : 199,
    'MXM3_162' : 198,
    'MXM3_164' : 171,
    'MXM3_176' : 13,
    'MXM3_178' : 12,
    'MXM3_180' : 7,
    'MXM3_184' : 6,
    'MXM3_186' : 15,
    'MXM3_188' : 14,
    'MXM3_200' : 3,
    'MXM3_201' : 218,
    'MXM3_203' : 217,
    'MXM3_204' : 2,
    'MXM3_209' : 21,
    'MXM3_211' : 20,
    'MXM3_215' : 85,
    'MXM3_217' : 86,
    'MXM3_220' : 243,
    'MXM3_232' : 111
    },
    colibri_imx6 {
        'SODIMM_19' : 201,
        'SODIMM_21' : 202,
        'SODIMM_22' : 23,
        'SODIMM_23' : 88,
        'SODIMM_24' : 116,
        'SODIMM_25' : 83,
        'SODIMM_27' : 84,
        'SODIMM_28' : 9,
        'SODIMM_29' : 89,
        'SODIMM_30' : 42,
        'SODIMM_31' : 87,
        'SODIMM_32' : 46,
        'SODIMM_33' : 156,
        'SODIMM_34' : 45,
        'SODIMM_35' : 157,
        'SODIMM_36' : 47,
        'SODIMM_37' : 39,
        'SODIMM_38' : 44,
        'SODIMM_43' : 37,
        'SODIMM_44' : 113,
        'SODIMM_45' : 54,
        'SODIMM_46' : 124,
        'SODIMM_47' : 20,
        'SODIMM_48' : 126,
        'SODIMM_49' : 17,
        'SODIMM_50' : 133,
        'SODIMM_51' : 19,
        'SODIMM_52' : 134,
        'SODIMM_53' : 21,
        'SODIMM_54' : 135,
        'SODIMM_55' : 7,
        'SODIMM_56' : 112,
        'SODIMM_57' : 138,
        'SODIMM_58' : 120,
        'SODIMM_59' : 41,
        'SODIMM_60' : 119,
        'SODIMM_61' : 139,
        'SODIMM_62' : 125,
        'SODIMM_63' : 8,
        'SODIMM_64' : 137,
        'SODIMM_65' : 132,
        'SODIMM_66' : 136,
        'SODIMM_67' : 1,
        'SODIMM_68' : 114,
        'SODIMM_69' : 11,
        'SODIMM_70' : 118,
        'SODIMM_71' : 90,
        'SODIMM_72' : 122,
        'SODIMM_73' : 91,
        'SODIMM_74' : 127,
        'SODIMM_75' : 175,
        'SODIMM_76' : 117,
        'SODIMM_77' : 82,
        'SODIMM_78' : 121,
        'SODIMM_79' : 51,
        'SODIMM_80' : 123,
        'SODIMM_81' : 93,
        'SODIMM_82' : 115,
        'SODIMM_85' : 166,
        'SODIMM_86' : 130,
        'SODIMM_88' : 85,
        'SODIMM_89' : 58,
        'SODIMM_90' : 86,
        'SODIMM_91' : 57,
        'SODIMM_92' : 92,
        'SODIMM_93' : 10,
        'SODIMM_94' : 63,
        'SODIMM_95' : 128,
        'SODIMM_96' : 81,
        'SODIMM_97' : 50,
        'SODIMM_98' : 15,
        'SODIMM_99' : 12,
        'SODIMM_100' : 43,
        'SODIMM_101' : 53,
        'SODIMM_102' : 36,
        'SODIMM_103' : 52,
        'SODIMM_104' : 40,
        'SODIMM_105' : 55,
        'SODIMM_106' : 14,
        'SODIMM_107' : 56,
        'SODIMM_110' : 72,
        'SODIMM_111' : 64,
        'SODIMM_112' : 73,
        'SODIMM_113' : 65,
        'SODIMM_114' : 74,
        'SODIMM_115' : 66,
        'SODIMM_116' : 75,
        'SODIMM_117' : 67,
        'SODIMM_118' : 76,
        'SODIMM_119' : 68,
        'SODIMM_120' : 77,
        'SODIMM_121' : 69,
        'SODIMM_122' : 78,
        'SODIMM_123' : 70,
        'SODIMM_124' : 79,
        'SODIMM_125' : 71,
        'SODIMM_126' : 60,
        'SODIMM_127' : 38,
        'SODIMM_128' : 61,
        'SODIMM_129' : 95,
        'SODIMM_130' : 13,
        'SODIMM_131' : 94,
        'SODIMM_132' : 32,
        'SODIMM_133' : 35,
        'SODIMM_134' : 33,
        'SODIMM_135' : 34,
        'SODIMM_136' : 140,
        'SODIMM_137' : 204,
        'SODIMM_138' : 141,
        'SODIMM_140' : 142,
        'SODIMM_142' : 143,
        'SODIMM_144' : 144,
        'SODIMM_146' : 145,
        'SODIMM_149' : 148,
        'SODIMM_150' : 59,
        'SODIMM_151' : 149,
        'SODIMM_152' : 191,
        'SODIMM_153' : 150,
        'SODIMM_154' : 176,
        'SODIMM_155' : 151,
        'SODIMM_156' : 174,
        'SODIMM_157' : 152,
        'SODIMM_158' : 170,
        'SODIMM_159' : 153,
        'SODIMM_160' : 168,
        'SODIMM_161' : 154,
        'SODIMM_162' : 169,
        'SODIMM_163' : 155,
        'SODIMM_164' : 171,
        'SODIMM_165' : 158,
        'SODIMM_166' : 167,
        'SODIMM_167' : 159,
        'SODIMM_168' : 101,
        'SODIMM_169' : 160,
        'SODIMM_170' : 147,
        'SODIMM_171' : 161,
        'SODIMM_172' : 146,
        'SODIMM_173' : 162,
        'SODIMM_174' : 4,
        'SODIMM_175' : 163,
        'SODIMM_176' : 5,
        'SODIMM_177' : 164,
        'SODIMM_178' : 110,
        'SODIMM_179' : 165,
        'SODIMM_180' : 2,
        'SODIMM_184' : 106,
        'SODIMM_186' : 107,
        'SODIMM_188' : 111,
        'SODIMM_190' : 18,
        'SODIMM_192' : 16,
        'SODIMM_194' : 6,
        'SODIMM_196' : 3,
        'SODIMM_15' : 108,
        'SODIMM_16' : 109

    },
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
