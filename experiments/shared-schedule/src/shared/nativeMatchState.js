// Search/comparison/filter choices remain on this device. A public share only
// carries the selected published map, never a player search or comparison pair.
export function createMatchReadingQuery(params={}) {
  const query=new URLSearchParams()
  const order=Number(params.mapOrder)
  if(Number.isInteger(order)&&order>0)query.set('map',String(order))
  return query.toString()
}

export function applyMatchReadingQuery(target,readingQuery) {
  // Taro's native URLSearchParams has forEach but no Symbol.iterator.
  new URLSearchParams(readingQuery).forEach((value,key)=>target.set(key,value))
  return target
}
