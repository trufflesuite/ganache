import { EPOCH, RESPONSE_COMPRESS_HTML_NOCACHE } from "../../constants";

export async function dashboardRoute() {
  const value = await VERSION_KV.list();
  const keys = value.keys;

  const analyticData = parseKVData(keys);
  const tableHTML = createTableHTML(analyticData);

  return new Response(
    createDashboard(tableHTML),
    RESPONSE_COMPRESS_HTML_NOCACHE
  );
}

function parseKVData(keys) {
  const pkgs = {};
  keys.forEach(({ name: key }) => {
    const [name, ip, timestamp] = key.split("|");
    const pkg =
      pkgs[name] ||
      (pkgs[name] = {
        max: -Infinity,
        earliest: Infinity,
        latest: -Infinity,
      });
    const date = new Date(EPOCH + +timestamp);
    date.setHours(0, 0, 0, 0); // set to midnight UTC
    pkg[+date] || (pkg[+date] = 0);
    pkg[+date]++;
    pkg["earliest"] = date < pkg["earliest"] ? +date : pkg["earliest"];
    pkg["latest"] = date > pkg["latest"] ? +date : pkg["latest"];
    pkg["max"] = date > pkg["max"] ? pkg[+date] : pkg["max"];
  });
  return pkgs;
}

function createDashboard(body) {
  const title = "User Dashboard";
  return `<!doctype html>
<html class="no-js" lang="">

<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body>
${body}
</body>
</html>
`;
}

function createTableHTML(analyticData) {
  let html = "";
  for (const name in analyticData) {
    const pkg = analyticData[name];
    const max = pkg["max"];
    const earliest = pkg["earliest"];
    const numDays =
      Math.round((pkg["latest"] - earliest) / (1000 * 60 * 60 * 24)) + 1;
    const rows = Array.from(Array(numDays)).map((_, i) => {
      const date = new Date(earliest).setDate(new Date(earliest).getDate() + i);
      const count = pkg[+date] || 0;
      const progress =
        "<progress value=" +
        count +
        " max=" +
        max +
        ">" +
        count +
        "</progress>";
      return createTableRow(date, progress, count);
    });
    html += createTable(name, rows);
  }
  return html;
}

function createTable(name, rows) {
  return (
    "<h2>" +
    name +
    "</h2><table><thead><tr><th>Date</th><th>Pings</th><th align=right>#</th></tr></thead><tbody>" +
    rows.join("") +
    "</tbody></table>"
  );
}

function createTableRow(date, progress, count) {
  return (
    "<tr><td>" +
    new Date(date).toISOString().split("T")[0] +
    "</td><td>" +
    progress +
    "</td><td align=right>" +
    count +
    " </td><td>"
  );
}
