import React from 'react'
export default function SectionCard({title, children, right}){
  return (
    <div className="card">
      <div className="head"><h2 style={{margin:0,fontSize:16,fontWeight:600}}>{title}</h2>{right}</div>
      <div className="content">{children}</div>
    </div>
  )
}
