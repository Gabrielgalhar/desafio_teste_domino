import test from 'node:test';
import assert from 'node:assert/strict';
import { Domino, criarPecas } from '../src/domino.js';

function executarJogadaAutomatica(jogo) {
  const estado = jogo.estado;
  const jogador = estado.vez;
  const indice = estado.maos[jogador].findIndex(peca =>
    !estado.mesa.length || peca.includes(estado.mesa[0][0]) || peca.includes(estado.mesa.at(-1)[1])
  );

  if (indice >= 0) {
    const peca = estado.maos[jogador][indice];
    const lado = !estado.mesa.length || peca.includes(estado.mesa.at(-1)[1]) ? 'direita' : 'esquerda';
    jogo.jogar(jogador, indice, lado);
    return 'jogar';
  }

  if (estado.monte) {
    jogo.comprar(jogador);
    return 'comprar';
  }

  jogo.passar(jogador);
  return 'passar';
}

function criarBaralhoDeterministico(semente) {
  const baralho = criarPecas();
  let valor = semente;

  for (let i = baralho.length - 1; i > 0; i--) {
    valor = (Math.imul(valor, 1664525) + 1013904223) >>> 0;
    const indice = valor % (i + 1);
    [baralho[i], baralho[indice]] = [baralho[indice], baralho[i]];
  }

  return baralho;
}

test('CT01 - conjunto duplo seis possui 28 pecas distintas', () => {
  const pecas = criarPecas();
  assert.equal(pecas.length, 28);
  assert.equal(new Set(pecas.map(p => p.join('-'))).size, 28);
  assert.deepEqual(pecas[0], [0, 0]);
  assert.deepEqual(pecas.at(-1), [6, 6]);
});

test('CT02 - entrega sete pecas para cada jogador e deixa quatorze no monte', () => {
  const estado = new Domino().estado;
  assert.deepEqual(estado.maos.map(mao => mao.length), [7, 7]);
  assert.equal(estado.monte, 14);
  assert.equal(estado.vez, 0);
});

test('CT03 - baralho invalido ou repetido e recusado', () => {
  assert.throws(() => new Domino([]), RangeError);
  const repetido = criarPecas();
  repetido[1] = repetido[0];
  assert.throws(() => new Domino(repetido), RangeError);
  const foraDoLimite = criarPecas();
  foraDoLimite[0] = [7, 0];
  assert.throws(() => new Domino(foraDoLimite), RangeError);
});

test('CT04 - primeira jogada cria a mesa, reduz a mao e alterna o turno', () => {
  const jogo = new Domino();
  jogo.jogar(0, 0);
  assert.deepEqual(jogo.estado.mesa, [[0, 0]]);
  assert.equal(jogo.estado.maos[0].length, 6);
  assert.equal(jogo.estado.vez, 1);
});

test('CT05 - peca e invertida quando entra pela ponta esquerda', () => {
  const pecas = criarPecas();
  const escolhidas = [[0, 1], [0, 2]];
  const restante = pecas.filter(p => !escolhidas.some(e => e.join() === p.join()));
  const baralho = [escolhidas[0], ...restante.slice(0, 6), escolhidas[1], ...restante.slice(6)];
  const jogo = new Domino(baralho);

  jogo.jogar(0, 0);
  jogo.jogar(1, 0, 'esquerda');
  assert.deepEqual(jogo.estado.mesa, [[2, 0], [0, 1]]);
});

test('CT06 - peca sem encaixe e rejeitada sem modificar o estado', () => {
  const jogo = new Domino();
  jogo.jogar(0, 0);
  const antes = jogo.estado;
  assert.throws(() => jogo.jogar(1, 0));
  assert.deepEqual(jogo.estado, antes);
});

test('CT07 - turno, indice e lado invalidos sao rejeitados', () => {
  const jogo = new Domino();
  const antes = jogo.estado;
  assert.throws(() => jogo.jogar(1, 0));
  assert.throws(() => jogo.jogar(0, -1), RangeError);
  assert.throws(() => jogo.jogar(0, 0, 'centro'), RangeError);
  assert.deepEqual(jogo.estado, antes);
});

test('CT08 - nao permite comprar ou passar quando existe jogada', () => {
  const jogo = new Domino();
  assert.throws(() => jogo.comprar(0));
  assert.throws(() => jogo.passar(0));
});

test('CT09 - compra sem encaixe mantem o turno e preserva as 28 pecas', () => {
  const jogo = new Domino();
  jogo.jogar(0, 0);
  const antes = jogo.estado;
  jogo.comprar(1);
  const depois = jogo.estado;

  assert.equal(depois.maos[1].length, antes.maos[1].length + 1);
  assert.equal(depois.monte, antes.monte - 1);
  assert.equal(depois.vez, 1);
  assert.throws(() => jogo.passar(1));
});

test('CT10 - partidas deterministicas conservam as 28 pecas e terminam', () => {
  for (let semente = 1; semente <= 20; semente++) {
    const jogo = new Domino(criarBaralhoDeterministico(semente));

    for (let passo = 0; !jogo.estado.terminou && passo < 200; passo++) {
      executarJogadaAutomatica(jogo);
      const estado = jogo.estado;
      assert.equal(
        estado.maos[0].length + estado.maos[1].length + estado.mesa.length + estado.monte,
        28
      );
      for (let i = 1; i < estado.mesa.length; i++) {
        assert.equal(estado.mesa[i - 1][1], estado.mesa[i][0]);
      }
    }

    assert.equal(jogo.estado.terminou, true);
    assert.throws(() => jogo.jogar(jogo.estado.vez, 0));
    assert.throws(() => jogo.comprar(jogo.estado.vez));
    assert.throws(() => jogo.passar(jogo.estado.vez));
  }
});

test('CT11 - ficar sem pecas encerra com vitoria', () => {
  const jogo = new Domino();
  for (let passo = 0; !jogo.estado.terminou && passo < 200; passo++) executarJogadaAutomatica(jogo);
  assert.ok([0, 1].includes(jogo.estado.vencedor));
  assert.equal(jogo.estado.maos[jogo.estado.vencedor].length, 0);
});

test('CT12 - bloqueio escolhe a menor soma de pontos', () => {
  let partidasBloqueadas = 0;

  for (let semente = 1; semente <= 100; semente++) {
    const jogo = new Domino(criarBaralhoDeterministico(semente));
    for (let passo = 0; !jogo.estado.terminou && passo < 200; passo++) executarJogadaAutomatica(jogo);

    const estado = jogo.estado;
    if (estado.maos.every(mao => mao.length > 0)) {
      partidasBloqueadas++;
      const pontos = estado.maos.map(mao => mao.flat().reduce((total, numero) => total + numero, 0));
      const esperado = pontos[0] === pontos[1] ? 'empate' : pontos[0] < pontos[1] ? 0 : 1;
      assert.equal(estado.vencedor, esperado);
      assert.equal(estado.monte, 0);
    }
  }

  assert.ok(partidasBloqueadas > 0);
});

test('CT13 - baralho de entrada e estado retornado sao copias defensivas', () => {
  const pecas = criarPecas();
  const jogo = new Domino(pecas);
  pecas[0][0] = 6;
  const consulta = jogo.estado;
  consulta.maos[0][0][0] = 5;
  assert.deepEqual(jogo.estado.maos[0][0], [0, 0]);
});
