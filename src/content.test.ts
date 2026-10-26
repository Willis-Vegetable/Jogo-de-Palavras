import { describe, expect, it } from "vitest";
import { ACCEPTED_WORDS, getDailyEntry, getPracticeEntry, wordsForDifficulty } from "./content";
import { LEVEL_RULES, type Difficulty } from "./game-core";

describe("catálogo de palavras PT-BR", () => {
  it.each(["easy", "normal", "hard"] as Difficulty[])("mantém respostas e palpites no tamanho do nível %s", (difficulty) => {
    const expectedLength = LEVEL_RULES[difficulty].length;
    const entries = wordsForDifficulty(difficulty);

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.normalized.length === expectedLength)).toBe(true);
    expect([...ACCEPTED_WORDS[difficulty]].every((word) => word.length === expectedLength)).toBe(true);
    expect(getPracticeEntry(difficulty).normalized.length).toBe(expectedLength);
    expect(getDailyEntry("2026-10-13", difficulty).normalized.length).toBe(expectedLength);
  });

  it("seleciona o mesmo desafio para a mesma data e configuração", () => {
    expect(getDailyEntry("2026-10-13", "normal").id).toBe(getDailyEntry("2026-10-13", "normal").id);
  });
});