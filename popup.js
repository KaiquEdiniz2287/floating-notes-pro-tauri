const tabsEl = document.getElementById("tabs");
const addTabBtn = document.getElementById("add-tab");
const searchEl = document.getElementById("search");
const themeBtn = document.getElementById("theme-btn");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const downloadToast = document.getElementById("download-toast");
const openPdfBtn = document.getElementById("open-pdf-btn");

let lastDownloadedPdf = null;

openPdfBtn.addEventListener("click", async () => {
  if (!lastDownloadedPdf) return;

  await window.appAPI.openFile(lastDownloadedPdf);
});

let state = {
  theme: "dark",

  currentTab: 0,

  tabs: [
    {
      title: "Nota 1",

      content: {
        ops: [],
      },
    },
  ],
};

// =====================================
// COLOR MEMORY
// =====================================

state.lastColor = state.lastColor || "#000000";
state.lastBackground = state.lastBackground || "#ffff00";

state.recentColors = state.recentColors || [];
state.recentBackgrounds = state.recentBackgrounds || [];

const OFFICE_COLORS = [
  // Escala de Cinza
  "#000000",
  "#1A1A1A",
  "#333333",
  "#666666",
  "#808080",
  "#999999",
  "#B3B3B3",
  "#CCCCCC",
  "#E6E6E6",
  "#FFFFFF",

  // Amarelo
  "#FFF200",
  "#FFF9D9",
  "#FFF2B3",
  "#FFE066",
  "#FFD700",
  "#D9D900",
  "#999900",
  "#7F6000",
  "#4F3B00",
  "#332400",

  // Dourado
  "#FFC000",
  "#FFF2CC",
  "#FFE699",
  "#FFD966",
  "#FFC000",
  "#E6AC00",
  "#BF9000",
  "#7F6000",
  "#4F3B00",
  "#332400",

  // Laranja
  "#FF8C00",
  "#FFE0BF",
  "#F9CB9C",
  "#F6B26B",
  "#FF9900",
  "#E69100",
  "#B45F06",
  "#783F04",
  "#5A2D0C",
  "#3D1F00",

  // Laranja Avermelhado
  "#FF4200",
  "#FFD6CC",
  "#F4B183",
  "#FF9966",
  "#FF6600",
  "#E65C00",
  "#B45F06",
  "#783F04",
  "#5A2D0C",
  "#3D1F00",

  // Vermelho
  "#FF0000",
  "#FFD9D9",
  "#EA9999",
  "#FF6666",
  "#FF3333",
  "#CC0000",
  "#990000",
  "#660000",
  "#4C0000",
  "#330000",

  // Rosa / Magenta
  "#C0007A",
  "#F4CCCC",
  "#D5A6BD",
  "#C27BA0",
  "#A64D79",
  "#990066",
  "#741B47",
  "#4C1130",
  "#351C2A",
  "#220011",

  // Roxo
  "#800080",
  "#D9D2E9",
  "#B4A7D6",
  "#8E7CC3",
  "#674EA7",
  "#5B2C83",
  "#351C75",
  "#20124D",
  "#1C0F33",
  "#12001A",

  // Azul
  "#0000ff",
  "#DCE6F1",
  "#B7C9E2",
  "#6FA8DC",
  "#3D85C6",
  "#3C78D8",
  "#1C4587",
  "#073763",
  "#1B2A49",
  "#0F1A2B",

  // Verde Azulado
  "#1B8D6B",
  "#D9EAD3",
  "#A2C4C9",
  "#76A5AF",
  "#45818E",
  "#0B8043",
  "#134F5C",
  "#0C343D",
  "#1B2D2F",
  "#102020",

  // Verde
  "#00ff00",
  "#E2F0D9",
  "#B6D7A8",
  "#93C47D",
  "#6AA84F",
  "#3FAF46",
  "#38761D",
  "#274E13",
  "#1F3A0F",
  "#102B0F",
];

// =====================================
// CUSTOM ICONS
// =====================================

const icons = window.Quill.import("ui/icons");

icons.undo = `<i class="fa-solid fa-rotate-left"></i>`;

icons.redo = `<i class="fa-solid fa-rotate-right"></i>`;

icons.uppercase = '<i class="fa-solid fa-arrow-up-a-z"></i>';

icons.lowercase = '<i class="fa-solid fa-arrow-down-a-z"></i>';

icons.capitalize = "Aa";

icons.clearAll = `<i class="fa-solid fa-trash-can"></i>`;
icons.copyAll = `<i class="fa-solid fa-copy"></i>`;

icons.clean = `<i class="fa-solid fa-text-slash"></i>`;

// =====================================
// QUILL
// =====================================

const quill = new window.Quill("#editor", {
  theme: "snow",

  modules: {
    history: {
      delay: 500,

      maxStack: 500,

      userOnly: true,
    },

    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }, { size: [] }, { font: [] }],

        ["bold", "italic", "underline", "strike"],
        ["uppercase", "lowercase", "capitalize"],

        ["color", "background"],

        [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],

        ["code-block"],

        ["link"],

        ["clean"],

        ["undo", "redo"],

        ["clearAll", "copyAll"],
      ],
      handlers: {
        undo: () => {
          quill.history.undo();
        },

        redo: () => {
          quill.history.redo();
        },

        uppercase: () => transformText("upper"),
        lowercase: () => transformText("lower"),
        capitalize: () => transformText("capitalize"),

        // COR TEXTO
        color: function (value) {
          // LIMPAR COR
          if (value === false) {
            quill.format("color", false, "user");
            return;
          }

          // botão principal = última cor
          if (!value) {
            quill.format("color", state.lastColor, "user");
            return;
          }

          // nova cor escolhida
          state.lastColor = value;

          quill.format("color", value, "user");

          updateColorUI();
          saveState();
        },

        // COR FUNDO
        background: function (value) {
          // LIMPAR FUNDO
          if (value === false) {
            quill.format("background", false, "user");
            return;
          }

          // botão principal = última cor
          if (!value) {
            quill.format("background", state.lastBackground, "user");
            return;
          }

          // nova cor
          state.lastBackground = value;

          quill.format("background", value, "user");

          updateColorUI();
          saveState();
        },

        clearAll: async function () {
          const confirmed = await customConfirm(
            "Apagar todo o conteúdo desta aba?",
            "Limpar conteúdo",
          );

          if (!confirmed) return;

          quill.setContents([{ insert: "\n" }], "user");

          saveCurrentTab();

          saveState();
        },

        copyAll: function () {
          const text = quill.getText();
          navigator.clipboard.writeText(text).then(() => {
            // feedback visual temporário no botão
            const btn = document.querySelector(".ql-copyAll");
            if (!btn) return;
            btn.style.opacity = "0.4";
            setTimeout(() => (btn.style.opacity = ""), 400);
          });
        },
      },
    },
  },
});

const spaceBindings = quill.keyboard.bindings[" "];

if (spaceBindings) {
  quill.keyboard.bindings[" "] = spaceBindings.filter((binding) => {
    return !(binding.format && (binding.format.list || binding.prefix));
  });
}

quill.root.setAttribute("spellcheck", "false");

// REMOVE PICKERS ORIGINAIS DO QUILL
const colorPicker = document.querySelector(".ql-color");
const bgPicker = document.querySelector(".ql-background");

if (colorPicker) {
  colorPicker.innerHTML = `
    <button class="color-apply-btn" id="apply-color-btn" title="Aplicar cor">
      <span class="color-btn-letter"><i class="fa-solid fa-paintbrush"></i></span>
      <span class="color-btn-bar" id="color-bar"></span>
    </button>
    <button class="color-arrow-btn" id="open-color-picker" title="Escolher cor">▾</button>
  `;
}
if (bgPicker) {
  bgPicker.innerHTML = `
    <button class="color-apply-btn" id="apply-bg-btn" title="Aplicar cor de fundo">
      <span class="color-btn-letter"><i class="fa-solid fa-brush"></i></span>
      <span class="color-btn-bar" id="bg-bar"></span>
    </button>
    <button class="color-arrow-btn" id="open-bg-picker" title="Escolher cor de fundo">▾</button>
  `;
}

// =====================================
// FIX QUILL TOOLBAR FOCUS
// =====================================

const toolbar = document.querySelector(".ql-toolbar");

// elementos que NÃO devem roubar foco do editor
const keepEditorFocusSelectors = [
  "button",
  /* ".tab", */
  "#topbar",
  "#actions",
  "#tabs-wrapper",
  "#statusbar",
  ".color-item",
];

// impede perda de cursor
document.addEventListener("mousedown", (e) => {
  // se clicou em input REAL → deixa focar normalmente
  if (
    e.target.closest("input") ||
    e.target.closest("textarea") ||
    e.target.closest(".tab-title[contenteditable='true']") ||
    e.target.closest(".replace-popup") ||
    e.target.closest(".export-popup")
  ) {
    return;
  }

  const shouldKeepFocus = keepEditorFocusSelectors.some((selector) =>
    e.target.closest(selector),
  );

  if (!shouldKeepFocus) return;

  // NÃO bloqueia drag das tabs
  if (e.target.closest(".tab")) {
    return;
  }

  // salva posição atual
  const range = quill.getSelection();

  // impede blur do editor
  e.preventDefault();

  // restaura cursor imediatamente
  requestAnimationFrame(() => {
    quill.focus();

    if (range) {
      quill.setSelection(range, "silent");
    }
  });
});

// impede toolbar de roubar foco do editor
toolbar.addEventListener("mousedown", (e) => {
  const button = e.target.closest("button");

  if (!button) return;

  // PERMITE O BOTÃO ...
  if (button.classList.contains("toolbar-more")) {
    return;
  }

  e.preventDefault();
});

// =====================================
// TOOLTIP TOOLBAR QUILL
// =====================================

const tooltips = {
  bold: "Negrito",
  italic: "Itálico",
  underline: "Sublinhado",
  strike: "Riscado",
  link: "Inserir link",
  "code-block": "Bloco de código",
  clean: "Limpar formatação",
  undo: "Desfazer (Ctrl+Z)",
  redo: "Refazer (Ctrl+Shift+Z)",
  uppercase: "Transformar em MAIÚSCULO",
  lowercase: "Transformar em minúsculo",
  capitalize: "Primeira letra maiúscula",
};

document.querySelectorAll(".ql-toolbar button").forEach((btn) => {
  const cls = Array.from(btn.classList).find((c) => c.startsWith("ql-"));

  if (!cls) return;

  const key = cls.replace("ql-", "");

  if (tooltips[key]) {
    btn.title = tooltips[key];
  }
});

// =====================================
// UPDATE COLOR UI
// =====================================

function updateColorUI() {
  const colorBar = document.getElementById("color-bar");
  const bgBar = document.getElementById("bg-bar");
  if (colorBar) colorBar.style.background = state.lastColor;
  if (bgBar) bgBar.style.background = state.lastBackground;
}

// =====================================
// CUSTOM COLOR PICKER
// =====================================

const colorPopup = document.getElementById("color-popup");

const colorGrid = document.getElementById("color-grid");

const recentColorsEl = document.getElementById("recent-colors");

const hiddenColorPicker = document.getElementById("hidden-color-picker");

let currentColorMode = "color";

// =====================================
// CREATE GRID
// =====================================

function renderColorGrid() {
  colorGrid.innerHTML = "";

  OFFICE_COLORS.forEach((color) => {
    const item = document.createElement("div");

    item.className = "color-item";

    item.style.background = color;

    item.addEventListener("click", () => {
      applyColor(color);
    });

    colorGrid.appendChild(item);
  });
}

// =====================================
// RECENTS
// =====================================

function renderRecentColors() {
  recentColorsEl.innerHTML = "";
  const recent =
    currentColorMode === "color" ? state.recentColors : state.recentBackgrounds;

  if (recent.length === 0) {
    // ADICIONE ISSO:
    recentColorsEl.innerHTML =
      '<span style="font-size:11px;opacity:0.45;">Nenhuma cor recente</span>';
    return;
  }

  recent.slice(0, 10).forEach((color) => {
    const item = document.createElement("div");
    item.className = "color-item";
    item.style.background = color;
    item.addEventListener("click", () => applyColor(color));
    recentColorsEl.appendChild(item);
  });
}

// =====================================
// APPLY
// =====================================

function applyColor(color) {
  if (savedSelection) quill.setSelection(savedSelection);
  if (currentColorMode === "color") {
    quill.format("color", color, "user");

    state.lastColor = color;

    if (!state.recentColors.includes(color)) {
      state.recentColors.unshift(color);
    }
  } else {
    quill.format("background", color, "user");

    state.lastBackground = color;

    if (!state.recentBackgrounds.includes(color)) {
      state.recentBackgrounds.unshift(color);
    }
  }

  updateColorUI();

  saveState();

  colorPopup.classList.add("hidden");
}

// =====================================
// OPEN POPUP
// =====================================

let savedSelection = null;

function setupCustomColorPickers() {
  // ── BOTÃO ESQUERDO (aplicar) ──────────────────────────────
  // Usa mousedown + stopPropagation para evitar que o Quill
  // receba o evento e resete a cor depois do nosso handler
  document
    .getElementById("apply-color-btn")
    .addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sel = quill.getSelection();
      if (sel !== null) {
        quill.format("color", state.lastColor, "user");
      }
    });
  document.getElementById("apply-color-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // impede o Quill de agir no click também
  });

  document.getElementById("apply-bg-btn").addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = quill.getSelection();
    if (sel !== null) {
      quill.format("background", state.lastBackground, "user");
    }
  });
  document.getElementById("apply-bg-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // ── BOTÃO DIREITO (seta / dropdown) ──────────────────────
  function openPopup(e, mode) {
    e.preventDefault();
    e.stopPropagation();
    savedSelection = quill.getSelection();
    currentColorMode = mode;
    renderColorGrid();
    renderRecentColors();
    const rect = e.currentTarget.getBoundingClientRect();
    colorPopup.style.left = rect.left + "px";
    colorPopup.style.top = rect.bottom + 8 + "px";
    colorPopup.classList.remove("hidden");
  }

  document
    .getElementById("open-color-picker")
    .addEventListener("mousedown", (e) => openPopup(e, "color"));
  document
    .getElementById("open-color-picker")
    .addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

  document
    .getElementById("open-bg-picker")
    .addEventListener("mousedown", (e) => openPopup(e, "background"));
  document.getElementById("open-bg-picker").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

// =====================================
// CLEAR
// =====================================

document.querySelector(".color-clear").addEventListener("click", () => {
  if (currentColorMode === "color") {
    quill.format("color", false, "user");
  } else {
    quill.format("background", false, "user");
  }

  colorPopup.classList.add("hidden");
});

// =====================================
// CUSTOM COLOR
// =====================================

document.getElementById("custom-color-btn").addEventListener("click", () => {
  hiddenColorPicker.click();
});

hiddenColorPicker.addEventListener("input", (e) => {
  applyColor(e.target.value);
});

// =====================================
// CLOSE OUTSIDE
// =====================================

document.addEventListener("mousedown", (e) => {
  if (
    !e.target.closest(".color-popup") &&
    !e.target.closest(".ql-color") &&
    !e.target.closest(".ql-background")
  ) {
    colorPopup.classList.add("hidden");
  }
});

// =====================================
// TEXT TRANSFORM
// =====================================

function transformText(type) {
  const range = quill.getSelection();

  if (!range || range.length === 0) return;

  const text = quill.getText(range.index, range.length);

  let transformed = text;

  // =====================================
  // TRANSFORM
  // =====================================

  if (type === "upper") {
    transformed = text.toUpperCase();
  }

  if (type === "lower") {
    transformed = text.toLowerCase();
  }

  if (type === "capitalize") {
    transformed = text.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // =====================================
  // PRESERVA FORMATAÇÃO
  // =====================================

  const formats = quill.getFormat(range.index, range.length);

  quill.deleteText(range.index, range.length, "user");

  quill.insertText(range.index, transformed, formats, "user");

  quill.setSelection(range.index, transformed.length);
}

// ==========================
// LOAD
// ==========================

async function loadState() {
  try {
    const saved = await window.appAPI.loadData();

    if (saved) {
      state = {
        theme: saved.theme || "dark",
        currentTab: typeof saved.currentTab === "number" ? saved.currentTab : 0,
        tabs: Array.isArray(saved.tabs) ? saved.tabs : [],
        lastColor: saved.lastColor || "#000000",
        lastBackground: saved.lastBackground || "#ffff00",
        recentColors: Array.isArray(saved.recentColors)
          ? saved.recentColors
          : [],
        recentBackgrounds: Array.isArray(saved.recentBackgrounds)
          ? saved.recentBackgrounds
          : [],
      };
    }
  } catch (err) {
    console.error(err);
  }

  // GARANTE TABS

  if (!Array.isArray(state.tabs) || !state.tabs.length) {
    state.tabs = [
      {
        title: "Nota 1",

        content: {
          ops: [],
        },

        cursor: 0,
      },
    ];
  }

  // GARANTE CONTENT

  state.tabs = state.tabs.map((tab) => ({
    title: tab.title || "Sem título",

    content: tab.content || { ops: [] },

    cursor: typeof tab.cursor === "number" ? tab.cursor : 0,
  }));

  // GARANTE INDEX

  if (state.currentTab >= state.tabs.length) {
    state.currentTab = 0;
  }

  document.body.className = state.theme;

  updateThemeIcon();

  renderTabs();

  loadCurrentTab();

  quill.focus();

  updateColorUI();

  initTabsSortable();
}

// ==========================
// SAVE
// ==========================

async function saveState() {
  try {
    await window.appAPI.saveData(state);
  } catch (err) {
    console.error(err);
  }
}
// =====================================
// SAVE CURSOR POSITION
// =====================================

quill.on("selection-change", (range) => {
  if (!range) return;

  const currentTab = state.tabs[state.currentTab];

  if (!currentTab) return;

  currentTab.cursor = range.index;
});
// ==========================
// SAVE CURRENT TAB
// ==========================

function saveCurrentTab() {
  if (!state.tabs[state.currentTab]) return;

  state.tabs[state.currentTab].content = quill.getContents();
}

// ==========================
// LOAD CURRENT TAB
// ==========================

function loadCurrentTab() {
  const tab = state.tabs[state.currentTab];

  if (!tab) return;

  quill.setContents(tab.content || { ops: [] });

  const cursorPos = typeof tab.cursor === "number" ? tab.cursor : 0;

  setTimeout(() => {
    const max = Math.max(0, quill.getLength() - 1);

    const finalPos = Math.min(cursorPos, max);

    quill.setSelection(finalPos, 0, "silent");

    quill.focus();

    // 🔥 FORÇA STATUSBAR CORRETA
    updateStatusBar({
      index: finalPos,
      length: 0,
    });
  }, 0);
}

// ==========================
// RENDER TABS
// ==========================

function renderTabs() {
  tabsEl.innerHTML = "";

  state.tabs.forEach((tabData, index) => {
    const tab = document.createElement("div");

    tab.className = "tab";

    if (index === state.currentTab) {
      tab.classList.add("active");
    }

    // TITLE

    const title = document.createElement("div");

    title.className = "tab-title";

    title.contentEditable = false;

    title.innerText = tabData.title;
    title.title = tabData.title;

    // EVITA SELECIONAR ABA ENQUANTO EDITA

    title.addEventListener("click", (e) => {
      if (title.isContentEditable) {
        e.stopPropagation();
      }
    });

    // CLOSE

    const close = document.createElement("div");

    close.className = "close-tab";

    close.innerText = "✕";
    close.title = "Fechar aba";

    close.addEventListener("click", async (e) => {
      e.stopPropagation();

      document.activeElement?.blur();
      quill.blur();

      if (state.tabs.length === 1) {
        return;
      }

      // CONFIRMAÇÃO

      const confirmed = await customConfirm(
        `Deseja realmente fechar a aba "${tabData.title}"?`,
        "Fechar aba",
      );

      if (!confirmed) return;

      setTimeout(() => {
        quill.focus();

        const current = state.tabs[state.currentTab];

        if (current && typeof current.cursor === "number") {
          quill.setSelection(current.cursor, 0, "silent");
        }
      }, 0);

      // REMOVE

      state.tabs.splice(index, 1);

      // AJUSTA CURRENT TAB

      if (state.currentTab >= state.tabs.length) {
        state.currentTab = state.tabs.length - 1;
      }

      // RENDER

      renderTabs();

      loadCurrentTab();
      quill.focus();

      await saveState();

      requestAnimationFrame(() => {
        quill.focus();

        const current = state.tabs[state.currentTab];

        if (!current) return;

        const pos =
          typeof current.cursor === "number"
            ? current.cursor
            : quill.getLength() - 1;

        quill.setSelection(pos, 0, "silent");
      });
    });

    // =====================================
    // CLICK / DOUBLE CLICK
    // =====================================

    let clickTimer = null;
    let isEditing = false;

    // CLICK = TROCAR ABA
    tab.addEventListener("click", async (e) => {
      if (isDraggingTab) return;
      if (isEditing) return;

      clearTimeout(clickTimer);

      clickTimer = setTimeout(async () => {
        // salva cursor da aba atual
        const range = quill.getSelection();

        if (range && state.tabs[state.currentTab]) {
          state.tabs[state.currentTab].cursor = range.index;
        }

        saveCurrentTab();

        state.currentTab = index;

        renderTabs();

        loadCurrentTab();
        quill.focus();

        await saveState();
      }, 10);
    });

    // DOUBLE CLICK = EDITAR
    title.addEventListener("dblclick", (e) => {
      e.stopPropagation();

      clearTimeout(clickTimer);

      isEditing = true;

      title.contentEditable = true;

      title.focus();

      // DESABILITA DRAG
      tab.draggable = false;

      // CURSOR NO FINAL
      const range = document.createRange();

      range.selectNodeContents(title);

      range.collapse(false);

      const selection = window.getSelection();

      selection.removeAllRanges();

      selection.addRange(range);
    });

    // FINALIZA EDIÇÃO
    title.addEventListener("blur", async () => {
      isEditing = false;

      title.contentEditable = false;

      tab.draggable = true;

      // nome digitado
      let newTitle = title.innerText.trim() || "Sem título";

      // remove a própria aba da comparação
      const existing = state.tabs
        .filter((_, i) => i !== index)
        .map((t) => t.title);

      // função local pra evitar conflito
      function makeUnique(name) {
        if (!existing.includes(name)) {
          return name;
        }

        let counter = 1;

        while (existing.includes(`${name} (${counter})`)) {
          counter++;
        }

        return `${name} (${counter})`;
      }

      newTitle = makeUnique(newTitle);

      tabData.title = newTitle;

      title.innerText = newTitle;

      title.title = newTitle;

      await saveState();
    });

    // ENTER FINALIZA
    title.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();

        title.blur();
      }
    });
    /////////////////////////////////////////////////////
    tab.appendChild(title);

    tab.appendChild(close);

    tabsEl.appendChild(tab);
  });
}

// =====================================
// UNIQUE TAB NAME
// =====================================

function getUniqueTabName(baseName) {
  const existing = state.tabs.map((t) => t.title);

  // se não existir igual
  if (!existing.includes(baseName)) {
    return baseName;
  }

  let counter = 1;

  while (existing.includes(`${baseName} (${counter})`)) {
    counter++;
  }

  return `${baseName} (${counter})`;
}

// ==========================
// ADD TAB
// ==========================

addTabBtn.addEventListener("click", async () => {
  saveCurrentTab();

  state.tabs.push({
    title: getUniqueTabName(`Nota ${state.tabs.length + 1}`),

    content: {
      ops: [],
    },

    cursor: 0,
  });

  state.currentTab = state.tabs.length - 1;

  renderTabs();

  loadCurrentTab();
  quill.focus();

  await saveState();
});

// ==========================
// QUILL AUTOSAVE
// ==========================

quill.on("text-change", () => {
  scheduleSaveState();
});

// ==========================
// THEME
// ==========================

const themeIcon = document.querySelector(".theme-icon");

function updateThemeIcon() {
  themeIcon.textContent = state.theme === "dark" ? "☀" : "🌙";
}

themeBtn.addEventListener("click", async () => {
  themeBtn.classList.add("animate");

  setTimeout(() => {
    themeBtn.classList.remove("animate");
  }, 400);

  state.theme = state.theme === "dark" ? "light" : "dark";

  document.body.className = state.theme;

  updateThemeIcon();

  await saveState();
});

// ==========================
// SEARCH
// ==========================

// ==========================
// SEARCH (TÍTULO E CONTEÚDO)
// ==========================

searchEl.addEventListener("input", () => {
  const value = searchEl.value.toLowerCase().trim();

  document.querySelectorAll(".tab").forEach((tab, index) => {
    const tabData = state.tabs[index];
    if (!tabData) return;

    const titleMatch = tabData.title.toLowerCase().includes(value);

    // Busca no texto dos ops do Quill
    let contentText = "";
    if (tabData.content && Array.isArray(tabData.content.ops)) {
      contentText = tabData.content.ops
        .map((op) => (typeof op.insert === "string" ? op.insert : ""))
        .join(" ")
        .toLowerCase();
    }

    const contentMatch = contentText.includes(value);
    const visible = !value || titleMatch || contentMatch;

    tab.style.display = visible ? "flex" : "none";
  });
});

// =====================================
// EXPORT POPUP
// =====================================

const exportPopup = document.getElementById("export-popup");
const closeExport = document.getElementById("close-export");
const exportTxtBtn = document.getElementById("export-txt");
const exportPdfBtn = document.getElementById("export-pdf");

exportBtn.onclick = () => {
  exportPopup.classList.remove("hidden");
};

closeExport.onclick = () => {
  exportPopup.classList.add("hidden");
};

const exportMdBtn = document.getElementById("export-md");

// TXT

exportTxtBtn.onclick = async () => {
  const current = state.tabs[state.currentTab];
  const text = quill.getText();
  const savedPath = await window.appAPI.saveTxt({
    filename: `${current.title}.txt`,
    content: text,
  });
  if (!savedPath) return;
  lastDownloadedPdf = savedPath;
  downloadToast.classList.remove("hidden");
  clearTimeout(downloadToast.hideTimer);
  downloadToast.hideTimer = setTimeout(() => {
    downloadToast.classList.add("hidden");
  }, 5000);
  exportPopup.classList.add("hidden");
};

// MARKDOWN (.md)

if (exportMdBtn) {
  exportMdBtn.onclick = async () => {
    const current = state.tabs[state.currentTab];
    const text = quill.getText();
    const savedPath = await window.appAPI.saveMd({
      filename: `${current.title}.md`,
      content: text,
    });
    if (!savedPath) return;
    lastDownloadedPdf = savedPath;
    downloadToast.classList.remove("hidden");
    clearTimeout(downloadToast.hideTimer);
    downloadToast.hideTimer = setTimeout(() => {
      downloadToast.classList.add("hidden");
    }, 5000);
    exportPopup.classList.add("hidden");
  };
}

// =====================================
// PDF CORRIGIDO
// =====================================

exportPdfBtn.onclick = () => {
  const current = state.tabs[state.currentTab];

  // =====================================
  // CLONE + FIX CHECKLIST
  // =====================================

  const clone = document.createElement("div");

  clone.innerHTML = quill.root.innerHTML;

  clone.style.padding = "20px";
  clone.style.background = "#fff";
  clone.style.color = "#000";
  // =====================================
  // QUILL PDF STYLES
  // =====================================

  clone.style.fontFamily = "Arial, sans-serif";
  clone.style.fontSize = "14px";
  clone.style.lineHeight = "1.5";
  clone.style.whiteSpace = "normal";
  clone.style.wordBreak = "break-word";

  // FONTES
  clone.querySelectorAll(".ql-font-monospace").forEach((el) => {
    el.style.fontFamily = "monospace";
  });

  clone.querySelectorAll(".ql-font-serif").forEach((el) => {
    el.style.fontFamily = "serif";
  });

  // TAMANHOS
  clone.querySelectorAll(".ql-size-small").forEach((el) => {
    el.style.fontSize = "12px";
  });

  clone.querySelectorAll(".ql-size-large").forEach((el) => {
    el.style.fontSize = "22px";
  });

  clone.querySelectorAll(".ql-size-huge").forEach((el) => {
    el.style.fontSize = "32px";
  });

  // CODE BLOCK
  clone.querySelectorAll(".ql-code-block").forEach((el) => {
    el.style.fontFamily = "monospace";
    el.style.background = "#1e1e1e";
    el.style.color = "#ffffff";
    el.style.padding = "10px";
    el.style.borderRadius = "6px";
    el.style.whiteSpace = "pre-wrap";
    el.style.display = "block";
    el.style.margin = "8px 0";
  });

  // BLOCKQUOTE
  clone.querySelectorAll("blockquote").forEach((el) => {
    el.style.borderLeft = "4px solid #ccc";
    el.style.paddingLeft = "12px";
    el.style.marginLeft = "0";
    el.style.color = "#555";
  });

  // LINKS
  clone.querySelectorAll("a").forEach((el) => {
    el.style.color = "#2563eb";
    el.style.textDecoration = "underline";
  });
  // =====================================
  // CONVERTE CHECKLIST DO QUILL
  // FIX TOTAL LISTAS (CHECK + BULLET)
  // =====================================

  clone.querySelectorAll("li").forEach((li, i) => {
    const type = li.getAttribute("data-list");

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "flex-start";
    wrapper.style.gap = "8px";
    wrapper.style.marginBottom = "4px";

    const prefix = document.createElement("span");

    // =====================
    // CHECKLIST
    // =====================
    const isChecked = type === "checked";

    if (type === "checked" || type === "unchecked") {
      prefix.innerText = isChecked ? "✔" : "☐";
      prefix.style.color = isChecked ? "green" : "#000000";
      prefix.style.fontWeight = "bold";
    }

    const textEl = document.createElement("span");
    textEl.innerHTML = li.innerHTML;

    if (isChecked) {
      textEl.style.textDecoration = "line-through";
      textEl.style.opacity = "0.6";
    }

    // =====================
    // BULLET (🔥 CORRETO)
    // =====================
    else if (type === "bullet") {
      prefix.innerText = "•";
      prefix.style.fontWeight = "bold";
    }

    // =====================
    // ORDERED
    // =====================
    else if (type === "ordered") {
      // pega índice dentro da lista pai
      const parent = li.parentNode;
      const items = Array.from(parent.children);
      const index = items.indexOf(li) + 1;

      prefix.innerText = index + ".";
    }

    const text = document.createElement("span");
    text.innerHTML = li.innerHTML;

    // checklist riscado
    if (type === "checked") {
      text.style.textDecoration = "line-through";
      text.style.opacity = "0.6";
    }

    wrapper.appendChild(prefix);
    wrapper.appendChild(textEl);

    li.parentNode.insertBefore(wrapper, li);
    li.remove();
  });

  // evita quebra feia
  clone.querySelectorAll("p, li, h1, h2, h3").forEach((el) => {
    const wrap = document.createElement("div");
    wrap.style.pageBreakInside = "avoid";

    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
  });

  const opt = {
    margin: 10,

    html2canvas: {
      scale: 2,
      useCORS: true,
    },

    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },

    pagebreak: {
      mode: ["css", "legacy"],
    },
  };

  html2pdf()
    .set(opt)
    .from(clone)
    .outputPdf("blob")
    .then(async (pdfBlob) => {
      const arrayBuffer = await pdfBlob.arrayBuffer();

      const savedPath = await window.appAPI.savePdf({
        filename: `${current.title}.pdf`,
        data: Array.from(new Uint8Array(arrayBuffer)),
      });

      if (!savedPath) return;

      lastDownloadedPdf = savedPath;

      downloadToast.classList.remove("hidden");

      clearTimeout(downloadToast.hideTimer);

      downloadToast.hideTimer = setTimeout(() => {
        downloadToast.classList.add("hidden");
      }, 5000);
    });

  exportPopup.classList.add("hidden");
};

// ==========================
// IMPORT
// ==========================

importBtn.addEventListener("click", () => {
  importFile.accept = ".txt";

  importFile.click();
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = async () => {
    const text = reader.result;

    // SALVA ABA ATUAL ANTES
    saveCurrentTab();

    // NOME DO ARQUIVO SEM .txt
    const fileName = getUniqueTabName(file.name.replace(/\.[^/.]+$/, ""));

    // NOVA ABA
    state.tabs.push({
      title: fileName || `Nota ${state.tabs.length + 1}`,

      content: {
        ops: [
          {
            insert: text,
          },
        ],
      },
    });

    // MUDA PRA NOVA ABA
    state.currentTab = state.tabs.length - 1;

    // RENDER
    renderTabs();

    loadCurrentTab();
    quill.focus();

    await saveState();

    // limpa input pra permitir importar mesmo arquivo novamente
    importFile.value = "";
  };

  reader.readAsText(file);
});

// ==========================
// BEFORE CLOSE
// ==========================
window.addEventListener("beforeunload", async () => {
  // salva conteúdo atual
  saveCurrentTab();

  // pega posição REAL do cursor no momento exato do fechamento
  const range = quill.getSelection();

  if (range && state.tabs[state.currentTab]) {
    state.tabs[state.currentTab].cursor = range.index;
  }

  // força persistência final
  await saveState();
});

// =====================================
// DRAG TABS
// =====================================

let tabsSortable = null;
let isDraggingTab = false;

function initTabsSortable() {
  const tabs = document.getElementById("tabs");

  if (!tabs) return;

  if (tabsSortable) {
    tabsSortable.destroy();
  }

  tabsSortable = new Sortable(tabs, {
    animation: 150,

    draggable: ".tab",

    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "dragging-tab",

    forceFallback: true,
    fallbackTolerance: 3,

    onStart: () => {
      isDraggingTab = true;
    },

    onEnd: async (evt) => {
      isDraggingTab = false;

      if (evt.oldIndex === evt.newIndex) return;

      const movedTab = state.tabs.splice(evt.oldIndex, 1)[0];

      state.tabs.splice(evt.newIndex, 0, movedTab);

      // mantém aba atual correta
      if (state.currentTab === evt.oldIndex) {
        state.currentTab = evt.newIndex;
      } else if (
        evt.oldIndex < state.currentTab &&
        evt.newIndex >= state.currentTab
      ) {
        state.currentTab--;
      } else if (
        evt.oldIndex > state.currentTab &&
        evt.newIndex <= state.currentTab
      ) {
        state.currentTab++;
      }

      renderTabs();

      await saveState();
    },
  });
}

// =====================================
// REPLACE SYSTEM
// =====================================

const replacePopup = document.getElementById("replace-popup");

const findInput = document.getElementById("find-input");
const replaceInput = document.getElementById("replace-input");
const caseSensitive = document.getElementById("case-sensitive");
const replaceBtn = document.getElementById("replace-btn");
const replaceAllBtn = document.getElementById("replace-all");
findInput.addEventListener("input", () => {
  lastFindIndex = 0;
});
const closeReplace = document.getElementById("close-replace");

// ABRIR (CTRL + H)

function openReplacePopup() {
  replacePopup.classList.remove("hidden");

  findInput.focus();
}

// botão
replaceBtn.addEventListener("click", () => {
  openReplacePopup();
});

// atalho
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
    e.preventDefault();

    openReplacePopup();
  }
});

// FECHAR

closeReplace.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  replacePopup.classList.add("hidden");
});

// =====================================
// FIND NEXT
// =====================================

const findNextBtn = document.getElementById("find-next");

let lastFindIndex = 0;

findNextBtn.onclick = () => {
  const find = findInput.value;

  if (!find) return;

  const flags = caseSensitive.checked ? "g" : "gi";

  try {
    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(escapeRegex(find), flags);

    const text = quill.getText();

    regex.lastIndex = lastFindIndex;

    const match = regex.exec(text);

    // encontrou
    if (match) {
      const index = match.index;

      quill.setSelection(index, match[0].length, "user");

      quill.scrollIntoView();

      lastFindIndex = index + match[0].length;
    }

    // reinicia busca
    else {
      lastFindIndex = 0;

      const restartMatch = regex.exec(text);

      if (restartMatch) {
        quill.setSelection(restartMatch.index, restartMatch[0].length, "user");

        quill.scrollIntoView();

        lastFindIndex = restartMatch.index + restartMatch[0].length;
      }
    }
  } catch (err) {
    console.error("Erro find:", err);
  }
};

// SUBSTITUIR TUDO

// =====================================
// REPLACE ALL (MANTÉM FORMATAÇÃO PERFEITA)
// =====================================

replaceAllBtn.onclick = () => {
  const find = findInput.value;
  const replace = replaceInput.value;

  if (!find) return;

  const flags = caseSensitive.checked ? "g" : "gi";

  try {
    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(escapeRegex(find), flags);

    const text = quill.getText();

    let match;

    const matches = [];

    // 🔍 encontrar ocorrências
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }

    // 🔥 processar de trás pra frente
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];

      // 🧠 pega formatação EXATA do início
      const formats = quill.getFormat(m.index, m.length);

      // remove texto antigo
      quill.deleteText(m.index, m.length, "user");

      // insere novo texto COM FORMATAÇÃO
      quill.insertText(m.index, replace, formats, "user");
    }
  } catch (err) {
    console.error("Erro replace:", err);
  }
};

// =====================================
// DRAG + SNAP + LIMIT + SAVE
// =====================================

const popup = document.getElementById("replace-popup");
const dragHandle = document.getElementById("replace-drag");

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

// DRAG START

dragHandle.addEventListener("mousedown", (e) => {
  if (e.target.closest("button") || e.target.id === "close-replace") {
    return;
  }

  isDragging = true;

  const rect = popup.getBoundingClientRect();

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  popup.style.transform = "none";
});

// DRAG MOVE

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const width = popup.offsetWidth;
  const height = popup.offsetHeight;

  let left = e.clientX - offsetX;
  let top = e.clientY - offsetY;

  // LIMITES DA TELA

  left = Math.max(0, Math.min(window.innerWidth - width, left));
  top = Math.max(0, Math.min(window.innerHeight - height, top));

  // SNAP

  const SNAP = 20;

  if (left < SNAP) left = 0;
  if (top < SNAP) top = 0;

  if (left + width > window.innerWidth - SNAP) {
    left = window.innerWidth - width;
  }

  if (top + height > window.innerHeight - SNAP) {
    top = window.innerHeight - height;
  }

  popup.style.left = left + "px";
  popup.style.top = top + "px";
});

// DRAG END

document.addEventListener("mouseup", async () => {
  if (!isDragging) return;

  isDragging = false;

  // SAVE POSITION
});
// ==========================
// DEBOUNCED AUTO SAVE (Substitui o setInterval(1000) contínuo)
// ==========================

let saveDebounceTimer = null;

function scheduleSaveState() {
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    saveCurrentTab();
    await saveState();
  }, 300);
}

// =====================================
// APP VERSION TITLE
// =====================================

async function updateAppTitle() {
  const version = await window.appAPI.getVersion();

  document.title = `Notas Independente - v${version}`;
}

updateAppTitle();

// =====================================
// UPDATE UI
// =====================================
const updateOverlay = document.getElementById("update-overlay");
const updateTitle = document.getElementById("update-title");
const updateSubtitle = document.getElementById("update-subtitle");
const updatePercent = document.getElementById("update-percent");
const updateProgressBar = document.getElementById("update-progress-bar");
const updateActions = document.getElementById("update-actions");
const updateIcon = document.getElementById("update-icon");

/* window.appAPI.onUpdateAvailable((version) => {
  updateTitle.textContent = `Nova versão v${version} disponível`;
  updateSubtitle.textContent = "Baixando atualização...";
  updateOverlay.classList.remove("hidden");
});

window.appAPI.onUpdateProgress((percent) => {
  updateProgressBar.style.width = percent + "%";
  updatePercent.textContent = percent + "%";
});

window.appAPI.onUpdateDownloaded(() => {
  updateIcon.innerHTML =
    '<i class="fa-solid fa-check-to-slot" style="color: rgb(0, 255, 0);"></i>';
  updateTitle.textContent = "Atualização pronta!";
  updateSubtitle.textContent = "";
  updatePercent.textContent = "";
  document.getElementById("update-progress-wrap").classList.add("hidden");
  updateActions.classList.remove("hidden");
});

document.getElementById("update-restart-btn").addEventListener("click", () => {
  window.appAPI.restartApp();
}); */

document.getElementById("update-later-btn").addEventListener("click", () => {
  updateOverlay.classList.add("hidden");
});

// =====================================
// QUILL TOOLBAR RESPONSIVE
// =====================================

function initResponsiveToolbar() {
  const toolbar = document.querySelector(".ql-toolbar");

  if (!toolbar) return;

  // evita duplicar
  if (toolbar.dataset.responsiveReady) return;

  toolbar.dataset.responsiveReady = "true";

  // botão
  const moreBtn = document.createElement("button");

  moreBtn.className = "toolbar-more";

  moreBtn.innerHTML = '<i class="fa-solid fa-angles-down"></i>';

  // dropdown
  const dropdown = document.createElement("div");

  dropdown.className = "toolbar-dropdown";

  toolbar.appendChild(moreBtn);

  toolbar.appendChild(dropdown);

  // grupos originais
  const groups = [...toolbar.querySelectorAll(".ql-formats")];

  function update() {
    // devolve tudo
    groups.forEach((group) => {
      toolbar.insertBefore(group, moreBtn);
    });

    dropdown.innerHTML = "";

    moreBtn.style.display = "none";

    const toolbarRect = toolbar.getBoundingClientRect();

    const limit = toolbarRect.right - 50;

    let collision = false;

    groups.forEach((group) => {
      const rect = group.getBoundingClientRect();

      // PRIMEIRA COLISÃO REAL
      if (rect.right > limit || collision) {
        collision = true;

        dropdown.appendChild(group);

        moreBtn.style.display = "flex";
      }
    });

    // fecha se vazio
    if (!dropdown.children.length) {
      dropdown.classList.remove("show");
    }
  }

  // toggle
  moreBtn.addEventListener("mousedown", (e) => {
    e.stopPropagation();

    dropdown.classList.toggle("show");
  });

  // fechar fora
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !moreBtn.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });

  // resize
  window.addEventListener("resize", () => {
    requestAnimationFrame(update);
  });

  // primeira render
  setTimeout(update, 200);
}

// =====================================
// STATUS BAR
// =====================================

const cursorPosEl = document.getElementById("cursor-pos");
const charCountEl = document.getElementById("char-count");
const wordCountEl = document.getElementById("word-count");

function updateStatusBar(range = quill.getSelection()) {
  // POSIÇÃO CURSOR
  if (range) {
    const textBefore = quill.getText(0, range.index);

    const lines = textBefore.split("\n");

    const line = lines.length;

    const col = lines[lines.length - 1].length + 1;

    cursorPosEl.textContent = `Ln ${line}, Col ${col}`;
  }

  // TEXTO TOTAL
  const text = quill.getText().trim();

  // CARACTERES
  charCountEl.textContent = `${text.length} caracteres`;

  // PALAVRAS
  const words = text ? text.split(/\s+/).length : 0;

  wordCountEl.textContent = `${words} palavras`;
}

// CURSOR
quill.on("selection-change", (range) => {
  updateStatusBar(range);
});

// TEXTO
quill.on("text-change", () => {
  updateStatusBar();
});

// =====================================
// CONFIRMAÇÃO DE FECHAMENTO DA ABA
// =====================================
const confirmTitle = document.getElementById("confirm-title");
const confirmPopup = document.getElementById("confirm-popup");
const confirmMessage = document.getElementById("confirm-message");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");

function customConfirm(message, title = "Confirmação") {
  return new Promise((resolve) => {
    confirmTitle.textContent = title;

    confirmMessage.textContent = message;

    document.querySelector(".confirm-title").textContent = title;

    confirmPopup.classList.remove("hidden");

    function handleKey(e) {
      // ENTER ou ESPAÇO = confirmar
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();

        cleanup();

        resolve(true);
      }

      // ESC = cancelar
      if (e.key === "Escape") {
        e.preventDefault();

        cleanup();

        resolve(false);
      }
    }

    document.addEventListener("keydown", handleKey);

    const cleanup = () => {
      confirmPopup.classList.add("hidden");

      confirmOk.onclick = null;
      confirmCancel.onclick = null;

      document.removeEventListener("keydown", handleKey);

      requestAnimationFrame(() => {
        quill.focus();
      });
    };

    confirmOk.onclick = () => {
      cleanup();
      resolve(true);
    };

    confirmCancel.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

// =====================================
// ALWAYS ON TOP (PIN BUTTON)
// =====================================

const pinBtn = document.getElementById("pin-btn");

async function updatePinButtonUI(forcedState = null) {
  if (!pinBtn) return;
  const isOnTop =
    typeof forcedState === "boolean"
      ? forcedState
      : await window.appAPI?.isAlwaysOnTop();

  if (isOnTop) {
    pinBtn.classList.add("active");
    pinBtn.title = "Desafixar do topo (Ctrl+Alt+P)";
  } else {
    pinBtn.classList.remove("active");
    pinBtn.title = "Fixar no topo (Ctrl+Alt+P)";
  }
}

if (pinBtn) {
  pinBtn.addEventListener("click", async () => {
    const newState = await window.appAPI?.toggleAlwaysOnTop();
    updatePinButtonUI(newState);
  });
}

window.appAPI?.onAlwaysOnTopChanged((isOnTop) => {
  updatePinButtonUI(isOnTop);
});

// =====================================
// TABS WHEEL SCROLL (ROLAGEM HORIZONTAL SUAVE)
// =====================================

const tabsWrapperEl = document.getElementById("tabs-wrapper");
if (tabsWrapperEl) {
  tabsWrapperEl.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        tabsWrapperEl.scrollLeft += e.deltaY * 0.8;
      }
    },
    { passive: false }
  );
}

// =====================================
// GLOBAL SHORTCUT -> NEW TAB
// ===================================

window.appAPI?.onNewTabShortcut(() => {
  addTabBtn.click();
});

// ==========================
// INIT
// ==========================

loadState();
updateColorUI();
setupCustomColorPickers();
initResponsiveToolbar();
updatePinButtonUI();
