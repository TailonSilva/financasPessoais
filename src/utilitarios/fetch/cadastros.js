export async function fetchBancos() {
  const response = await fetch('/api/bancos')

  if (!response.ok) {
    throw new Error('Não foi possível carregar os bancos')
  }

  const dados = await response.json()

  return Array.isArray(dados) ? dados : []
}

export async function fetchContas() {
  const response = await fetch('/api/contas')

  if (!response.ok) {
    throw new Error('Não foi possível carregar as contas')
  }

  const dados = await response.json()

  return Array.isArray(dados) ? dados : []
}

export async function fetchCategorias() {
  const response = await fetch('/api/categorias')

  if (!response.ok) {
    throw new Error('Não foi possível carregar as categorias')
  }

  const dados = await response.json()

  return Array.isArray(dados) ? dados : []
}
