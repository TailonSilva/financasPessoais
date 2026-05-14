import { useEffect, useState } from "react";
import {
  AnoSelector,
  HeaderActionButton,
  MesSelector,
  PageHeader,
} from "../componentes/PageHeader";
import {
  atualizarAjusteFaturaCartao,
  atualizarParcelaCartao,
  criarAjusteFaturaCartao,
  criarCompraCartao,
  excluirAjusteFaturaCartao,
  excluirParcelaCartao,
  fetchAjustesFaturaCartao,
  fetchCartoesCredito,
  fetchFaturasCartao,
  fetchParcelasCartao,
} from "../utilitarios/fetch/faturasCartao";
import ConfirmacaoModal from "../componentes/ConfirmacaoModal.jsx";
import { fetchCategorias } from "../utilitarios/fetch/cadastros";
import { apiUrl } from "../utilitarios/fetch/api";
import { formatarMoeda } from "../utilitarios/formatarMoeda";
import { useNotificacoes } from "../componentes/notificacoesContext";

const logosBanco = {
  "bradesco.png": new URL("../assets/img/bradesco.png", import.meta.url).href,
  "mercado-pago.png": new URL("../assets/img/mercado-pago.png", import.meta.url).href,
  "nubank.png": new URL("../assets/img/nubank.png", import.meta.url).href,
};

const tiposInclusaoCartao = ["Despesa no cartão", "Estorno", "Pagamento"];
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

function gerarOpcoesPrimeiraFatura(mesInicial, anoInicial) {
  return Array.from({ length: 6 }, (_, index) => {
    const data = new Date(Number(anoInicial), Number(mesInicial) - 1 + index, 1);
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

function isCategoriaCartaoCredito(categoria) {
  return (
    categoria?.icone === "credit-card" ||
    categoria?.descricao?.toLowerCase().includes("cartão de crédito") ||
    categoria?.descricao?.toLowerCase().includes("cartao de credito")
  );
}

function isParcelaCartao(linha) {
  return Boolean(linha?.compra_cartao_id);
}

function isCompraParcelada(linha) {
  return isParcelaCartao(linha) && Number(linha.total_parcelas) > 1;
}

function getImagemBancoUrl(valor) {
  if (!valor) {
    return "";
  }

  if (logosBanco[valor]) {
    return logosBanco[valor];
  }

  if (valor.startsWith("uploads/")) {
    return apiUrl(`/api/${valor}`);
  }

  return "";
}

function BancoLogo({ className = "", imagem }) {
  const src = getImagemBancoUrl(imagem);

  if (!src) {
    return null;
  }

  return <img className={className} src={src} alt="" />;
}

function CategoriaCell({ categoria }) {
  if (!categoria) {
    return "-";
  }

  return (
    <span className="invoice-table__category">
      {categoria.icone && (
        <span className="invoice-table__category-icon">{categoria.icone}</span>
      )}
      {categoria.descricao}
    </span>
  );
}

function ContaCartao() {
  const { notificarErro } = useNotificacoes();
  const [faturas, setFaturas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [ajustes, setAjustes] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [menuContexto, setMenuContexto] = useState(null);
  const [menuNovoAberto, setMenuNovoAberto] = useState(false);
  const [modalInclusao, setModalInclusao] = useState(null);
  const [registroCopiado, setRegistroCopiado] = useState(null);
  const [modalAcao, setModalAcao] = useState(null);
  const [acaoParceladaPendente, setAcaoParceladaPendente] = useState(null);
  const [cartaoEstornoSelecionado, setCartaoEstornoSelecionado] = useState("");
  const [mesSelecionado, setMesSelecionado] = useState(
    () => new Date().getMonth() + 1,
  );
  const [anoSelecionado, setAnoSelecionado] = useState(
    () => new Date().getFullYear(),
  );

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
        notificarErro(error.message);
      }
    }

    carregarDadosCartao();
  }, [notificarErro]);

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
  const opcoesPrimeiraFatura = gerarOpcoesPrimeiraFatura(mesSelecionado, anoSelecionado);
  const referenciasFuturas = new Set(opcoesPrimeiraFatura.map((opcao) => opcao.value));
  const faturasDoCartaoEstorno = faturas.filter(
    (fatura) =>
      Number(fatura.cartao_id) === Number(cartaoEstornoSelecionado) &&
      referenciasFuturas.has(`${fatura.mes_referencia}-${fatura.ano_referencia}`),
  );
  const cartoesComFaturas = Object.values(agruparFaturasPorCartao(faturasDoMes));
  const categoriasPorId = new Map(
    categorias.map((categoria) => [Number(categoria.id), categoria]),
  );
  const categoriasCompraCartao = categorias.filter(
    (categoria) => !isCategoriaCartaoCredito(categoria),
  );

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
    const contexto = menuContexto;
    setMenuContexto(null);

    if (!contexto) {
      return;
    }

    if (acao === "copiar") {
      const tipoInclusao = isParcelaCartao(contexto.linha)
        ? "Despesa no cartão"
        : contexto.linha.tipo === "pagamento"
          ? "Pagamento"
          : "Estorno";

      setRegistroCopiado({
        fatura: contexto.fatura,
        linha: contexto.linha,
        tipo: tipoInclusao,
      });
      setModalInclusao(tipoInclusao);
      setCartaoEstornoSelecionado(String(contexto.fatura.cartao_id || ""));
      setMenuNovoAberto(false);
      return;
    }

    if (acao === "excluir") {
      if (isCompraParcelada(contexto.linha)) {
        setAcaoParceladaPendente({
          acao: "excluir",
          linha: contexto.linha,
        });
        return;
      }

      setAcaoParceladaPendente({
        acao: "excluir-simples",
        linha: contexto.linha,
      });
      return;
    }

    setModalAcao({
      acao,
      linha: contexto.linha,
      fatura: contexto.fatura,
    });
  }

  async function excluirLinhaFatura(linha, escopo = "atual") {
    try {
      if (isParcelaCartao(linha)) {
        await excluirParcelaCartao(linha.id, escopo);
      } else {
        await excluirAjusteFaturaCartao(linha.id);
      }

      await recarregarDadosCartao();
      setAcaoParceladaPendente(null);
      setModalAcao(null);
    } catch (error) {
      notificarErro(error.message);
    }
  }

  async function aplicarEdicaoLinhaFatura(payload, escopo = "atual") {
    try {
      if (isParcelaCartao(payload.linha)) {
        await atualizarParcelaCartao(payload.linha.id, {
          descricao: payload.descricao,
          categoria_id: payload.categoria_id || null,
          valor_parcela: payload.valor,
          escopo,
        });
      } else {
        await atualizarAjusteFaturaCartao(payload.linha.id, {
          descricao: payload.descricao,
          valor: payload.valor,
          data_ajuste: payload.data_ajuste || null,
        });
      }

      await recarregarDadosCartao();
      setAcaoParceladaPendente(null);
      setModalAcao(null);
    } catch (error) {
      notificarErro(error.message);
    }
  }

  function salvarAcaoFatura(event) {
    event.preventDefault();

    if (!modalAcao || modalAcao.acao !== "editar") {
      return;
    }

    const dados = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      linha: modalAcao.linha,
      descricao: dados.descricao,
      categoria_id: dados.categoria_id,
      valor: dados.valor,
      data_ajuste: dados.data_ajuste,
    };

    if (isCompraParcelada(modalAcao.linha)) {
      setAcaoParceladaPendente({
        acao: "editar",
        payload,
      });
      return;
    }

    aplicarEdicaoLinhaFatura(payload, "atual");
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
          valor_parcela: dados.valor_parcela,
          quantidade_parcelas: dados.quantidade_parcelas,
          primeira_fatura_mes: primeiraFaturaMes,
          primeira_fatura_ano: primeiraFaturaAno,
          dia_compra: diaCompra,
          mes_compra: mesCompra,
          ano_compra: anoCompra,
        });
      }

      if (modalInclusao === "Estorno" || modalInclusao === "Pagamento") {
        await criarAjusteFaturaCartao({
          fatura_cartao_id: dados.fatura_cartao_id,
          descricao: dados.descricao,
          tipo: modalInclusao === "Pagamento" ? "pagamento" : "estorno",
          valor: dados.valor,
          data_ajuste: dados.data_ajuste || null,
        });
      }

      await recarregarDadosCartao();
      setModalInclusao(null);
      setRegistroCopiado(null);
    } catch (error) {
      notificarErro(error.message);
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <MesSelector
              value={mesSelecionado}
              onChange={setMesSelecionado}
              year={anoSelecionado}
              onYearChange={setAnoSelecionado}
            />
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
                        setRegistroCopiado(null);
                        setCartaoEstornoSelecionado("");
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
        {cartoesComFaturas.length === 0 && (
          <div className="box-grid">
            <p>Nenhuma fatura de cartão cadastrada para o mês selecionado.</p>
          </div>
        )}

        {cartoesComFaturas.map((cartao) => (
          <div className="box-grid" key={cartao.cartao_id}>
            <h2>
              <BancoLogo className="grid-title-icon" imagem={cartao.banco_imagem} />
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
                        <strong>{formatarMoeda(fatura.valor_aberto ?? fatura.valor_total)}</strong>
                        <span>Em aberto de {formatarMoeda(fatura.valor_total)}</span>
                        <span>
                          Vence em {String(fatura.dia_vencimento).padStart(2, "0")}/
                          {String(fatura.mes_vencimento).padStart(2, "0")}/
                          {fatura.ano_vencimento}
                        </span>
                      </div>
                    </div>

                    <table className="grid invoice-table">
                      <colgroup>
                        <col className="invoice-table__col-description" />
                        <col className="invoice-table__col-category" />
                        <col className="invoice-table__col-installment" />
                        <col className="invoice-table__col-account" />
                        <col className="invoice-table__col-status" />
                        <col className="invoice-table__col-value" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th>Parcela</th>
                          <th>Conta Pagamento</th>
                          <th>Status</th>
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
                            <td className="invoice-table__text">{parcela.compra}</td>
                            <td className="invoice-table__text">
                              <CategoriaCell
                                categoria={
                                  categoriasPorId.get(Number(parcela.categoria_id)) ||
                                  (parcela.categoria
                                    ? { descricao: parcela.categoria }
                                    : null)
                                }
                              />
                            </td>
                            <td className="invoice-table__center">
                              {parcela.numero_parcela}/{parcela.total_parcelas}
                            </td>
                            <td className="invoice-table__account">
                              <BancoLogo imagem={fatura.banco_imagem} />
                              {fatura.conta_pagamento}
                            </td>
                            <td className="invoice-table__center">{fatura.status}</td>
                            <td className="invoice-table__money">{formatarMoeda(parcela.valor_parcela)}</td>
                          </tr>
                        ))}
                        {ajustesDaFatura.map((ajuste) => (
                          <tr
                            key={`ajuste-${ajuste.id}`}
                            className="grid-row--context grid-row--refund"
                            onContextMenu={(event) => abrirMenuContexto(event, ajuste, fatura)}
                          >
                            <td className="invoice-table__text">{ajuste.descricao}</td>
                            <td className="invoice-table__text">-</td>
                            <td className="invoice-table__center">{ajuste.tipo === "pagamento" ? "Pagamento" : "Estorno"}</td>
                            <td className="invoice-table__account">
                              <BancoLogo imagem={fatura.banco_imagem} />
                              {fatura.conta_pagamento}
                            </td>
                            <td className="invoice-table__center">{fatura.status}</td>
                            <td className="invoice-table__money">{formatarMoeda(-Number(ajuste.valor))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="invoice-table__total-label" colSpan="5">Total da fatura</td>
                          <td className="invoice-table__money">{formatarMoeda(fatura.valor_total)}</td>
                        </tr>
                        <tr>
                          <td className="invoice-table__total-label" colSpan="5">Total pago</td>
                          <td className="invoice-table__money">{formatarMoeda(fatura.valor_pago || 0)}</td>
                        </tr>
                        <tr>
                          <td className="invoice-table__total-label" colSpan="5">Em aberto</td>
                          <td className="invoice-table__money">
                            {formatarMoeda(fatura.valor_aberto ?? fatura.valor_total)}
                          </td>
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
          <button type="button" onClick={() => executarAcao("copiar")}>
            Copiar
          </button>
          <button type="button" onClick={() => executarAcao("excluir")}>
            Excluir
          </button>
        </div>
      )}

      {modalAcao && (
        <div
          className="launch-modal"
          role="presentation"
          onMouseDown={() => setModalAcao(null)}
        >
          <form
            className="launch-modal__panel"
            onSubmit={salvarAcaoFatura}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="launch-modal__header">
              <div>
                <h2>
                  {modalAcao.acao === "consultar" ? "Consultar fatura" : "Editar fatura"}
                </h2>
                <p>
                  {isParcelaCartao(modalAcao.linha)
                    ? "Despesa no cartão"
                    : modalAcao.linha.tipo === "pagamento"
                      ? "Pagamento"
                      : "Estorno"}
                </p>
              </div>
              <button
                className="launch-modal__close"
                type="button"
                onClick={() => setModalAcao(null)}
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
              {isParcelaCartao(modalAcao.linha) ? (
                <>
                  <label>
                    Descrição
                    <input
                      name="descricao"
                      type="text"
                      defaultValue={modalAcao.linha.compra}
                      disabled={modalAcao.acao === "consultar"}
                      required
                    />
                  </label>
                  <label>
                    Categoria
                    <select
                      name="categoria_id"
                      defaultValue={modalAcao.linha.categoria_id || ""}
                      disabled={modalAcao.acao === "consultar"}
                    >
                      <option value="">Sem categoria</option>
                      {categoriasCompraCartao.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Parcela
                    <input
                      type="text"
                      value={`${modalAcao.linha.numero_parcela}/${modalAcao.linha.total_parcelas}`}
                      disabled
                      readOnly
                    />
                  </label>
                  <label>
                    Valor da parcela
                    <input
                      name="valor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={modalAcao.linha.valor_parcela}
                      disabled={modalAcao.acao === "consultar"}
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Descrição
                    <input
                      name="descricao"
                      type="text"
                      defaultValue={modalAcao.linha.descricao}
                      disabled={modalAcao.acao === "consultar"}
                      required
                    />
                  </label>
                  <label>
                    Tipo
                    <input
                      type="text"
                      value={modalAcao.linha.tipo === "pagamento" ? "Pagamento" : "Estorno"}
                      disabled
                      readOnly
                    />
                  </label>
                  <label>
                    Valor
                    <input
                      name="valor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={modalAcao.linha.valor}
                      disabled={modalAcao.acao === "consultar"}
                      required
                    />
                  </label>
                  <label>
                    Data
                    <input
                      name="data_ajuste"
                      type="date"
                      defaultValue={modalAcao.linha.data_ajuste || ""}
                      max={getDataAtualInput()}
                      disabled={modalAcao.acao === "consultar"}
                    />
                  </label>
                </>
              )}
            </div>

            <footer className="launch-modal__footer">
              <button type="button" onClick={() => setModalAcao(null)}>
                {modalAcao.acao === "consultar" ? "Fechar" : "Cancelar"}
              </button>
              {modalAcao.acao === "editar" && <button type="submit">Salvar</button>}
            </footer>
          </form>
        </div>
      )}

      {modalInclusao && (
        <div
          className="launch-modal"
          role="presentation"
          onMouseDown={() => {
            setModalInclusao(null);
            setRegistroCopiado(null);
          }}
        >
          <form
            className="launch-modal__panel"
            onSubmit={salvarInclusaoCartao}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="launch-modal__header">
              <div>
                <h2>{registroCopiado ? "Copiar no cartão" : "Incluir no cartão"}</h2>
                <p>{modalInclusao}</p>
              </div>
              <button
                className="launch-modal__close"
                type="button"
                onClick={() => {
                  setModalInclusao(null);
                  setRegistroCopiado(null);
                }}
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
                    <select
                      name="cartao_id"
                      defaultValue={registroCopiado?.fatura?.cartao_id ?? ""}
                      required
                    >
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
                    <input
                      name="descricao"
                      type="text"
                      defaultValue={registroCopiado?.linha?.compra ?? ""}
                      required
                    />
                  </label>
                  <label>
                    Categoria
                    <select
                      name="categoria_id"
                      defaultValue={registroCopiado?.linha?.categoria_id ?? ""}
                    >
                      <option value="">Sem categoria</option>
                      {categoriasCompraCartao.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Valor da parcela
                    <input
                      name="valor_parcela"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={registroCopiado?.linha?.valor_parcela ?? ""}
                      required
                    />
                  </label>
                  <label>
                    Parcelas
                    <input
                      name="quantidade_parcelas"
                      type="number"
                      min="1"
                      defaultValue={registroCopiado?.linha?.total_parcelas ?? "1"}
                      required
                    />
                  </label>
                  <label>
                    Data da compra
                    <input name="data_compra" type="date" defaultValue={getDataAtualInput()} required />
                  </label>
                  <label>
                    Primeira fatura
                    <select
                      name="primeira_fatura"
                      defaultValue={
                        registroCopiado?.fatura
                          ? `${registroCopiado.fatura.mes_referencia}-${registroCopiado.fatura.ano_referencia}`
                          : undefined
                      }
                      required
                    >
                      {opcoesPrimeiraFatura.map((opcao) => (
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
                    Cartão
                    <select
                      name="cartao_id"
                      value={cartaoEstornoSelecionado}
                      onChange={(event) => setCartaoEstornoSelecionado(event.target.value)}
                      required
                    >
                      <option value="">Selecione</option>
                      {cartoes.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {cartao.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fatura
                    <select
                      name="fatura_cartao_id"
                      defaultValue={registroCopiado?.fatura?.id ?? ""}
                      disabled={!cartaoEstornoSelecionado}
                      required
                    >
                      <option value="">Selecione</option>
                      {faturasDoCartaoEstorno.map((fatura) => (
                        <option key={fatura.id} value={fatura.id}>
                          {fatura.mes_referencia_descricao}/{fatura.ano_referencia}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descrição
                    <input
                      name="descricao"
                      type="text"
                      defaultValue={
                        registroCopiado?.linha?.descricao ??
                        (modalInclusao === "Pagamento" ? "Pagamento parcial da fatura" : "")
                      }
                      required
                    />
                  </label>
                  <label>
                    {modalInclusao === "Pagamento" ? "Valor pago" : "Valor do estorno"}
                    <input
                      name="valor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={registroCopiado?.linha?.valor ?? ""}
                      required
                    />
                  </label>
                  <label>
                    {modalInclusao === "Pagamento" ? "Data do pagamento" : "Data do estorno"}
                    <input
                      name="data_ajuste"
                      type="date"
                      defaultValue={getDataAtualInput()}
                      max={getDataAtualInput()}
                    />
                  </label>
                </>
              )}
            </div>

            <footer className="launch-modal__footer">
              <button
                type="button"
                onClick={() => {
                  setModalInclusao(null);
                  setRegistroCopiado(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit">Salvar</button>
            </footer>
          </form>
        </div>
      )}

      <ConfirmacaoModal
        aberto={Boolean(acaoParceladaPendente)}
        titulo={
          acaoParceladaPendente?.acao === "excluir-simples"
            ? "Excluir registro da fatura"
            : acaoParceladaPendente?.acao === "excluir"
            ? "Excluir compra parcelada"
            : "Alterar compra parcelada"
        }
        mensagem={
          acaoParceladaPendente?.acao === "excluir-simples"
            ? "Tem certeza que deseja excluir este registro da fatura?"
            : acaoParceladaPendente?.acao === "editar"
              ? "Escolha como aplicar esta alteração na compra parcelada. Ao alterar só esta parcela, apenas o valor será alterado."
              : "Escolha como aplicar esta exclusão na compra parcelada."
        }
        onClose={() => setAcaoParceladaPendente(null)}
        acoes={
          acaoParceladaPendente?.acao === "excluir-simples"
            ? [
                {
                  label: "Excluir",
                  onClick: () => excluirLinhaFatura(acaoParceladaPendente.linha, "atual"),
                },
              ]
            : [
                {
                  label: "Só esta parcela",
                  onClick: () => {
                    if (acaoParceladaPendente?.acao === "excluir") {
                      excluirLinhaFatura(acaoParceladaPendente.linha, "atual");
                      return;
                    }

                    aplicarEdicaoLinhaFatura(acaoParceladaPendente.payload, "atual");
                  },
                },
                {
                  label: "Esta e próximas parcelas",
                  onClick: () => {
                    if (acaoParceladaPendente?.acao === "excluir") {
                      excluirLinhaFatura(acaoParceladaPendente.linha, "futuro");
                      return;
                    }

                    aplicarEdicaoLinhaFatura(acaoParceladaPendente.payload, "futuro");
                  },
                },
              ]
        }
      />
    </>
  );
}

export default ContaCartao;
