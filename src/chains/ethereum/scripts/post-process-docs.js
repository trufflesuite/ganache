const cheerio = require("cheerio");
const { readFileSync, writeFileSync } = require("fs");
const $ = cheerio.load(
  readFileSync("./lib/docs/classes/_api_.ethereumapi.html")
);

$("body").append(
  "<script src='https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js' integrity='sha256-0SGl1PJNDyJwcV5T+weg2zpEMrh7xvlwO4oXgvZCeZk=' crossorigin='anonymous'></script>"
);
$(`body`).append(`<script src="../../../scripts/inject-editor.js"></script>`);

$("dt")
  .filter(function () {
    return $(this).text().trim().toLocaleUpperCase() === "EXAMPLE";
  })
  .each(function () {
    $(this).next().addClass("monaco");
  });

writeFileSync("./lib/docs/classes/_api_.ethereumapi.html", $.html());
