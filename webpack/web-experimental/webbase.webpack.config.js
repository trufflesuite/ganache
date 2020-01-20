const { merge } = require("lodash");
const applyBaseConfig = require("../base.webpack.config");

module.exports = (override) => {
  return merge(
    {},
    applyBaseConfig({
      resolve: {
        alias: {
          fs: "browserfs/dist/shims/fs.js"
        }
      }
    }),
    override
  );
};
