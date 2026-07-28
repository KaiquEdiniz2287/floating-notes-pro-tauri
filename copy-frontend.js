const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const distDir = path.join(rootDir, "dist");
const packageJsonPath = path.join(rootDir, "package.json");
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");
const indexHtmlPath = path.join(rootDir, "index.html");
const jsDir = path.join(rootDir, "js");
const versionJsPath = path.join(jsDir, "version.js");

// --- 1. SINCRONIZAÇÃO DE VERSÃO (Single Source of Truth) ---
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const version = pkg.version;

    if (version) {
      // a) Atualiza src-tauri/tauri.conf.json
      if (fs.existsSync(tauriConfPath)) {
        const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
        let updated = false;
        if (tauriConf.version !== version) {
          tauriConf.version = version;
          updated = true;
        }
        if (
          tauriConf.app &&
          Array.isArray(tauriConf.app.windows) &&
          tauriConf.app.windows[0]
        ) {
          const expectedTitle = `Floating Notes Pro - v${version}`;
          if (tauriConf.app.windows[0].title !== expectedTitle) {
            tauriConf.app.windows[0].title = expectedTitle;
            updated = true;
          }
        }
        if (updated) {
          fs.writeFileSync(
            tauriConfPath,
            JSON.stringify(tauriConf, null, 2) + "\n"
          );
          console.log(`[Version Sync] tauri.conf.json atualizado para v${version}`);
        }
      }

      // b) Atualiza src-tauri/Cargo.toml
      if (fs.existsSync(cargoTomlPath)) {
        let cargoContent = fs.readFileSync(cargoTomlPath, "utf-8");
        const newCargoContent = cargoContent.replace(
          /^version\s*=\s*"[^"]+"/m,
          `version = "${version}"`
        );
        if (newCargoContent !== cargoContent) {
          fs.writeFileSync(cargoTomlPath, newCargoContent);
          console.log(`[Version Sync] Cargo.toml atualizado para v${version}`);
        }
      }

      // c) Atualiza index.html <title>
      if (fs.existsSync(indexHtmlPath)) {
        let htmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
        const newHtmlContent = htmlContent.replace(
          /<title>.*?<\/title>/,
          `<title>Floating Notes Pro - v${version}</title>`
        );
        if (newHtmlContent !== htmlContent) {
          fs.writeFileSync(indexHtmlPath, newHtmlContent);
          console.log(`[Version Sync] index.html title atualizado para v${version}`);
        }
      }

      // d) Gera js/version.js
      if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir, { recursive: true });
      }
      const versionJsContent = `// Arquivo gerado automaticamente pelo copy-frontend.js\nwindow.APP_VERSION = "${version}";\n`;
      if (
        !fs.existsSync(versionJsPath) ||
        fs.readFileSync(versionJsPath, "utf-8") !== versionJsContent
      ) {
        fs.writeFileSync(versionJsPath, versionJsContent);
        console.log(`[Version Sync] js/version.js gerado com window.APP_VERSION = "${version}"`);
      }
    }
  } catch (err) {
    console.error("[Version Sync Error]", err.message);
  }
}

// --- 2. CÓPIA DOS ARQUIVOS PARA DIST ---
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

console.log("Frontend assets e versão sincronizados e copiados para dist com sucesso!");
