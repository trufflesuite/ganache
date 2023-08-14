import { Definitions, ExternalConfig, InternalConfig } from "./definition";
import { Base } from "./base";
import { UnionToTuple } from "./exclusive";

import { hasOwn } from "@ganache/utils";

export type NamespacedOptions = { [key: string]: Base.Config };

export type ProviderOptions<O extends NamespacedOptions> = Partial<{
  [K in keyof O]: ExternalConfig<O[K]>;
}>;

export type InternalOptions<O extends NamespacedOptions> = {
  [K in keyof O]: InternalConfig<O[K]>;
};

export type Defaults<O extends NamespacedOptions> = {
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

function fill(options: any, target: any, def: any, namespace: any) {
  const config = (target[namespace] = target[namespace] || {});

  const suppliedOptions = new Set<string>();
  const entries = Object.entries(def) as [string, any][];
  if (hasOwn(options, namespace)) {
    const namespaceOptions = options[namespace];

    for (const [key, propDefinition] of entries) {
      let value = namespaceOptions[key];
      if (value !== undefined) {
        const normalized = propDefinition.normalize(value, config);
        if (normalized !== undefined) {
          checkForConflicts(
            key,
            namespace,
            suppliedOptions,
            propDefinition.conflicts
          );
          config[key] = normalized;
          suppliedOptions.add(key);
        }
      } else {
        const legacyName = propDefinition.legacyName || key;
        value = options[legacyName];
        if (value !== undefined) {
          const normalized = propDefinition.normalize(value, config);
          if (normalized !== undefined) {
            checkForConflicts(
              key,
              namespace,
              suppliedOptions,
              propDefinition.conflicts
            );
            config[key] = normalized;
            suppliedOptions.add(key);
          }
        } else if (hasOwn(propDefinition, "default")) {
          config[key] = propDefinition.default(config);
        }
      }
    }
  } else {
    for (const [key, propDefinition] of entries) {
      const legacyName = propDefinition.legacyName || key;
      const value = options[legacyName];
      if (value !== undefined) {
        const normalized = propDefinition.normalize(value, config);
        if (normalized !== undefined) {
          checkForConflicts(
            key,
            namespace,
            suppliedOptions,
            propDefinition.conflicts
          );
          config[key] = normalized;
          suppliedOptions.add(key);
        }
      } else if (hasOwn(propDefinition, "default")) {
        config[key] = propDefinition.default(config);
      }
    }
  }
}

export class OptionsConfig<O extends NamespacedOptions> {
  public readonly defaults: Defaults<O>;

  constructor(defaults: Defaults<O>) {
    this.defaults = defaults;
  }

  normalize(options: ProviderOptions<O>) {
    const out = {} as InternalOptions<O>;
    Object.entries(this.defaults).forEach(([namespace, definition]) => {
      fill(options, out, definition, namespace as keyof Defaults<O>);
    });
    return out;
  }
}
