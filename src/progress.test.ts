import { afterEach, describe, expect, it, vi } from "vitest";
import { createDailyRound, createPracticeRound, dailyRoundKey, getAttemptRank, loadProgress, summarizeSessions, type GameRound } from "./progress";
import { getDailyEntry, getSaoPauloDate } from "./content";
import { evaluateGuess } from "./game-core";

afterEach(() => vi.unstubAllGlobals());

function round(key: string, kind: "daily" | "practice", status: "playing" | "won" | "lost"): GameRound {
  return {
    key,
    kind,
    date: "2026-10-13",
    difficulty: "normal",
    mode: "letters",
    ...(kind === "practice" ? { wordId: "banco" } : {}),
    guesses: [],
    status,
  };
}

describe("progresso local", () => {
  it("mantém estatísticas de prática fora da taxa do desafio diário", () => {
    const statistics = summarizeSessions([
      round("daily:one", "daily", "won"),
      round("daily:two", "daily", "lost"),
      round("daily:active", "daily", "playing"),
      round("practice:one", "practice", "won"),
    ]);

    expect(statistics.daily).toMatchObject({ completed: 2, wins: 1, winRate: 50 });
    expect(statistics.practice).toMatchObject({ completed: 1, wins: 1, winRate: 100 });
  });

  it("descarta uma rodada prática corrompida sem derrubar a restauração", () => {
    const activeKey = "practice:corrupted";
    const value = {
      version: 1,
      settings: { difficulty: "normal", mode: "letters", kind: "practice", activeKey },
      rounds: {
        [activeKey]: {
          ...round(activeKey, "practice", "playing"),
          guesses: [{}],
        },
      },
      collection: [],
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value), setItem: vi.fn() });

    const restored = loadProgress();

    expect(restored.settings.kind).toBe("daily");
    expect(restored.rounds[restored.settings.activeKey].guesses).toEqual([]);
  });

  it("não restaura rodada diária como prática nem palavras não desbloqueadas", () => {
    const date = getSaoPauloDate();
    const activeKey = dailyRoundKey(date, "normal", "letters");
    const value = {
      version: 1,
      settings: { difficulty: "normal", mode: "letters", kind: "practice", activeKey },
      rounds: { [activeKey]: createDailyRound(date, "normal", "letters") },
      collection: ["banco", "espelho", "id-inexistente"],
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value), setItem: vi.fn() });

    const restored = loadProgress();

    expect(restored.settings.kind).toBe("daily");
    expect(restored.settings.activeKey).toBe(activeKey);
    expect(restored.collection).toEqual([]);
  });

  it("descarta data impossível e vitória sem palpite vencedor", () => {
    const date = getSaoPauloDate();
    const invalidDate = "2026-02-31";
    const invalidKey = dailyRoundKey(invalidDate, "normal", "letters");
    const todayKey = dailyRoundKey(date, "normal", "letters");
    const value = {
      version: 1,
      settings: { difficulty: "normal", mode: "letters", kind: "daily", activeKey: invalidKey },
      rounds: {
        [invalidKey]: createDailyRound(invalidDate, "normal", "letters"),
        [todayKey]: { ...createDailyRound(date, "normal", "letters"), status: "won", guesses: [] },
      },
      collection: [],
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value), setItem: vi.fn() });

    const restored = loadProgress();

    expect(restored.rounds).not.toHaveProperty(invalidKey);
    expect(restored.rounds[todayKey].status).toBe("playing");
    expect(restored.rounds[todayKey].guesses).toEqual([]);
  });

  it("descarta palavra de prática incompatível com o nível persistido", () => {
    const activeKey = "practice:wrong-level";
    const wrongLevel = { ...createPracticeRound("normal", "letters", "banco", "wrong-level"), difficulty: "easy" as const };
    const value = {
      version: 1,
      settings: { difficulty: "easy", mode: "letters", kind: "practice", activeKey },
      rounds: { [activeKey]: wrongLevel },
      collection: [],
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value), setItem: vi.fn() });

    const restored = loadProgress();

    expect(restored.settings.kind).toBe("daily");
    expect(restored.rounds[restored.settings.activeKey].difficulty).toBe("easy");
  });

  it("compartilha a posição em empates e deixa partidas incompletas sem colocação", () => {
    const results = [{ attempts: 3 }, { attempts: 3 }, { attempts: 5 }, { attempts: null }];

    expect(results.map((_, index) => getAttemptRank(results, index))).toEqual([1, 1, 3, null]);
  });

  it("preserva na coleção a palavra revelada ao concluir uma prática", () => {
    const practice = createPracticeRound("normal", "letters", "banco", "practice-win");
    const wonRound: GameRound = {
      ...practice,
      status: "won",
      guesses: [{ word: "BANCO", marks: evaluateGuess("BANCO", "BANCO") }],
    };
    const value = {
      version: 1,
      settings: { difficulty: "normal", mode: "letters", kind: "practice", activeKey: practice.key },
      rounds: { [practice.key]: wonRound },
      collection: ["banco"],
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value), setItem: vi.fn() });

    const restored = loadProgress();

    expect(restored.settings.kind).toBe("practice");
    expect(restored.collection).toEqual(["banco"]);
  });

  it("descarta marcas persistidas que não correspondem ao resultado calculado", () => {
    const date = getSaoPauloDate();
    const key = dailyRoundKey(date, "normal", "letters");
    const answer = getDailyEntry(date, "normal");
    const value = {
      version: 1,
      settings: { difficulty: "normal", mode: "letters", kind: "daily", activeKey: key },
      rounds: {
        [key]: {
          ...createDailyRound(date, "normal", "letters"),
          guesses: [{ word: answer.normalized, marks: Array(5).fill("absent") }],
          status: "won",
        },
      },
      collection: [answer.id],
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value), setItem: vi.fn() });

    const restored = loadProgress();

    expect(restored.rounds[key].status).toBe("playing");
    expect(restored.rounds[key].guesses).toEqual([]);
    expect(restored.collection).toEqual([]);
  });
});