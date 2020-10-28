const cheerio = require("cheerio");
const { readFileSync, writeFileSync } = require("fs");
const { randomBytes } = require("crypto");
const $ = cheerio.load(
  readFileSync("./lib/docs/classes/_api_.ethereumapi.html")
);

$(`.tsd-page-title`).after(`<script src="https://embed.runkit.com"></script>`);

$(".runkit-example").each(function () {
  const sanitizedCode = $(this)
    .text()
    .replace(/;(\s+)/gi, ";\n")
    .trim();
  $(this).text("");
  const id = randomBytes(4).toString("hex");
  $(this).attr("id", id).html();
  $(this).prepend(
    `<script>var notebook = RunKit.createNotebook({ element: document.getElementById("${id}"), source: \`${sanitizedCode}\` })</script>`
  );
});

writeFileSync("./lib/docs/classes/_api_.ethereumapi.html", $.html());
