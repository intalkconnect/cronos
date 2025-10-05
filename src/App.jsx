import React, { useEffect, useMemo, useState } from 'react'
import SectionCard from './components/SectionCard.jsx'
import Badge from './components/Badge.jsx'

const PROV_BASE = import.meta.env.VITE_PROVISIONER_BASE || ''

const DB_URL = import.meta.env.VITE_DB_URL || ''
const DB_METHOD = (import.meta.env.VITE_DB_METHOD || 'POST').toUpperCase()
const DB_BODY_JSON = import.meta.env.VITE_DB_BODY_JSON || ''

const TOKEN_URL = import.meta.env.VITE_TOKEN_URL || ''
const TOKEN_METHOD = (import.meta.env.VITE_TOKEN_METHOD || 'POST').toUpperCase()
const TOKEN_BODY_JSON = import.meta.env.VITE_TOKEN_BODY_JSON || ''
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'token'

const TENANT_CREATE_PATH = import.meta.env.VITE_TENANT_CREATE_PATH || '/api/v1/create'
const TENANT_CREATE_METHOD = (import.meta.env.VITE_TENANT_CREATE_METHOD || 'POST').toUpperCase()
const TENANT_CREATE_BODY_JSON = import.meta.env.VITE_TENANT_CREATE_BODY_JSON || ''

function tpl(str, ctx){
  return str.replace(/\{(\w+)\}/g, (_,k) => (ctx[k] ?? ''))
}

export default function App(){
  const [mode, setMode] = useState('') // '', 'create', 'scale'
  const [tenant, setTenant] = useState('')
  const [repIn, setRepIn] = useState(1)
  const [repOut, setRepOut] = useState(1)
  const [adminEmail, setAdminEmail] = useState('')

  const [busy, setBusy] = useState(false)
  const [health, setHealth] = useState('idle')
  const [log, setLog] = useState('')
  const [steps, setSteps] = useState([])

  const headers = useMemo(()=>({ 'Content-Type':'application/json' }),[])

  // Health ping
  useEffect(()=>{
    let stop = false
    async function ping(){
      if(!PROV_BASE){ setHealth('idle'); return }
      try {
        const r = await fetch(`${PROV_BASE.replace(/\/$/, '')}/health`)
        const t = (await r.text()).trim()
        if(!stop) setHealth(t === 'ok' ? 'ok' : 'down')
      } catch { if(!stop) setHealth('down') }
    }
    ping(); const id = setInterval(ping, 5000); return ()=>{ stop = true; clearInterval(id) }
  }, [])

  function resetUI(){ setLog(''); setSteps([]) }

  async function stepRun(id, fn){
    setSteps(prev => prev.map(s => s.id === id ? {...s, state:'run'} : s))
    try{ const out = await fn(); setSteps(prev => prev.map(s => s.id === id ? {...s, state:'ok'} : s)); return out }
    catch(e){ setSteps(prev => prev.map(s => s.id === id ? {...s, state:'err', detail:String(e)} : s)); throw e }
  }

  async function doCreateSequence(){
    if(!tenant) return alert('Informe o tenant')
    if(!PROV_BASE) return alert('VITE_PROVISIONER_BASE não configurada')

    setBusy(true); resetUI()
    setSteps([
      { id:'db',      title:'Criando banco de dados...', state:'idle' },
      { id:'token',   title:'Gerando token padrão do tenant...', state:'idle' },
      { id:'admin',   title:'Criando usuário admin (envio de e-mail)...', state:'idle' },
      { id:'workers', title:'Criando workers...', state:'idle' },
      { id:'done',    title:`Usuário recebeu o e-mail de criação de senha; após criar, já pode acessar portal.ninechat.com.br`, state:'idle' },
    ])

    const ctx = { tenant, email: adminEmail }
    try {
      // 1) DB setup
      const dbRes = await stepRun('db', async () => {
        if (!DB_URL) throw new Error('VITE_DB_URL não configurada')
        const url = tpl(DB_URL, ctx)
        const body = DB_BODY_JSON ? JSON.parse(tpl(DB_BODY_JSON, ctx)) : { tenant }
        const r = await fetch(url, { method: DB_METHOD, headers, body: JSON.stringify(body) })
        return r.json().catch(()=>({raw:true}))
      })

      // 2) Token
      let tokenRes = await stepRun('token', async () => {
        if (!TOKEN_URL) throw new Error('VITE_TOKEN_URL não configurada')
        const url = tpl(TOKEN_URL, ctx)
        const body = TOKEN_BODY_JSON ? JSON.parse(tpl(TOKEN_BODY_JSON, ctx)) : { tenant }
        const r = await fetch(url, { method: TOKEN_METHOD, headers, body: JSON.stringify(body) })
        const data = await r.json().catch(()=>({raw:true}))
        return data
      })
      const token = tokenRes?.[TOKEN_KEY] || tokenRes?.access_token || tokenRes?.data?.[TOKEN_KEY]
      if (!token) throw new Error('Token não encontrado na resposta (ajuste VITE_TOKEN_KEY se necessário)')

      // 3) Admin user at tenant domain
      const adminRes = await stepRun('admin', async () => {
        if (!adminEmail) throw new Error('Informe o e-mail do admin')
        const url = `https://${tenant}.ninechat.com.br${TENANT_CREATE_PATH}`
        const body = TENANT_CREATE_BODY_JSON ? JSON.parse(tpl(TENANT_CREATE_BODY_JSON, ctx)) : { email: adminEmail, profile: 'admin' }
        const r = await fetch(url, {
          method: TENANT_CREATE_METHOD,
          headers: { ...headers, Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        })
        return r.json().catch(()=>({raw:true}))
      })

      // 4) workers
      const workersRes = await stepRun('workers', async () => {
        const r = await fetch(`${PROV_BASE.replace(/\/$/, '')}/clientes`, {
          method:'POST', headers, body: JSON.stringify({ tenant })
        })
        return r.json().catch(()=>({raw:true}))
      })

      // 5) done
      setSteps(prev => prev.map(s => s.id === 'done' ? {...s, state:'ok'} : s))
      setLog(JSON.stringify({ db:dbRes, token:tokenRes, admin:adminRes, workers:workersRes }, null, 2))
    } catch(e){
      setLog(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function doScale(){
    if(!tenant){ alert('Informe o tenant'); return }
    if(!Number.isFinite(repIn) || repIn < 0){ alert('Réplicas de incoming inválidas'); return }
    if(!Number.isFinite(repOut) || repOut < 0){ alert('Réplicas de outcoming inválidas'); return }
    if(!PROV_BASE){ alert('VITE_PROVISIONER_BASE não configurada'); return }
    setBusy(true); resetUI()
    try {
      const body = { incoming: repIn, outcoming: repOut }
      const r = await fetch(`${PROV_BASE.replace(/\/$/, '')}/clientes/${encodeURIComponent(tenant)}/scale`, {
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
            <button className="ghost" onClick={()=>{ setMode('create'); resetUI(); }}>Criar</button>
            <button className="ghost" onClick={()=>{ setMode('scale');  resetUI(); }}>Escalar</button>
          </div>
        </SectionCard>

        {!!mode && (
          <SectionCard title="Dados do Tenant">
            <div className="grid two">
              <label className="field">
                <span>TENANT</span>
                <input value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="ex.: hmg" />
              </label>
              {mode === 'create' && (
                <label className="field">
                  <span>E-mail do Admin (para receber convite)</span>
                  <input type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} placeholder="admin@empresa.com.br" />
                </label>
              )}
            </div>
          </SectionCard>
        )}

        {mode === 'create' && (
          <>
            <SectionCard title="Criação — etapas">
              <div className="row" style={{marginBottom:12}}>
                <button className="primary" onClick={doCreateSequence} disabled={busy}>Iniciar criação</button>
              </div>
              <div className="steps">
                {steps.map(s => (
                  <div key={s.id} className="step">
                    <span className={`dot ${s.state === 'run' ? 'run' : s.state === 'ok' ? 'ok' : s.state === 'err' ? 'err' : ''}`}></span>
                    <span>{s.title}</span>
                    {s.detail && <span style={{color:'#64748b'}}>— {s.detail}</span>}
                  </div>
                ))}
                {!steps.length && <div style={{color:'#64748b'}}>Nada iniciado ainda.</div>}
              </div>
            </SectionCard>
          </>
        )}

        {mode === 'scale' && (
          <>
            <SectionCard title="Escalar (apenas incoming e outcoming)">
              <div className="grid two">
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

        <SectionCard title="Resposta">
          <pre className="log">{log || (mode ? '\n As respostas dos endpoints aparecerão aqui.' : '\n Selecione Criar ou Escalar para começar.')}</pre>
        </SectionCard>

        <footer> Cronos © 2025 — DKDevs </footer>
      </main>
    </div>
  )
}
