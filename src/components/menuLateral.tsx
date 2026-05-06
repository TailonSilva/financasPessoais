import Link from "next/link";

export default function MenuLateral() {
  return (
    <div>
      <nav>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/lancamentos">Lançamentos</Link></li>
          <li><Link href="/cadastros">Cadastros</Link></li>
          <li><Link href="/contas">Contas</Link></li>
        </ul>
      </nav>
    </div>
  );
}