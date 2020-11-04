import webpack from "webpack";

// inlines files, like package.json
import packageJsonTransformer from "ts-transformer-inline-file/transformer";

const base: webpack.Configuration = {
  entry: "./src/index.ts",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            // webpack typescript modules
            loader: "ts-loader",
            options: {
              getCustomTransformers: program => ({
                before: [packageJsonTransformer(program)]
              })
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    libraryTarget: "umd",
    filename: "ganache.min.js",
    library: "Ganache",
    libraryExport: "default"
  }
};

export default base;
