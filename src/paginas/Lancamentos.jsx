import { useEffect, useState } from "react";
import {
  AnoSelector,
  HeaderActionButton,
  MesSelector,
  PageHeader,
} from "../componentes/PageHeader.jsx";
import { fetchCategorias, fetchContas } from "../utilitarios/fetch/cadastros.js";
import {
  atualizarLancamento,
  atualizarPagamentoLancamento,
  criarLancamento,
  excluirLancamento,
  fetchLancamentos,
} from "../utilitarios/fetch/lancamentos.js";
import { formatarMoeda } from "../utilitarios/formatarMoeda.js";

const tiposNovoLancamento = ["Despesa", "Receita", "Transferência"];

function getDataAtualInput() {
  return new Date().toISOString().slice(0, 10);
}

function getDataVencimentoInput(lancamento) {
  return `${lancamento.ano_vencimento}-${String(lancamento.mes_vencimento).padStart(
    2,
    "0",
  )}-${String(lancamento.dia_vencimento).padStart(2, "0")}`;
}

function somarLancamentos(lancamentos) {
  return lancamentos.reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0);
}

function PagoStatus({ dataPagamento }) {
  if (!dataPagamento) {
    return (
      <span className="status-paid status-paid--no" title="Não pago">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      </span>
    );
  }

  return (
    <span className="status-paid status-paid--yes" title={`Pago em ${dataPagamento}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4 10-10" />
      </svg>
    </span>
  );
}

function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [menuContexto, setMenuContexto] = useState(null);
  const [menuNovoAberto, setMenuNovoAberto] = useState(false);
  const [tipoLancamentoModal, setTipoLancamentoModal] = useState(null);
  const [modalAcao, setModalAcao] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState(
    () => new Date().getMonth() + 1,
  );
  const [anoSelecionado, setAnoSelecionado] = useState(
    () => new Date().getFullYear(),
  );
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarLancamentos() {
      try {
        const [dadosLancamentos, dadosCategorias, dadosContas] = await Promise.all([
          fetchLancamentos(),
          fetchCategorias(),
          fetchContas(),
        ]);

        setLancamentos(dadosLancamentos);
        setCategorias(dadosCategorias);
        setContas(dadosContas);
      } catch (error) {
        setErro(error.message);
      }
    }

    carregarLancamentos();
  }, []);

  async function recarregarLancamentos() {
    const dados = await fetchLancamentos();
    setLancamentos(dados);
  }

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

  const lancamentosDoMes = lancamentos.filter(
    (lancamento) =>
      Number(lancamento.mes_vencimento) === mesSelecionado &&
      Number(lancamento.ano_vencimento) === anoSelecionado,
  );

  const despesas = lancamentosDoMes.filter(
    (lancamento) => lancamento.tipo_lancamento === "Despesa",
  );
  const receitas = lancamentosDoMes.filter(
    (lancamento) => lancamento.tipo_lancamento === "Receita",
  );
  const transferencias = lancamentosDoMes.filter(
    (lancamento) => lancamento.tipo_lancamento === "Transferência",
  );

  function abrirMenuContexto(event, lancamento) {
    event.preventDefault();

    setMenuContexto({
      x: event.clientX,
      y: event.clientY,
      lancamento,
    });
  }

  async function executarAcao(acao) {
    const lancamento = menuContexto?.lancamento;
    setMenuContexto(null);

    if (!lancamento) {
      return;
    }

    if (acao === "pagar" || acao === "cancelar-pagamento") {
      try {
        await atualizarPagamentoLancamento(
          lancamento.id,
          acao === "pagar" ? getDataAtualInput() : null,
        );
        await recarregarLancamentos();
      } catch (error) {
        setErro(error.message);
      }
      return;
    }

    setModalAcao({ acao, lancamento });
  }

  function abrirModalNovoLancamento(tipo) {
    setTipoLancamentoModal(tipo);
    setMenuNovoAberto(false);
  }

  async function salvarNovoLancamento(event) {
    event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.currentTarget));
    const [anoVencimento, mesVencimento, diaVencimento] = dados.data_vencimento.split("-");

    try {
      await criarLancamento({
        ...dados,
        ano_vencimento: anoVencimento,
        data_pagamento: dados.data_pagamento || null,
        dia_vencimento: diaVencimento,
        mes_vencimento: mesVencimento,
      });
      await recarregarLancamentos();
      setTipoLancamentoModal(null);
    } catch (error) {
      setErro(error.message);
    }
  }

  async function salvarEdicaoLancamento(event) {
    event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.currentTarget));
    const [anoVencimento, mesVencimento, diaVencimento] = dados.data_vencimento.split("-");

    try {
      await atualizarLancamento(modalAcao.lancamento.id, {
        ...dados,
        ano_vencimento: anoVencimento,
        data_pagamento: dados.data_pagamento || null,
        dia_vencimento: diaVencimento,
        mes_vencimento: mesVencimento,
      });
      await recarregarLancamentos();
      setModalAcao(null);
    } catch (error) {
      setErro(error.message);
    }
  }

  async function confirmarExclusaoLancamento() {
    try {
      await excluirLancamento(modalAcao.lancamento.id);
      await recarregarLancamentos();
      setModalAcao(null);
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
                label="Novo lançamento"
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
                  {tiposNovoLancamento.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => abrirModalNovoLancamento(tipo)}
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
        <div className="box-grid">
          <h1>Lançamentos</h1>
          <h2>Despesas</h2>
          {erro && <p>{erro}</p>}
          <table className="grid">
            <thead>
              <tr>
                <th>Dia Vencimento</th>
                <th>Mês Vencimento</th>
                <th>Ano Vencimento</th>
                <th>Pago</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
                <th>Banco</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map((despesa) => (
                <tr
                  key={despesa.id}
                  className="grid-row--context"
                  onContextMenu={(event) => abrirMenuContexto(event, despesa)}
                >
                  <td>{despesa.dia_vencimento}</td>
                  <td>{despesa.mes_vencimento_descricao}</td>
                  <td>{despesa.ano_vencimento}</td>
                  <td>
                    <PagoStatus dataPagamento={despesa.data_pagamento} />
                  </td>
                  <td>{despesa.descricao}</td>
                  <td>{formatarMoeda(despesa.valor)}</td>
                  <td>{despesa.categoria}</td>
                  <td>
                    <img src={"src/assets/img/" + despesa.banco_imagem} alt="" />
                    {despesa.banco}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Total de despesas</td>
                <td>{formatarMoeda(somarLancamentos(despesas))}</td>
                <td colSpan="2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="box-grid">
          <h2>Receitas</h2>
          {erro && <p>{erro}</p>}
          <table className="grid">
            <thead>
              <tr>
                <th>Dia Vencimento</th>
                <th>Mês Vencimento</th>
                <th>Ano Vencimento</th>
                <th>Pago</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
                <th>Banco</th>
              </tr>
            </thead>
            <tbody>
              {receitas.map((receita) => (
                <tr
                  key={receita.id}
                  className="grid-row--context"
                  onContextMenu={(event) => abrirMenuContexto(event, receita)}
                >
                  <td>{receita.dia_vencimento}</td>
                  <td>{receita.mes_vencimento_descricao}</td>
                  <td>{receita.ano_vencimento}</td>
                  <td>
                    <PagoStatus dataPagamento={receita.data_pagamento} />
                  </td>
                  <td>{receita.descricao}</td>
                  <td>{formatarMoeda(receita.valor)}</td>
                  <td>{receita.categoria}</td>
                  <td>
                    <img src={"src/assets/img/" + receita.banco_imagem} alt="" />
                    {receita.banco}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Total de receitas</td>
                <td>{formatarMoeda(somarLancamentos(receitas))}</td>
                <td colSpan="2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="box-grid">
          <h2>Transferências</h2>
          {erro && <p>{erro}</p>}
          <table className="grid">
            <thead>
              <tr>
                <th>Dia Vencimento</th>
                <th>Mês Vencimento</th>
                <th>Ano Vencimento</th>
                <th>Pago</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
                <th>Conta Origem</th>
                <th>Conta Destino</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map((transferencia) => (
                <tr
                  key={transferencia.id}
                  className="grid-row--context"
                  onContextMenu={(event) => abrirMenuContexto(event, transferencia)}
                >
                  <td>{transferencia.dia_vencimento}</td>
                  <td>{transferencia.mes_vencimento_descricao}</td>
                  <td>{transferencia.ano_vencimento}</td>
                  <td>
                    <PagoStatus dataPagamento={transferencia.data_pagamento} />
                  </td>
                  <td>{transferencia.descricao}</td>
                  <td>{formatarMoeda(transferencia.valor)}</td>
                  <td>{transferencia.categoria}</td>
                  <td>
                    <img
                      src={"src/assets/img/" + transferencia.conta_origem_banco_imagem}
                      alt=""
                    />
                    {transferencia.conta_origem_banco}
                  </td>
                  <td>
                    <img
                      src={"src/assets/img/" + transferencia.conta_destino_banco_imagem}
                      alt=""
                    />
                    {transferencia.conta_destino_banco}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Total de transferências</td>
                <td>{formatarMoeda(somarLancamentos(transferencias))}</td>
                <td colSpan="3" />
              </tr>
            </tfoot>
          </table>
        </div>
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
          <button
            type="button"
            onClick={() =>
              executarAcao(
                menuContexto.lancamento.data_pagamento ? "cancelar-pagamento" : "pagar",
              )
            }
          >
            {menuContexto.lancamento.data_pagamento ? "Cancelar pagamento" : "Pagar"}
          </button>
          <button type="button" onClick={() => executarAcao("excluir")}>
            Excluir
          </button>
        </div>
      )}

      {tipoLancamentoModal && (
        <div
          className="launch-modal"
          role="presentation"
          onMouseDown={() => setTipoLancamentoModal(null)}
        >
          <form
            className="launch-modal__panel"
            onSubmit={salvarNovoLancamento}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="launch-modal__header">
              <div>
                <h2>Novo lançamento</h2>
                <p>{tipoLancamentoModal}</p>
              </div>
              <button
                className="launch-modal__close"
                type="button"
                onClick={() => setTipoLancamentoModal(null)}
                aria-label="Fechar"
                title="Fechar"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </header>

            <input type="hidden" name="tipo_lancamento" value={tipoLancamentoModal} />

            <div className="launch-modal__fields">
              <label>
                Descrição
                <input name="descricao" type="text" required />
              </label>
              <label>
                Valor
                <input name="valor" type="number" min="0" step="0.01" required />
              </label>
              <label>
                Data de vencimento
                <input
                  name="data_vencimento"
                  type="date"
                  defaultValue={`${anoSelecionado}-${String(mesSelecionado).padStart(
                    2,
                    "0",
                  )}-${String(new Date().getDate()).padStart(2, "0")}`}
                  required
                />
              </label>
              <label>
                Categoria
                <select name="categoria_id" required>
                  <option value="">Selecione</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.descricao}
                    </option>
                  ))}
                </select>
              </label>

              {tipoLancamentoModal === "Transferência" ? (
                <>
                  <label>
                    Conta origem
                    <select name="conta_origem_id" required>
                      <option value="">Selecione</option>
                      {contas.map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Conta destino
                    <select name="conta_destino_id" required>
                      <option value="">Selecione</option>
                      {contas.map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label>
                  Conta
                  <select name="conta_id" required>
                    <option value="">Selecione</option>
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.descricao}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Data pagamento
                <input name="data_pagamento" type="date" />
              </label>
            </div>

            <footer className="launch-modal__footer">
              <button type="button" onClick={() => setTipoLancamentoModal(null)}>
                Cancelar
              </button>
              <button type="submit">Salvar</button>
            </footer>
          </form>
        </div>
      )}

      {modalAcao?.acao === "excluir" && (
        <div className="launch-modal" role="presentation" onMouseDown={() => setModalAcao(null)}>
          <section
            className="launch-modal__panel launch-modal__panel--small"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="launch-modal__header">
              <div>
                <h2>Excluir lançamento</h2>
                <p>Tem certeza que deseja excluir "{modalAcao.lancamento.descricao}"?</p>
              </div>
            </header>
            <footer className="launch-modal__footer">
              <button type="button" onClick={() => setModalAcao(null)}>
                Cancelar
              </button>
              <button type="button" onClick={confirmarExclusaoLancamento}>
                Excluir
              </button>
            </footer>
          </section>
        </div>
      )}

      {["consultar", "editar"].includes(modalAcao?.acao) && (
        <div className="launch-modal" role="presentation" onMouseDown={() => setModalAcao(null)}>
          <form
            className="launch-modal__panel"
            onSubmit={salvarEdicaoLancamento}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="launch-modal__header">
              <div>
                <h2>
                  {modalAcao.acao === "consultar" ? "Consultar lançamento" : "Editar lançamento"}
                </h2>
                <p>{modalAcao.lancamento.tipo_lancamento}</p>
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

            <input
              type="hidden"
              name="tipo_lancamento"
              value={modalAcao.lancamento.tipo_lancamento}
            />

            <div className="launch-modal__fields">
              <label>
                Descrição
                <input
                  name="descricao"
                  type="text"
                  defaultValue={modalAcao.lancamento.descricao}
                  disabled={modalAcao.acao === "consultar"}
                  required
                />
              </label>
              <label>
                Valor
                <input
                  name="valor"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={modalAcao.lancamento.valor}
                  disabled={modalAcao.acao === "consultar"}
                  required
                />
              </label>
              <label>
                Data de vencimento
                <input
                  name="data_vencimento"
                  type="date"
                  defaultValue={getDataVencimentoInput(modalAcao.lancamento)}
                  disabled={modalAcao.acao === "consultar"}
                  required
                />
              </label>
              <label>
                Categoria
                <select
                  name="categoria_id"
                  defaultValue={modalAcao.lancamento.categoria_id || ""}
                  disabled={modalAcao.acao === "consultar"}
                  required
                >
                  <option value="">Selecione</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.descricao}
                    </option>
                  ))}
                </select>
              </label>

              {modalAcao.lancamento.tipo_lancamento === "Transferência" ? (
                <>
                  <label>
                    Conta origem
                    <select
                      name="conta_origem_id"
                      defaultValue={modalAcao.lancamento.conta_origem_id || ""}
                      disabled={modalAcao.acao === "consultar"}
                      required
                    >
                      <option value="">Selecione</option>
                      {contas.map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Conta destino
                    <select
                      name="conta_destino_id"
                      defaultValue={modalAcao.lancamento.conta_destino_id || ""}
                      disabled={modalAcao.acao === "consultar"}
                      required
                    >
                      <option value="">Selecione</option>
                      {contas.map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label>
                  Conta
                  <select
                    name="conta_id"
                    defaultValue={modalAcao.lancamento.conta_id || ""}
                    disabled={modalAcao.acao === "consultar"}
                    required
                  >
                    <option value="">Selecione</option>
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.descricao}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Data pagamento
                <input
                  name="data_pagamento"
                  type="date"
                  defaultValue={modalAcao.lancamento.data_pagamento || ""}
                  disabled={modalAcao.acao === "consultar"}
                />
              </label>
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
    </>
  );
}

export default Lancamentos;
