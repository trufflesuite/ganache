import webpack from "webpack";

// inlines files, like package.json
import packageJsonTransformer from "ts-transformer-inline-file/transformer";

const base: webpack.Configuration = {
  entry: "./index.ts",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
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
    filename: "ganache.min.js",
    library: "Ganache",
    libraryExport: "default",
    libraryTarget: "umd"
  },
  stats: {
    colors: true
  }
};

export default base;
