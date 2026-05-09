import { useEffect, useState } from "react";
import {
  AnoSelector,
  HeaderActionButton,
  MesSelector,
  PageHeader,
} from "../componentes/PageHeader";
import {
  criarAjusteFaturaCartao,
  criarCompraCartao,
  fetchAjustesFaturaCartao,
  fetchCartoesCredito,
  fetchFaturasCartao,
  fetchParcelasCartao,
} from "../utilitarios/fetch/faturasCartao";
import { fetchCategorias } from "../utilitarios/fetch/cadastros";
import { formatarMoeda } from "../utilitarios/formatarMoeda";

const tiposInclusaoCartao = ["Despesa no cartão", "Estorno"];
const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function getDataAtualInput() {
  return new Date().toISOString().slice(0, 10);
}

function gerarOpcoesPrimeiraFatura() {
  const hoje = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + index, 1);
    const mes = data.getMonth() + 1;
    const ano = data.getFullYear();

    return {
      label: `${nomesMeses[mes - 1]}/${ano}`,
      value: `${mes}-${ano}`,
    };
  });
}

function agruparFaturasPorCartao(faturas) {
  return faturas.reduce((grupos, fatura) => {
    const chave = fatura.cartao_id;

    if (!grupos[chave]) {
      grupos[chave] = {
        cartao_id: fatura.cartao_id,
        cartao: fatura.cartao,
        banco: fatura.banco,
        banco_imagem: fatura.banco_imagem,
        conta_pagamento: fatura.conta_pagamento,
        faturas: [],
      };
    }

    grupos[chave].faturas.push(fatura);

    return grupos;
  }, {});
}

function ContaCartao() {
  const [faturas, setFaturas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [ajustes, setAjustes] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [menuContexto, setMenuContexto] = useState(null);
  const [menuNovoAberto, setMenuNovoAberto] = useState(false);
  const [modalInclusao, setModalInclusao] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState(
    () => new Date().getMonth() + 1,
  );
  const [anoSelecionado, setAnoSelecionado] = useState(
    () => new Date().getFullYear(),
  );
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDadosCartao() {
      try {
        const [
          faturasDados,
          parcelasDados,
          ajustesDados,
          cartoesDados,
          categoriasDados,
        ] = await Promise.all([
          fetchFaturasCartao(),
          fetchParcelasCartao(),
          fetchAjustesFaturaCartao(),
          fetchCartoesCredito(),
          fetchCategorias(),
        ]);

        setFaturas(faturasDados);
        setParcelas(parcelasDados);
        setAjustes(ajustesDados);
        setCartoes(cartoesDados);
        setCategorias(categoriasDados);
      } catch (error) {
        setErro(error.message);
      }
    }

    carregarDadosCartao();
  }, []);

  useEffect(() => {
    function fecharMenu() {
      setMenuContexto(null);
      setMenuNovoAberto(false);
    }

    window.addEventListener("click", fecharMenu);
    window.addEventListener("keydown", fecharMenu);

    return () => {
      window.removeEventListener("click", fecharMenu);
      window.removeEventListener("keydown", fecharMenu);
    };
  }, []);

  const faturasDoMes = faturas.filter(
    (fatura) =>
      Number(fatura.mes_referencia) === mesSelecionado &&
      Number(fatura.ano_referencia) === anoSelecionado,
  );
  const cartoesComFaturas = Object.values(agruparFaturasPorCartao(faturasDoMes));

  function buscarParcelasDaFatura(faturaId) {
    return parcelas.filter((parcela) => parcela.fatura_cartao_id === faturaId);
  }

  function buscarAjustesDaFatura(faturaId) {
    return ajustes.filter((ajuste) => ajuste.fatura_cartao_id === faturaId);
  }

  function abrirMenuContexto(event, linha, fatura) {
    event.preventDefault();

    setMenuContexto({
      x: event.clientX,
      y: event.clientY,
      linha,
      fatura,
    });
  }

  function executarAcao(acao) {
    console.log(`${acao}:`, {
      linha: menuContexto?.linha,
      fatura: menuContexto?.fatura,
    });
    setMenuContexto(null);
  }

  async function recarregarDadosCartao() {
    const [faturasDados, parcelasDados, ajustesDados] = await Promise.all([
      fetchFaturasCartao(),
      fetchParcelasCartao(),
      fetchAjustesFaturaCartao(),
    ]);

    setFaturas(faturasDados);
    setParcelas(parcelasDados);
    setAjustes(ajustesDados);
  }

  async function salvarInclusaoCartao(event) {
    event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.currentTarget));

    try {
      if (modalInclusao === "Despesa no cartão") {
        const [anoCompra, mesCompra, diaCompra] = dados.data_compra.split("-");
        const [primeiraFaturaMes, primeiraFaturaAno] =
          dados.primeira_fatura.split("-");

        await criarCompraCartao({
          cartao_id: dados.cartao_id,
          categoria_id: dados.categoria_id || null,
          descricao: dados.descricao,
          valor_total: dados.valor_total,
          quantidade_parcelas: dados.quantidade_parcelas,
          primeira_fatura_mes: primeiraFaturaMes,
          primeira_fatura_ano: primeiraFaturaAno,
          dia_compra: diaCompra,
          mes_compra: mesCompra,
          ano_compra: anoCompra,
        });
      }

      if (modalInclusao === "Estorno") {
        await criarAjusteFaturaCartao({
          fatura_cartao_id: dados.fatura_cartao_id,
          descricao: dados.descricao,
          tipo: "estorno",
          valor: dados.valor,
          data_ajuste: dados.data_ajuste || null,
        });
      }

      await recarregarDadosCartao();
      setModalInclusao(null);
    } catch (error) {
      setErro(error.message);
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <MesSelector value={mesSelecionado} onChange={setMesSelecionado} />
            <AnoSelector value={anoSelecionado} onChange={setAnoSelecionado} />
            <div className="new-entry">
              <HeaderActionButton
                label="Incluir no cartão"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuNovoAberto((aberto) => !aberto);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </HeaderActionButton>

              {menuNovoAberto && (
                <div className="new-entry__menu" onClick={(event) => event.stopPropagation()}>
                  {tiposInclusaoCartao.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setModalInclusao(tipo);
                        setMenuNovoAberto(false);
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      />

      <div className="container">
        <h1>Cartões de crédito</h1>
        {erro && <p>{erro}</p>}

        {cartoesComFaturas.length === 0 && (
          <div className="box-grid">
            <p>Nenhuma fatura de cartão cadastrada para o mês selecionado.</p>
          </div>
        )}

        {cartoesComFaturas.map((cartao) => (
          <div className="box-grid" key={cartao.cartao_id}>
            <h2>
              {cartao.banco_imagem && (
                <img
                  className="grid-title-icon"
                  src={"src/assets/img/" + cartao.banco_imagem}
                  alt=""
                />
              )}
              {cartao.cartao}
            </h2>

            <div className="invoice-list">
              {cartao.faturas.map((fatura) => {
                const parcelasDaFatura = buscarParcelasDaFatura(fatura.id);
                const ajustesDaFatura = buscarAjustesDaFatura(fatura.id);

                return (
                  <div className="invoice-grid" key={fatura.id}>
                    <div className="invoice-grid__header">
                      <div>
                        <strong>
                          {fatura.mes_referencia_descricao}/{fatura.ano_referencia}
                        </strong>
                        <span>
                          Fecha em {String(fatura.dia_fechamento).padStart(2, "0")}/
                          {String(fatura.mes_fechamento).padStart(2, "0")}/
                          {fatura.ano_fechamento}
                        </span>
                      </div>
                      <div>
                        <strong>{formatarMoeda(fatura.valor_total)}</strong>
                        <span>
                          Vence em {String(fatura.dia_vencimento).padStart(2, "0")}/
                          {String(fatura.mes_vencimento).padStart(2, "0")}/
                          {fatura.ano_vencimento}
                        </span>
                      </div>
                    </div>

                    <table className="grid">
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Parcela</th>
                          <th>Conta Pagamento</th>
                          <th>Status</th>
                          <th>Lançamento</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parcelasDaFatura.map((parcela) => (
                          <tr
                            key={parcela.id}
                            className="grid-row--context"
                            onContextMenu={(event) => abrirMenuContexto(event, parcela, fatura)}
                          >
                            <td>{parcela.compra}</td>
                            <td>
                              {parcela.numero_parcela}/{parcela.total_parcelas}
                            </td>
                            <td>
                              {fatura.banco_imagem && (
                                <img src={"src/assets/img/" + fatura.banco_imagem} alt="" />
                              )}
                              {fatura.conta_pagamento}
                            </td>
                            <td>{fatura.status}</td>
                            <td>{fatura.lancamento_id}</td>
                            <td>{formatarMoeda(parcela.valor_parcela)}</td>
                          </tr>
                        ))}
                        {ajustesDaFatura.map((ajuste) => (
                          <tr
                            key={`ajuste-${ajuste.id}`}
                            className="grid-row--context grid-row--refund"
                            onContextMenu={(event) => abrirMenuContexto(event, ajuste, fatura)}
                          >
                            <td>{ajuste.descricao}</td>
                            <td>-</td>
                            <td>
                              {fatura.banco_imagem && (
                                <img src={"src/assets/img/" + fatura.banco_imagem} alt="" />
                              )}
                              {fatura.conta_pagamento}
                            </td>
                            <td>{fatura.status}</td>
                            <td>{fatura.lancamento_id}</td>
                            <td>{formatarMoeda(-Number(ajuste.valor))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="5">Total da fatura</td>
                          <td>{formatarMoeda(fatura.valor_total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {menuContexto && (
        <div
          className="context-menu"
          style={{ left: menuContexto.x, top: menuContexto.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => executarAcao("consultar")}>
            Consultar
          </button>
          <button type="button" onClick={() => executarAcao("editar")}>
            Editar
          </button>
          <button type="button" onClick={() => executarAcao("excluir")}>
            Excluir
          </button>
        </div>
      )}

      {modalInclusao && (
        <div
          className="launch-modal"
          role="presentation"
          onMouseDown={() => setModalInclusao(null)}
        >
          <form
            className="launch-modal__panel"
            onSubmit={salvarInclusaoCartao}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="launch-modal__header">
              <div>
                <h2>Incluir no cartão</h2>
                <p>{modalInclusao}</p>
              </div>
              <button
                className="launch-modal__close"
                type="button"
                onClick={() => setModalInclusao(null)}
                aria-label="Fechar"
                title="Fechar"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div className="launch-modal__fields">
              {modalInclusao === "Despesa no cartão" ? (
                <>
                  <label>
                    Cartão
                    <select name="cartao_id" required>
                      <option value="">Selecione</option>
                      {cartoes.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {cartao.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descrição
                    <input name="descricao" type="text" required />
                  </label>
                  <label>
                    Categoria
                    <select name="categoria_id">
                      <option value="">Sem categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Valor total
                    <input name="valor_total" type="number" min="0.01" step="0.01" required />
                  </label>
                  <label>
                    Parcelas
                    <input
                      name="quantidade_parcelas"
                      type="number"
                      min="1"
                      defaultValue="1"
                      required
                    />
                  </label>
                  <label>
                    Data da compra
                    <input name="data_compra" type="date" defaultValue={getDataAtualInput()} required />
                  </label>
                  <label>
                    Primeira fatura
                    <select name="primeira_fatura" required>
                      {gerarOpcoesPrimeiraFatura().map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Fatura
                    <select name="fatura_cartao_id" required>
                      <option value="">Selecione</option>
                      {faturasDoMes.map((fatura) => (
                        <option key={fatura.id} value={fatura.id}>
                          {fatura.cartao} - {fatura.mes_referencia_descricao}/
                          {fatura.ano_referencia}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descrição
                    <input name="descricao" type="text" required />
                  </label>
                  <label>
                    Valor do estorno
                    <input name="valor" type="number" min="0.01" step="0.01" required />
                  </label>
                  <label>
                    Data do estorno
                    <input name="data_ajuste" type="date" defaultValue={getDataAtualInput()} />
                  </label>
                </>
              )}
            </div>

            <footer className="launch-modal__footer">
              <button type="button" onClick={() => setModalInclusao(null)}>
                Cancelar
              </button>
              <button type="submit">Salvar</button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}

export default ContaCartao;
