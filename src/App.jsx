import React, { useEffect, useMemo, useState } from 'react'
import SectionCard from './components/SectionCard.jsx'
import Badge from './components/Badge.jsx'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || ''

export default function App(){
  const [mode, setMode] = useState('') // '', 'create', 'scale'
  const [tenant, setTenant] = useState('')
  const [repIn, setRepIn] = useState(1)
  const [repOut, setRepOut] = useState(1)
  const [busy, setBusy] = useState(false)
  const [health, setHealth] = useState('idle')
  const [log, setLog] = useState('')

  const headers = useMemo(()=>({ 'Content-Type':'application/json' }),[])

  // Health ping usando env (sem exibir a URL)
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
    if(!tenant){ alert('Informe o tenant'); return }
    if(!API_BASE){ alert('API base não configurada. Defina VITE_API_BASE no .env'); return }
    setBusy(true); setLog('')
    try {
      // criação: por padrão 1 réplica para todos (back-end já faz ao receber só o tenant)
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/clientes`, {
        method:'POST', headers, body: JSON.stringify({ tenant })
      })
      const data = await r.json().catch(()=>({ raw: true }))
      setLog(JSON.stringify(data, null, 2))
    } catch(e){ setLog(String(e)) } finally { setBusy(false) }
  }

  async function doScale(){
    if(!tenant){ alert('Informe o tenant'); return }
    if(!Number.isFinite(repIn) || repIn < 0){ alert('Réplicas de incoming inválidas'); return }
    if(!Number.isFinite(repOut) || repOut < 0){ alert('Réplicas de outcoming inválidas'); return }
    if(!API_BASE){ alert('API base não configurada. Defina VITE_API_BASE no .env'); return }
    setBusy(true); setLog('')
    try {
      const body = { incoming: repIn, outcoming: repOut }
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/clientes/${encodeURIComponent(tenant)}/scale`, {
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
        <SectionCard title="Escolha uma ação">
          <div className="choice">
            <button className="ghost" onClick={()=>{ setMode('create'); setLog(''); }}>Criar</button>
            <button className="ghost" onClick={()=>{ setMode('scale'); setLog(''); }}>Escalar</button>
          </div>
        </SectionCard>

        {mode === 'create' && (
          <>
            <SectionCard title="Criação (1 réplica por serviço)">
              <div className="grid two">
                <label className="field">
                  <span>TENANT</span>
                  <input value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="ex.: hmg" />
                </label>
              </div>
              <div className="row" style={{marginTop:12}}>
                <button className="primary" onClick={doCreate} disabled={busy}>Criar</button>
              </div>
            </SectionCard>
          </>
        )}

        {mode === 'scale' && (
          <>
            <SectionCard title="Escalar (apenas incoming e outcoming)">
              <div className="grid two">
                <label className="field">
                  <span>TENANT</span>
                  <input value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="ex.: hmg" />
                </label>
                <label className="field">
                  <span>Réplicas — incoming</span>
                  <input type="number" min={0} value={repIn} onChange={e=> setRepIn(parseInt(e.target.value || '0',10))} />
                </label>
                <label className="field">
                  <span>Réplicas — outcoming</span>
                  <input type="number" min={0} value={repOut} onChange={e=> setRepOut(parseInt(e.target.value || '0',10))} />
                </label>
              </div>
              <div className="row" style={{marginTop:12}}>
                <button className="blue" onClick={doScale} disabled={busy}>Aplicar</button>
              </div>
            </SectionCard>
          </>
        )}

        <SectionCard title="Resultado">
          <pre className="log">{log || (mode ? '\n ⚠️  As respostas do provisionador aparecerão aqui.' : '\n Selecione Criar ou Escalar para começar.')}</pre>
        </SectionCard>

        <footer> Cronos © 2025 — DKDevs </footer>
      </main>
    </div>
  )
}
