import React from 'react'
export default function Badge({children, ok}){
  return <span className={`badge ${ok ? 'green' : 'red'}`}>{children}</span>
}
