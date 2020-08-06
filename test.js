const Ganache = require("./src/packages/core/build/bundle.js");
console.log(Ganache);
Ganache.default.server({flavor:"filecoin", ipfsPort: 5002})
.listen(7545, console.log);
