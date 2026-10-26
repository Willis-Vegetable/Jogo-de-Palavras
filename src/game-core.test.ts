import { describe, expect, it } from "vitest";
import { evaluateGuess, makeShareGrid, mergeKeyboardMarks, normalizeWord, validateGuess } from "./game-core";

describe("normalização e avaliação de palpites", () => {
  it("normaliza acentos sem alterar o tamanho lógico", () => {
    expect(normalizeWord("ação")).toBe("ACAO");
    expect(normalizeWord("  café ")).toBe("CAFE");
  });

  it("marca letras corretas, presentes e ausentes", () => {
    expect(evaluateGuess("ALTOS", "FESTA")).toEqual(["present", "absent", "present", "absent", "present"]);
  });

  it("consome ocorrências uma única vez quando há letras repetidas", () => {
    expect(evaluateGuess("ASSAS", "FESTA")).toEqual(["present", "absent", "correct", "absent", "absent"]);
  });

  it("rejeita tamanhos incompatíveis", () => {
    expect(() => evaluateGuess("SOL", "FESTA")).toThrow(/mesmo número de letras/);
  });

  it("não rebaixa uma letra correta no teclado", () => {
    expect(mergeKeyboardMarks({ A: "correct" }, "CASA", ["absent", "absent", "present", "absent"])).toMatchObject({ A: "correct", C: "absent", S: "present" });
  });

  it("valida comprimento e dicionário sem consumir tentativa", () => {
    const accepted = new Set(["FESTA", "CASAS"]);
    expect(validateGuess("SOL", 5, accepted)).toMatch(/exatamente 5/);
    expect(validateGuess("NUNCA", 5, accepted)).toMatch(/lista de palpites/);
    expect(validateGuess("festa", 5, accepted)).toBeNull();
  });

  it("gera grade compartilhável sem incluir o palpite ou a resposta", () => {
    const grid = makeShareGrid([{ marks: ["correct", "present", "absent"] }], "won", 1, 6, "Diário");
    expect(grid).toContain("1/6");
    expect(grid).toContain("■▨□");
    expect(grid).not.toContain("FESTA");
  });
});