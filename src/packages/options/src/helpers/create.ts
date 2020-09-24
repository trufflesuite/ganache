import { Definitions, ExternalConfig, InternalConfig } from "./definition";
import { Base } from "./base";
import { UnionToTuple } from "./exclusive";

import { utils } from "@ganache/utils";

const hasOwn = utils.hasOwn;

export type Options = {[key: string] : Base.Config};

export type ProviderOptions<O extends Options> = Partial<{
  [K in keyof O]: ExternalConfig<O[K]>;
}>

export type InternalOptions<O extends Options> = {
  [K in keyof O]: InternalConfig<O[K]>;
}

export type Defaults<O extends Options> = {
  [K in keyof O]: Definitions<O[K]>;
}

function fill(defaults: any, options: any, target: any, namespace: any) {
  const def = defaults[namespace];
  const config = target[namespace] = target[namespace] || {};

  if (hasOwn(options, namespace)) {
    const userOpts = options[namespace];

    const keys = Object.keys(def);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const defProp = def[key];
      if (hasOwn(userOpts, key)) {
        config[key] = defProp.normalize(userOpts[key]);
      } else {
        const legacyName = defProp.legacyName || key;
        if (hasOwn(options, legacyName)) {
          config[key] = defProp.normalize(options[legacyName]);
        } else if (hasOwn(defProp, "default")) {
          config[key] = defProp.default(config);
        }
      }
    }
  } else {
    const keys = Object.keys(def);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const defProp = def[key];

      const legacyName = defProp.legacyName || key;
      if (hasOwn(options, legacyName)) {
        config[key] = defProp.normalize(options[legacyName]);
      } else if (hasOwn(defProp, "default")) {
        config[key] = defProp.default(config);
      }
    }
  }
}

export class OptionsConfig<O extends Options> {
  #defaults: Defaults<O>
  #namespaces: UnionToTuple<keyof Defaults<O>>;

  constructor(defaults: Defaults<O>) {
    this.#defaults = defaults;
    this.#namespaces = Object.keys(defaults) as UnionToTuple<keyof Defaults<O>>;
  }

  normalize(options: ProviderOptions<O>) {
    const defaults = this.#defaults;

    const out = {} as InternalOptions<O>;
    this.#namespaces.forEach(namespace => {
      fill(defaults, options, out, namespace as keyof Defaults<O>);
    });
    return out;
  }
}
