const esbuild = require("esbuild");

// core for node
esbuild
  .build({
    entryPoints: ["./index.ts", "./src/cli.ts"],
    outdir: "dist-esbuild/node",
    bundle: true,
    sourcemap: true,
    minify: true,
    target: ["node10.7"],
    platform: "node",
    loader: { ".tsx": "js" },
    resolveExtensions: [".ts", ".js"],
    splitting: true
  })
  .catch(() => process.exit(1));

// // browser
// esbuild
//   .build({
//     entryPoints: ["./index.ts"],
//     outfile: "dist/node/ganache.min.js",
//     bundle: true,
//     sourcemap: true,
//     minify: true,
//     target: ["es2020"],
//     // banner: { js: "#!/usr/bin/env node" },
//     platform: "browser",
//     loader: { ".tsx": "js" },
//     resolveExtensions: [".tsx", ".ts", ".js"]
//   })
//   .catch(() => process.exit(1));
