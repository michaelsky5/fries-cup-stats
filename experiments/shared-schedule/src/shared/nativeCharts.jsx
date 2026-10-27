import {Children,cloneElement} from 'react'
import {View} from '@tarojs/components'
import NativeSvg from './NativeSvg.jsx'
export const CartesianGrid=()=>null,Line=()=>null,ReferenceLine=()=>null,Tooltip=()=>null,XAxis=()=>null,YAxis=()=>null
export function ResponsiveContainer({children}){return <View style={{width:'100%',height:'100%'}}>{children}</View>}
export function LineChart({data=[],children}) {
  const parts=Children.toArray(children),x=parts.find(p=>p.type===XAxis)?.props||{},y=parts.find(p=>p.type===YAxis)?.props||{},line=parts.find(p=>p.type===Line)?.props||{},reference=parts.find(p=>p.type===ReferenceLine)?.props
  const values=data.map(row=>Number(row[x.dataKey])),min=Math.min(...values),max=Math.max(...values)
  const domain=[typeof x.domain?.[0]==='number'?x.domain[0]:min,typeof x.domain?.[1]==='number'?x.domain[1]:max]
  const px=value=>40+(value-domain[0])/Math.max(1,domain[1]-domain[0])*570,py=value=>260-(value-(y.domain?.[0]||0))/Math.max(1,(y.domain?.[1]||10)-(y.domain?.[0]||0))*235
  const segments=[];let current=[];for(const row of data){if(Number.isFinite(row[line.dataKey]))current.push(`${px(row[x.dataKey])},${py(row[line.dataKey])}`);else {segments.push(current);current=[]}}segments.push(current)
  return <NativeSvg viewBox='0 0 640 300' style={{width:'100%',height:'100%'}}>
    {(y.ticks||[0,5,10]).map(value=><g key={value}><line x1='40' x2='610' y1={py(value)} y2={py(value)} stroke='#cbccc3'/><text x='30' y={py(value)+4} textAnchor='end' fill='#66685f'>{value}</text></g>)}
    {[...new Set(x.ticks||[min,max])].map(value=><text key={value} x={px(value)} y='288' textAnchor='middle' fill='#66685f'>{x.tickFormatter?.(value)||value}</text>)}
    {reference?<line x1={px(reference.x)} x2={px(reference.x)} y1='20' y2='260' stroke='#66685f' strokeDasharray='4 5'/>:null}
    {segments.map((points,i)=><polyline key={i} points={points.join(' ')} stroke={line.stroke} strokeWidth={line.strokeWidth} fill='none'/>)}
    {data.filter(row=>Number.isFinite(row[line.dataKey])).map(row=>cloneElement(line.dot,{key:row.key,cx:px(row[x.dataKey]),cy:py(row[line.dataKey]),payload:row}))}
  </NativeSvg>
}
