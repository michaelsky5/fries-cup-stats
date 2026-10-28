// Production defaults to the live account API. Preview deployments can set
// FRIES_PLATFORM_ORIGIN to the isolated staging backend. EdgeOne supplies this
// through context.env; process.env is only the local Node fallback.
const PLATFORM_ORIGIN = globalThis.process?.env?.FRIES_PLATFORM_ORIGIN || 'https://admin.fries-cup.com'
const PUBLIC_ORIGIN = 'https://admin.fries-cup.com'
const RELEASE_IDENTITY = null // stamped by the production release builder
const MAX_BODY_BYTES = 1024 * 1024
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const METHODS = new Set([...READ_METHODS, 'POST', 'PUT', 'PATCH', 'DELETE'])
const FORWARD_HEADERS = ['accept', 'accept-language', 'content-type', 'origin', 'referer', 'sec-fetch-site']

// BEGIN GENERATED PUBLIC GZIP CODEC
/*! fflate 0.8.3, gzip-only browser bundle.
 * Regenerate: node scripts/generateSnapshotGzip.mjs
 * Source integrity: sha512-tbZNuJrLwGUp3zshBtdy4W+ORxZuIh8a5ilyIEQDC5rY1f3U20JMry0Ll3WBzU58EZKsEuJFXhb5gwv8CsPvgA==
 * MIT License
 *
 * Copyright (c) 2026 Arjun Barrett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* eslint-disable no-redeclare, no-sparse-arrays, no-empty -- Pinned generated third-party codec only. */
var FriesSnapshotGzip=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=Uint8Array,n=Uint16Array,r=Int32Array,i=new t([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),a=new t([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),o=new t([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),s=function(e,t){for(var i=new n(31),a=0;a<31;++a)i[a]=t+=1<<e[a-1];for(var o=new r(i[30]),a=1;a<30;++a)for(var s=i[a];s<i[a+1];++s)o[s]=s-i[a]<<5|a;return{b:i,r:o}},c=s(i,2),l=c.b,u=c.r;l[28]=258,u[258]=28;var d=s(a,0);d.b;for(var f=d.r,p=new n(32768),m=0;m<32768;++m){var h=(m&43690)>>1|(m&21845)<<1;h=(h&52428)>>2|(h&13107)<<2,h=(h&61680)>>4|(h&3855)<<4,p[m]=((h&65280)>>8|(h&255)<<8)>>1}for(var g=(function(e,t,r){for(var i=e.length,a=0,o=new n(t);a<i;++a)e[a]&&++o[e[a]-1];var s=new n(t);for(a=1;a<t;++a)s[a]=s[a-1]+o[a-1]<<1;var c;if(r){c=new n(1<<t);var l=15-t;for(a=0;a<i;++a)if(e[a])for(var u=a<<4|e[a],d=t-e[a],f=s[e[a]-1]++<<d,m=f|(1<<d)-1;f<=m;++f)c[p[f]>>l]=u}else for(c=new n(i),a=0;a<i;++a)e[a]&&(c[a]=p[s[e[a]-1]++]>>15-e[a]);return c}),_=new t(288),m=0;m<144;++m)_[m]=8;for(var m=144;m<256;++m)_[m]=9;for(var m=256;m<280;++m)_[m]=7;for(var m=280;m<288;++m)_[m]=8;for(var v=new t(32),m=0;m<32;++m)v[m]=5;var ee=/*#__PURE__*/ g(_,9,0),y=/*#__PURE__*/ g(v,5,0),b=function(e){return(e+7)/8|0},x=function(e,n,r){return(n==null||n<0)&&(n=0),(r==null||r>e.length)&&(r=e.length),new t(e.subarray(n,r))},S=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],C=function(e,t,n){var r=Error(t||S[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,C),!n)throw r;return r},w=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},T=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},E=function(e,r){for(var i=[],a=0;a<e.length;++a)e[a]&&i.push({s:a,f:e[a]});var o=i.length,s=i.slice();if(!o)return{t:M,l:0};if(o==1){var c=new t(i[0].s+1);return c[i[0].s]=1,{t:c,l:1}}i.sort(function(e,t){return e.f-t.f}),i.push({s:-1,f:25001});var l=i[0],u=i[1],d=0,f=1,p=2;for(i[0]={s:-1,f:l.f+u.f,l,r:u};f!=o-1;)l=i[i[d].f<i[p].f?d++:p++],u=i[d!=f&&i[d].f<i[p].f?d++:p++],i[f++]={s:-1,f:l.f+u.f,l,r:u};for(var m=s[0].s,a=1;a<o;++a)s[a].s>m&&(m=s[a].s);var h=new n(m+1),g=D(i[f-1],h,0);if(g>r){var a=0,_=0,v=g-r,ee=1<<v;for(s.sort(function(e,t){return h[t.s]-h[e.s]||e.f-t.f});a<o;++a){var y=s[a].s;if(h[y]>r)_+=ee-(1<<g-h[y]),h[y]=r;else break}for(_>>=v;_>0;){var b=s[a].s;h[b]<r?_-=1<<r-h[b]++-1:++a}for(;a>=0&&_;--a){var x=s[a].s;h[x]==r&&(--h[x],++_)}g=r}return{t:new t(h),l:g}},D=function(e,t,n){return e.s==-1?Math.max(D(e.l,t,n+1),D(e.r,t,n+1)):t[e.s]=n},O=function(e){for(var t=e.length;t&&!e[--t];);for(var r=new n(++t),i=0,a=e[0],o=1,s=function(e){r[i++]=e},c=1;c<=t;++c)if(e[c]==a&&c!=t)++o;else{if(!a&&o>2){for(;o>138;o-=138)s(32754);o>2&&(s(o>10?o-11<<5|28690:o-3<<5|12305),o=0)}else if(o>3){for(s(a),--o;o>6;o-=6)s(8304);o>2&&(s(o-3<<5|8208),o=0)}for(;o--;)s(a);o=1,a=e[c]}return{c:r.subarray(0,i),n:t}},k=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},te=function(e,t,n){var r=n.length,i=b(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},A=function(e,t,r,s,c,l,u,d,f,p,m){w(t,m++,r),++c[256];for(var h=E(c,15),b=h.t,x=h.l,S=E(l,15),C=S.t,D=S.l,A=O(b),j=A.c,M=A.n,N=O(C),P=N.c,F=N.n,I=new n(19),L=0;L<j.length;++L)++I[j[L]&31];for(var L=0;L<P.length;++L)++I[P[L]&31];for(var R=E(I,7),z=R.t,B=R.l,V=19;V>4&&!z[o[V-1]];--V);var H=p+5<<3,U=k(c,_)+k(l,v)+u,W=k(c,b)+k(l,C)+u+14+3*V+k(I,z)+2*I[16]+3*I[17]+7*I[18];if(f>=0&&H<=U&&H<=W)return te(t,m,e.subarray(f,f+p));var G,K,q,J;if(w(t,m,1+(W<U)),m+=2,W<U){G=g(b,x,0),K=b,q=g(C,D,0),J=C;var ne=g(z,B,0);w(t,m,M-257),w(t,m+5,F-1),w(t,m+10,V-4),m+=14;for(var L=0;L<V;++L)w(t,m+3*L,z[o[L]]);m+=3*V;for(var re=[j,P],Y=0;Y<2;++Y)for(var X=re[Y],L=0;L<X.length;++L){var Z=X[L]&31;w(t,m,ne[Z]),m+=z[Z],Z>15&&(w(t,m,X[L]>>5&127),m+=X[L]>>12)}}else G=ee,K=_,q=y,J=v;for(var L=0;L<d;++L){var Q=s[L];if(Q>255){var Z=Q>>18&31;T(t,m,G[Z+257]),m+=K[Z+257],Z>7&&(w(t,m,Q>>23&31),m+=i[Z]);var $=Q&31;T(t,m,q[$]),m+=J[$],$>3&&(T(t,m,Q>>5&8191),m+=a[$])}else T(t,m,G[Q]),m+=K[Q]}return T(t,m,G[256]),m+K[256]},j=/*#__PURE__*/ new r([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),M=/*#__PURE__*/ new t(0),N=function(e,o,s,c,l,d){var p=d.z||e.length,m=new t(c+p+5*(1+Math.ceil(p/7e3))+l),h=m.subarray(c,m.length-l),g=d.l,_=(d.r||0)&7;if(o){_&&(h[0]=d.r>>3);for(var v=j[o-1],ee=v>>13,y=v&8191,S=(1<<s)-1,C=d.p||new n(32768),w=d.h||new n(S+1),T=Math.ceil(s/3),E=2*T,D=function(t){return(e[t]^e[t+1]<<T^e[t+2]<<E)&S},O=new r(25e3),k=new n(288),M=new n(32),N=0,P=0,F=d.i||0,I=0,L=d.w||0,R=0;F+2<p;++F){var z=D(F),B=F&32767,V=w[z];if(C[B]=V,w[z]=B,L<=F){var H=p-F;if((N>7e3||I>24576)&&(H>423||!g)){_=A(e,h,0,O,k,M,P,I,R,F-R,_),I=N=P=0,R=F;for(var U=0;U<286;++U)k[U]=0;for(var U=0;U<30;++U)M[U]=0}var W=2,G=0,K=y,q=B-V&32767;if(H>2&&z==D(F-q))for(var J=Math.min(ee,H)-1,ne=Math.min(32767,F),re=Math.min(258,H);q<=ne&&--K&&B!=V;){if(e[F+W]==e[F+W-q]){for(var Y=0;Y<re&&e[F+Y]==e[F+Y-q];++Y);if(Y>W){if(W=Y,G=q,Y>J)break;for(var X=Math.min(q,Y-2),Z=0,U=0;U<X;++U){var Q=F-q+U&32767,$=Q-C[Q]&32767;$>Z&&(Z=$,V=Q)}}}B=V,V=C[B],q+=B-V&32767}if(G){O[I++]=268435456|u[W]<<18|f[G];var ie=u[W]&31,ae=f[G]&31;P+=i[ie]+a[ae],++k[257+ie],++M[ae],L=F+W,++N}else O[I++]=e[F],++k[e[F]]}}for(F=Math.max(F,L);F<p;++F)O[I++]=e[F],++k[e[F]];_=A(e,h,g,O,k,M,P,I,R,F-R,_),g||(d.r=_&7|h[_/8|0]<<3,_-=7,d.h=w,d.p=C,d.i=F,d.w=L)}else{for(var F=d.w||0;F<p+g;F+=65535){var oe=F+65535;oe>=p&&(h[_/8|0]=g,oe=p),_=te(h,_+1,e.subarray(F,oe))}d.i=p}return x(m,0,c+b(_)+l)},P=/*#__PURE__*/ (function(){for(var e=/* @__PURE__ */ new Int32Array(256),t=0;t<256;++t){for(var n=t,r=9;--r;)n=(n&1&&-306674912)^n>>>1;e[t]=n}return e})(),F=function(){var e=-1;return{p:function(t){for(var n=e,r=0;r<t.length;++r)n=P[n&255^t[r]]^n>>>8;e=n},d:function(){return~e}}},I=function(e,n,r,i,a){if(!a&&(a={l:1},n.dictionary)){var o=n.dictionary.subarray(-32768),s=new t(o.length+e.length);s.set(o),s.set(e,o.length),e=s,a.w=o.length}return N(e,n.level==null?6:n.level,n.mem==null?a.l?Math.ceil(Math.max(8,Math.min(13,Math.log(e.length)))*1.5):20:12+n.mem,r,i,a)},L=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8},R=function(e,t){var n=t.filename;if(e[0]=31,e[1]=139,e[2]=8,e[8]=t.level<2?4:t.level==9?2:0,e[9]=3,t.mtime!=0&&L(e,4,Math.floor(new Date(t.mtime||Date.now())/1e3)),n){e[3]=8;for(var r=0;r<=n.length;++r)e[r+10]=n.charCodeAt(r)}},z=function(e){return 10+(e.filename?e.filename.length+1:0)},B=/* @__PURE__ */ function(){function e(e,n){if(typeof e==`function`&&(n=e,e={}),this.ondata=n,this.o=e||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new t(98304),this.o.dictionary){var r=this.o.dictionary.subarray(-32768);this.b.set(r,32768-r.length),this.s.i=32768-r.length}}return e.prototype.p=function(e,t){this.ondata(I(e,this.o,0,0,this.s),t)},e.prototype.push=function(e,n){this.ondata||C(5),this.s.l&&C(4);var r=e.length+this.s.z;if(r>this.b.length){if(r>2*this.b.length-32768){var i=new t(r&-32768);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;this.b.set(e.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(e.subarray(a),32768),this.s.z=e.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(e,this.s.z),this.s.z+=e.length;this.s.l=n&1,(this.s.z>this.s.w+8191||n)&&(this.p(this.b,n||!1),this.s.w=this.s.i,this.s.i-=2),n&&(this.s=this.o={},this.b=M)},e.prototype.flush=function(e){if(this.ondata||C(5),this.s.l&&C(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2,e){var n=new t(6);n[0]=this.s.r>>3;var r=te(n,this.s.r,M);this.s.r=0,this.ondata(n.subarray(0,r>>3),!1)}},e}(),V=/* @__PURE__ */ function(){function e(e,t){this.c=F(),this.l=0,this.v=1,B.call(this,e,t)}return e.prototype.push=function(e,t){this.c.p(e),this.l+=e.length,B.prototype.push.call(this,e,t)},e.prototype.p=function(e,t){var n=I(e,this.o,this.v&&z(this.o),t&&8,this.s);this.v&&=(R(n,this.o),0),t&&(L(n,n.length-8,this.c.d()),L(n,n.length-4,this.l)),this.ondata(n,t)},e.prototype.flush=function(e){B.prototype.flush.call(this,e)},e}(),H=typeof TextDecoder<`u`&&/*#__PURE__*/ new TextDecoder;try{H.decode(M,{stream:!0})}catch{}return e.Gzip=V,e})({});
/* eslint-enable no-redeclare, no-sparse-arrays, no-empty */
// END GENERATED PUBLIC GZIP CODEC

function acceptsGzip(value) {
  let gzip, wildcard
  for (const entry of String(value || '').split(',')) {
    const [name, ...parameters] = entry.trim().toLowerCase().split(';').map(part => part.trim())
    const quality = parameters.find(part => part.startsWith('q='))
    const weight = quality ? Number(quality.slice(2)) : 1
    const accepted = Number.isFinite(weight) && weight >= 0 && weight <= 1 ? weight : 0
    if (name === 'gzip') gzip = accepted
    if (name === '*') wildcard = accepted
  }
  return (gzip ?? wildcard ?? 0) > 0
}

async function encodeSnapshotGzip(body) {
  const chunks = []
  let inputBytes = 0, outputBytes = 0
  const encoder = new FriesSnapshotGzip.Gzip({ level: 1, mtime: 0 }, chunk => {
    outputBytes += chunk.byteLength
    if (outputBytes > MAX_BODY_BYTES) throw new Error('PUBLIC_GZIP_OUTPUT_LIMIT')
    chunks.push(chunk)
  })
  const reader = body.getReader()
  try {
    while (true) {
      const next = await reader.read()
      const value = next.done ? new Uint8Array(0) : next.value
      const bytes = value instanceof Uint8Array ? value : ArrayBuffer.isView(value)
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value)
      inputBytes += bytes.byteLength
      if (inputBytes > 8 * MAX_BODY_BYTES) throw new Error('PUBLIC_GZIP_INPUT_LIMIT')
      encoder.push(bytes, next.done)
      if (next.done) break
    }
    const encoded = new Uint8Array(outputBytes)
    let offset = 0
    for (const chunk of chunks) { encoded.set(chunk, offset); offset += chunk.byteLength }
    return encoded.buffer
  } catch (error) {
    // The other tee branch is the intact identity fallback. Waiting for its
    // cancellation before returning that fallback would deadlock the read.
    reader.cancel(error).catch(() => {})
    throw error
  } finally { reader.releaseLock() }
}

async function snapshotResponse(request, response, route) {
  if (!route.snapshot) return response
  const headers = new Headers(response.headers)
  const vary = (headers.get('vary') || '').split(',').map(value => value.trim()).filter(Boolean)
  if (!vary.some(value => value.toLowerCase() === 'accept-encoding')) vary.push('Accept-Encoding')
  headers.set('vary', vary.join(', '))
  const cacheControl = headers.get('cache-control') || ''
  const compress = request.method === 'GET' && response.status === 200 && response.body
    && /application\/json/i.test(headers.get('content-type') || '')
    && /\bpublic\b/i.test(cacheControl) && !/private|no-store/i.test(cacheControl)
    && acceptsGzip(request.headers.get('accept-encoding'))
  if (!compress) return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  // Actual provider acceptance did not preserve rewritten stream bytes. Build
  // a bounded compressed ArrayBuffer instead; read the origin with getReader
  // because the runtime's text/json/arrayBuffer helpers reject bodies >1 MiB.
  let encoded
  try { encoded = await encodeSnapshotGzip(response.clone(true).body) }
  catch {
    headers.set('X-Fries-Compression', 'identity-unavailable')
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
  response.body.cancel().catch(() => {})
  headers.set('content-encoding', 'gzip')
  headers.set('X-Fries-Compression', 'gzip-js-buffered')
  headers.delete('content-length')
  const etag = headers.get('etag')
  if (etag && !etag.startsWith('W/')) headers.set('etag', 'W/' + etag)
  return new Response(encoded, {
    status: response.status, statusText: response.statusText, headers
  })
}

function matchesIfNoneMatch(value, currentEtag) {
  if (typeof value !== 'string' || typeof currentEtag !== 'string') return false
  const field = value.trim()
  if (field === '*') return true
  const current = currentEtag.trim().replace(/^W\//, '')
  const tags = []
  let remaining = field
  while (remaining) {
    const match = remaining.match(/^[\t ,]*(?:W\/)?("[\x21\x23-\x7e\x80-\xff]*")[\t ]*(?:,|$)/)
    if (!match) return false
    tags.push(match[1])
    remaining = remaining.slice(match[0].length)
    if (/^[\t ,]*$/.test(remaining)) break
  }
  return tags.includes(current)
}

function cachedResponse(request, hit) {
  const headers = new Headers(hit.headers)
  headers.set('X-Fries-Public-Cache', 'HIT')
  const unchanged = request.headers.get('if-none-match')?.trim() === '*'
    || matchesIfNoneMatch(request.headers.get('if-none-match'), headers.get('etag'))
  if (unchanged) {
    headers.delete('content-length')
    headers.delete('content-encoding')
    // Releasing a cache body must not delay a header-only response.
    hit.body?.cancel().catch(() => {})
    return new Response(null, { status: 304, headers })
  }
  return new Response(hit.body, { status: hit.status, headers })
}

function problem(status, error, message, outcomeUnknown = false) {
  return new Response(JSON.stringify({ error, message, ...(outcomeUnknown ? { outcomeUnknown: true } : {}) }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

function resolveRoute(url, { platformOrigin, publicOrigin, rehearsal }) {
  // Refuse encoded separators and nested escapes before any upstream URL parsing.
  if (/%(?:2f|5c|25|00)/i.test(url.pathname)) return null
  let pathname
  try { pathname = decodeURIComponent(url.pathname) } catch { return null }
  if (pathname.split('/').some(part => part === '.' || part === '..') || pathname.includes('\\')) return null
  if (/^\/api\/admin-public\/seasons\/[A-Za-z0-9_-]+\/matches\/[A-Za-z0-9_-]+\/progress$/.test(pathname)) {
    return { public: true, volatile: true, url: `${publicOrigin}${pathname.replace('/api/admin-public/', '/api/public/')}` }
  }
  if (/^\/api\/admin-public\/seasons\/[A-Za-z0-9_-]+\/support$/.test(pathname)) {
    return { public: true, noCache: true, url: `${publicOrigin}${pathname.replace('/api/admin-public/', '/api/public/')}${url.search}` }
  }
  if (/^\/api\/admin-public\/seasons\/[A-Za-z0-9_-]+\/(team-logos|rulebook|rulebooks\/[a-f0-9]{32}\.(docx|pdf))$/.test(pathname)) {
    return { public: true, url: `${publicOrigin}${pathname.replace('/api/admin-public/', '/api/public/')}` }
  }
  if (/^\/api\/admin-public\/seasons\/[A-Za-z0-9_-]+\/publish\/latest\/(data|report)$/.test(pathname)) {
    const snapshotOrigin = rehearsal && pathname.startsWith('/api/admin-public/seasons/WEBWEEK20260914/') ? platformOrigin : publicOrigin
    return { public: true, snapshot: true, url: `${snapshotOrigin}${pathname.replace('/api/admin-public/', '/api/public/')}${url.search}` }
  }
  if (/^\/api\/platform\/media\/avatars\/[a-f0-9]{24}\/[a-f0-9]{32}-(256|96)\.webp$/.test(pathname)) {
    return { public: true, media: true, url: `${platformOrigin}${pathname.replace('/api/platform/', '/api/')}` }
  }
  if (/^\/api\/platform\/media\/team-logos\/[a-f0-9]{24}\/[a-f0-9]{32}\.webp$/.test(pathname)) {
    return { public: true, media: true, url: `${platformOrigin}${pathname.replace('/api/platform/', '/api/')}` }
  }
  if (/^\/api\/platform\/[^/].*$/.test(pathname)) {
    return { public: false, url: `${platformOrigin}${url.pathname.replace('/api/platform/', '/api/')}${url.search}` }
  }
  return null
}

export async function proxyRequest(request, {
  fetchImpl = fetch, cache, waitUntil,
  platformOrigin = PLATFORM_ORIGIN, publicOrigin = PUBLIC_ORIGIN, rehearsal = false,
  environment = 'production'
} = {}) {
  const url = new URL(request.url)
  const route = resolveRoute(url, { platformOrigin, publicOrigin, rehearsal })
  if (!route) return problem(404, 'API_ROUTE_NOT_FOUND', 'Unknown API route.')
  if (!METHODS.has(request.method) || (route.public && !['GET', 'HEAD'].includes(request.method))) {
    return problem(405, 'METHOD_NOT_ALLOWED', 'This API route does not accept that method.')
  }
  if (!READ_METHODS.has(request.method)) {
    // Preserve Origin downstream too: the backend must explicitly allow the preview domain.
    if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return problem(403, 'ORIGIN_NOT_ALLOWED', 'Open this action from the same website.')
    }
  }

  // Key the published representation by its upstream URL, independently of the
  // preview hostname and the Pages route that executed this function.
  const cacheKey = new Request(route.url)
  const canReadCache = route.public && !route.volatile && !route.noCache && request.method === 'GET' && cache
  if (canReadCache) {
    try {
      const hit = await cache.match(cacheKey)
      if (hit?.ok) {
        return snapshotResponse(request, cachedResponse(request, hit), route)
      }
    } catch { /* Expired or unavailable node cache: use the published origin. */ }
  }

  const headers = new Headers()
  for (const name of FORWARD_HEADERS) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name))
  }
  if (route.public) {
    // Published snapshots are identical for everyone; never send user credentials.
    headers.delete('origin')
    headers.delete('referer')
    if (request.headers.has('if-none-match')) headers.set('if-none-match', request.headers.get('if-none-match'))
  } else {
    for (const name of ['cookie', 'authorization']) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name))
    }
    headers.set('Cache-Control', 'no-store')
  }
  headers.set('accept-encoding', 'identity')

  const registrationImage = (request.method === 'POST' && /^\/api\/platform\/seasons\/[^/]+\/registration\/drafts$/.test(url.pathname))
    || (request.method === 'PATCH' && /^\/api\/platform\/seasons\/[^/]+\/registration\/drafts\/[^/]+$/.test(url.pathname))
    || (request.method === 'PUT' && /^\/api\/platform\/seasons\/[^/]+\/registration\/drafts\/[^/]+\/logo$/.test(url.pathname))
  const openingEvidence = request.method === 'POST' && /^\/api\/platform\/weekly-live-rooms\/[^/]+\/opening\/evidence$/.test(url.pathname)
  const bodyLimit = openingEvidence ? 8 * MAX_BODY_BYTES : registrationImage || (request.method === 'PATCH' && url.pathname === '/api/platform/me/profile') ? 3 * MAX_BODY_BYTES : MAX_BODY_BYTES
  let body
  if (!READ_METHODS.has(request.method)) {
    if (Number(request.headers.get('content-length')) > bodyLimit) {
      return problem(413, 'REQUEST_TOO_LARGE', 'Request exceeds the size limit.')
    }
    body = await request.arrayBuffer()
    if (body.byteLength > bodyLimit) return problem(413, 'REQUEST_TOO_LARGE', 'Request exceeds the size limit.')
  }

  let upstream
  try {
    upstream = await fetchImpl(route.url, {
      method: request.method, headers, body, redirect: 'manual',
      eo: { timeoutSetting: { connectTimeout: 15000, readTimeout: 15000, writeTimeout: 15000 } }
    })
  } catch (error) {
    const timedOut = /timeout|timed out/i.test(`${error?.name} ${error?.message} ${error?.cause?.code} ${error?.cause?.message}`)
    const outcomeUnknown = !READ_METHODS.has(request.method)
    return problem(timedOut ? 504 : 502, timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      outcomeUnknown ? '提交结果尚未确认，请先刷新相关状态后核对。' : '账号服务暂时无法连接，请稍后重试。', outcomeUnknown)
  }

  // API redirects are unexpected. Never follow them with session credentials.
  const notModified = route.public && ['GET', 'HEAD'].includes(request.method) && upstream.status === 304
  if (upstream.status >= 300 && upstream.status < 400 && !notModified) {
    return problem(502, 'UPSTREAM_REDIRECT', '账号服务返回异常，请先刷新相关状态后核对。', !READ_METHODS.has(request.method))
  }
  if (request.method !== 'HEAD' && upstream.status !== 204 && /text\/html/i.test(upstream.headers.get('content-type') || '')) {
    return problem(502, 'UPSTREAM_INVALID_RESPONSE', '账号服务返回异常，请先刷新相关状态后核对。', !READ_METHODS.has(request.method))
  }
  // Clone Headers directly so separate Set-Cookie values stay separate.
  const responseHeaders = new Headers(upstream.headers)
  for (const name of ['connection', 'keep-alive', 'transfer-encoding', 'content-length', 'content-encoding', 'server', 'access-control-allow-origin', 'access-control-allow-credentials']) {
    responseHeaders.delete(name)
  }
  responseHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  responseHeaders.set('X-Content-Type-Options', 'nosniff')
  responseHeaders.set('X-Fries-Backend', route.media ? `${environment}-media` : route.public ? 'published-snapshots' : environment)
  if (!route.public || route.volatile || route.noCache || (!upstream.ok && !notModified)) responseHeaders.set('Cache-Control', 'private, no-store')
  if (route.public) {
    responseHeaders.delete('set-cookie')
    // Both variants were normalized upstream: no Origin, identity encoding.
    const vary = (responseHeaders.get('vary') || '').split(',').map(value => value.trim())
      .filter(value => value && !/^(origin|accept-encoding)$/i.test(value))
    if (vary.length) responseHeaders.set('vary', vary.join(', '))
    else responseHeaders.delete('vary')
  }
  responseHeaders.set('X-Fries-Public-Cache', route.public && !route.volatile && !route.noCache ? (cache ? 'MISS' : 'UNAVAILABLE') : 'BYPASS')
  const response = new Response(request.method === 'HEAD' || upstream.status === 204 || notModified ? null : upstream.body, {
    status: upstream.status, statusText: upstream.statusText, headers: responseHeaders
  })
  const cacheControl = responseHeaders.get('cache-control') || ''
  if (canReadCache && upstream.status === 200 && /\bpublic\b/i.test(cacheControl)
    && !/private|no-store|no-cache/i.test(cacheControl) && !upstream.headers.has('set-cookie')
    && (route.media ? /^image\/webp$/i : /application\/json/i).test(responseHeaders.get('content-type') || '')) {
    const report = url.pathname.endsWith('/report')
    const task = cache.put(cacheKey, response.clone()).then(() => {
      if (report) response.headers.set('X-Fries-Cache-Write', 'completed')
    }).catch(error => {
      if (report) response.headers.set('X-Fries-Cache-Write', `failed-${String(error?.message || '').match(/\b[45]\d\d\b/)?.[0] || 'runtime'}`)
      // Operational diagnostics only; never log credentials, request headers or URLs.
      console.warn('PUBLIC_SNAPSHOT_CACHE_WRITE_FAILED', {
        path: url.pathname,
        name: error?.name,
        message: String(error?.message || '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 200)
      })
    })
    if (report) await task
    else if (waitUntil) waitUntil(task)
    else await task
  }
  return snapshotResponse(request, response, route)
}

// Keep the geo response inside the existing catch-all entry. Importing another
// EdgeOne handler here caused the deployed proxy to use that handler instead.
export function localeResponse({ request }) {
  const method = request.method.toUpperCase()
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
  }
  if (!['GET', 'HEAD'].includes(method)) return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } })
  const raw = String(request.eo?.geo?.countryCodeAlpha2 || '').trim().toUpperCase()
  const countryCode = /^[A-Z]{2}$/.test(raw) ? raw : null
  return new Response(method === 'HEAD' ? null : JSON.stringify({ countryCode }), { headers })
}

export default function onRequest(context) {
  if (new URL(context.request.url).pathname === '/api/release') {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    if (!['GET', 'HEAD'].includes(context.request.method)) return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } })
    return new Response(context.request.method === 'HEAD' ? null : JSON.stringify(RELEASE_IDENTITY || { error: 'RELEASE_IDENTITY_UNAVAILABLE' }), { status: RELEASE_IDENTITY ? 200 : 503, headers })
  }
  if (new URL(context.request.url).pathname === '/api/locale') return localeResponse(context)
  const platformOrigin = context.env?.FRIES_PLATFORM_ORIGIN ?? PLATFORM_ORIGIN
  if (!['https://admin.fries-cup.com', 'https://test-admin.fries-cup.com'].includes(platformOrigin)) {
    return problem(503, 'PLATFORM_ORIGIN_INVALID', '账号服务配置暂时不可用。')
  }
  return proxyRequest(context.request, {
    platformOrigin,
    environment: platformOrigin === PUBLIC_ORIGIN ? 'production' : 'preview',
    cache: globalThis.caches?.default,
    waitUntil: context.waitUntil ? task => context.waitUntil(task) : undefined
  })
}
