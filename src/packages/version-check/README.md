# `@ganache/version-check`

### Description

`version-check` (VC) alerts the user when it detects a newer version is available. It does so in two ways:

1. When the user starts `ganache` from the command line through a banner message.
2. When the `ganache --version` command switch is run as a single string.

VC does two things.

1. On startup, VC will report based on an existing `latestVersion` stored on disk, comparing it to the currently running software version (`currentVersion`).
2. It makes a request to a configured url and expects back a semver response representing the `latestVersion` that is then persisted to disk.

#### Requirements

VC does not block the currently running application when it makes a request to check on the `latestVersion`. It is specced to be eventually consistent, assuming users will start/stop the tool implementing VC frequently. At each startup, VC checks against the value of the previously fetched `latestVersion`.

VC tracks the version that has been reported to the user to reduce its chattiness to the user. Upon start, VC will persist a `latestVersionLogged` representing the semver of the last version it displayed to the user upon starting ganache. VC will not display the banner message more than once for a given version. When the `ganache --version` command is run, VC will always display the single string message (if a newer version is known).

On install, VC defaults the `latestVersion` and `latestVersionLogged` to `0.0.0`. This will always be below the first-run of the latest install.

VC is specced to fail silently. If a request fails, returns invalid semver, or any combination of current/latest version is not valid semver it will quit without informing the user. It is self-healing if the API incorrectly reports a version and is later corrected it will inform the user of the latest, correct, version.

VC relies on the same `conf` package as truffle to manage the data persistence across environments (Linux, Mac, Windows).

VC relies on the `semver` package to perform `diff` and validation of semver.

#### Usage

VC is flexible in how it may be implemented

```javascript
const vc = new VersionCheck(currentVersionSemVer, [config], [logger]);
```

The constructor requires a `currentVersionSemVer` and accepts an optional config and logger function.

```javascript
vc.init().log();
```

`init` will initialize a request to fetch the version in the background and then update the `latestVersion` on disk, if it has changed.
`log` will perform the required notification checks and, if they pass, log the banner message to the user based on the current `latestVersion` on disk.

`init` will not await the fetch, it fires the request and does not concern itself with the outcome or results. If the desired behavior is to wait for a response before logging to the user (forgoing the eventual consistency spec), VC can be used as such:

```javascript
await vc.getLatestVersion();
vc.log();
```

This usage will perform the the same steps as using `init`, however the `latestVersion` stored on disk will be the version returned from the fetch. This could be desirable by applications that are not concerned with latency/server timeout/ or that have configured a low `ttl` value in the VC config.

```javascript
vc.getVersionMessage();
```

`getVersionMessage` returns a single string noting the `currentVersion` and `latestVersion` if a semver change is detected. This string is appended to the `detailedVersion` string in `@ganache/cli` to support the `ganache --version` command switch.

#### Test

From a develop environment, start ganache using:

```bash
$ export VERSION="1.2.3"; npm run start
```

##### Expected Output

1.) No banner message is displayed (first run, assumes latest was installed)

```bash
$ export VERSION="1.2.3"; npm run start

> root@ start /home/user/proj/ganache
> lerna exec --loglevel=silent --scope ganache -- npm run start --silent --

Debugger listening on ws://127.0.0.1:9229/b4dc2d61-8f90-4a2c-80ff-14db24160453
For help, see: https://nodejs.org/en/docs/inspector
ganache v1.2.3 (@ganache/cli: DEV, @ganache/core: DEV)
Starting RPC server
```

2.) A config file now exists for the user `less ~/.config/@ganache/version-check-nodejs/config.json` (on linux)

```json
{
  "packageName": "ganache",
  "enabled": true,
  "url": "https://version.trufflesuite.com/",
  "ttl": 300,
  "latestVersion": "7.0.5",
  "latestVersionLogged": "0.0.0"
}
```

Restart `ganache` (`export VERSION="1.2.3"; npm run start`)

##### Expected Output

1. Banner message displays, `latestVersion` > `latestVersionLogged`

```javascript
export VERSION="1.2.3"; npm run start

> root@ start /home/user/proj/ganache
> lerna exec --loglevel=silent --scope ganache -- npm run start --silent --

Debugger listening on ws://127.0.0.1:9229/911542db-3daa-433c-a31f-2aa662a084e2
For help, see: https://nodejs.org/en/docs/inspector
ganache v1.2.3 (@ganache/cli: DEV, @ganache/core: DEV)
Starting RPC server

                        ╔══════════════════════════════════════════════════════════════════════╗
                        ║                                                                      ║
                        ║        New major version of ganache available! 1.2.3 -> 7.0.5        ║
                        ║  Changelog: https://github.com/trufflesuite/ganache/releases/v7.0.5  ║
                        ║             Run npm install -g ganache@7.0.5 to update!              ║
                        ║                                                                      ║
                        ╚══════════════════════════════════════════════════════════════════════╝
```

2. Config updates `latestVersionLogged`

```json
{
  "packageName": "ganache",
  "enabled": true,
  "url": "https://version.trufflesuite.com/",
  "ttl": 300,
  "latestVersion": "7.0.5",
  "latestVersionLogged": "7.0.5"
}
```

Restart `ganache` (`export VERSION="1.2.3"; npm run start`)

##### Expected Results

1. Banner message does not display; user has already seen this version.

```sh
export VERSION="1.2.3"; npm run start

> root@ start /home/user/proj/ganache
> lerna exec --loglevel=silent --scope ganache -- npm run start --silent --

Debugger listening on ws://127.0.0.1:9229/27f051e4-1c84-4bdf-a41d-95601466ba2b
For help, see: https://nodejs.org/en/docs/inspector
ganache v1.2.3 (@ganache/cli: DEV, @ganache/core: DEV)
Starting RPC server
```

Run `npm start -- --version`

##### Expected Result

```bash
ganache v1.2.3 (@ganache/cli: DEV, @ganache/core: DEV)
note: there is a new version available! 1.2.3 -> 7.0.5
```
