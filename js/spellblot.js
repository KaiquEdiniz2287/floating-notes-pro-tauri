// js/spellblot.js
// Registra o Quill Blot customizado para erros ortográficos.
// DEVE ser carregado ANTES do popup.js (que cria a instância do Quill).

(function () {
  if (typeof window.Quill === "undefined") {
    console.warn("[SpellBlot] Quill não encontrado. O blot não será registrado.");
    return;
  }

  const Inline = Quill.import("blots/inline");
  const Delta = Quill.import("delta");

  class SpellErrorBlot extends Inline {
    static create(word) {
      const node = super.create();
      if (word && typeof word === "string") {
        node.setAttribute("data-spell-word", word);
      }
      return node;
    }

    static formats(node) {
      return node.getAttribute("data-spell-word") || true;
    }

    format(name, value) {
      if (name === SpellErrorBlot.blotName && !value) {
        this.unwrap();
      } else {
        super.format(name, value);
      }
    }

    // Sobrescreve delta() para NÃO incluir spell-error na serialização
    // Isso garante que os erros marcados NÃO são salvos no arquivo de dados
    delta() {
      return this.children.reduce((memo, child) => {
        return memo.concat(child.delta());
      }, new Delta());
    }
  }

  SpellErrorBlot.blotName = "spell-error";
  SpellErrorBlot.tagName = "span";
  SpellErrorBlot.className = "ql-spell-error";

  Quill.register(SpellErrorBlot, true);
})();
