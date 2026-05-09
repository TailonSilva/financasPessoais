// Importa o Router para criar rotas separadas no Express.
import { Router } from "express";
// Importa a conexão com o banco SQLite.
import { db } from "../db.js";

// Cria e exporta o agrupador de rotas de lançamentos.
export const lancamentosRoutes = Router();

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

  return null;
}

// Cria a rota GET que lista todas as lancamentos.
lancamentosRoutes.get("/db-lancamentos", (_req, res) => {
  // Executa a consulta SQL buscando lancamentos com categoria e conta.
  db.all(
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
      lancamento.valor
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
    LEFT JOIN meses ON meses.id = lancamento.mes_vencimento
    ORDER BY lancamento.ano_vencimento, lancamento.mes_vencimento, lancamento.dia_vencimento`,
    // Recebe erro ou resultado da consulta.
    (error, rows) => {
      // Se houver erro, retorna status 500 com a mensagem.
      if (error) {
        // Envia o erro em formato JSON.
        return res.status(500).json({ error: error.message });
      }

      // Se não houver erro, retorna a lista de despesas.
      return res.json(rows);
    },
  );
});

lancamentosRoutes.post("/db-lancamentos", (req, res) => {
  const dados = montarDadosLancamento(req.body);
  const erroValidacao = validarDadosLancamento(dados);

  if (erroValidacao) {
    return res.status(400).json({ error: erroValidacao });
  }

  db.get(
    "SELECT id FROM tipo_lancamentos WHERE descricao = ?",
    [dados.tipo_lancamento],
    (tipoError, tipo) => {
      if (tipoError) {
        return res.status(500).json({ error: tipoError.message });
      }

      if (!tipo) {
        return res.status(400).json({ error: "Tipo de lançamento inválido." });
      }

      const isTransferencia = dados.tipo_lancamento === "Transferência";
      const contaLancamentoId = isTransferencia ? dados.conta_origem_id : dados.conta_id;

      db.run(
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
          conta_destino_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ],
        function inserirLancamento(insertError) {
          if (insertError) {
            return res.status(500).json({ error: insertError.message });
          }

          return res.status(201).json({ id: this.lastID });
        },
      );
    },
  );
});

lancamentosRoutes.put("/db-lancamentos/:id", (req, res) => {
  const dados = montarDadosLancamento(req.body);
  const erroValidacao = validarDadosLancamento(dados);

  if (erroValidacao) {
    return res.status(400).json({ error: erroValidacao });
  }

  db.get(
    "SELECT id FROM tipo_lancamentos WHERE descricao = ?",
    [dados.tipo_lancamento],
    (tipoError, tipo) => {
      if (tipoError) {
        return res.status(500).json({ error: tipoError.message });
      }

      if (!tipo) {
        return res.status(400).json({ error: "Tipo de lançamento inválido." });
      }

      const isTransferencia = dados.tipo_lancamento === "Transferência";
      const contaLancamentoId = isTransferencia ? dados.conta_origem_id : dados.conta_id;

      db.run(
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
        function atualizarLancamento(updateError) {
          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }

          return res.json({ updated: this.changes });
        },
      );
    },
  );
});

lancamentosRoutes.patch("/db-lancamentos/:id/pagamento", (req, res) => {
  db.run(
    `UPDATE "lançamentos" SET data_pagamento = ? WHERE id = ?`,
    [req.body.data_pagamento || null, req.params.id],
    function atualizarPagamento(error) {
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ updated: this.changes });
    },
  );
});

lancamentosRoutes.delete("/db-lancamentos/:id", (req, res) => {
  db.run(
    `DELETE FROM "lançamentos" WHERE id = ?`,
    [req.params.id],
    function excluirLancamento(error) {
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ deleted: this.changes });
    },
  );
});
