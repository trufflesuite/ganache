import Options, {getDefault as getDefaultOptions} from "./options";

const bip39 = require("bip39");
const seedrandom = require("seedrandom");


function randomBytes(length: any, rng: any): any {
  var buf = Array(length);

  for (var i = 0; i < length; i++) {
    buf[i] = rng() * 255;
  }

  return Buffer.from(buf);
}

function randomAlphaNumericString (length:any, rng:any) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let text = "";

  for (var i = 0; i < length; i++) {
    text += alphabet.charAt(Math.floor((rng || Math.random)() * alphabet.length));
  }

  return text;
}

export default interface ProviderOptions extends Options {
  /**
   * Array of strings to installed subproviders
   */
  subProviders?: any[]
}

export const getDefault : (options: ProviderOptions) => ProviderOptions = (options) => {
  const _options = Object.assign(
    {
      subProviders: []
    },
    getDefaultOptions(options)
  );

      // do this so that we can use the same seed on our next run and get the same
    // results without explicitly setting a seed up front
    if (!_options.seed) {
      _options.seed = randomAlphaNumericString(10, seedrandom());
    }

    // generate a randomized default mnemonic
    if (!_options.mnemonic) {
      let _randomBytes = randomBytes(16, seedrandom(_options.seed));
      _options.mnemonic = bip39.entropyToMnemonic(_randomBytes.toString("hex"));
    }
  return _options;
}
