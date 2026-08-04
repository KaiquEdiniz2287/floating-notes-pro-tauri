// js/tauri-api.js
// Ponte de comunicação para Tauri v2.
// Com "withGlobalTauri: true" no tauri.conf.json, o Tauri injeta automaticamente
// window.__TAURI__ e window.__TAURI_INTERNALS__ no contexto da webview.

(function () {
  // Retorna a função invoke do Tauri, testando os locais conhecidos
  function getInvoke() {
    // Tauri v2 principal
    if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
      return window.__TAURI_INTERNALS__.invoke;
    }
    // Tauri v2 via withGlobalTauri
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === "function") {
      return window.__TAURI__.core.invoke;
    }
    // Tauri v1 fallback
    if (window.__TAURI__ && window.__TAURI__.tauri && typeof window.__TAURI__.tauri.invoke === "function") {
      return window.__TAURI__.tauri.invoke;
    }
    return null;
  }

  // Retorna a função listen do Tauri
  function getListen() {
    if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.listen === "function") {
      return window.__TAURI_INTERNALS__.listen;
    }
    if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.listen === "function") {
      return window.__TAURI__.event.listen;
    }
    return null;
  }

  window.appAPI = {
    async loadData() {
      const invoke = getInvoke();
      let res = null;
      if (invoke) {
        try {
          res = await invoke("load_data");
        } catch (e) {
          console.error("Erro ao carregar dados do Tauri:", e);
        }
      }
      if (res && Array.isArray(res.tabs) && res.tabs.length > 0) {
        return res;
      }
      // Backup secundário no localStorage
      try {
        const saved = localStorage.getItem("floatingNotesData");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Erro ao carregar do localStorage:", e);
      }
      return res || null;
    },

    async saveData(data) {
      // Salva sempre no localStorage como espelho de segurança imediato
      try {
        localStorage.setItem("floatingNotesData", JSON.stringify(data));
      } catch (e) {
        console.error("Erro ao salvar backup no localStorage:", e);
      }

      const invoke = getInvoke();
      if (invoke) {
        return await invoke("save_data", { data });
      }
      return true;
    },

    async getVersion() {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("get_version");
      }
      return "1.4.1";
    },

    async setWindowTitle(title) {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("set_window_title", { title });
      }
      document.title = title;
    },

    async saveTxt({ filename, content }) {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("save_txt", { filename, content });
      }
      return null;
    },

    async savePdf({ filename, data }) {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("save_pdf", { filename, data });
      }
      return null;
    },

    async openFile(filePath) {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("open_file", { filePath });
      }
      return null;
    },

    async saveMd({ filename, content }) {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("save_md", { filename, content });
      }
      return null;
    },

    async toggleAlwaysOnTop() {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("toggle_always_on_top");
      }
      return false;
    },

    async isAlwaysOnTop() {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("is_always_on_top");
      }
      return false;
    },

    onNewTabShortcut(callback) {
      const listen = getListen();
      if (listen) {
        listen("shortcut-new-tab", () => callback());
      }
    },

    onAlwaysOnTopChanged(callback) {
      const listen = getListen();
      if (listen) {
        listen("always-on-top-changed", (event) => callback(event.payload));
      }
    },

    onUpdateAvailable(callback) {
      const listen = getListen();
      if (listen) {
        listen("update-available", (event) => callback(event.payload));
      }
    },

    onUpdateProgress(callback) {
      const listen = getListen();
      if (listen) {
        listen("update-progress", (event) => callback(event.payload));
      }
    },

    onUpdateDownloaded(callback) {
      const listen = getListen();
      if (listen) {
        listen("update-downloaded", () => callback());
      }
    },

    onUpdateError(callback) {
      const listen = getListen();
      if (listen) {
        listen("update-error", (event) => callback(event.payload));
      }
    },

    async checkForUpdates() {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("check_for_updates");
      }
      return false;
    },

    async restartApp() {
      const invoke = getInvoke();
      if (invoke) {
        return await invoke("restart_app");
      }
    },

    minimizeWindow() {
      const invoke = getInvoke();
      if (invoke) {
        invoke("minimize_window");
      }
    },

    maximizeWindow() {
      const invoke = getInvoke();
      if (invoke) {
        invoke("maximize_window");
      }
    },

    closeWindow() {
      const invoke = getInvoke();
      if (invoke) {
        invoke("close_window");
      }
    },

    startDrag() {
      const invoke = getInvoke();
      if (invoke) {
        invoke("start_drag");
      }
    },
  };
})();
