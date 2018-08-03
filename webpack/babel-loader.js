module.exports = {
  "loader": "babel-loader",
  "options": {
    "presets": [
      ["env", {
        "targets": {
          "node": "6.5.0"
        }
      }]
    ]
  }
};