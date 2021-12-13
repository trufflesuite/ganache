declare const indexedDB: any;

import { resolve, isAbsolute, basename, join, relative } from "path";
import { randomBytes, pseudoRandomBytes } from "crypto";

export interface TmpNameOptions {
  dir?: string;
  name?: string;
  postfix?: string;
  prefix?: string;
  template?: string;
  tmpdir?: string;
  tries?: number;
}

export interface DirOptions extends TmpNameOptions {
  keep?: boolean;
  mode?: number;
  unsafeCleanup?: boolean;
}

const // the random characters to choose from
  RANDOM_CHARS =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  TEMPLATE_PATTERN = /XXXXXX/,
  DEFAULT_TRIES = 3,
  _removeObjects = [];

let _gracefulCleanup = false;

/**
 * The garbage collector.
 *
 * @private
 */
async function _garbageCollector() {
  /* istanbul ignore else */
  if (!_gracefulCleanup) return;

  // the function being called removes itself from _removeObjects,
  // loop until _removeObjects is empty
  while (_removeObjects.length) {
    try {
      _removeObjects[0]();
    } catch {
      // already removed?
    }
  }
}

/**
 * Random name generator based on crypto.
 * Adapted from http://blog.tompawlak.org/how-to-generate-random-values-nodejs-javascript
 *
 * @param {number} - howMany
 * @returns {string} the generated random name
 * @private
 */
function _randomChars(howMany: number) {
  let value = [],
    rnd = null;

  // make sure that we do not fail because we ran out of entropy
  try {
    rnd = randomBytes(howMany);
  } catch {
    rnd = pseudoRandomBytes(howMany);
  }

  for (var i = 0; i < howMany; i++) {
    value.push(RANDOM_CHARS[rnd[i] % RANDOM_CHARS.length]);
  }

  return value.join("");
}

/**
 * Helper which determines whether a string s is blank, that is undefined, or empty or null.
 *
 * @private
 * @param {string} - s
 * @returns {Boolean} true whether the string s is blank, false otherwise
 */
function _isBlank(s: string) {
  return s === null || _isUndefined(s) || !s.trim();
}

/**
 * Checks whether the `obj` parameter is defined or not.
 *
 * @param {Object} - obj
 * @returns {boolean} true if the object is undefined
 * @private
 */
function _isUndefined(obj: Object) {
  return typeof obj === "undefined";
}

/**
 * Generates a new temporary name.
 *
 * @param {Object} - opts
 * @returns {string} the new random name according to opts
 * @private
 */
function _generateTmpName(options: TmpNameOptions) {
  const tmpDir = options.tmpdir;

  /* istanbul ignore else */
  if (!_isUndefined(options.name))
    return join(tmpDir, options.dir, options.name);

  /* istanbul ignore else */
  if (!_isUndefined(options.template))
    return join(tmpDir, options.dir, options.template).replace(
      TEMPLATE_PATTERN,
      _randomChars(6)
    );

  // prefix and postfix
  const name = [
    options.prefix ? options.prefix : "tmp",
    "-",
    _randomChars(12),
    options.postfix ? "-" + options.postfix : ""
  ].join("");

  return join(tmpDir, options.dir, name);
}

function _indexedDbExists(name: string) {
  return new Promise(resolve => {
    const req = indexedDB.open(name);
    let existed = true;
    req.onsuccess = function () {
      req.result.close();
      if (!existed) indexedDB.deleteDatabase(name);
      resolve(existed);
    };
    req.onupgradeneeded = function () {
      existed = false;
    };
  });
}

/**
 * Gets a temporary file name.
 *
 * @param {(Options)} - opts options
 */
function tmpName(options: TmpNameOptions) {
  const opts = _parseArguments(options);

  _assertAndSanitizeOptions(opts);

  let tries = opts.tries;

  return (async function _getUniqueName() {
    const name = _generateTmpName(opts);

    // check whether the path exists then retry if needed
    const exists = await _indexedDbExists(name);
    if (exists) {
      if (tries-- > 0) return _getUniqueName();

      throw new Error(
        "Could not get a unique tmp filename, max tries reached " + name
      );
    }

    return name;
  })();
}

function _prepareTmpDirRemoveCallback(name: string, options: DirOptions) {
  const removeCallback = () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onerror = function (e) {
        reject();
      };

      request.onsuccess = function () {
        resolve(void 0);
      };
    });
  };
  if (!options.keep) _removeObjects.unshift(removeCallback);
  return removeCallback;
}

function _assertAndSanitizeOptions(options: DirOptions) {
  options.tmpdir = _getTmpDir(options);

  const tmpDir = options.tmpdir;

  if (!_isUndefined(options.name))
    _assertIsRelative(options.name, "name", tmpDir);

  if (!_isUndefined(options.dir)) _assertIsRelative(options.dir, "dir", tmpDir);

  if (!_isUndefined(options.template)) {
    _assertIsRelative(options.template, "template", tmpDir);
    if (!options.template.match(TEMPLATE_PATTERN))
      throw new Error(`Invalid template, found "${options.template}".`);
  }

  if (
    (!_isUndefined(options.tries) && isNaN(options.tries)) ||
    options.tries < 0
  )
    throw new Error(`Invalid tries, found "${options.tries}".`);

  options.tries = _isUndefined(options.name)
    ? options.tries || DEFAULT_TRIES
    : 1;
  options.keep = !!options.keep;

  // sanitize dir, also keep (multiple) blanks if the user, purportedly sane, requests us to
  options.dir = _isUndefined(options.dir)
    ? ""
    : relative(tmpDir, _resolvePath(options.dir, tmpDir));
  options.template = _isUndefined(options.template)
    ? undefined
    : relative(tmpDir, _resolvePath(options.template, tmpDir));
  // sanitize further if template is relative to options.dir
  options.template = _isBlank(options.template)
    ? undefined
    : relative(options.dir, options.template);

  options.name = _isUndefined(options.name)
    ? undefined
    : _sanitizeName(options.name);
  options.prefix = _isUndefined(options.prefix) ? "" : options.prefix;
  options.postfix = _isUndefined(options.postfix) ? "" : options.postfix;
}

/**
 * Resolve the specified path name in respect to tmpDir.
 *
 * The specified name might include relative path components, e.g. ../
 * so we need to resolve in order to be sure that is is located inside tmpDir
 *
 * @param name -
 * @param tmpDir -
 * @returns {string}
 * @private
 */
function _resolvePath(name: string, tmpDir: string) {
  const sanitizedName = _sanitizeName(name);
  if (sanitizedName.startsWith(tmpDir)) {
    return resolve(sanitizedName);
  } else {
    return resolve(join(tmpDir, sanitizedName));
  }
}

/**
 * Sanitize the specified path name by removing all quote characters.
 *
 * @param name -
 * @returns {string}
 * @private
 */
function _sanitizeName(name: string) {
  if (_isBlank(name)) {
    return name;
  }
  return name.replace(/["']/g, "");
}

/**
 * Asserts whether specified name is relative to the specified tmpDir.
 *
 * @param {string} - name
 * @param {string} - option
 * @param {string} - tmpDir
 * @throws {Error}
 * @private
 */
function _assertIsRelative(
  name: string,
  option: "name" | "dir" | "template",
  tmpDir: string
) {
  if (option === "name") {
    // assert that name is not absolute and does not contain a path
    if (isAbsolute(name))
      throw new Error(
        `${option} option must not contain an absolute path, found "${name}".`
      );
    // must not fail on valid .<name> or ..<name> or similar such constructs
    let _basename = basename(name);
    if (_basename === ".." || _basename === "." || _basename !== name)
      throw new Error(
        `${option} option must not contain a path, found "${name}".`
      );
  } else {
    // if (option === 'dir' || option === 'template') {
    // assert that dir or template are relative to tmpDir
    if (isAbsolute(name) && !name.startsWith(tmpDir)) {
      throw new Error(
        `${option} option must be relative to "${tmpDir}", found "${name}".`
      );
    }
    let resolvedPath = _resolvePath(name, tmpDir);
    if (!resolvedPath.startsWith(tmpDir))
      throw new Error(
        `${option} option must be relative to "${tmpDir}", found "${resolvedPath}".`
      );
  }
}

function _parseArguments(options: DirOptions): DirOptions {
  if (_isUndefined(options)) {
    return {};
  }
  // copy options so we do not leak the changes we make internally
  const actualOptions = {};
  for (const key of Object.getOwnPropertyNames(options)) {
    actualOptions[key] = options[key];
  }

  return actualOptions;
}

/**
 * Creates a temporary directory.
 *
 * @param {(Options)} - opts the options
 */
export async function dir(options: DirOptions) {
  const opts = _parseArguments(options);
  // gets a temporary filename
  const path = await tmpName(opts);
  return {
    path,
    cleanup: _prepareTmpDirRemoveCallback(path, options)
  };
}

/**
 * Sets the graceful cleanup.
 *
 * If graceful cleanup is set, tmp will remove all controlled temporary objects on process exit, otherwise the
 * temporary objects will remain in place, waiting to be cleaned up on system restart or otherwise scheduled temporary
 * object removals.
 */
export function setGracefulCleanup() {
  _gracefulCleanup = true;
}

/**
 * Returns the currently configured tmp dir.
 *
 * @private
 * @param {?Options} - options
 * @returns {string} the currently configured tmp dir
 */
function _getTmpDir(options: TmpNameOptions) {
  return resolve(_sanitizeName((options && options.tmpdir) || "/tmp"));
}

// window.addEventListener("beforeunload", _garbageCollector);
