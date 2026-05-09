import { Route, Routes } from 'react-router-dom'
import Sidebar from './componentes/Sidebar'
import Home from './paginas/Home'
import FluxoCaixa from './paginas/FluxoCaixa'
import Lancamentos from './paginas/Lancamentos'
import ContaCartao from './paginas/ContaCartao'
import Configuracao from './paginas/Configuracao'

function App() {
  return (
    <>
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="/cartao-credito" element={<ContaCartao />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/configuracoes" element={<Configuracao />} />
        </Routes>
      </main>
    </>
  )
}

export default App
