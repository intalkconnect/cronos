import React from 'react'
export default function Badge({children, state}){
  const cls = state === 'ok' ? 'green' : state === 'down' ? 'red' : 'amber'
  return <span className={`badge ${cls}`}>{children}</span>
}
