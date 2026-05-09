import { apiUrl } from './api'

export async function fetchLancamentos() {
  const response = await fetch(apiUrl("/api/db-lancamentos"));

  if (!response.ok) {
    throw new Error("Não foi possível carregar os lançamentos");
  }

  const dados = await response.json();

  return Array.isArray(dados) ? dados : [];
}

export async function criarLancamento(lancamento) {
  const response = await fetch(apiUrl("/api/db-lancamentos"), {
    body: JSON.stringify(lancamento),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível criar o lançamento");
  }

  return response.json();
}

export async function atualizarLancamento(id, lancamento) {
  const response = await fetch(apiUrl(`/api/db-lancamentos/${id}`), {
    body: JSON.stringify(lancamento),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível atualizar o lançamento");
  }

  return response.json();
}

export async function atualizarPagamentoLancamento(id, dataPagamento) {
  const response = await fetch(apiUrl(`/api/db-lancamentos/${id}/pagamento`), {
    body: JSON.stringify({ data_pagamento: dataPagamento }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível atualizar o pagamento");
  }

  return response.json();
}

export async function excluirLancamento(id) {
  const response = await fetch(apiUrl(`/api/db-lancamentos/${id}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível excluir o lançamento");
  }

  return response.json();
}
