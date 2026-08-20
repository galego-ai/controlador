export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>AGENDA-GO</h1>
        <p>Sistema de reservas e gestão de veículos.</p>
      </section>
      <section className="grid">
        <div className="card"><h3>Veículos</h3><div className="value">0</div><p>Cadastros disponíveis</p></div>
        <div className="card"><h3>Reservas</h3><div className="value">0</div><p>Reservas no sistema</p></div>
        <div className="card"><h3>Confirmadas</h3><div className="value">0</div><p>Reservas confirmadas</p></div>
        <div className="card"><h3>Faturamento</h3><div className="value">R$ 0,00</div><p>Total registrado</p></div>
      </section>
      <section className="section card">
        <h2>Próximos módulos</h2>
        <p>O sistema será conectado ao Supabase para carregar veículos, clientes, reservas e pagamentos em tempo real.</p>
        <div className="actions">
          <a className="btn" href="/reservas">Reservas</a>
          <a className="btn secondary" href="/veiculos">Veículos</a>
        </div>
      </section>
    </main>
  )
}