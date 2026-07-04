// Self-check: `npx tsx src/lib/financeiro.check.ts`
import assert from "node:assert";
import { gerarParcelas, descontoEfetivo } from "./financeiro";

// Soma das parcelas fecha o total líquido exato (sem sobra de centavos).
const p = gerarParcelas({ valorTotal: 1000, numParcelas: 3, diaVencimento: 10, dataInicio: new Date("2026-01-15") });
assert.equal(p.length, 3);
assert.equal(Math.round(p.reduce((s, x) => s + x.valor, 0) * 100) / 100, 1000);
assert.equal(p[0].vencimento.toISOString().slice(0, 10), "2026-01-10");
assert.equal(p[2].vencimento.toISOString().slice(0, 10), "2026-03-10");

// Desconto de 10% sobre 1000 = 900, fecha exato.
const d = gerarParcelas({ valorTotal: 1000, numParcelas: 7, diaVencimento: 31, dataInicio: new Date("2026-01-10"), descontoPercentual: 10 });
assert.equal(Math.round(d.reduce((s, x) => s + x.valor, 0) * 100) / 100, 900);
// Clamp do dia 31 em fevereiro → 28/02.
assert.equal(d[1].vencimento.toISOString().slice(0, 10), "2026-02-28");

assert.equal(descontoEfetivo(50, 60), 100); // soma limitada a 100
assert.equal(descontoEfetivo(20, null), 20);

console.log("financeiro.check OK");
