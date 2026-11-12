export const criarPecas = () => Array.from({ length: 7 }, (_, primeiro) =>
  Array.from({ length: 7 - primeiro }, (_, segundo) => [primeiro, primeiro + segundo])).flat();

const chavePeca = p => [...p].sort((a, b) => a - b).join('-');

export class Domino {
  #maos;
  #monte;
  #mesa = [];
  #vez = 0;
  #passes = 0;
  #vencedor = null;
  #terminou = false;

  constructor(baralho = criarPecas()) {
    const invalido = !Array.isArray(baralho) || baralho.length !== 28 ||
      baralho.some(p => !Array.isArray(p) || p.length !== 2 ||
        p.some(n => !Number.isInteger(n) || n < 0 || n > 6)) ||
      new Set(baralho.map(chavePeca)).size !== 28;

    if (invalido) throw new RangeError('Baralho invalido');

    const copia = baralho.map(peca => [...peca]);
    this.#maos = [copia.slice(0, 7), copia.slice(7, 14)];
    this.#monte = copia.slice(14);
  }

  #validarTurno(jogador) {
    if (this.#terminou) throw new Error('Partida encerrada');
    if (jogador !== this.#vez) throw new Error('Fora da vez');
  }

  #podeEncaixar(peca) {
    if (!this.#mesa.length) return true;
    return peca.includes(this.#mesa[0][0]) || peca.includes(this.#mesa.at(-1)[1]);
  }

  #temJogada(jogador) {
    return this.#maos[jogador].some(peca => this.#podeEncaixar(peca));
  }

  jogar(jogador, indice, lado = 'direita') {
    this.#validarTurno(jogador);

    if (!['esquerda', 'direita'].includes(lado) || !Number.isInteger(indice) ||
        indice < 0 || indice >= this.#maos[jogador].length) {
      throw new RangeError('Jogada invalida');
    }

    const peca = [...this.#maos[jogador][indice]];

    if (this.#mesa.length) {
      const ponta = lado === 'esquerda' ? this.#mesa[0][0] : this.#mesa.at(-1)[1];
      if (!peca.includes(ponta)) throw new Error('Peca nao encaixa');

      const precisaInverter = lado === 'esquerda' ? peca[1] !== ponta : peca[0] !== ponta;
      if (precisaInverter) peca.reverse();
    }

    this.#maos[jogador].splice(indice, 1);
    lado === 'esquerda' ? this.#mesa.unshift(peca) : this.#mesa.push(peca);
    this.#passes = 0;

    if (this.#maos[jogador].length === 0) {
      this.#terminou = true;
      this.#vencedor = jogador;
    } else {
      this.#vez = 1 - jogador;
    }
  }

  comprar(jogador) {
    this.#validarTurno(jogador);
    if (this.#temJogada(jogador)) throw new Error('Existe jogada disponivel');
    if (!this.#monte.length) throw new Error('Monte vazio');

    this.#maos[jogador].push(this.#monte.shift());
    this.#passes = 0;
  }

  passar(jogador) {
    this.#validarTurno(jogador);
    if (this.#temJogada(jogador) || this.#monte.length) throw new Error('Nao pode passar');

    this.#passes++;
    if (this.#passes === 2) {
      const pontos = this.#maos.map(mao => mao.flat().reduce((total, numero) => total + numero, 0));
      this.#vencedor = pontos[0] === pontos[1] ? 'empate' : pontos[0] < pontos[1] ? 0 : 1;
      this.#terminou = true;
    } else {
      this.#vez = 1 - jogador;
    }
  }

  get estado() {
    return {
      maos: this.#maos.map(mao => mao.map(peca => [...peca])),
      monte: this.#monte.length,
      mesa: this.#mesa.map(peca => [...peca]),
      vez: this.#vez,
      vencedor: this.#vencedor,
      terminou: this.#terminou
    };
  }
}
