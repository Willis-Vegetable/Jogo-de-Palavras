import { useEffect, useRef, useState, type FormEvent } from "react";
import { evaluateGuess, LEVEL_RULES, makeShareGrid, mergeKeyboardMarks, normalizeWord, validateGuess, type GuessMark } from "./game-core";
import { ACCEPTED_WORDS, formatDate, getDailyEntry, getPracticeEntry, getSaoPauloDate, getWordById } from "./content";
import { createDailyRound, createPracticeId, createPracticeRound, getAttemptRank, loadProgress, saveProgress, summarizeSessions, type GameRound, type GameMode, type ProgressState, type SessionKind } from "./progress";

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function markDescription(mark: GuessMark): string {
  if (mark === "correct") return "letra correta na posição correta";
  if (mark === "present") return "letra presente em outra posição";
  return "letra ausente";
}

function guessSummary(marks: GuessMark[]): string {
  const correct = marks.filter((mark) => mark === "correct").length;
  const present = marks.filter((mark) => mark === "present").length;
  const absent = marks.filter((mark) => mark === "absent").length;
  return `${correct} ${correct === 1 ? "letra na posição certa" : "letras na posição certa"}, ${present} em outra posição e ${absent} ausentes`;
}

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1, 12));
  return yesterday.toISOString().slice(0, 10);
}

function calculateStreak(rounds: GameRound[]): number {
  const dates = new Set(rounds.filter((round) => round.kind === "daily" && round.status !== "playing").map((round) => round.date));
  const today = getSaoPauloDate();
  let date = dates.has(today) ? today : previousDate(today);
  let streak = 0;
  while (dates.has(date)) {
    streak += 1;
    date = previousDate(date);
  }
  return streak;
}

function App() {
  const [progress, setProgress] = useState<ProgressState>(loadProgress);
  const [guessInput, setGuessInput] = useState("");
  const [feedback, setFeedback] = useState("Pronto para jogar. Digite um palpite com o número de letras indicado.");
  const [copyStatus, setCopyStatus] = useState("");
  const [dialogView, setDialogView] = useState<"stats" | "collection" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shareRef = useRef<HTMLTextAreaElement>(null);

  const { difficulty, mode, kind, activeKey } = progress.settings;
  const round = progress.rounds[activeKey];
  const rules = LEVEL_RULES[difficulty];
  const answer = round?.kind === "practice"
    ? getWordById(round.wordId)
    : round
      ? getDailyEntry(round.date, round.difficulty)
      : undefined;
  const keyboardMarks = round?.guesses.reduce<Record<string, GuessMark>>((marks, savedGuess) => mergeKeyboardMarks(marks, savedGuess.word, savedGuess.marks), {}) ?? {};
  const sessionStatistics = summarizeSessions(Object.values(progress.rounds));
  const dailyRounds = sessionStatistics.daily.rounds;
  const practiceRounds = sessionStatistics.practice.rounds;
  const dailyWins = sessionStatistics.daily.wins;
  const practiceWins = sessionStatistics.practice.wins;
  const winRate = sessionStatistics.daily.winRate;
  const streak = calculateStreak(Object.values(progress.rounds));
  const remaining = Math.max(0, rules.attempts - (round?.guesses.length ?? 0));
  const isComplete = round?.status !== "playing";
  const shareLabel = round?.kind === "daily" ? `Diário ${formatDate(round.date)}` : "Prática";
  const shareText = round && isComplete
    ? makeShareGrid(round.guesses, round.status === "won" ? "won" : "lost", round.guesses.length, rules.attempts, `${shareLabel} · ${rules.label} · ${mode === "letters" ? "Letras" : "Definição"}`)
    : "";

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    setGuessInput("");
    setCopyStatus("");
    if (round) setFeedback(round.status === "playing" ? `Partida salva. Você tem ${Math.max(0, LEVEL_RULES[round.difficulty].attempts - round.guesses.length)} tentativas.` : "Partida concluída. Confira o resultado e a palavra descoberta.");
  }, [activeKey]);

  function openDaily(nextDifficulty = difficulty, nextMode = mode) {
    const date = getSaoPauloDate();
    const nextRound = createDailyRound(date, nextDifficulty, nextMode);
    const savedRound = progress.rounds[nextRound.key] ?? nextRound;
    setProgress({
      ...progress,
      settings: { difficulty: nextDifficulty, mode: nextMode, kind: "daily", activeKey: savedRound.key },
      rounds: { ...progress.rounds, [savedRound.key]: savedRound },
    });
    setGuessInput("");
    setCopyStatus("");
    setFeedback(savedRound.guesses.length ? `Partida retomada. Você tem ${LEVEL_RULES[nextDifficulty].attempts - savedRound.guesses.length} tentativas.` : "Novo desafio diário. A mesma palavra vale para todos neste nível.");
  }

  function openPractice(nextDifficulty = difficulty, nextMode = mode) {
    const previousWordId = answer?.id;
    const entry = getPracticeEntry(nextDifficulty, previousWordId);
    const nextRound = createPracticeRound(nextDifficulty, nextMode, entry.id, createPracticeId());
    setProgress({
      ...progress,
      settings: { difficulty: nextDifficulty, mode: nextMode, kind: "practice", activeKey: nextRound.key },
      rounds: { ...progress.rounds, [nextRound.key]: nextRound },
    });
    setGuessInput("");
    setCopyStatus("");
    setFeedback("Prática iniciada. Esta rodada não altera sua sequência diária nem o ranking demonstrativo.");
  }

  function chooseSession(nextKind: SessionKind) {
    if (nextKind === "daily") openDaily();
    else openPractice();
  }

  function chooseDifficulty(nextDifficulty: typeof difficulty) {
    if (kind === "daily") openDaily(nextDifficulty, mode);
    else openPractice(nextDifficulty, mode);
  }

  function chooseMode(nextMode: GameMode) {
    if (kind === "daily") openDaily(difficulty, nextMode);
    else openPractice(difficulty, nextMode);
  }

  function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!round || !answer || round.status !== "playing") return;

    const validationMessage = validateGuess(guessInput, rules.length, ACCEPTED_WORDS[difficulty]);
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }

    const normalizedGuess = normalizeWord(guessInput);
    const marks = evaluateGuess(normalizedGuess, answer.normalized);
    const guesses = [...round.guesses, { word: normalizedGuess, marks }];
    const won = normalizedGuess === answer.normalized;
    const lost = !won && guesses.length >= rules.attempts;
    const status = won ? "won" : lost ? "lost" : "playing";
    const updatedRound: GameRound = { ...round, guesses, status };
    const updatedCollection = status === "playing" || progress.collection.includes(answer.id)
      ? progress.collection
      : [...progress.collection, answer.id];

    setProgress({
      ...progress,
      rounds: { ...progress.rounds, [round.key]: updatedRound },
      collection: updatedCollection,
    });
    setGuessInput("");

    const result = won ? `Você descobriu ${answer.display} em ${guesses.length} ${guesses.length === 1 ? "tentativa" : "tentativas"}.` : lost ? `Fim de jogo. A palavra era ${answer.display}.` : `Ainda não. Restam ${rules.attempts - guesses.length} tentativas.`;
    setFeedback(`${guessSummary(marks)}. ${result}`);
  }

  function enterVirtualKey(key: string) {
    if (!round || round.status !== "playing") return;
    if (key === "Backspace") {
      setGuessInput((current) => Array.from(current).slice(0, -1).join(""));
      return;
    }
    if (key === "Enter") {
      document.querySelector<HTMLFormElement>("[data-guess-form]")?.requestSubmit();
      return;
    }
    setGuessInput((current) => normalizeWord(`${current}${key}`).slice(0, rules.length));
  }

  async function copyShareResult() {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyStatus("Resultado copiado. A resposta não está incluída.");
    } catch {
      shareRef.current?.focus();
      shareRef.current?.select();
      setCopyStatus("Selecione e copie o resultado. A resposta não está incluída.");
    }
  }

  function openDialog(view: "stats" | "collection") {
    setDialogView(view);
    dialogRef.current?.showModal();
  }

  if (!round || !answer) {
    return <main className="load-error"><h1>Não foi possível abrir a partida.</h1><button className="primary-button" onClick={() => window.location.reload()}>Recarregar jogo</button></main>;
  }

  const sortedFriendResults = [
    { name: "Lia", attempts: 3 },
    { name: "Rafa", attempts: 5 },
    { name: "Você", attempts: isComplete && kind === "daily" ? round.guesses.length : null },
  ].sort((first, second) => (first.attempts ?? Number.POSITIVE_INFINITY) - (second.attempts ?? Number.POSITIVE_INFINITY));
  const friendResults = sortedFriendResults.map((friend, index, results) => ({ ...friend, rank: getAttemptRank(results, index) }));
  const collectedWords = progress.collection.map(getWordById).filter((word): word is NonNullable<typeof word> => Boolean(word));
  const todayLabel = formatDate(round.date);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#jogo" aria-label="Jogo de Palavras, início">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span><strong>PALAVRA</strong><small>edição de hoje</small></span>
        </a>
        <nav className="top-actions" aria-label="Progresso pessoal">
          <button className="quiet-button" type="button" onClick={() => openDialog("collection")}>Minha coleção <span className="count-mark">{progress.collection.length}</span></button>
          <button className="quiet-button" type="button" onClick={() => openDialog("stats")}>Estatísticas</button>
        </nav>
      </header>

      <div className="game-layout" id="jogo">
        <section className="play-column" aria-labelledby="round-title">
          <div className="round-meta"><span className="round-number">{kind === "daily" ? `DESAFIO · ${todayLabel}` : "MODO PRÁTICA"}</span><span>{kind === "daily" ? "Palavra em comum hoje" : "Jogue no seu ritmo"}</span></div>
          <h1 className="round-title" id="round-title">{kind === "daily" ? "Uma palavra, novas pistas." : "Treino no seu ritmo."}</h1>
          <p className="round-description">{kind === "daily" ? "Descubra a palavra do dia. Cada palpite revela novas pistas, sem pressa e sem cronômetro." : "Pratique sem limite. Suas tentativas ficam fora da sequência e do ranking demonstrativo."}</p>

          <div className="control-row">
            <div className="segmented" role="group" aria-label="Tipo de partida">
              <button type="button" aria-pressed={kind === "daily"} onClick={() => chooseSession("daily")}>Desafio diário</button>
              <button type="button" aria-pressed={kind === "practice"} onClick={() => chooseSession("practice")}>Prática livre</button>
            </div>
            <label className="level-control" htmlFor="difficulty-select">Nível
              <select id="difficulty-select" value={difficulty} onChange={(event) => chooseDifficulty(event.target.value as typeof difficulty)}>
                <option value="easy">Leve · 4 letras · 7 tentativas</option>
                <option value="normal">Normal · 5 letras · 6 tentativas</option>
                <option value="hard">Desafiador · 7 letras · 5 tentativas</option>
              </select>
            </label>
          </div>

          <div className="segmented mechanic-picker" role="group" aria-label="Mecânica do desafio">
            <button type="button" aria-pressed={mode === "letters"} onClick={() => chooseMode("letters")}>Letras</button>
            <button type="button" aria-pressed={mode === "definition"} onClick={() => chooseMode("definition")}>Por definição</button>
          </div>

          <div className="hint-line" aria-label={mode === "definition" ? `Definição: ${answer.definition}` : "Como funcionam as pistas"}>
            <span className="hint-mark" aria-hidden="true">PISTA</span>
            <p>{mode === "definition" ? answer.definition : "As letras mostram se a resposta está na palavra e na posição certa."}</p>
          </div>

          <div className="board-wrap">
            <ol className="board" style={{ "--word-length": rules.length } as React.CSSProperties} aria-label={`Tentativas da palavra, ${round.guesses.length} de ${rules.attempts} usadas`}>
              {Array.from({ length: rules.attempts }, (_, rowIndex) => {
                const savedGuess = round.guesses[rowIndex];
                return (
                  <li className="board-row" key={`${round.key}-row-${rowIndex}`} aria-label={savedGuess ? `Tentativa ${rowIndex + 1}: ${guessSummary(savedGuess.marks)}` : `Tentativa vazia ${rowIndex + 1}`}>
                    {Array.from({ length: rules.length }, (_, columnIndex) => {
                      const letter = savedGuess?.word[columnIndex] ?? "";
                      const mark = savedGuess?.marks[columnIndex];
                      return <span className={`tile${mark ? ` tile--${mark}` : ""}`} key={`${round.key}-${rowIndex}-${columnIndex}`} role={savedGuess && mark ? "img" : undefined} aria-label={savedGuess && mark ? `${letter}: ${markDescription(mark)}` : undefined} aria-hidden={!savedGuess}>{letter}</span>;
                    })}
                  </li>
                );
              })}
            </ol>
            <p className="attempt-summary">{round.status === "playing" ? `Você tem ${remaining} ${remaining === 1 ? "tentativa" : "tentativas"}.` : round.status === "won" ? `Palavra descoberta em ${round.guesses.length} ${round.guesses.length === 1 ? "tentativa" : "tentativas"}.` : `Fim de jogo. A palavra era ${answer.display}.`}</p>
          </div>

          <form className="guess-form" data-guess-form onSubmit={submitGuess}>
            <label className="guess-field" htmlFor="guess-input"><span>Seu palpite · {rules.length} letras</span>
              <input id="guess-input" type="text" inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={rules.length + 4} value={guessInput} disabled={round.status !== "playing"} onChange={(event) => setGuessInput(event.target.value.toLocaleUpperCase("pt-BR").replace(/[^A-ZÀ-ÖØ-Þ]/g, ""))} aria-describedby="guess-help live-feedback" placeholder="Digite sua palavra" />
            </label>
            <span id="guess-help" className="sr-only">Acentos são normalizados. Palpites inválidos não consomem uma tentativa.</span>
            <button className="primary-button submit-button" type="submit" disabled={round.status !== "playing"}>Enviar palpite</button>
          </form>
          <p className="form-status" id="live-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>

          <div className="virtual-keyboard" role="group" aria-label="Teclado virtual">
            {KEY_ROWS.map((row, rowIndex) => (
              <div className="key-row" key={`key-row-${rowIndex}`}>
                {rowIndex === 2 && <button className="key key--wide" type="button" aria-label="Apagar última letra" disabled={round.status !== "playing"} onClick={() => enterVirtualKey("Backspace")}>Apagar</button>}
                {Array.from(row).map((letter) => <button className="key" type="button" key={letter} aria-label={`Tecla ${letter}${keyboardMarks[letter] ? `, ${markDescription(keyboardMarks[letter])}` : ""}`} data-state={keyboardMarks[letter]} disabled={round.status !== "playing"} onClick={() => enterVirtualKey(letter)}>{letter}</button>)}
                {rowIndex === 2 && <button className="key key--wide" type="button" aria-label="Enviar tentativa" disabled={round.status !== "playing"} onClick={() => document.querySelector<HTMLFormElement>("[data-guess-form]")?.requestSubmit()}>Enviar</button>}
              </div>
            ))}
          </div>

          {isComplete && <section className="answer-note" aria-labelledby="answer-title"><p className="micro-label">PALAVRA DESCOBERTA</p><h2 id="answer-title">{answer.display}</h2><p>{answer.definition}</p><p className="example-sentence">“{answer.example}”</p></section>}

          {isComplete && <section className="share-area" aria-labelledby="share-title"><div><p className="micro-label">SEM SPOILER</p><h2 id="share-title">Seu resultado</h2><p>A grade mostra suas pistas, sem incluir letras ou resposta.</p></div><textarea ref={shareRef} readOnly aria-label="Resultado sem spoiler" value={shareText} rows={Math.max(2, round.guesses.length + 1)} /><div className="share-actions"><button className="outline-button" type="button" onClick={copyShareResult}>Copiar resultado</button>{kind === "practice" && <button className="text-button" type="button" onClick={() => openPractice()}>Outra prática</button>}</div><p className="copy-status" role="status" aria-live="polite">{copyStatus}</p></section>}
        </section>

        <aside className="game-aside" aria-label="Progresso e comunidade">
          <section className="aside-section" aria-labelledby="stats-heading">
            <h2 className="aside-heading" id="stats-heading">Seu caderno <small>em números</small></h2>
            <div className="stat-grid"><div className="stat"><strong>{dailyRounds.length}</strong><span>desafios concluídos</span></div><div className="stat"><strong>{winRate}%</strong><span>vitórias diárias</span></div><div className="stat"><strong>{streak}</strong><span>dias seguidos</span></div><div className="stat"><strong>{progress.collection.length}</strong><span>palavras na coleção</span></div></div>
            <button className="text-button aside-link" type="button" onClick={() => openDialog("stats")}>Ver estatísticas completas</button>
          </section>

          <section className="aside-section" aria-labelledby="collection-heading">
            <h2 className="aside-heading" id="collection-heading">Coleção <small>descobertas</small></h2>
            {collectedWords.length ? <ul className="collection-list">{collectedWords.slice(-3).reverse().map((word) => <li className="collection-line" key={word.id}><span className="stamp" aria-hidden="true">{word.display[0]}</span><span><strong>{word.display}</strong><small>{word.definition}</small></span></li>)}</ul> : <p className="muted-copy">Conclua uma rodada para guardar sua primeira palavra.</p>}
            <button className="text-button aside-link" type="button" onClick={() => openDialog("collection")}>Abrir coleção completa</button>
          </section>

          <section className="aside-section" aria-labelledby="friends-heading">
            <h2 className="aside-heading" id="friends-heading">Sua roda <small>{kind === "daily" ? todayLabel : "exemplo"}</small></h2>
            <p className="muted-copy">Demonstração local. Os resultados não são sincronizados entre amigos.</p>
            {kind === "daily" ? <ol className="friend-list">{friendResults.map((friend) => <li className="friend-row" key={friend.name}><span className="friend-rank">{friend.rank ?? "—"}</span><span>{friend.name}</span><span className="friend-score">{friend.attempts === null ? "--" : `${friend.attempts} tent.`}</span></li>)}</ol> : <p className="muted-copy">A prática livre não entra no ranking diário.</p>}
            <p className="ranking-note">O ranking entre amigos exige uma versão online com servidor.</p>
          </section>
        </aside>
      </div>

      <footer className="app-footer"><span>Jogo gratuito · sem anúncios</span><span>Progresso salvo neste dispositivo</span></footer>

      <dialog className="info-dialog" ref={dialogRef} aria-labelledby="dialog-title" onClose={() => setDialogView(null)}>
        <div className="dialog-header"><div><p className="micro-label">JOGO DE PALAVRAS</p><h2 id="dialog-title">{dialogView === "collection" ? "Sua coleção" : "Estatísticas"}</h2></div><button className="outline-button" type="button" onClick={() => dialogRef.current?.close()}>Fechar</button></div>
        {dialogView === "collection" ? <div className="dialog-content">{collectedWords.length ? <ul className="collection-list dialog-collection">{collectedWords.map((word) => <li className="collection-line" key={word.id}><span className="stamp" aria-hidden="true">{word.display[0]}</span><span><strong>{word.display}</strong><small>{word.definition}</small><em>{word.example}</em></span></li>)}</ul> : <p className="muted-copy">Sua coleção começa quando você conclui uma rodada.</p>}</div> : <div className="dialog-content"><h3 className="stats-subheading">Desafio diário</h3><div className="stat-grid expanded-stats"><div className="stat"><strong>{dailyRounds.length}</strong><span>partidas concluídas</span></div><div className="stat"><strong>{dailyWins}</strong><span>vitórias</span></div><div className="stat"><strong>{winRate}%</strong><span>taxa de vitória</span></div><div className="stat"><strong>{streak}</strong><span>dias seguidos</span></div></div><h3 className="stats-subheading">Prática</h3><div className="stat-grid expanded-stats"><div className="stat"><strong>{practiceRounds.length}</strong><span>partidas concluídas</span></div><div className="stat"><strong>{practiceWins}</strong><span>vitórias</span></div><div className="stat"><strong>{progress.collection.length}</strong><span>palavras descobertas</span></div></div><p className="muted-copy">A prática fica fora da sequência diária e do ranking demonstrativo.</p></div>}
      </dialog>
    </main>
  );
}

export default App;