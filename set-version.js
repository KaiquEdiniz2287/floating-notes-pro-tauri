const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const packageJsonPath = path.join(rootDir, "package.json");

const newVersion = process.argv[2];

if (!newVersion) {
  console.error("Uso: node set-version.js <nova-versao>");
  console.error("Exemplo: node set-version.js 2.0.2");
  process.exit(1);
}

// Validar formato básico de versão semver (ex: 2.0.2 ou 2.0.2-beta)
if (!/^\d+\.\d+\.\d+.*$/.test(newVersion)) {
  console.error("Formato de versão inválido. Use algo como '2.0.2'.");
  process.exit(1);
}

try {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const oldVersion = pkg.version;
  pkg.version = newVersion;

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Versão alterada no package.json: ${oldVersion} -> ${newVersion}`);

  // Executa o copy-frontend.js para sincronizar os demais arquivos
  const copyScriptPath = path.join(rootDir, "copy-frontend.js");
  if (fs.existsSync(copyScriptPath)) {
    require(copyScriptPath);
  }

  console.log("Sincronização concluída com sucesso!");
} catch (err) {
  console.error("Erro ao atualizar versão:", err.message);
  process.exit(1);
}
