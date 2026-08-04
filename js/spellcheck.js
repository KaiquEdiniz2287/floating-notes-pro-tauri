// js/spellcheck.js
// Módulo de Correção Ortográfica e Gramatical via API (LanguageTool)
// Leve, assíncrono, sem travamento de UI ou arquivos pesados locais.

(function () {
  const API_URL = "https://api.languagetool.org/v2/check";

  class SpellChecker {
    constructor(quill) {
      this.quill = quill;
      this.enabled = false;
      this.loading = false;
      this.debounceTimer = null;
      this._isRunning = false;
      this.lastMatches = []; // Armazena últimas correspondências da API

      // Listas de preferências salvas
      this.ignoreList = this._loadList("spellIgnoreList");
      this.userWords = this._loadList("spellUserWords");

      this._setupContextMenu();
    }

    _loadList(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        return [];
      }
    }

    _saveList(key, list) {
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
    }

    // ─── Enable / Disable / Toggle ───────────────

    enable() {
      this.enabled = true;
      this._updateButtonState(true);
      this.runCheck();

      // Escuta digitação
      if (!this._hasTextListener) {
        this.quill.on("text-change", (delta, oldDelta, source) => {
          if (!this.enabled || source === "silent" || this._isRunning) return;
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.runCheck(), 800);
        });
        this._hasTextListener = true;
      }
    }

    disable() {
      this.enabled = false;
      this._updateButtonState(false);
      this.clearAllErrors();

      // Limpa marcadores de todas as abas no state
      if (typeof state !== "undefined" && Array.isArray(state.tabs)) {
        state.tabs.forEach((t) => {
          if (t.content && Array.isArray(t.content.ops)) {
            t.content.ops.forEach((op) => {
              if (op.attributes && op.attributes["spell-error"]) {
                delete op.attributes["spell-error"];
              }
            });
          }
        });
      }

      if (typeof saveState === "function") {
        saveState();
      }
    }

    toggle() {
      if (this.enabled) {
        this.disable();
      } else {
        this.enable();
      }

      try {
        localStorage.setItem("spellEnabled", this.enabled ? "1" : "0");
      } catch {}

      return this.enabled;
    }

    // ─── Verificação Ortográfica via API ───────────

    clearAllErrors() {
      this._isRunning = true;
      try {
        const len = this.quill.getLength();
        if (len > 1) {
          this.quill.formatText(0, len, "spell-error", false, "silent");
        }
      } finally {
        this._isRunning = false;
      }
    }

    async runCheck() {
      if (!this.enabled) return;

      // Se estiver offline, cancela silenciosamente sem travar
      if (!navigator.onLine) {
        this._setButtonLoading(false, "Offline - Corretor inativo");
        return;
      }

      const text = this.quill.getText().trim();
      if (!text || text.length < 2) {
        this.clearAllErrors();
        this.lastMatches = [];
        return;
      }

      this._setButtonLoading(true, "Verificando texto...");

      try {
        const params = new URLSearchParams();
        params.append("text", text);
        params.append("language", "pt-BR");

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: params,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawMatches = data.matches || [];

        // Filtra ignorados pelo usuário
        this.lastMatches = rawMatches.filter((match) => {
          const matchText = text.substring(match.offset, match.offset + match.length);
          const lower = matchText.toLowerCase();
          return !this.ignoreList.includes(lower) && !this.userWords.includes(lower);
        });

        // Aplica as marcações no Quill
        this._applyMatches(text);
      } catch (err) {
        console.warn("[SpellChecker API] Falha ou offline:", err.message);
      } finally {
        this._setButtonLoading(false);
      }
    }

    _applyMatches(fullText) {
      this._isRunning = true;
      try {
        // Limpa erros anteriores
        const totalLen = this.quill.getLength();
        if (totalLen > 1) {
          this.quill.formatText(0, totalLen, "spell-error", false, "silent");
        }

        // Aplica novos erros encontrados pela API
        this.lastMatches.forEach((match) => {
          const word = fullText.substring(match.offset, match.offset + match.length);
          if (word.length >= 2) {
            this.quill.formatText(match.offset, match.length, "spell-error", word, "silent");
          }
        });
      } finally {
        this._isRunning = false;
      }
    }

    // ─── Correção ────────────────────────────────

    correctWord(offset, length, replacement) {
      this._isRunning = true;
      try {
        this.quill.deleteText(offset, length, "user");
        this.quill.insertText(offset, replacement, "user");
      } finally {
        this._isRunning = false;
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.runCheck(), 400);
    }

    addToUserDictionary(word) {
      const lower = word.toLowerCase();
      if (!this.userWords.includes(lower)) {
        this.userWords.push(lower);
        this._saveList("spellUserWords", this.userWords);
      }
      this.runCheck();
    }

    ignoreWord(word) {
      const lower = word.toLowerCase();
      if (!this.ignoreList.includes(lower)) {
        this.ignoreList.push(lower);
        this._saveList("spellIgnoreList", this.ignoreList);
      }
      this.runCheck();
    }

    // ─── Context Menu Customizado ──────────────────

    _setupContextMenu() {
      const menu = document.getElementById("spell-context-menu");
      if (!menu) return;

      document.addEventListener("mousedown", (e) => {
        if (!menu.classList.contains("hidden") && !menu.contains(e.target)) {
          this._hideContextMenu();
        }
      });

      document.addEventListener("scroll", () => this._hideContextMenu(), true);

      this.quill.root.addEventListener("contextmenu", (e) => {
        const spanEl = e.target.closest(".ql-spell-error");
        if (!spanEl || !this.enabled) {
          this._hideContextMenu();
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const word = spanEl.getAttribute("data-spell-word") || spanEl.textContent.trim();

        // Encontra o offset da palavra no Quill
        let offset = -1;
        let length = word.length;

        try {
          const blot = Quill.find(spanEl);
          if (blot) {
            offset = this.quill.getIndex(blot);
          }
        } catch {}

        if (offset < 0) {
          const fullText = this.quill.getText();
          offset = fullText.indexOf(word);
        }

        // Tenta encontrar a sugestão correspondente da API
        let match = this.lastMatches.find(
          (m) => Math.abs(m.offset - offset) <= 2 || m.offset === offset
        );

        let suggestions = [];
        if (match && match.replacements) {
          suggestions = match.replacements.map((r) => r.value).slice(0, 5);
        }

        this._showContextMenu(e.clientX, e.clientY, word, offset, length, suggestions);
      });
    }

    _showContextMenu(x, y, word, offset, length, suggestions) {
      const menu = document.getElementById("spell-context-menu");
      if (!menu) return;

      const list = menu.querySelector(".spell-menu-list");
      list.innerHTML = "";

      // Cabeçalho da palavra
      const header = document.createElement("div");
      header.className = "spell-menu-header";
      header.textContent = `"${word}"`;
      list.appendChild(header);

      if (suggestions.length > 0) {
        const sugTitle = document.createElement("div");
        sugTitle.className = "spell-menu-label";
        sugTitle.textContent = "Sugestões:";
        list.appendChild(sugTitle);

        suggestions.forEach((sug) => {
          const item = document.createElement("button");
          item.className = "spell-menu-item spell-suggestion";
          item.textContent = sug;
          item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this._hideContextMenu();
            if (offset >= 0) {
              this.correctWord(offset, length, sug);
            }
          });
          list.appendChild(item);
        });
      } else {
        const noSug = document.createElement("div");
        noSug.className = "spell-menu-no-suggestions";
        noSug.textContent = "Sem sugestões disponíveis";
        list.appendChild(noSug);
      }

      const divider = document.createElement("div");
      divider.className = "spell-menu-divider";
      list.appendChild(divider);

      // Ignorar sempre
      const ignoreBtn = document.createElement("button");
      ignoreBtn.className = "spell-menu-item spell-menu-action";
      ignoreBtn.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Ignorar sempre`;
      ignoreBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this._hideContextMenu();
        this.ignoreWord(word);
      });
      list.appendChild(ignoreBtn);

      // Adicionar ao dicionário
      const addBtn = document.createElement("button");
      addBtn.className = "spell-menu-item spell-menu-action";
      addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar ao dicionário`;
      addBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this._hideContextMenu();
        this.addToUserDictionary(word);
      });
      list.appendChild(addBtn);

      // Exibição e posicionamento
      menu.classList.remove("hidden");
      menu.style.left = "0";
      menu.style.top = "0";

      const menuW = menu.offsetWidth || 210;
      const menuH = menu.offsetHeight || 190;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let finalX = x + 4;
      let finalY = y + 4;

      if (finalX + menuW > winW - 8) finalX = winW - menuW - 8;
      if (finalY + menuH > winH - 8) finalY = y - menuH - 4;
      if (finalY < 8) finalY = 8;

      menu.style.left = `${finalX}px`;
      menu.style.top = `${finalY}px`;
    }

    _hideContextMenu() {
      const menu = document.getElementById("spell-context-menu");
      if (menu) menu.classList.add("hidden");
    }

    // ─── UI do Botão ─────────────────────────────

    _setButtonLoading(loading, tooltipMessage) {
      const btn = document.getElementById("spell-toggle-btn");
      if (!btn) return;

      if (loading) {
        btn.classList.add("loading");
        if (tooltipMessage) btn.title = tooltipMessage;
      } else {
        btn.classList.remove("loading");
        this._updateButtonState(this.enabled, tooltipMessage);
      }
    }

    _updateButtonState(active, customTitle) {
      const btn = document.getElementById("spell-toggle-btn");
      if (!btn) return;

      if (active) {
        btn.classList.add("active");
        btn.title = customTitle || "Corretor ortográfico ativo (LanguageTool API)";
      } else {
        btn.classList.remove("active");
        btn.title = "Ativar corretor ortográfico (pt-BR)";
      }
    }
  }

  // ─── Inicialização ────────────────────────────

  function initSpellChecker() {
    if (typeof quill === "undefined") return;

    const sc = new SpellChecker(quill);
    window.spellChecker = sc;

    const btn = document.getElementById("spell-toggle-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        sc.toggle();
      });
    }

    // Ativo por padrão se não houver preferência salva como '0'
    const savedEnabled = localStorage.getItem("spellEnabled");
    if (savedEnabled === "1" || savedEnabled === null) {
      sc.enable();
    } else {
      sc._updateButtonState(false);
    }

    // Quando mudar de aba
    document.addEventListener("spellcheck-recheck", () => {
      if (sc.enabled) {
        clearTimeout(sc.debounceTimer);
        sc.debounceTimer = setTimeout(() => sc.runCheck(), 300);
      } else {
        sc.clearAllErrors();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSpellChecker);
  } else {
    initSpellChecker();
  }
})();
