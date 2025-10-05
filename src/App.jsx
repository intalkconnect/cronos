import React, { useEffect, useMemo, useState } from 'react'
import SectionCard from './components/SectionCard.jsx'
import Badge from './components/Badge.jsx'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || ''

export default function App(){
  const [tenantCreate, setTenantCreate] = useState('hmg')
  const [tenantScale, setTenantScale] = useState('hmg')
  const [scaleCount, setScaleCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [health, setHealth] = useState('idle')
  const [log, setLog] = useState('')

  const headers = useMemo(()=>({ 'Content-Type':'application/json' }),[])

  // Health ping (sem expor a URL na UI)
  useEffect(()=>{
    let stop = false
    async function ping(){
      if(!API_BASE){ setHealth('idle'); return }
      try {
        const r = await fetch(`${API_BASE.replace(/\/$/, '')}/health`)
        const t = (await r.text()).trim()
        if(!stop) setHealth(t === 'ok' ? 'ok' : 'down')
      } catch { if(!stop) setHealth('down') }
    }
    ping(); const id = setInterval(ping, 5000); return ()=>{ stop = true; clearInterval(id) }
  }, [])

  async function doCreate(){
    if(!tenantCreate){ alert('Informe o tenant'); return }
    if(!API_BASE){ alert('API base não configurada. Defina VITE_API_BASE no .env'); return }
    setBusy(true); setLog('')
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/clientes`, {
        method:'POST', headers, body: JSON.stringify({ tenant: tenantCreate })
      })
      const data = await r.json().catch(()=>({ raw: true }))
      setLog(JSON.stringify(data, null, 2))
    } catch(e){ setLog(String(e)) } finally { setBusy(false) }
  }

  async function doScale(){
    if(!tenantScale){ alert('Informe o tenant'); return }
    if(!Number.isFinite(scaleCount) || scaleCount < 0){ alert('Réplicas inválidas'); return }
    if(!API_BASE){ alert('API base não configurada. Defina VITE_API_BASE no .env'); return }
    setBusy(true); setLog('')
    try {
      // aplica o mesmo número para todos os serviços
      const body = { incoming: scaleCount, outcoming: scaleCount, campaign: scaleCount, status: scaleCount }
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/clientes/${encodeURIComponent(tenantScale)}/scale`, {
        method:'POST', headers, body: JSON.stringify(body)
      })
      const data = await r.json().catch(()=>({ raw: true }))
      setLog(JSON.stringify(data, null, 2))
    } catch(e){ setLog(String(e)) } finally { setBusy(false) }
  }

  return (
    <div style={{minHeight:'100vh', background:'var(--bg)', color:'var(--text)'}}>
      <header className="appbar">
        <div className="wrap container">
          <h1>Cronos — Painel de Provisionamento</h1>
          <div> <Badge state={health}>{health === 'ok' ? 'provisioner online' : health === 'down' ? 'provisioner offline' : 'aguardando configuração'}</Badge> </div>
        </div>
      </header>

      <main className="container">
        <SectionCard title="Criar cliente (apenas TENANT)">
          <div className="grid two">
            <label className="field">
              <span>TENANT</span>
              <input value={tenantCreate} onChange={e=>setTenantCreate(e.target.value)} placeholder="hmg" />
            </label>
          </div>
          <div style={{marginTop:12}} className="row">
            <button className="primary" onClick={doCreate} disabled={busy}>Criar</button>
          </div>
        </SectionCard>

        <SectionCard title="Escalar réplicas (TENANT + quantidade)">
          <div className="grid two">
            <label className="field">
              <span>TENANT</span>
              <input value={tenantScale} onChange={e=>setTenantScale(e.target.value)} placeholder="hmg" />
            </label>
            <label className="field">
              <span>Réplicas (para todos os serviços)</span>
              <input type="number" min={0} value={scaleCount} onChange={e=> setScaleCount(parseInt(e.target.value || '0',10))} />
            </label>
          </div>
          <div style={{marginTop:12}} className="row">
            <button className="blue" onClick={doScale} disabled={busy}>Aplicar escala</button>
          </div>
        </SectionCard>

        <SectionCard title="Resultado">
          <pre className="log">{log || '\n ⚠️  As respostas do provisionador aparecerão aqui.\n\n  Dicas:\n  • configure VITE_API_BASE no .env antes de buildar\n  • use Criar (tenant) ou Escalar (tenant + replicas)\n'}</pre>
        </SectionCard>

        <footer> Cronos © 2025 — DKDevs </footer>
      </main>
    </div>
  )
}
