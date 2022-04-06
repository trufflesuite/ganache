import * as https from "https";
import { PhoneHomeSettings } from "../types";

// TODO I cant imagine the user setting these but I'm just not familiar with how Ganache does its options.
export default async function phoneHome(
  version: string = process.env.VERSION || "DEV",
  phoneHomeSettings: PhoneHomeSettings = {
    hostname: "version.trufflesuite.com",
    port: 443,
    path: "/?name=ganache",
    method: "GET",
    headers: { "User-Agent": `Ganache ${version}` }
  }
) {
  // Short circuit DEV phoneHomes.
  const checkedForVersion = false; // TODO: Have we checked this version of Ganache already?
  if (version === "DEV" || checkedForVersion) return false;

  let latestVersion;

  try {
    latestVersion = await makePhoneHomeRequest(phoneHomeSettings);
  } catch (e) {
    // if phoneHome fails it shouldn't bomb out Ganache.
    // TODO Log failure w/ settings.
    return false;
  }

  if (version !== latestVersion) {
    console.log(
      `Current Ganache version is: ${version}, latest version: ${latestVersion}, please upgrade Ganache`
    );
    // TODO Persist some flag "Checked for version": true
  }

  return latestVersion === version;
}

async function makePhoneHomeRequest(phoneHomeSettings: PhoneHomeSettings) {
  return new Promise((resolve, reject) => {
    let data = "";
    const req = https.request(phoneHomeSettings, res => {
      // TODO redirects?
      switch (res.statusCode) {
        case 200:
          // This is possibly overkill, but maybe we want to return more data or JSON in the future
          res.on("data", responseData => {
            data += responseData;
          });
          res.on("end", () => {
            resolve(data);
          });
          break;
        default:
          reject(new Error("Status code !== 200"));
      }
    });

    req.on("error", error => {
      reject(error);
    });

    req.end();
  });
}
