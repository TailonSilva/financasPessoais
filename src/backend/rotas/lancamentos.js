// Importa o Router para criar rotas separadas no Express.
import { Router } from "express";
import crypto from "node:crypto";
// Importa a conexão com o banco SQLite.
import { db } from "../db.js";

// Cria e exporta o agrupador de rotas de lançamentos.
export const lancamentosRoutes = Router();

function addMonths(mes, ano, quantidadeMeses) {
  const date = new Date(Number(ano), Number(mes) - 1 + quantidadeMeses, 1);

  return {
    ano: date.getFullYear(),
    mes: date.getMonth() + 1,
  };
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

async function garantirColunasRecorrencia() {
  const colunas = await all('PRAGMA table_info("lançamentos")');
  const nomes = colunas.map((coluna) => coluna.name);

  if (!nomes.includes("recorrencia_id")) {
    await run('ALTER TABLE "lançamentos" ADD COLUMN recorrencia_id TEXT');
  }

  if (!nomes.includes("recorrencia_ordem")) {
    await run('ALTER TABLE "lançamentos" ADD COLUMN recorrencia_ordem INTEGER');
  }
}

function montarDadosLancamento(body) {
  const {
    descricao,
    valor,
    data_vencimento,
    dia_vencimento,
    mes_vencimento,
    ano_vencimento,
    data_pagamento,
    categoria_id,
    conta_id,
    conta_origem_id,
    conta_destino_id,
    tipo_lancamento,
    recorrencia_id,
    recorrencia_ordem,
  } = body;
  const partesDataVencimento = data_vencimento ? data_vencimento.split("-") : [];
  const anoVencimento = ano_vencimento || partesDataVencimento[0];
  const mesVencimento = mes_vencimento || partesDataVencimento[1];
  const diaVencimento = dia_vencimento || partesDataVencimento[2];

  return {
    anoVencimento,
    categoria_id,
    conta_destino_id,
    conta_id,
    conta_origem_id,
    dataPagamento: data_pagamento || null,
    dataVencimento:
      anoVencimento && mesVencimento && diaVencimento
        ? `${anoVencimento}-${String(mesVencimento).padStart(2, "0")}-${String(
            diaVencimento,
          ).padStart(2, "0")}`
        : null,
    descricao,
    diaVencimento,
    mesVencimento,
    recorrencia_id,
    recorrencia_ordem,
    tipo_lancamento,
    valor,
  };
}

function validarDadosLancamento(dados) {
  if (
    !dados.descricao ||
    !dados.valor ||
    !dados.diaVencimento ||
    !dados.mesVencimento ||
    !dados.anoVencimento ||
    !dados.categoria_id ||
    !dados.tipo_lancamento
  ) {
    return "Informe descricao, valor, vencimento, categoria_id e tipo_lancamento.";
  }

  const isTransferencia = dados.tipo_lancamento === "Transferência";
  const contaLancamentoId = isTransferencia ? dados.conta_origem_id : dados.conta_id;

  if (!contaLancamentoId) {
    return isTransferencia
      ? "Informe conta_origem_id para transferências."
      : "Informe conta_id.";
  }

  if (isTransferencia && !dados.conta_destino_id) {
    return "Informe conta_destino_id para transferências.";
  }

  if (dados.dataPagamento && dados.dataPagamento > new Date().toISOString().slice(0, 10)) {
    return "A data de pagamento não pode ser futura.";
  }

  return null;
}

// Cria a rota GET que lista todas as lancamentos.
lancamentosRoutes.get("/db-lancamentos", (_req, res) => {
  async function listar() {
    await garantirColunasRecorrencia();

  // Executa a consulta SQL buscando lancamentos com categoria e conta.
  const rows = await all(
    // Seleciona campos da despesa e nomes relacionados.
    `SELECT
      lancamento.id,
      lancamento.descricao,
      lancamento.dia_vencimento,
      lancamento.mes_vencimento,
      meses.descricao AS mes_vencimento_descricao,
      lancamento.ano_vencimento,
      lancamento.data_pagamento,
      lancamento.categoria_id,
      categoria.descricao AS categoria,
      categoria.icone AS categoria_icone,
      categoria.cor AS categoria_cor,
      lancamento.conta_id,
      conta.descricao AS conta,
      conta.tipo_conta_id,
      tipo_conta.descricao AS tipo_conta,
      conta.banco_id,
      banco.nome AS banco,
      banco.imagem AS banco_imagem,
      lancamento.conta_origem_id,
      conta_origem.descricao AS conta_origem,
      conta_origem.banco_id AS conta_origem_banco_id,
      banco_origem.nome AS conta_origem_banco,
      banco_origem.imagem AS conta_origem_banco_imagem,
      lancamento.conta_destino_id,
      conta_destino.descricao AS conta_destino,
      conta_destino.banco_id AS conta_destino_banco_id,
      banco_destino.nome AS conta_destino_banco,
      banco_destino.imagem AS conta_destino_banco_imagem,
      lancamento.tipo_lancamento_id,
      tipo_lancamentos.descricao AS tipo_lancamento,
      lancamento.recorrencia_id,
      lancamento.recorrencia_ordem,
      fatura_cartao.id AS fatura_cartao_id,
      fatura_cartao.status AS fatura_cartao_status,
      fatura_cartao.mes_referencia AS fatura_cartao_mes_referencia,
      fatura_cartao.ano_referencia AS fatura_cartao_ano_referencia,
      COALESCE(fatura_cartao.valor_total, lancamento.valor) AS valor
    FROM "lançamentos" AS lancamento
    LEFT JOIN categoria ON categoria.id = lancamento.categoria_id
    LEFT JOIN conta ON conta.id = lancamento.conta_id
    LEFT JOIN tipo_conta ON tipo_conta.id = conta.tipo_conta_id
    LEFT JOIN banco ON banco.id = conta.banco_id
    LEFT JOIN conta AS conta_origem ON conta_origem.id = lancamento.conta_origem_id
    LEFT JOIN banco AS banco_origem ON banco_origem.id = conta_origem.banco_id
    LEFT JOIN conta AS conta_destino ON conta_destino.id = lancamento.conta_destino_id
    LEFT JOIN banco AS banco_destino ON banco_destino.id = conta_destino.banco_id
    LEFT JOIN tipo_lancamentos ON tipo_lancamentos.id = lancamento.tipo_lancamento_id
    LEFT JOIN faturas_cartao AS fatura_cartao ON fatura_cartao.lancamento_id = lancamento.id
    LEFT JOIN meses ON meses.id = lancamento.mes_vencimento
    ORDER BY lancamento.ano_vencimento, lancamento.mes_vencimento, lancamento.dia_vencimento`,
  );

    return res.json(rows);
  }

  listar().catch((error) => res.status(500).json({ error: error.message }));
});

lancamentosRoutes.post("/db-lancamentos", (req, res) => {
  const dados = montarDadosLancamento(req.body);
  const erroValidacao = validarDadosLancamento(dados);

  if (erroValidacao) {
    return res.status(400).json({ error: erroValidacao });
  }

  async function criar() {
    await garantirColunasRecorrencia();

    const tipo = await get(
      "SELECT id FROM tipo_lancamentos WHERE descricao = ?",
      [dados.tipo_lancamento],
    );

    if (!tipo) {
      return res.status(400).json({ error: "Tipo de lançamento inválido." });
    }

    const isTransferencia = dados.tipo_lancamento === "Transferência";
    const isFixo =
      req.body.fixo === true || req.body.fixo === "true" || req.body.fixo === "on";
    const totalLancamentos = isFixo && !isTransferencia ? 600 : 1;
    const recorrenciaId = totalLancamentos > 1 ? crypto.randomUUID() : null;
    const ids = [];

    await run("BEGIN TRANSACTION");

    try {
      for (let index = 0; index < totalLancamentos; index += 1) {
        const referencia = addMonths(dados.mesVencimento, dados.anoVencimento, index);
        const dataVencimento = `${referencia.ano}-${String(referencia.mes).padStart(
          2,
          "0",
        )}-${String(dados.diaVencimento).padStart(2, "0")}`;
        const contaLancamentoId = isTransferencia ? dados.conta_origem_id : dados.conta_id;
        const result = await run(
          `INSERT INTO "lançamentos" (
            descricao,
            data_vencimento,
            data_pagamento,
            categoria_id,
            conta_id,
            valor,
            tipo_lancamento_id,
            dia_vencimento,
            mes_vencimento,
            ano_vencimento,
            conta_origem_id,
            conta_destino_id,
            recorrencia_id,
            recorrencia_ordem
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dados.descricao.trim(),
            dataVencimento,
            index === 0 ? dados.dataPagamento : null,
            dados.categoria_id,
            contaLancamentoId,
            dados.valor,
            tipo.id,
            dados.diaVencimento,
            referencia.mes,
            referencia.ano,
            isTransferencia ? dados.conta_origem_id : null,
            isTransferencia ? dados.conta_destino_id : null,
            recorrenciaId,
            recorrenciaId ? index + 1 : null,
          ],
        );

        ids.push(result.lastID);
      }

      await run("COMMIT");
      return res.status(201).json({ id: ids[0], ids, recorrencia_id: recorrenciaId });
    } catch (error) {
      await run("ROLLBACK").catch(() => {});
      throw error;
    }
  }

  criar().catch((error) => res.status(500).json({ error: error.message }));
});

lancamentosRoutes.put("/db-lancamentos/:id", (req, res) => {
  const dados = montarDadosLancamento(req.body);
  const erroValidacao = validarDadosLancamento(dados);

  if (erroValidacao) {
    return res.status(400).json({ error: erroValidacao });
  }

  async function atualizar() {
    await garantirColunasRecorrencia();

    const tipo = await get(
      "SELECT id FROM tipo_lancamentos WHERE descricao = ?",
      [dados.tipo_lancamento],
    );

    if (!tipo) {
      return res.status(400).json({ error: "Tipo de lançamento inválido." });
    }

    const lancamentoAtual = await get(
      `SELECT id, recorrencia_id, ano_vencimento, mes_vencimento
      FROM "lançamentos"
      WHERE id = ?`,
      [req.params.id],
    );
    const faturaVinculada = await get(
      `SELECT id FROM faturas_cartao WHERE lancamento_id = ?`,
      [req.params.id],
    );

    if (faturaVinculada) {
      return res.status(400).json({
        error: "Lançamentos de fatura de cartão permitem apenas consulta.",
      });
    }

    const isTransferencia = dados.tipo_lancamento === "Transferência";
    const contaLancamentoId = isTransferencia ? dados.conta_origem_id : dados.conta_id;
    const aplicarRecorrencia =
      req.body.aplicar_recorrencia === "futuro" && lancamentoAtual?.recorrencia_id;
    if (!aplicarRecorrencia) {
      const result = await run(
        `UPDATE "lançamentos"
        SET descricao = ?,
          data_vencimento = ?,
          data_pagamento = ?,
          categoria_id = ?,
          conta_id = ?,
          valor = ?,
          tipo_lancamento_id = ?,
          dia_vencimento = ?,
          mes_vencimento = ?,
          ano_vencimento = ?,
          conta_origem_id = ?,
          conta_destino_id = ?
        WHERE id = ?`,
        [
          dados.descricao.trim(),
          dados.dataVencimento,
          dados.dataPagamento,
          dados.categoria_id,
          contaLancamentoId,
          dados.valor,
          tipo.id,
          dados.diaVencimento,
          dados.mesVencimento,
          dados.anoVencimento,
          isTransferencia ? dados.conta_origem_id : null,
          isTransferencia ? dados.conta_destino_id : null,
          req.params.id,
        ],
      );

      return res.json({ updated: result.changes });
    }

    const result = await run(
      `UPDATE "lançamentos"
      SET descricao = ?,
        data_vencimento = printf('%04d-%02d-%02d', ano_vencimento, mes_vencimento, ?),
        data_pagamento = CASE WHEN id = ? THEN ? ELSE data_pagamento END,
        categoria_id = ?,
        conta_id = ?,
        valor = ?,
        tipo_lancamento_id = ?,
        dia_vencimento = ?,
        conta_origem_id = ?,
        conta_destino_id = ?
      WHERE recorrencia_id = ?
        AND (ano_vencimento > ? OR (ano_vencimento = ? AND mes_vencimento >= ?))`,
      [
        dados.descricao.trim(),
        dados.diaVencimento,
        req.params.id,
        dados.dataPagamento,
        dados.categoria_id,
        contaLancamentoId,
        dados.valor,
        tipo.id,
        dados.diaVencimento,
        isTransferencia ? dados.conta_origem_id : null,
        isTransferencia ? dados.conta_destino_id : null,
        lancamentoAtual.recorrencia_id,
        lancamentoAtual.ano_vencimento,
        lancamentoAtual.ano_vencimento,
        lancamentoAtual.mes_vencimento,
      ],
    );

    return res.json({ updated: result.changes });
  }

  atualizar().catch((error) => res.status(500).json({ error: error.message }));
});

lancamentosRoutes.patch("/db-lancamentos/:id/pagamento", (req, res) => {
  if (
    req.body.data_pagamento &&
    req.body.data_pagamento > new Date().toISOString().slice(0, 10)
  ) {
    return res.status(400).json({ error: "A data de pagamento não pode ser futura." });
  }

  async function atualizarPagamento() {
    const fatura = await get(
      `SELECT id, status FROM faturas_cartao WHERE lancamento_id = ?`,
      [req.params.id],
    );

    if (fatura && fatura.status !== "fechada") {
      return res.status(400).json({
        error:
          "A fatura ainda está aberta. Faça pagamentos parciais pela tela de cartões.",
      });
    }

    const result = await run(
      `UPDATE "lançamentos" SET data_pagamento = ? WHERE id = ?`,
      [req.body.data_pagamento || null, req.params.id],
    );

    return res.json({ updated: result.changes });
  }

  atualizarPagamento().catch((error) => res.status(500).json({ error: error.message }));
});

lancamentosRoutes.delete("/db-lancamentos/:id", (req, res) => {
  async function excluir() {
    const faturaVinculada = await get(
      `SELECT id FROM faturas_cartao WHERE lancamento_id = ?`,
      [req.params.id],
    );

    if (faturaVinculada) {
      return res.status(400).json({
        error: "Lançamentos de fatura de cartão permitem apenas consulta.",
      });
    }

    const result = await run(`DELETE FROM "lançamentos" WHERE id = ?`, [req.params.id]);

    return res.json({ deleted: result.changes });
  }

  excluir().catch((error) => res.status(500).json({ error: error.message }));
});
