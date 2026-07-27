const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const distDir = path.join(rootDir, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const itemsToCopy = [
  "index.html",
  "popup.css",
  "popup.js",
  "html2pdf.bundle.min.js",
  "assets",
  "js",
  "quill",
  "sortable",
];

itemsToCopy.forEach((item) => {
  const src = path.join(rootDir, item);
  const dest = path.join(distDir, item);

  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
});

console.log("Frontend assets copied to dist successfully!");
