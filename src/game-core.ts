export type Difficulty = "easy" | "normal" | "hard";
export type GuessMark = "correct" | "present" | "absent";

export const LEVEL_RULES: Record<Difficulty, { length: number; attempts: number; label: string }> = {
  easy: { length: 4, attempts: 7, label: "Leve" },
  normal: { length: 5, attempts: 6, label: "Normal" },
  hard: { length: 7, attempts: 5, label: "Desafiador" },
};

export function normalizeWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/[^A-Z]/g, "");
}

export function evaluateGuess(guessInput: string, answerInput: string): GuessMark[] {
  const guess = normalizeWord(guessInput);
  const answer = normalizeWord(answerInput);

  if (!answer || guess.length !== answer.length) {
    throw new Error("O palpite precisa ter o mesmo número de letras da resposta.");
  }

  const marks: GuessMark[] = Array(guess.length).fill("absent");
  const remaining = Array.from(answer);

  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === answer[index]) {
      marks[index] = "correct";
      remaining[index] = "";
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    if (marks[index] === "correct") continue;
    const matchingIndex = remaining.indexOf(guess[index]);
    if (matchingIndex !== -1) {
      marks[index] = "present";
      remaining[matchingIndex] = "";
    }
  }

  return marks;
}

export function mergeKeyboardMarks(previous: Record<string, GuessMark>, guess: string, marks: GuessMark[]): Record<string, GuessMark> {
  const priority: Record<GuessMark, number> = { absent: 0, present: 1, correct: 2 };
  const merged = { ...previous };

  Array.from(normalizeWord(guess)).forEach((letter, index) => {
    const mark = marks[index];
    if (!merged[letter] || priority[mark] > priority[merged[letter]]) merged[letter] = mark;
  });

  return merged;
}

export function validateGuess(guess: string, length: number, acceptedWords: ReadonlySet<string>): string | null {
  const normalized = normalizeWord(guess);
  if (normalized.length !== length) return `Digite uma palavra com exatamente ${length} letras.`;
  if (!acceptedWords.has(normalized)) return "Essa palavra não está na lista de palpites aceitos.";
  return null;
}

export function makeShareGrid(guesses: { marks: GuessMark[] }[], result: "won" | "lost", attempts: number, maxAttempts: number, puzzleLabel: string): string {
  const lines = guesses.map(({ marks }) => marks.map((mark) => {
    if (mark === "correct") return "■";
    if (mark === "present") return "▨";
    return "□";
  }).join(""));
  const score = result === "won" ? `${attempts}/${maxAttempts}` : `X/${maxAttempts}`;
  return `Jogo de Palavras · ${puzzleLabel} ${score}\n${lines.join("\n")}`;
}