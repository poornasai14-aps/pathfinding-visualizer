import { useState, useCallback, useRef } from "react";

const ROWS = 25;
const COLS = 55;
const INIT_START = [12, 5];
const INIT_END = [12, 49];
const T = { EMPTY: 0, WALL: 1, START: 2, END: 3, VISITED: 4, PATH: 5, WEIGHT: 6 };

const mkGrid = (sr=INIT_START[0], sc=INIT_START[1], er=INIT_END[0], ec=INIT_END[1]) =>
  Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      r, c,
      type: r===sr&&c===sc ? T.START : r===er&&c===ec ? T.END : T.EMPTY,
      dist: Infinity, h: 0, parent: null, weight: 1,
    }))
  );

const dirs4 = [[-1,0],[1,0],[0,-1],[0,1]];
const dirs8 = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

const nbrs = (grid, node, diag) =>
  (diag ? dirs8 : dirs4)
    .map(([dr,dc]) => grid[node.r+dr]?.[node.c+dc])
    .filter(n => n && n.type !== T.WALL);

const reconstruct = node => {
  const p = []; let c = node;
  while (c) { p.unshift(c); c = c.parent; }
  return p.length > 1 ? p : [];
};

function bfs(grid, sr, sc, er, ec, diag) {
  const g = grid.map(r => r.map(c => ({...c, dist: Infinity, parent: null})));
  const [s, e] = [g[sr][sc], g[er][ec]];
  const q = [s], seen = new Set([`${sr},${sc}`]), order = [];
  while (q.length) {
    const cur = q.shift(); order.push(cur);
    if (cur === e) break;
    for (const nb of nbrs(g, cur, diag)) {
      const k = `${nb.r},${nb.c}`;
      if (!seen.has(k)) { seen.add(k); nb.parent = cur; q.push(nb); }
    }
  }
  return { order, path: reconstruct(e) };
}

function dfs(grid, sr, sc, er, ec, diag) {
  const g = grid.map(r => r.map(c => ({...c, dist: Infinity, parent: null})));
  const e = g[er][ec];
  const stack = [g[sr][sc]], seen = new Set([`${sr},${sc}`]), order = [];
  while (stack.length) {
    const cur = stack.pop(); order.push(cur);
    if (cur === e) break;
    for (const nb of nbrs(g, cur, diag)) {
      const k = `${nb.r},${nb.c}`;
      if (!seen.has(k)) { seen.add(k); nb.parent = cur; stack.push(nb); }
    }
  }
  return { order, path: reconstruct(e) };
}

function dijkstra(grid, sr, sc, er, ec, diag) {
  const g = grid.map(r => r.map(c => ({...c, dist: Infinity, parent: null})));
  const [s, e] = [g[sr][sc], g[er][ec]]; s.dist = 0;
  const pq = [s], vis = new Set(), order = [];
  while (pq.length) {
    pq.sort((a,b) => a.dist - b.dist);
    const cur = pq.shift(); const k = `${cur.r},${cur.c}`;
    if (vis.has(k)) continue; vis.add(k); order.push(cur);
    if (cur === e) break;
    for (const nb of nbrs(g, cur, diag)) {
      const nd = cur.dist + (nb.weight||1);
      if (nd < nb.dist) { nb.dist = nd; nb.parent = cur; pq.push(nb); }
    }
  }
  return { order, path: reconstruct(e) };
}

function aStar(grid, sr, sc, er, ec, diag) {
  const mh = (a,b) => diag ? Math.max(Math.abs(a.r-b.r),Math.abs(a.c-b.c)) : Math.abs(a.r-b.r)+Math.abs(a.c-b.c);
  const g = grid.map(r => r.map(c => ({...c, dist: Infinity, h:0, parent: null})));
  const [s, e] = [g[sr][sc], g[er][ec]]; s.dist=0; s.h=mh(s,e);
  const open=[s], closed=new Set(), order=[];
  while (open.length) {
    open.sort((a,b) => (a.dist+a.h)-(b.dist+b.h));
    const cur = open.shift(); const k=`${cur.r},${cur.c}`;
    if (closed.has(k)) continue; closed.add(k); order.push(cur);
    if (cur===e) break;
    for (const nb of nbrs(g, cur, diag)) {
      if (closed.has(`${nb.r},${nb.c}`)) continue;
      const nd = cur.dist + (nb.weight||1);
      if (nd < nb.dist) { nb.dist=nd; nb.h=mh(nb,e); nb.parent=cur; open.push(nb); }
    }
  }
  return { order, path: reconstruct(e) };
}

function greedy(grid, sr, sc, er, ec, diag) {
  const mh = (a,b) => Math.abs(a.r-b.r)+Math.abs(a.c-b.c);
  const g = grid.map(r => r.map(c => ({...c, h:0, parent: null})));
  const [s, e] = [g[sr][sc], g[er][ec]]; s.h=mh(s,e);
  const open=[s], closed=new Set(), order=[];
  while (open.length) {
    open.sort((a,b) => a.h-b.h);
    const cur = open.shift(); const k=`${cur.r},${cur.c}`;
    if (closed.has(k)) continue; closed.add(k); order.push(cur);
    if (cur===e) break;
    for (const nb of nbrs(g, cur, diag)) {
      if (closed.has(`${nb.r},${nb.c}`)) continue;
      nb.h=mh(nb,e); nb.parent=cur; open.push(nb);
    }
  }
  return { order, path: reconstruct(e) };
}

function genMaze(rows, cols) {
  const walls = new Set();
  const add = (r,c) => { if (r>0&&r<rows-1&&c>0&&c<cols-1) walls.add(`${r},${c}`); };
  function divide(r1,c1,r2,c2,horiz) {
    if (r2-r1<2||c2-c1<2) return;
    if (horiz) {
      const wr = r1+1+Math.floor(Math.random()*(r2-r1-1));
      const pass = c1+Math.floor(Math.random()*(c2-c1+1));
      for (let c=c1;c<=c2;c++) if (c!==pass) add(wr,c);
      divide(r1,c1,wr-1,c2,(c2-c1)>(wr-1-r1));
      divide(wr+1,c1,r2,c2,(c2-c1)>(r2-wr-1));
    } else {
      const wc = c1+1+Math.floor(Math.random()*(c2-c1-1));
      const pass = r1+Math.floor(Math.random()*(r2-r1+1));
      for (let r=r1;r<=r2;r++) if (r!==pass) add(r,wc);
      divide(r1,c1,r2,wc-1,(wc-1-c1)<(r2-r1));
      divide(r1,wc+1,r2,c2,(c2-wc)<(r2-r1));
    }
  }
  divide(0,0,rows-1,cols-1,cols>rows);
  return walls;
}

const ALGOS = {
  "A*":       { fn: aStar,    desc: "Optimal + Heuristic", guaranteed: true,  color: "#00ffaa", icon: "★" },
  "DIJKSTRA": { fn: dijkstra, desc: "Weighted Shortest",   guaranteed: true,  color: "#60a5fa", icon: "◈" },
  "BFS":      { fn: bfs,      desc: "Unweighted Shortest", guaranteed: true,  color: "#fbbf24", icon: "◉" },
  "GREEDY":   { fn: greedy,   desc: "Fast, Not Optimal",   guaranteed: false, color: "#f472b6", icon: "◆" },
  "DFS":      { fn: dfs,      desc: "Explores Deep First", guaranteed: false, color: "#fb923c", icon: "▸" },
};

export default function App() {
  const [grid, setGrid] = useState(() => mkGrid());
  const [start, setStart] = useState(INIT_START);
  const [end, setEnd] = useState(INIT_END);
  const [algo, setAlgo] = useState("A*");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false); // eslint-disable-line no-unused-vars
  const [diagonal, setDiagonal] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [stats, setStats] = useState(null);
  const [drawMode, setDrawMode] = useState("wall");
  const [mouseDown, setMouseDown] = useState(false);
  const [dragging, setDragging] = useState(null);
  const timeouts = useRef([]);

  const clearTOs = () => { timeouts.current.forEach(clearTimeout); timeouts.current = []; };

  const resetGrid = useCallback(() => {
    clearTOs(); setRunning(false); setDone(false); setStats(null);
    setGrid(mkGrid()); setStart(INIT_START); setEnd(INIT_END);
  }, []);

  const clearPath = useCallback(() => {
    clearTOs(); setRunning(false); setDone(false); setStats(null);
    setGrid(p => p.map(row => row.map(c => ({
      ...c,
      type: [T.VISITED, T.PATH].includes(c.type) ? (c.weight>1?T.WEIGHT:T.EMPTY) : c.type,
      dist: Infinity, h: 0, parent: null,
    }))));
  }, []);

  const doMaze = useCallback(() => {
    clearTOs(); setRunning(false); setDone(false); setStats(null);
    const walls = genMaze(ROWS, COLS);
    setGrid(p => p.map(row => row.map(cell => {
      const k = `${cell.r},${cell.c}`;
      const isS = cell.r===start[0]&&cell.c===start[1];
      const isE = cell.r===end[0]&&cell.c===end[1];
      if (isS) return {...cell, type:T.START, dist:Infinity, h:0, parent:null};
      if (isE) return {...cell, type:T.END, dist:Infinity, h:0, parent:null};
      return {...cell, type:walls.has(k)?T.WALL:T.EMPTY, dist:Infinity, h:0, parent:null, weight:1};
    })));
  }, [start, end]);

  const runAlgo = useCallback(() => {
    if (running) return;
    clearTOs(); setRunning(true); setDone(false); setStats(null);
    // snapshot current walls/weights
    setGrid(prev => {
      const snap = prev.map(r => r.map(c => ({...c, dist:Infinity, h:0, parent:null,
        type:[T.VISITED,T.PATH].includes(c.type)?T.EMPTY:c.type})));
      const info = ALGOS[algo];
      const { order, path } = info.fn(snap, start[0], start[1], end[0], end[1], diagonal);
      const delay = Math.max(2, 55 - speed*5);

      order.forEach((node, i) => {
        const t = setTimeout(() => {
          setGrid(g => {
            if ([T.START,T.END,T.WALL].includes(g[node.r][node.c].type)) return g;
            const ng = g.map(r=>[...r]);
            ng[node.r] = [...ng[node.r]];
            ng[node.r][node.c] = {...ng[node.r][node.c], type: T.VISITED};
            return ng;
          });
        }, i*delay);
        timeouts.current.push(t);
      });

      const ps = order.length * delay;
      path.forEach((node, i) => {
        const t = setTimeout(() => {
          setGrid(g => {
            if ([T.START,T.END,T.WALL].includes(g[node.r][node.c].type)) return g;
            const ng = g.map(r=>[...r]);
            ng[node.r] = [...ng[node.r]];
            ng[node.r][node.c] = {...ng[node.r][node.c], type: T.PATH};
            return ng;
          });
        }, ps + i*delay*3);
        timeouts.current.push(t);
      });

      const ft = setTimeout(() => {
        setRunning(false); setDone(true);
        setStats({ visited: order.length, pathLen: path.length>1?path.length-1:0, found: path.length>1 });
      }, ps + path.length*delay*3 + 200);
      timeouts.current.push(ft);
      return prev;
    });
  }, [algo, running, start, end, diagonal, speed]);

  const applyDraw = (r, c) => {
    setGrid(prev => {
      const cell = prev[r][c];
      if ([T.START,T.END].includes(cell.type)) return prev;
      const ng = prev.map(row=>[...row]);
      ng[r] = [...ng[r]];
      if (drawMode==='wall') ng[r][c] = {...cell, type: cell.type===T.WALL?T.EMPTY:T.WALL, weight:1};
      else if (drawMode==='erase') ng[r][c] = {...cell, type:T.EMPTY, weight:1};
      else ng[r][c] = {...cell, type:cell.type===T.WEIGHT?T.EMPTY:T.WEIGHT, weight:5};
      return ng;
    });
  };

  const onCellDown = (r, c) => {
    if (running) return;
    const t = grid[r][c].type;
    if (t===T.START) { setDragging('start'); return; }
    if (t===T.END) { setDragging('end'); return; }
    setMouseDown(true); applyDraw(r,c);
  };

  const onCellEnter = (r, c) => {
    if (running) return;
    if (dragging) {
      const isSt = dragging==='start';
      const other = isSt ? end : start;
      if (r===other[0]&&c===other[1]) return;
      setGrid(prev => prev.map(row => row.map(cell => {
        if (cell.r===r&&cell.c===c) return {...cell, type:isSt?T.START:T.END};
        if (isSt&&cell.r===start[0]&&cell.c===start[1]) return {...cell, type:T.EMPTY};
        if (!isSt&&cell.r===end[0]&&cell.c===end[1]) return {...cell, type:T.EMPTY};
        return cell;
      })));
      if (isSt) setStart([r,c]); else setEnd([r,c]);
      return;
    }
    if (mouseDown) applyDraw(r,c);
  };

  const ac = ALGOS[algo].color;

  const cellStyle = (cell) => {
    const base = {
      width:"17px", height:"20px",
      borderRight:"0.5px solid #060c14",
      borderBottom:"0.5px solid #060c14",
      boxSizing:"border-box",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"9px", transition:"background 0.08s",
      position:"relative",
    };
    switch(cell.type) {
      case T.WALL:    return {...base, background:"#0f1623", borderColor:"#111827"};
      case T.START:   return {...base, background:`linear-gradient(135deg,#4ade80,#16a34a)`, borderRadius:"3px"};
      case T.END:     return {...base, background:`linear-gradient(135deg,#f87171,#dc2626)`,
                        clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)"};
      case T.PATH:    return {...base, background:`linear-gradient(135deg,#fde68a,#f59e0b)`,
                        boxShadow:`0 0 6px #f59e0b88`};
      case T.VISITED: return {...base, background:`${ac}2a`, borderColor:`${ac}11`};
      case T.WEIGHT:  return {...base, background:`#4c1d9544`};
      default:        return {...base, background:"transparent"};
    }
  };

  return (
    <div
      onMouseUp={()=>{setMouseDown(false);setDragging(null);}}
      onMouseLeave={()=>{setMouseDown(false);setDragging(null);}}
      style={{
        minHeight:"100vh", background:"#030712",
        fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace",
        padding:"14px", display:"flex", flexDirection:"column",
        alignItems:"center", gap:"10px", userSelect:"none",
      }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        @keyframes visitPulse { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes pathPop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px var(--c)} 50%{box-shadow:0 0 18px var(--c)} }
        .visited-anim { animation: visitPulse 0.25s ease forwards; }
        .path-anim { animation: pathPop 0.2s ease forwards; }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        button { transition: all 0.15s; }
        button:hover:not(:disabled) { filter: brightness(1.25); transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0px); }
      `}</style>

      {/* Title */}
      <div style={{textAlign:"center"}} className="fade-up">
        <div style={{display:"flex",alignItems:"center",gap:"10px",justifyContent:"center",marginBottom:"2px"}}>
          <div style={{height:"28px",width:"3px",background:`linear-gradient(${ac},transparent)`,borderRadius:"2px"}}/>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:800,letterSpacing:"4px",color:"#f1f5f9",textTransform:"uppercase"}}>
            Pathfinding Visualizer
          </h1>
          <div style={{height:"28px",width:"3px",background:`linear-gradient(${ac},transparent)`,borderRadius:"2px"}}/>
        </div>
        <p style={{margin:0,fontSize:"9px",color:"#334155",letterSpacing:"3px"}}>
          DRAG ▶ START  •  DRAG ◆ END  •  CLICK/DRAG GRID TO DRAW  •  5 ALGORITHMS
        </p>
      </div>

      {/* Algorithm selector */}
      <div style={{display:"flex",gap:"5px",flexWrap:"wrap",justifyContent:"center"}}>
        {Object.entries(ALGOS).map(([key,info])=>(
          <button key={key} onClick={()=>!running&&setAlgo(key)} style={{
            padding:"7px 12px", borderRadius:"5px",
            border:`1.5px solid ${algo===key?info.color:"#1e293b"}`,
            background: algo===key?`${info.color}15`:"#0a0f1a",
            color: algo===key?info.color:"#475569",
            cursor:"pointer", fontSize:"10px", fontWeight:700,
            letterSpacing:"1px", fontFamily:"inherit",
          }}>
            <span style={{marginRight:"5px"}}>{info.icon}</span>{key}
            {algo===key&&<span style={{marginLeft:"6px",fontSize:"8px",opacity:0.7,display:"inline-block",
              padding:"1px 5px",borderRadius:"3px",
              background:info.guaranteed?"#16a34a22":"#dc262622",
              color:info.guaranteed?"#4ade80":"#f87171"
            }}>{info.guaranteed?"OPTIMAL":"NOT OPTIMAL"}</span>}
          </button>
        ))}
      </div>

      {/* Info bar */}
      <div style={{
        background:"#0a0f1a", border:`1px solid ${ac}22`,
        borderRadius:"6px", padding:"7px 14px",
        display:"flex", alignItems:"center", gap:"8px",
        fontSize:"11px", maxWidth:"900px"
      }}>
        <span style={{color:ac,fontWeight:700}}>{ALGOS[algo].desc}</span>
        <span style={{color:"#1e293b"}}>|</span>
        <span style={{color:"#475569",fontSize:"10px"}}>
          {ALGOS[algo].guaranteed?"✓ Guarantees shortest path":"✗ Does not guarantee shortest path"}
        </span>
        {stats && <>
          <span style={{color:"#1e293b",margin:"0 4px"}}>|</span>
          <span style={{color:ac}}>{stats.visited} nodes visited</span>
          <span style={{color:"#1e293b"}}>|</span>
          <span style={{color:"#fbbf24"}}>path: {stats.pathLen||"—"}</span>
          <span style={{color:"#1e293b"}}>|</span>
          <span style={{color:stats.found?"#4ade80":"#f87171",fontWeight:700}}>
            {stats.found?"PATH FOUND ✓":"NO PATH FOUND ✗"}
          </span>
        </>}
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"center",alignItems:"center"}}>
        <button onClick={runAlgo} disabled={running} style={{
          padding:"9px 24px", borderRadius:"5px", border:"none",
          background: running?"#1e293b":ac, color:running?"#475569":"#000",
          cursor:running?"not-allowed":"pointer", fontWeight:800,
          fontSize:"11px", letterSpacing:"2px", fontFamily:"inherit",
          boxShadow: running?"none":`0 0 20px ${ac}55`,
        }}>{running?"⟳ RUNNING...":"▶ VISUALIZE"}</button>

        <button onClick={doMaze} disabled={running} style={{
          padding:"9px 14px", borderRadius:"5px",
          border:"1px solid #4c1d9544", background:"#0a0f1a",
          color:"#a78bfa", cursor:"pointer", fontSize:"10px",
          fontFamily:"inherit", letterSpacing:"1px",
        }}>⊞ MAZE</button>

        <button onClick={clearPath} disabled={running} style={{
          padding:"9px 12px", borderRadius:"5px",
          border:"1px solid #1e293b", background:"#0a0f1a",
          color:"#475569", cursor:"pointer", fontSize:"10px",
          fontFamily:"inherit",
        }}>CLEAR PATH</button>

        <button onClick={resetGrid} disabled={running} style={{
          padding:"9px 12px", borderRadius:"5px",
          border:"1px solid #1e293b", background:"#0a0f1a",
          color:"#475569", cursor:"pointer", fontSize:"10px",
          fontFamily:"inherit",
        }}>RESET</button>

        <div style={{display:"flex",gap:"3px",background:"#0a0f1a",padding:"3px",borderRadius:"5px",border:"1px solid #1e293b"}}>
          {[["wall","⬛ WALL"],["erase","🧹 ERASE"],["weight","⊕ WEIGHT"]].map(([m,lb])=>(
            <button key={m} onClick={()=>setDrawMode(m)} style={{
              padding:"6px 9px", borderRadius:"3px", border:"none",
              background: drawMode===m?"#1e293b":"transparent",
              color: drawMode===m?"#f1f5f9":"#475569",
              cursor:"pointer", fontSize:"9px", fontFamily:"inherit",
            }}>{lb}</button>
          ))}
        </div>

        <button onClick={()=>setDiagonal(d=>!d)} style={{
          padding:"9px 12px", borderRadius:"5px",
          border:`1px solid ${diagonal?ac+"44":"#1e293b"}`,
          background: diagonal?`${ac}0f`:"#0a0f1a",
          color: diagonal?ac:"#475569",
          cursor:"pointer", fontSize:"10px", fontFamily:"inherit",
        }}>⟋ DIAGONAL {diagonal?"ON":"OFF"}</button>

        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"9px",color:"#334155",letterSpacing:"1px"}}>⚡</span>
          <input type="range" min="1" max="11" value={speed}
            onChange={e=>setSpeed(+e.target.value)}
            style={{width:"65px",accentColor:ac}}/>
          <span style={{fontSize:"9px",color:"#334155"}}>{speed}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display:"grid",
        gridTemplateRows:`repeat(${ROWS},20px)`,
        border:`1px solid #0f172a`,
        borderRadius:"6px", overflow:"hidden",
        cursor: running?"not-allowed": dragging?"grabbing":"crosshair",
        boxShadow:`0 0 60px ${ac}08, 0 20px 60px #00000080`,
      }}>
        {grid.map((row,r)=>(
          <div key={r} style={{display:"flex"}}>
            {row.map((cell,c)=>(
              <div key={c}
                onMouseDown={()=>onCellDown(r,c)}
                onMouseEnter={()=>onCellEnter(r,c)}
                className={cell.type===T.VISITED?"visited-anim":cell.type===T.PATH?"path-anim":""}
                style={cellStyle(cell)}>
                {cell.type===T.START&&<span style={{color:"#fff",fontSize:"8px",fontWeight:800}}>▶</span>}
                {cell.type===T.END&&<span style={{color:"#fff",fontSize:"8px",fontWeight:800}}>◆</span>}
                {cell.type===T.WEIGHT&&<span style={{color:"#a78bfa",fontSize:"8px"}}>5</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:"12px",flexWrap:"wrap",justifyContent:"center"}}>
        {[
          {bg:"linear-gradient(135deg,#4ade80,#16a34a)",label:"Start (drag)",r:"3px"},
          {bg:"linear-gradient(135deg,#f87171,#dc2626)",label:"End (drag)",clip:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)"},
          {bg:"#0f1623",border:"1px solid #1e293b",label:"Wall"},
          {bg:`${ac}2a`,label:"Visited"},
          {bg:"linear-gradient(135deg,#fde68a,#f59e0b)",label:"Shortest Path"},
          {bg:"#4c1d9544",label:"Weight ×5"},
        ].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"12px",height:"12px",background:l.bg,border:l.border||"none",
              borderRadius:l.r||"2px",clipPath:l.clip,flexShrink:0}}/>
            <span style={{fontSize:"10px",color:"#475569"}}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
