function ConfirmacaoModal({
  aberto,
  acoes = [],
  mensagem,
  onClose,
  titulo,
}) {
  if (!aberto) {
    return null;
  }

  return (
    <div className="launch-modal" role="presentation" onMouseDown={onClose}>
      <section
        className="launch-modal__panel launch-modal__panel--small"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="launch-modal__header">
          <div>
            <h2>{titulo}</h2>
            {mensagem && <p>{mensagem}</p>}
          </div>
        </header>

        <footer className="launch-modal__footer">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          {acoes.map((acao) => (
            <button key={acao.label} type="button" onClick={acao.onClick}>
              {acao.label}
            </button>
          ))}
        </footer>
      </section>
    </div>
  );
}

export default ConfirmacaoModal;
