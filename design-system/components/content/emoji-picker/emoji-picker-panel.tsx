"use client";

/**
 * Fronteira dinâmica ÚNICA do `emoji-picker-react`.
 *
 * Tudo o que toca a biblioteca em tempo de execução — o componente e os enums
 * `Theme`/`Categories`/`EmojiStyle` — vive aqui. `emoji-picker.tsx` carrega
 * este módulo só por `lazy(() => import("./emoji-picker-panel"))` e mantém
 * apenas `import type` da lib (apagado na compilação).
 *
 * O motivo é concreto: com o import estático dos enums convivendo com o
 * `lazy()` no mesmo arquivo, o bundler emitia
 * `[INEFFECTIVE_DYNAMIC_IMPORT] ... is dynamically imported by
 * emoji-picker.tsx but also statically imported by emoji-picker.tsx, dynamic
 * import will not move module into another chunk` — ou seja, o code-split não
 * acontecia e a lib inteira entrava no bundle principal. Os enums são valores
 * de runtime (não são apagáveis como tipos), então a única forma de manter uma
 * fronteira é isolar quem os usa.
 */

import { memo } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import EmojiPicker, { Categories, EmojiStyle, Theme } from "emoji-picker-react";

// Categories config - static to avoid re-renders
const PICKER_CATEGORIES = [
  { category: Categories.SUGGESTED, name: "Recentes" },
  { category: Categories.SMILEYS_PEOPLE, name: "Pessoas" },
  { category: Categories.ANIMALS_NATURE, name: "Natureza" },
  { category: Categories.FOOD_DRINK, name: "Comida" },
  { category: Categories.TRAVEL_PLACES, name: "Viagem" },
  { category: Categories.ACTIVITIES, name: "Atividades" },
  { category: Categories.OBJECTS, name: "Objetos" },
  { category: Categories.SYMBOLS, name: "Símbolos" },
  { category: Categories.FLAGS, name: "Bandeiras" },
];

const PREVIEW_CONFIG = { showPreview: false };

export interface EmojiPickerPanelProps {
  /** Tema resolvido pelo consumidor — evita expor o enum `Theme` da lib. */
  isDark: boolean;
  onEmojiClick: (emojiData: EmojiClickData) => void;
}

// Memoized picker wrapper to prevent re-renders
export default memo(function EmojiPickerPanel({
  isDark,
  onEmojiClick,
}: EmojiPickerPanelProps) {
  return (
    <EmojiPicker
      theme={isDark ? Theme.DARK : Theme.LIGHT}
      emojiStyle={EmojiStyle.NATIVE}
      onEmojiClick={onEmojiClick}
      width={320}
      height={400}
      searchPlaceholder="Buscar emoji..."
      categories={PICKER_CATEGORIES}
      previewConfig={PREVIEW_CONFIG}
      skinTonesDisabled
      lazyLoadEmojis
    />
  );
});
