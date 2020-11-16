import { Definitions, ExternalConfig, InternalConfig } from "./definition";
import { Base } from "./base";
import { UnionToTuple } from "./exclusive";

import { utils } from "@ganache/utils";

const hasOwn = utils.hasOwn;

type Options = { [key: string]: Base.Config };

export type ProviderOptions<O extends Options> = Partial<
  {
    [K in keyof O]: ExternalConfig<O[K]>;
  }
>;

export type InternalOptions<O extends Options> = {
  [K in keyof O]: InternalConfig<O[K]>;
};

export type Defaults<O extends Options> = {
  [K in keyof O]: Definitions<O[K]>;
};

function fill(defaults: any, options: any, target: any, namespace: any) {
  const def = defaults[namespace];
  const config = (target[namespace] = target[namespace] || {});

  if (hasOwn(options, namespace)) {
    const namespaceOptions = options[namespace];

    const keys = Object.keys(def);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const propDefinition = def[key];
      let value = namespaceOptions[key];
      if (value !== undefined) {
        config[key] = propDefinition.normalize(namespaceOptions[key]);
      } else {
        const legacyName = propDefinition.legacyName || key;
        value = options[legacyName];
        if (value !== undefined) {
          config[key] = propDefinition.normalize(value);
        } else if (hasOwn(propDefinition, "default")) {
          config[key] = propDefinition.default(config);
        }
      }
    }
  } else {
    const keys = Object.keys(def);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const propDefinition = def[key];

      const legacyName = propDefinition.legacyName || key;
      const value = options[legacyName];
      if (value !== undefined) {
        config[key] = propDefinition.normalize(value);
      } else if (hasOwn(propDefinition, "default")) {
        config[key] = propDefinition.default(config);
      }
    }
  }
}

export class OptionsConfig<O extends Options> {
  #defaults: Defaults<O>;
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
