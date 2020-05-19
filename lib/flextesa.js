const { spawn, execSync } = require("child_process");

const Flextesa = {
  start(options) {
    return new Promise((resolve, reject) => {
      const flextesa = spawn("docker", [
        "run",
        "--rm",
        "--detach",
        "--name",
        "flextesa-mini-archive",
        "-p",
        "8732:20000",
        "trufflesuite/flextesa-mini-archive",
        "sandbox-archive",
        "start",
        "--random-traffic",
        "any",
        "--genesis-block-hash",
        "random"
      ]);

      let stderr = "";

      flextesa.stderr.on("data", (data) => {
        stderr += data;
        if (data.toString().includes("Randomizer")) {
          resolve(flextesa);
        }
      });

      flextesa.on("close", (code) => {
        if (code !== 0) {
          reject(stderr);
        }
      });
    });
  },
  stop() {
    return execSync("docker rm -f flextesa-mini-archive > /dev/null");
  }
};

module.exports = Flextesa;
