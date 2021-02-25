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

const checkForConflicts = (
  name: string,
  namespace: string,
  suppliedOptions: Set<string>,
  conflicts?: string[]
) => {
  if (!conflicts) return;
  for (const conflict of conflicts) {
    if (suppliedOptions.has(conflict)) {
      throw new Error(
        `Values for both "${namespace}.${name}" and ` +
          `"${namespace}.${conflict}" cannot ` +
          `be specified; they are mutually exclusive.`
      );
    }
  }
};

function fill(defaults: any, options: any, target: any, namespace: any) {
  const def = defaults[namespace];
  const config = (target[namespace] = target[namespace] || {});

  const suppliedOptions = new Set<string>();
  const keys = Object.keys(def);
  if (hasOwn(options, namespace)) {
    const namespaceOptions = options[namespace];

    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const propDefinition = def[key];
      let value = namespaceOptions[key];
      if (value !== undefined) {
        checkForConflicts(
          key,
          namespace,
          suppliedOptions,
          propDefinition.conflicts
        );
        const normalized = propDefinition.normalize(namespaceOptions[key]);
        config[key] = normalized;
        suppliedOptions.add(key);
      } else {
        const legacyName = propDefinition.legacyName || key;
        value = options[legacyName];
        if (value !== undefined) {
          checkForConflicts(
            key,
            namespace,
            suppliedOptions,
            propDefinition.conflicts
          );
          const normalized = propDefinition.normalize(value);
          config[key] = normalized;
          suppliedOptions.add(key);
        } else if (hasOwn(propDefinition, "default")) {
          config[key] = propDefinition.default(config);
        }
      }
    }
  } else {
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const propDefinition = def[key];

      const legacyName = propDefinition.legacyName || key;
      const value = options[legacyName];
      if (value !== undefined) {
        checkForConflicts(
          key,
          namespace,
          suppliedOptions,
          propDefinition.conflicts
        );
        const normalized = propDefinition.normalize(value);
        config[key] = normalized;
        suppliedOptions.add(key);
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
