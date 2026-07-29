const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = __dirname;
const packageJsonPath = path.join(rootDir, "package.json");

if (!fs.existsSync(packageJsonPath)) {
  console.error("package.json não encontrado!");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const version = pkg.version;

console.log(`\n========================================`);
console.log(`🚀 Criando Build de Release v${version}`);
console.log(`========================================\n`);

// 1. Sincronizar Frontend e Versões
console.log("--> [1/4] Sincronizando versão e assets do frontend...");
execSync("node copy-frontend.js", { stdio: "inherit" });

// 2. Executar tauri build
console.log("\n--> [2/4] Executando Tauri Build (modo release)...");
execSync("npx tauri build", { stdio: "inherit" });

// 3. Localizar executável NSIS
const nsisDir = path.join(rootDir, "src-tauri", "target", "release", "bundle", "nsis");
const rawExeName = `Floating Notes Pro_${version}_x64-setup.exe`;
const rawExePath = path.join(nsisDir, rawExeName);

if (!fs.existsSync(rawExePath)) {
  console.error(`\n❌ Erro: Executável não encontrado em ${rawExePath}`);
  process.exit(1);
}

// 4. Assinar o instalador digitalmente
console.log("\n--> [3/4] Assinando digitalmente o instalador executável...");
const keyPath = path.join(rootDir, "src-tauri", "tauri.key");

if (!fs.existsSync(keyPath)) {
  console.error(`\n❌ Erro: Chave tauri.key não encontrada em ${keyPath}`);
  process.exit(1);
}

try {
  execSync(`npx tauri signer sign -f "${keyPath}" -p "floatingnotes" "${rawExePath}"`, { stdio: "inherit" });
} catch (err) {
  console.error("\n❌ Erro ao assinar o executável:", err.message);
  process.exit(1);
}

const sigPath = `${rawExePath}.sig`;
if (!fs.existsSync(sigPath)) {
  console.error(`\n❌ Erro: Arquivo de assinatura .sig não encontrado em ${sigPath}`);
  process.exit(1);
}

const signature = fs.readFileSync(sigPath, "utf-8").trim();

// 5. Gerar latest.json e organizar arquivos para a Release do GitHub
console.log("\n--> [4/4] Gerando latest.json para o Auto-Update do Tauri v2...");

const bundleDir = path.join(rootDir, "src-tauri", "target", "release", "bundle");
const cleanExeName = `Floating.Notes.Pro_${version}_x64-setup.exe`;
const cleanExePath = path.join(bundleDir, cleanExeName);
const cleanSigPath = path.join(bundleDir, `${cleanExeName}.sig`);
const latestJsonPath = path.join(bundleDir, "latest.json");

// Copiar instalador e assinatura para a pasta bundle raiz sem espaços no nome (URL safe)
fs.copyFileSync(rawExePath, cleanExePath);
fs.writeFileSync(cleanSigPath, signature, "utf-8");

const downloadUrl = `https://github.com/KaiquEdiniz2287/floating-notes-pro-tauri/releases/download/v${version}/${cleanExeName}`;

const latestData = {
  version: version,
  notes: `Release Floating Notes Pro v${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: signature,
      url: downloadUrl
    }
  }
};

fs.writeFileSync(latestJsonPath, JSON.stringify(latestData, null, 2) + "\n", "utf-8");

console.log("\n=======================================================");
console.log(`✨ RELEASE v${version} CONSTRUÍDA E PREPARADA COM SUCESSO!`);
console.log("=======================================================\n");
console.log("📁 Arquivos gerados para publicar no GitHub Releases:");
console.log(` 1. ${cleanExePath}`);
console.log(` 2. ${cleanSigPath}`);
console.log(` 3. ${latestJsonPath}`);
console.log("\n📌 INSTRUÇÕES DE PUBLICAÇÃO NO GITHUB RELEASES:");
console.log(`1. Acesse https://github.com/KaiquEdiniz2287/floating-notes-pro-tauri/releases/new`);
console.log(`2. No campo 'Tag', selecione ou digite: v${version}`);
console.log(`3. No campo 'Title', digite: Floating Notes Pro v${version}`);
console.log(`4. ANEXE OS 3 ARQUIVOS ABAIXO na Release:`);
console.log(`   - ${cleanExeName}`);
console.log(`   - ${cleanExeName}.sig`);
console.log(`   - latest.json`);
console.log(`5. Clique em "Publish release".\n`);
console.log("O Auto Update lerá o latest.json do GitHub e atualizará os usuários automaticamente! 🎉\n");
