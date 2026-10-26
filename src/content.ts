import { LEVEL_RULES, normalizeWord, type Difficulty } from "./game-core";

export interface WordEntry {
  id: string;
  display: string;
  normalized: string;
  difficulty: Difficulty;
  definition: string;
  example: string;
}

const definitions: Omit<WordEntry, "normalized">[] = [
  { id: "gato", display: "GATO", difficulty: "easy", definition: "Mamífero doméstico conhecido por ronronar.", example: "O gato dormiu perto da janela." },
  { id: "lago", display: "LAGO", difficulty: "easy", definition: "Grande porção de água cercada por terra.", example: "As crianças caminharam ao redor do lago." },
  { id: "pato", display: "PATO", difficulty: "easy", definition: "Ave aquática de bico largo e pés palmados.", example: "O pato atravessou o jardim." },
  { id: "casa", display: "CASA", difficulty: "easy", definition: "Lugar construído para morar.", example: "A casa tem uma porta azul." },
  { id: "mesa", display: "MESA", difficulty: "easy", definition: "Móvel com tampo usado para apoiar objetos ou refeições.", example: "O livro ficou sobre a mesa." },
  { id: "bola", display: "BOLA", difficulty: "easy", definition: "Objeto redondo usado em vários jogos e esportes.", example: "A bola rolou até o portão." },
  { id: "rosa", display: "ROSA", difficulty: "easy", definition: "Flor ornamental de pétalas geralmente perfumadas.", example: "Uma rosa nasceu no canteiro." },
  { id: "rato", display: "RATO", difficulty: "easy", definition: "Pequeno mamífero roedor.", example: "O rato passou por uma fresta." },
  { id: "cafe", display: "CAFÉ", difficulty: "easy", definition: "Bebida feita com grãos torrados e moídos.", example: "Ela preparou café depois do almoço." },
  { id: "faca", display: "FACA", difficulty: "easy", definition: "Utensílio com lâmina usado para cortar.", example: "A faca ficou guardada na gaveta." },
  { id: "festa", display: "FESTA", difficulty: "normal", definition: "Reunião ou evento organizado para celebrar algo.", example: "A festa começou depois do pôr do sol." },
  { id: "limpo", display: "LIMPO", difficulty: "normal", definition: "Que não tem sujeira ou manchas.", example: "O caderno está limpo e pronto para uso." },
  { id: "farol", display: "FAROL", difficulty: "normal", definition: "Torre com luz que orienta embarcações ou sinaliza uma via.", example: "O farol iluminava a costa." },
  { id: "nuvem", display: "NUVEM", difficulty: "normal", definition: "Conjunto visível de gotículas ou cristais suspensos no céu.", example: "Uma nuvem cobriu o sol." },
  { id: "prato", display: "PRATO", difficulty: "normal", definition: "Peça rasa usada para servir ou comer alimentos.", example: "O prato de frutas ficou na mesa." },
  { id: "livro", display: "LIVRO", difficulty: "normal", definition: "Conjunto de páginas com texto ou imagens, reunidas numa publicação.", example: "Ela terminou o livro no fim de semana." },
  { id: "ponte", display: "PONTE", difficulty: "normal", definition: "Construção que permite passar sobre um obstáculo.", example: "A ponte liga os dois bairros." },
  { id: "campo", display: "CAMPO", difficulty: "normal", definition: "Área aberta de terra, geralmente afastada do centro urbano.", example: "A família passou o domingo no campo." },
  { id: "banco", display: "BANCO", difficulty: "normal", definition: "Assento comprido ou instituição que guarda e movimenta dinheiro.", example: "Sentamos no banco da praça." },
  { id: "pasta", display: "PASTA", difficulty: "normal", definition: "Recipiente ou conjunto organizado para guardar documentos.", example: "Salvei o trabalho numa pasta azul." },
  { id: "sabor", display: "SABOR", difficulty: "normal", definition: "Sensação percebida ao provar um alimento ou bebida.", example: "A fruta tem sabor adocicado." },
  { id: "tempo", display: "TEMPO", difficulty: "normal", definition: "Duração dos acontecimentos ou condição atmosférica.", example: "O tempo abriu depois da chuva." },
  { id: "brisa", display: "BRISA", difficulty: "normal", definition: "Vento leve e agradável.", example: "Uma brisa entrou pela janela." },
  { id: "noite", display: "NOITE", difficulty: "normal", definition: "Período entre o pôr do sol e o amanhecer.", example: "A noite estava fresca e silenciosa." },
  { id: "amigo", display: "AMIGO", difficulty: "normal", definition: "Pessoa com quem se mantém uma relação de afeto e confiança.", example: "Um amigo trouxe uma ideia nova." },
  { id: "folha", display: "FOLHA", difficulty: "normal", definition: "Parte geralmente achatada de uma planta; também, página de papel.", example: "Uma folha caiu perto do caminho." },
  { id: "sonho", display: "SONHO", difficulty: "normal", definition: "Experiência durante o sono ou desejo que se quer realizar.", example: "Aprender a tocar foi um sonho antigo." },
  { id: "letra", display: "LETRA", difficulty: "normal", definition: "Sinal gráfico de um alfabeto ou texto de uma canção.", example: "A letra ficou clara no cartaz." },
  { id: "caminho", display: "CAMINHO", difficulty: "hard", definition: "Percurso que leva de um ponto a outro.", example: "O caminho passa perto do rio." },
  { id: "caderno", display: "CADERNO", difficulty: "hard", definition: "Conjunto de folhas reunidas para anotações ou exercícios.", example: "Ela anotou a palavra no caderno." },
  { id: "estrela", display: "ESTRELA", difficulty: "hard", definition: "Astro que emite luz própria e parece um ponto brilhante no céu.", example: "Uma estrela apareceu ao anoitecer." },
  { id: "teclado", display: "TECLADO", difficulty: "hard", definition: "Conjunto de teclas usado para digitar ou tocar música.", example: "O teclado facilitou a escrita." },
  { id: "amizade", display: "AMIZADE", difficulty: "hard", definition: "Relação de afeto, confiança e companheirismo.", example: "A amizade cresceu com o tempo." },
  { id: "brincar", display: "BRINCAR", difficulty: "hard", definition: "Participar de uma atividade por diversão.", example: "As crianças foram brincar no quintal." },
  { id: "pintura", display: "PINTURA", difficulty: "hard", definition: "Imagem feita com tinta ou atividade de aplicar tinta numa superfície.", example: "A pintura retrata uma paisagem." },
  { id: "cultura", display: "CULTURA", difficulty: "hard", definition: "Conjunto de conhecimentos, práticas e expressões de um grupo.", example: "A música faz parte da cultura local." },
  { id: "desenho", display: "DESENHO", difficulty: "hard", definition: "Representação criada com linhas, formas ou imagens.", example: "O desenho mostra uma casa e um jardim." },
  { id: "cantiga", display: "CANTIGA", difficulty: "hard", definition: "Canção simples, muitas vezes ligada a brincadeiras tradicionais.", example: "A turma aprendeu uma cantiga nova." },
  { id: "futebol", display: "FUTEBOL", difficulty: "hard", definition: "Esporte disputado entre duas equipes que tentam marcar gols.", example: "O futebol reuniu a família na sala." },
  { id: "espelho", display: "ESPELHO", difficulty: "hard", definition: "Superfície que reflete imagens.", example: "O espelho fica perto da porta." },
  { id: "palavra", display: "PALAVRA", difficulty: "hard", definition: "Unidade da língua formada por sons ou letras e associada a um significado.", example: "Cada palavra pode abrir uma conversa." },
];

export const WORDS: WordEntry[] = definitions.map((entry) => ({
  ...entry,
  normalized: normalizeWord(entry.display),
}));

const EXTRA_GUESSES: Record<Difficulty, string[]> = {
  easy: ["AMOR", "DADO", "FILA", "FOCO", "FOGO", "FRIO", "MEIO", "NADA", "ONDA", "PANO", "PELE", "PERA", "REDE", "SINO", "TIPO", "VELA", "ZERO", "CEDO", "LEVE", "ANEL", "CERA", "GEMA", "POTE", "SUCO", "URSO", "CIMA", "DONA", "LUTA", "MALA", "RIMA", "SALA", "TELA", "VIDA", "VILA"],
  normal: ["ALUNO", "AREIA", "AVISO", "BAILE", "BAIXO", "BARCO", "BEIJO", "CALMA", "CANTO", "CHUVA", "CLARO", "COISA", "CONTO", "CORPO", "DOCEs", "ESTAR", "FOLHA", "FORMA", "FRASE", "GENTE", "GRUPO", "IDEIA", "IGUAL", "JOGAR", "LARGO", "LENTO", "LINHA", "LUGAR", "MUNDO", "PARTE", "PEDRA", "PLANO", "PODER", "PORTA", "PRAIA", "PROSA", "RITMO", "SONHO", "TRAMA", "VERDE"],
  hard: ["ANIMAIS", "CADEIRA", "CORAGEM", "COZINHA", "DESAFIO", "FANTASIA", "GARAGEM", "JORNADA", "MORANGO", "TESOURO", "TRILHA", "VIOLAO", "XICARA", "ZEBRADO", "ABRAÇAR", "ARTISTA", "BIBLIOTECA", "FLORESTA", "HISTORIA", "MONTANHA", "NATUREZA", "PRESENTE", "SORRISO", "TRABALHO"],
};

export function wordsForDifficulty(difficulty: Difficulty): WordEntry[] {
  return WORDS.filter((word) => word.difficulty === difficulty && word.normalized.length === LEVEL_RULES[difficulty].length);
}

function acceptedWordsFor(difficulty: Difficulty): ReadonlySet<string> {
  const length = LEVEL_RULES[difficulty].length;
  const authoredWords = wordsForDifficulty(difficulty).map((word) => word.normalized);
  const extraWords = EXTRA_GUESSES[difficulty].map(normalizeWord).filter((word) => word.length === length);
  return new Set([...authoredWords, ...extraWords]);
}

export const ACCEPTED_WORDS: Record<Difficulty, ReadonlySet<string>> = {
  easy: acceptedWordsFor("easy"),
  normal: acceptedWordsFor("normal"),
  hard: acceptedWordsFor("hard"),
};

export function getWordById(id: string | undefined): WordEntry | undefined {
  return WORDS.find((word) => word.id === id);
}

export function getSaoPauloDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function getDailyEntry(date: string, difficulty: Difficulty): WordEntry {
  const pool = wordsForDifficulty(difficulty);
  const seed = `${date}:pt-BR:${difficulty}:catalog-v1`;
  let hash = 0;
  for (const character of seed) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}

export function getPracticeEntry(difficulty: Difficulty, avoidId?: string): WordEntry {
  const pool = wordsForDifficulty(difficulty);
  const options = pool.length > 1 ? pool.filter((word) => word.id !== avoidId) : pool;
  return options[Math.floor(Math.random() * options.length)];
}