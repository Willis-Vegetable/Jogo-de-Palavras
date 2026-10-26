import type { Difficulty, GuessMark } from "./game-core";
import { evaluateGuess, LEVEL_RULES, normalizeWord } from "./game-core";
import { ACCEPTED_WORDS, getDailyEntry, getSaoPauloDate, getWordById } from "./content";

export type GameMode = "letters" | "definition";
export type SessionKind = "daily" | "practice";
export type RoundStatus = "playing" | "won" | "lost";

export interface SavedGuess {
  word: string;
  marks: GuessMark[];
}

export interface GameRound {
  key: string;
  kind: SessionKind;
  date: string;
  difficulty: Difficulty;
  mode: GameMode;
  wordId?: string;
  guesses: SavedGuess[];
  status: RoundStatus;
}

export interface ProgressState {
  version: 1;
  settings: {
    difficulty: Difficulty;
    mode: GameMode;
    kind: SessionKind;
    activeKey: string;
  };
  rounds: Record<string, GameRound>;
  collection: string[];
}

export interface SessionStatistics {
  rounds: GameRound[];
  completed: number;
  wins: number;
  winRate: number;
}

const STORAGE_KEY = "jdp.progress.v1";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

function isMode(value: unknown): value is GameMode {
  return value === "letters" || value === "definition";
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isSavedGuess(value: unknown, length: number): value is SavedGuess {
  if (!value || typeof value !== "object") return false;
  const guess = value as Partial<SavedGuess>;
  return typeof guess.word === "string"
    && normalizeWord(guess.word) === guess.word
    && guess.word.length === length
    && Array.isArray(guess.marks)
    && guess.marks.length === length
    && guess.marks.every((mark) => mark === "correct" || mark === "present" || mark === "absent");
}

function isRound(value: unknown): value is GameRound {
  if (!value || typeof value !== "object") return false;
  const round = value as Partial<GameRound>;
  const difficulty = round.difficulty;
  if (typeof round.key !== "string"
    || (round.kind !== "daily" && round.kind !== "practice")
    || typeof round.date !== "string"
    || !isCalendarDate(round.date)
    || !isDifficulty(difficulty)
    || !isMode(round.mode)
    || !Array.isArray(round.guesses)
    || (round.status !== "playing" && round.status !== "won" && round.status !== "lost")) return false;

  const length = LEVEL_RULES[difficulty].length;
  const attempts = LEVEL_RULES[difficulty].attempts;
  if (round.guesses.length > attempts || !round.guesses.every((guess) => isSavedGuess(guess, length))) return false;
  if (round.kind === "daily" && round.key !== dailyRoundKey(round.date, difficulty, round.mode)) return false;
  if (round.kind === "practice" && (typeof round.wordId !== "string" || getWordById(round.wordId)?.difficulty !== difficulty)) return false;

  const answer = round.kind === "daily"
    ? getDailyEntry(round.date, difficulty)
    : getWordById(round.wordId);
  if (!answer) return false;
  if (!round.guesses.every((guess) => ACCEPTED_WORDS[difficulty].has(guess.word)
    && evaluateGuess(guess.word, answer.normalized).every((mark, index) => mark === guess.marks[index]))) return false;

  const solvedAt = round.guesses.findIndex((guess) => guess.word === answer.normalized);
  if (round.status === "playing" && (round.guesses.length >= attempts || solvedAt !== -1)) return false;
  if (round.status === "lost" && (round.guesses.length !== attempts || solvedAt !== -1)) return false;
  if (round.status === "won" && (round.guesses.length === 0 || solvedAt !== round.guesses.length - 1)) return false;

  return round.kind === "daily" ? round.key.startsWith("daily:") : round.key.startsWith("practice:");
}

export function dailyRoundKey(date: string, difficulty: Difficulty, mode: GameMode): string {
  return `daily:${date}:${difficulty}:${mode}`;
}

export function summarizeSessions(rounds: GameRound[]): Record<SessionKind, SessionStatistics> {
  const summarize = (kind: SessionKind): SessionStatistics => {
    const completedRounds = rounds.filter((round) => round.kind === kind && round.status !== "playing");
    const wins = completedRounds.filter((round) => round.status === "won").length;
    return {
      rounds: completedRounds,
      completed: completedRounds.length,
      wins,
      winRate: completedRounds.length ? Math.round((wins / completedRounds.length) * 100) : 0,
    };
  };

  return { daily: summarize("daily"), practice: summarize("practice") };
}

export function getAttemptRank(results: { attempts: number | null }[], index: number): number | null {
  const attempts = results[index]?.attempts;
  if (attempts === null || attempts === undefined) return null;
  return 1 + results.filter((result) => result.attempts !== null && result.attempts < attempts).length;
}

export function createDailyRound(date: string, difficulty: Difficulty, mode: GameMode): GameRound {
  const key = dailyRoundKey(date, difficulty, mode);
  return { key, kind: "daily", date, difficulty, mode, guesses: [], status: "playing" };
}

export function createPracticeRound(difficulty: Difficulty, mode: GameMode, wordId: string, id: string): GameRound {
  return { key: `practice:${id}`, kind: "practice", date: getSaoPauloDate(), difficulty, mode, wordId, guesses: [], status: "playing" };
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInitialProgress(): ProgressState {
  const date = getSaoPauloDate();
  const firstRound = createDailyRound(date, "normal", "letters");
  return {
    version: 1,
    settings: { difficulty: "normal", mode: "letters", kind: "daily", activeKey: firstRound.key },
    rounds: { [firstRound.key]: firstRound },
    collection: [],
  };
}

export function loadProgress(): ProgressState {
  if (typeof localStorage === "undefined") return createInitialProgress();
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1) return createInitialProgress();
    const saved = parsed as Partial<ProgressState>;
    const difficulty = isDifficulty(saved.settings?.difficulty) ? saved.settings.difficulty : "normal";
    const mode = isMode(saved.settings?.mode) ? saved.settings.mode : "letters";
    const rounds = Object.fromEntries(Object.entries(saved.rounds ?? {}).filter((entry): entry is [string, GameRound] => entry[0] === (entry[1] as Partial<GameRound>)?.key && isRound(entry[1])));
    const revealedWordIds = new Set(Object.values(rounds)
      .filter((round) => round.status !== "playing")
      .map((round) => getRoundAnswer(round)?.id)
      .filter((id): id is string => Boolean(id)));
    const collection = Array.isArray(saved.collection)
      ? [...new Set(saved.collection.filter((id): id is string => typeof id === "string" && revealedWordIds.has(id)))]
      : [];
    const kind = saved.settings?.kind === "practice" ? "practice" : "daily";
    const date = getSaoPauloDate();
    let activeKey = typeof saved.settings?.activeKey === "string" ? saved.settings.activeKey : "";

    if (kind === "daily") activeKey = dailyRoundKey(date, difficulty, mode);
    if (kind === "practice" && (!isRound(rounds[activeKey]) || rounds[activeKey].kind !== "practice" || rounds[activeKey].difficulty !== difficulty || rounds[activeKey].mode !== mode)) activeKey = "";

    if (!activeKey) {
      const fallback = createDailyRound(date, difficulty, mode);
      rounds[fallback.key] = rounds[fallback.key] ?? fallback;
      return { version: 1, settings: { difficulty, mode, kind: "daily", activeKey: fallback.key }, rounds, collection };
    }

    if (kind === "daily") rounds[activeKey] = rounds[activeKey] ?? createDailyRound(date, difficulty, mode);
    return { version: 1, settings: { difficulty, mode, kind, activeKey }, rounds, collection };
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // O jogo continua funcional mesmo se o navegador bloquear armazenamento local.
  }
}

export function getRoundAnswer(round: GameRound) {
  if (round.kind === "daily") return getDailyEntry(round.date, round.difficulty);
  return getWordById(round.wordId);
}

export function createPracticeId(): string {
  return newId();
}