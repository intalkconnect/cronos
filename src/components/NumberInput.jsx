import React from 'react'
export default function NumberInput({label, value, onChange, min=0}){
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={min} value={Number.isFinite(value)? value : 0} onChange={(e)=> onChange(parseInt(e.target.value || '0',10))} />
    </label>
  )
}
