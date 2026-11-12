import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync(new URL('../evidencias/', import.meta.url), { recursive: true });

const resultado = spawnSync(process.execPath, ['--test'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});

const saida = `${resultado.stdout ?? ''}${resultado.stderr ?? ''}`;
process.stdout.write(saida);
writeFileSync(new URL('../evidencias/testes.log', import.meta.url), saida, 'utf8');
process.exit(resultado.status ?? 1);
