/**
 * Seed de demonstração — popula todos os módulos com dados realistas + usuários dos 3 papéis.
 * Rodar: npm run db:seed:demo   (LIMPA os dados de domínio antes de recriar).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const pick = <T>(arr: T[], i: number) => arr[i % arr.length];
const d = (s: string) => new Date(s + "T00:00:00Z");
const rand = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

async function limpar() {
  // ordem segura de FKs
  await prisma.$transaction([
    prisma.presenca.deleteMany(),
    prisma.lancamentoNota.deleteMany(),
    prisma.tentativaQuestionario.deleteMany(),
    prisma.progressoAula.deleteMany(),
    prisma.entregaAtividade.deleteMany(),
    prisma.questao.deleteMany(),
    prisma.questionario.deleteMany(),
    prisma.aulaEad.deleteMany(),
    prisma.moduloEad.deleteMany(),
    prisma.postForum.deleteMany(),
    prisma.forum.deleteMany(),
    prisma.aula.deleteMany(),
    prisma.avaliacao.deleteMany(),
    prisma.nota.deleteMany(),
    prisma.certificado.deleteMany(),
    prisma.matricula.deleteMany(),
    prisma.parcela.deleteMany(),
    prisma.renegociacao.deleteMany(),
    prisma.contrato.deleteMany(),
    prisma.cobranca.deleteMany(),
    prisma.bolsa.deleteMany(),
    prisma.multa.deleteMany(),
    prisma.emprestimo.deleteMany(),
    prisma.reserva.deleteMany(),
    prisma.exemplar.deleteMany(),
    prisma.titulo.deleteMany(),
    prisma.inscricao.deleteMany(),
    prisma.processoSeletivo.deleteMany(),
    prisma.notificacao.deleteMany(),
    prisma.comunicado.deleteMany(),
    prisma.atividade.deleteMany(),
    prisma.disciplina.deleteMany(),
    prisma.turma.deleteMany(),
    prisma.convenio.deleteMany(),
    prisma.sala.deleteMany(),
    prisma.calendarioEvento.deleteMany(),
    prisma.aluno.deleteMany(),
    prisma.professor.deleteMany(),
    prisma.curso.deleteMany(),
  ]);
  // remove usuários demo (mantém o admin)
  await prisma.user.deleteMany({ where: { email: { not: "admin@escola.com" } } });
}

function parcelasDe(valorTotal: number, num: number, dia: number, inicio: Date) {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const base = cents(valorTotal / num);
  const out: { numero: number; valor: number; vencimento: Date }[] = [];
  let acc = 0;
  for (let i = 1; i <= num; i++) {
    const valor = i === num ? cents(valorTotal - acc) : base;
    acc = cents(acc + valor);
    const venc = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + (i - 1), dia));
    out.push({ numero: i, valor, vencimento: venc });
  }
  return out;
}

async function main() {
  console.log("Limpando dados de domínio...");
  await limpar();

  // ── Cursos ─────────────────────────────────────────────
  console.log("Criando cursos, professores, salas...");
  const cursosData = [
    { nome: "Técnico em Informática", area: "Tecnologia", cargaHoraria: 1200, valor: 350, modalidade: "presencial" },
    { nome: "Técnico em Enfermagem", area: "Saúde", cargaHoraria: 1800, valor: 480, modalidade: "presencial" },
    { nome: "Técnico em Administração", area: "Gestão", cargaHoraria: 1000, valor: 320, modalidade: "presencial" },
    { nome: "Técnico em Eletrotécnica", area: "Indústria", cargaHoraria: 1200, valor: 400, modalidade: "presencial" },
    { nome: "Excel Avançado (Livre)", area: "Tecnologia", cargaHoraria: 40, valor: 250, modalidade: "ead" },
  ];
  const cursos = [];
  for (const c of cursosData) cursos.push(await prisma.curso.create({ data: c }));

  const profNomes = [
    "Carlos Mendes", "Ana Paula Souza", "Roberto Lima", "Fernanda Alves", "João Pereira",
    "Marina Costa", "Paulo Henrique", "Juliana Rocha",
  ];
  const professores = [];
  for (let i = 0; i < profNomes.length; i++) {
    professores.push(await prisma.professor.create({
      data: {
        nome: profNomes[i],
        email: `professor${i + 1}@escola.com`,
        cpf: `1110000000${i}`,
        telefone: `(42) 9${9000 + i}-0000`,
        especialidade: pick(["Programação", "Enfermagem", "Gestão", "Eletrotécnica", "Matemática"], i),
        titulacao: pick(["Especialista", "Mestre", "Graduado"], i),
      },
    }));
  }

  const salas = [];
  for (let i = 1; i <= 6; i++) {
    salas.push(await prisma.sala.create({
      data: { nome: `Sala ${i}`, bloco: i <= 3 ? "A" : "B", capacidade: 30 + i, tipo: i > 4 ? "laboratorio" : "sala", recursos: "Projetor, ar-condicionado" },
    }));
  }

  // ── Disciplinas por curso ──────────────────────────────
  console.log("Criando disciplinas e turmas...");
  const disciplinasPorCurso: Record<number, { id: number; nome: string }[]> = {};
  const nomesDisc: Record<string, string[]> = {
    "Técnico em Informática": ["Lógica de Programação", "Redes de Computadores", "Banco de Dados", "Desenvolvimento Web"],
    "Técnico em Enfermagem": ["Anatomia", "Primeiros Socorros", "Farmacologia", "Ética Profissional"],
    "Técnico em Administração": ["Gestão de Pessoas", "Contabilidade", "Marketing", "Empreendedorismo"],
    "Técnico em Eletrotécnica": ["Circuitos Elétricos", "Automação", "Segurança do Trabalho", "Desenho Técnico"],
    "Excel Avançado (Livre)": ["Fórmulas e Funções", "Tabelas Dinâmicas"],
  };
  for (let ci = 0; ci < cursos.length; ci++) {
    const curso = cursos[ci];
    const list = nomesDisc[curso.nome] ?? [];
    disciplinasPorCurso[curso.id] = [];
    for (let di = 0; di < list.length; di++) {
      const disc = await prisma.disciplina.create({
        data: {
          nome: list[di],
          cargaHoraria: 80,
          cursoId: curso.id,
          professorId: professores[(ci + di) % professores.length].id,
          periodo: (di % 2) + 1,
          obrigatoria: true,
        },
      });
      disciplinasPorCurso[curso.id].push({ id: disc.id, nome: disc.nome });
    }
  }

  // ── Turmas ─────────────────────────────────────────────
  const turmas = [];
  for (let ci = 0; ci < cursos.length; ci++) {
    const curso = cursos[ci];
    for (let t = 1; t <= (ci < 3 ? 2 : 1); t++) {
      turmas.push(await prisma.turma.create({
        data: {
          nome: `${curso.nome.split(" ").slice(-1)[0]} ${2026}.${t}`,
          cursoId: curso.id,
          professorId: professores[ci % professores.length].id,
          salaId: salas[(ci + t) % salas.length].id,
          dataInicio: d("2026-02-10"),
          dataFim: d("2026-12-15"),
          horario: t === 1 ? "Seg-Qua-Sex 19h-22h" : "Ter-Qui 19h-22h",
          vagas: 30,
          status: "em_andamento",
          anoLetivo: 2026,
          semestre: 1,
        },
      }));
    }
  }

  // ── Alunos ─────────────────────────────────────────────
  console.log("Criando alunos e matrículas...");
  const nomes = ["Lucas", "Mariana", "Gabriel", "Beatriz", "Rafael", "Camila", "Thiago", "Larissa", "Bruno", "Amanda",
    "Felipe", "Isabela", "Gustavo", "Letícia", "Matheus", "Júlia", "Vinícius", "Sofia", "Diego", "Manuela",
    "Rodrigo", "Helena", "André", "Valentina", "Eduardo", "Laura", "Marcelo", "Alice", "Ricardo", "Clara"];
  const sobren = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Almeida", "Ferreira"];
  const alunos = [];
  for (let i = 0; i < nomes.length; i++) {
    alunos.push(await prisma.aluno.create({
      data: {
        nome: `${nomes[i]} ${pick(sobren, i)}`,
        email: `aluno${i + 1}@escola.com`,
        cpf: String(22200000000 + i),
        telefone: `(42) 9${8000 + i}-1111`,
        cidade: "Guarapuava",
        estado: "PR",
        status: "ativo",
        dataNascimento: d(`200${i % 6}-0${(i % 9) + 1}-15`),
      },
    }));
  }

  // matrículas: distribui alunos nas turmas
  const matriculas = [];
  for (let i = 0; i < alunos.length; i++) {
    const turma = turmas[i % turmas.length];
    const m = await prisma.matricula.create({ data: { alunoId: alunos[i].id, turmaId: turma.id, status: "ativa" } });
    matriculas.push(m);
    await prisma.turma.update({ where: { id: turma.id }, data: { vagasOcupadas: { increment: 1 } } });
  }

  // ── Avaliações + notas ─────────────────────────────────
  console.log("Criando avaliações, notas, frequência...");
  for (const turma of turmas) {
    const discs = disciplinasPorCurso[turma.cursoId] ?? [];
    const alunosTurma = matriculas.filter((m) => m.turmaId === turma.id).map((m) => m.alunoId);
    for (const disc of discs.slice(0, 2)) {
      for (const tipo of ["prova", "trabalho"]) {
        const av = await prisma.avaliacao.create({
          data: { turmaId: turma.id, disciplinaId: disc.id, tipo, peso: tipo === "prova" ? 2 : 1, data: d("2026-05-20") },
        });
        for (const alunoId of alunosTurma) {
          await prisma.lancamentoNota.create({ data: { avaliacaoId: av.id, alunoId, valor: rand(4, 10) } });
        }
      }
      // nota legada (média simples) p/ a tela /notas
      for (const alunoId of alunosTurma.slice(0, 3)) {
        const n1 = rand(5, 10), n2 = rand(5, 10);
        const media = Math.round(((n1 + n2) / 2) * 10) / 10;
        await prisma.nota.create({
          data: { alunoId, turmaId: turma.id, disciplinaId: disc.id, nota1: n1, nota2: n2, media, situacao: media >= 6 ? "aprovado" : "recuperacao" },
        });
      }
    }
    // diário + frequência: 4 aulas
    const disc0 = discs[0];
    if (disc0) {
      for (let a = 0; a < 4; a++) {
        const aula = await prisma.aula.create({
          data: { turmaId: turma.id, disciplinaId: disc0.id, data: d(`2026-03-0${a + 1}`), conteudo: `Aula ${a + 1}: conteúdo programático` },
        });
        for (const alunoId of alunosTurma) {
          const falta = Math.random() < 0.15;
          await prisma.presenca.create({ data: { aulaId: aula.id, alunoId, status: falta ? "falta" : "presente" } });
        }
      }
    }
  }

  // ── Financeiro: cobranças, contratos, parcelas ─────────
  console.log("Criando financeiro (cobranças, contratos, inadimplência)...");
  for (let i = 0; i < alunos.length; i++) {
    const aluno = alunos[i];
    // cobranças avulsas (mensalidade) com status variados
    const status = pick(["pago", "pendente", "vencido"], i);
    await prisma.cobranca.create({
      data: {
        alunoId: aluno.id,
        descricao: "Mensalidade Março/2026",
        valor: 350,
        vencimento: d("2026-03-10"),
        dataPagamento: status === "pago" ? d("2026-03-08") : null,
        status,
        metodoPagamento: status === "pago" ? "pix" : null,
      },
    });
    // alguns contratos parcelados; 1/3 com parcela vencida (inadimplência)
    if (i % 2 === 0) {
      const inicio = i % 6 === 0 ? d("2025-11-10") : d("2026-02-10"); // vencidos p/ inadimplência
      const contrato = await prisma.contrato.create({
        data: { alunoId: aluno.id, valorTotal: 4200, numParcelas: 12, diaVencimento: 10, dataInicio: inicio, status: "ativo" },
      });
      const parcelas = parcelasDe(4200, 12, 10, inicio);
      const hoje = new Date();
      for (const p of parcelas) {
        const vencida = p.vencimento < hoje;
        await prisma.parcela.create({
          data: {
            contratoId: contrato.id,
            numero: p.numero,
            valor: p.valor,
            vencimento: p.vencimento,
            status: vencida ? (Math.random() < 0.6 ? "pago" : "vencido") : "pendente",
            dataPagamento: null,
          },
        });
      }
    }
  }

  // bolsas e convênios
  await prisma.convenio.create({ data: { nome: "Empresa Parceira XPTO", empresa: "XPTO Ltda", percentualDesconto: 15 } });
  await prisma.convenio.create({ data: { nome: "Sindicato dos Comerciários", empresa: "SINDCOM", percentualDesconto: 10 } });
  await prisma.bolsa.create({ data: { alunoId: alunos[1].id, tipo: "parcial", percentual: 50, motivo: "Mérito acadêmico", dataInicio: d("2026-02-01"), ativo: true } });
  await prisma.bolsa.create({ data: { alunoId: alunos[3].id, tipo: "integral", percentual: 100, motivo: "Vulnerabilidade social", dataInicio: d("2026-02-01"), ativo: true } });

  // ── Calendário ─────────────────────────────────────────
  console.log("Criando calendário, EAD, biblioteca, processo seletivo...");
  const eventos = [
    { titulo: "Início do 1º semestre", tipo: "inicio_semestre", dataInicio: d("2026-02-10") },
    { titulo: "Feriado - Tiradentes", tipo: "feriado", dataInicio: d("2026-04-21") },
    { titulo: "Semana de Provas", tipo: "prova", dataInicio: d("2026-05-18"), dataFim: d("2026-05-22") },
    { titulo: "Conselho de Classe", tipo: "conselho", dataInicio: d("2026-06-30") },
    { titulo: "Recesso de Julho", tipo: "recesso", dataInicio: d("2026-07-13"), dataFim: d("2026-07-24") },
    { titulo: "Formatura 2026", tipo: "formatura", dataInicio: d("2026-12-18") },
  ];
  for (const e of eventos) await prisma.calendarioEvento.create({ data: e });

  // EAD no curso livre
  const cursoEad = cursos[4];
  for (let m = 1; m <= 2; m++) {
    const modulo = await prisma.moduloEad.create({ data: { cursoId: cursoEad.id, titulo: `Módulo ${m}`, descricao: `Conteúdo do módulo ${m}`, ordem: m } });
    for (let a = 1; a <= 3; a++) {
      await prisma.aulaEad.create({
        data: { moduloId: modulo.id, titulo: `Aula ${m}.${a}`, tipo: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", ordem: a, duracaoMin: 15 },
      });
    }
    const q = await prisma.questionario.create({ data: { moduloId: modulo.id, titulo: `Quiz Módulo ${m}`, notaMinima: 6 } });
    await prisma.questao.create({ data: { questionarioId: q.id, enunciado: "Qual função soma valores no Excel?", tipo: "multipla", opcoes: ["SOMA", "MÉDIA", "SE"], respostaCorreta: "SOMA", peso: 1, ordem: 1 } });
  }

  // Biblioteca
  const titulosData = [
    { titulo: "Algoritmos e Lógica de Programação", autor: "José Augusto", categoria: "Tecnologia", ano: 2020 },
    { titulo: "Anatomia Humana Básica", autor: "Sobotta", categoria: "Saúde", ano: 2019 },
    { titulo: "Administração Moderna", autor: "Chiavenato", categoria: "Gestão", ano: 2021 },
  ];
  for (const t of titulosData) {
    const titulo = await prisma.titulo.create({ data: t });
    for (let e = 1; e <= 3; e++) {
      await prisma.exemplar.create({ data: { tituloId: titulo.id, codigo: `EX-${titulo.id}-${e}`, status: e === 1 ? "emprestado" : "disponivel", localizacao: `Estante ${titulo.id}` } });
    }
  }

  // Processo seletivo
  const processo = await prisma.processoSeletivo.create({
    data: { nome: "Vestibular 2026.2", descricao: "Processo seletivo para cursos técnicos", vagas: 120, inscricaoInicio: d("2026-06-01"), inscricaoFim: d("2026-07-31"), dataProva: d("2026-08-10"), taxaInscricao: 30, status: "aberto" },
  });
  for (let i = 0; i < 5; i++) {
    await prisma.inscricao.create({
      data: {
        processoId: processo.id,
        nome: `Candidato ${i + 1}`,
        cpf: `3330000000${i}`,
        email: `candidato${i + 1}@email.com`,
        status: pick(["inscrito", "aprovado", "convocado"], i),
        pagamentoStatus: pick(["pago", "pendente"], i),
        nota: rand(50, 95),
        classificacao: i + 1,
      },
    });
  }

  // ── Usuários dos 3 papéis (para testar acessos) ────────
  console.log("Criando usuários de teste...");
  const senha = await bcrypt.hash("demo123", 10);
  const admSenha = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@escola.com" },
    update: { papel: "super_admin", ativo: true },
    create: { nome: "Administrador", email: "admin@escola.com", senhaHash: admSenha, papel: "super_admin" },
  });
  const usuarios = [
    { nome: "Secretaria", email: "secretaria@escola.com", papel: "secretaria" },
    { nome: "Financeiro", email: "financeiro@escola.com", papel: "financeiro" },
    { nome: "Coordenação", email: "coordenacao@escola.com", papel: "coordenador" },
  ];
  for (const u of usuarios) {
    await prisma.user.create({ data: { ...u, senhaHash: senha, ativo: true } });
  }
  // aluno vinculado (portal do aluno)
  await prisma.user.create({
    data: { nome: alunos[0].nome, email: "aluno@escola.com", senhaHash: senha, papel: "aluno", ativo: true, alunoId: alunos[0].id, cpf: alunos[0].cpf },
  });
  // professor vinculado (portal do professor)
  await prisma.user.create({
    data: { nome: professores[0].nome, email: "professor@escola.com", senhaHash: senha, papel: "professor", ativo: true, professorId: professores[0].id, cpf: professores[0].cpf },
  });

  // notificações p/ o admin
  const admin = await prisma.user.findUnique({ where: { email: "admin@escola.com" } });
  if (admin) {
    await prisma.notificacao.createMany({
      data: [
        { userId: admin.id, titulo: "Bem-vindo", mensagem: "Dados de demonstração carregados.", tipo: "sucesso" },
        { userId: admin.id, titulo: "Inadimplência", mensagem: "Há parcelas vencidas para acompanhar.", tipo: "alerta", link: "/inadimplencia" },
      ],
    });
  }

  console.log("\n✅ Seed de demonstração concluído!\n");
  console.table({
    Admin: "admin@escola.com / admin123",
    Secretaria: "secretaria@escola.com / demo123",
    Financeiro: "financeiro@escola.com / demo123",
    Coordenação: "coordenacao@escola.com / demo123",
    Aluno: "aluno@escola.com / demo123",
    Professor: "professor@escola.com / demo123",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
