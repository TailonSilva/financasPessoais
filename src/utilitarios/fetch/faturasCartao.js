import { apiUrl } from './api'

export async function fetchFaturasCartao() {
  const response = await fetch(apiUrl("/api/faturas-cartao"));

  if (!response.ok) {
    throw new Error("Não foi possível carregar as faturas dos cartões");
  }

  const dados = await response.json();

  return Array.isArray(dados) ? dados : [];
}

export async function fetchParcelasCartao() {
  const response = await fetch(apiUrl("/api/parcelas-cartao"));

  if (!response.ok) {
    throw new Error("Não foi possível carregar as compras das faturas");
  }

  const dados = await response.json();

  return Array.isArray(dados) ? dados : [];
}

export async function fetchAjustesFaturaCartao() {
  const response = await fetch(apiUrl("/api/ajustes-fatura-cartao"));

  if (!response.ok) {
    throw new Error("Não foi possível carregar os estornos das faturas");
  }

  const dados = await response.json();

  return Array.isArray(dados) ? dados : [];
}

export async function fetchCartoesCredito() {
  const response = await fetch(apiUrl("/api/cartoes-credito"));

  if (!response.ok) {
    throw new Error("Não foi possível carregar os cartões de crédito");
  }

  const dados = await response.json();

  return Array.isArray(dados) ? dados : [];
}

export async function criarCompraCartao(compra) {
  const response = await fetch(apiUrl("/api/compras-cartao"), {
    body: JSON.stringify(compra),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível criar a compra no cartão");
  }

  return response.json();
}

export async function criarAjusteFaturaCartao(ajuste) {
  const response = await fetch(apiUrl("/api/ajustes-fatura-cartao"), {
    body: JSON.stringify(ajuste),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível criar o estorno");
  }

  return response.json();
}

export async function atualizarParcelaCartao(id, parcela) {
  const response = await fetch(apiUrl(`/api/parcelas-cartao/${id}`), {
    body: JSON.stringify(parcela),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "NÃ£o foi possÃ­vel atualizar a parcela");
  }

  return response.json();
}

export async function excluirParcelaCartao(id, escopo = "atual") {
  const response = await fetch(apiUrl(`/api/parcelas-cartao/${id}?escopo=${escopo}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "NÃ£o foi possÃ­vel excluir a parcela");
  }

  return response.json();
}

export async function atualizarAjusteFaturaCartao(id, ajuste) {
  const response = await fetch(apiUrl(`/api/ajustes-fatura-cartao/${id}`), {
    body: JSON.stringify(ajuste),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "NÃ£o foi possÃ­vel atualizar o lanÃ§amento da fatura");
  }

  return response.json();
}

export async function excluirAjusteFaturaCartao(id) {
  const response = await fetch(apiUrl(`/api/ajustes-fatura-cartao/${id}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "NÃ£o foi possÃ­vel excluir o lanÃ§amento da fatura");
  }

  return response.json();
}
