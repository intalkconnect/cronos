import React, { useEffect, useMemo, useState } from 'react'
import SectionCard from './components/SectionCard.jsx'
import NumberInput from './components/NumberInput.jsx'
import Badge from './components/Badge.jsx'

const DEFAULT_REPLICAS = { incoming: 1, outcoming: 1, campaign: 1, status: 1 }

function useLocalStorage(key, initial){
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial } catch { return initial }
  })
  useEffect(()=>{ try { localStorage.setItem(key, JSON.stringify(value)) } catch{} }, [key, value])
  return [value, setValue]
}

export default function App(){
  const [baseUrl, setBaseUrl] = useLocalStorage('cronos.baseUrl', 'http://localhost:18080')
  const [tenant, setTenant] = useLocalStorage('cronos.tenant', 'hmg')
  const [replicas, setReplicas] = useLocalStorage('cronos.replicas', {...DEFAULT_REPLICAS})
  const [busy, setBusy] = useState(false)
  const [health, setHealth] = useState(undefined)
  const [log, setLog] = useState('')

  const headers = useMemo(()=>({ 'Content-Type':'application/json' }),[])

  useEffect(()=>{
    let stop = false
    async function ping(){
      try {
        const r = await fetch(`${baseUrl.replace(/\/$/, '')}/health`)
        const t = await r.text(); if(!stop) setHealth(t.trim())
      } catch { if(!stop) setHealth(undefined) }
    }
    ping(); const id = setInterval(ping, 5000); return ()=>{ stop = true; clearInterval(id) }
  }, [baseUrl])

  function setRep(key, val){ setReplicas(prev=> ({...prev, [key]: Math.max(0, Number.isFinite(val)? val : 0)})) }

  async function doCreate(){
    if(!tenant){ alert('Informe o tenant'); return }
    setBusy(true); setLog('')
    try {
      const r = await fetch(`${baseUrl.replace(/\/$/, '')}/clientes`, { method:'POST', headers, body: JSON.stringify({ tenant, replicas }) })
      const data = await r.json().catch(()=>({ raw: true }))
      setLog(JSON.stringify(data, null, 2))
    } catch(e){ setLog(String(e)) } finally { setBusy(false) }
  }

  async function doScale(){
    if(!tenant){ alert('Informe o tenant'); return }
    setBusy(true); setLog('')
    try {
      const r = await fetch(`${baseUrl.replace(/\/$/, '')}/clientes/${encodeURIComponent(tenant)}/scale`, { method:'POST', headers, body: JSON.stringify(replicas) })
      const data = await r.json().catch(()=>({ raw: true }))
      setLog(JSON.stringify(data, null, 2))
    } catch(e){ setLog(String(e)) } finally { setBusy(false) }
  }

  async function doDelete(){
    if(!tenant){ alert('Informe o tenant'); return }
    if(!confirm(`Remover TODOS os serviços do tenant "${tenant}"?`)) return
    setBusy(true); setLog('')
    try {
      const r = await fetch(`${baseUrl.replace(/\/$/, '')}/clientes/${encodeURIComponent(tenant)}`, { method:'DELETE' })
      const data = await r.json().catch(()=>({ raw: true }))
      setLog(JSON.stringify(data, null, 2))
    } catch(e){ setLog(String(e)) } finally { setBusy(false) }
  }

  return (
    <div style={{minHeight:'100vh', background:'var(--bg)', color:'var(--text)'}}>
      <header className="appbar">
        <div className="wrap container">
          <h1>Cronos — Painel de Provisionamento</h1>
          <div> <Badge ok={health === 'ok'}>provisioner {health === 'ok' ? 'online' : 'offline'}</Badge> </div>
        </div>
      </header>

      <main className="container">
        <div className="card">
          <div className="head"><h2 style={{margin:0,fontSize:16,fontWeight:600}}>Configuração</h2></div>
          <div className="content">
            <div className="grid two">
              <label className="field">
                <span>Base URL do Provisioner</span>
                <input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="http://host:18080" />
              </label>
              <label className="field">
                <span>TENANT</span>
                <input value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="hmg" />
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="head"><h2 style={{margin:0,fontSize:16,fontWeight:600}}>Réplicas</h2></div>
          <div className="content">
            <div className="grid four">
              <NumberInput label="incoming"  value={replicas.incoming  ?? DEFAULT_REPLICAS.incoming}  onChange={n=>setRep('incoming', n)} min={0} />
              <NumberInput label="outcoming" value={replicas.outcoming ?? DEFAULT_REPLICAS.outcoming} onChange={n=>setRep('outcoming', n)} min={0} />
              <NumberInput label="campaign"  value={replicas.campaign  ?? DEFAULT_REPLICAS.campaign}  onChange={n=>setRep('campaign', n)} min={0} />
              <NumberInput label="status"    value={replicas.status    ?? DEFAULT_REPLICAS.status}    onChange={n=>setRep('status', n)} min={0} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="head"><h2 style={{margin:0,fontSize:16,fontWeight:600}}>Ações</h2></div>
          <div className="content">
            <div className="row">
              <button className="primary" onClick={doCreate} disabled={busy}>Criar / Aplicar</button>
              <button className="blue" onClick={doScale} disabled={busy}>Escalar</button>
              <button className="red" onClick={doDelete} disabled={busy}>Remover</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="head"><h2 style={{margin:0,fontSize:16,fontWeight:600}}>Resultado</h2></div>
          <div className="content">
            <pre className="log">{log || '\n ⚠️  As respostas do provisionador aparecerão aqui.\n\n  Dicas:\n  • preencha a URL do provisioner (ex.: http://host:18080)\n  • informe um TENANT (ex.: hmg)\n  • ajuste as réplicas, se quiser\n'}</pre>
          </div>
        </div>

        <footer> Cronos © 2025 — DKDevs </footer>
      </main>
    </div>
  )
}
