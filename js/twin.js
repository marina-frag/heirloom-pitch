// Digital twin hero: a real field (bottom) mirrored by a live soil-moisture twin (top).
// Sensor values are simulated for the pitch.
const host = document.getElementById('twin');

async function start() {
  let THREE;
  try { THREE = await import('three'); } catch (e) { host.classList.add('nogl'); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { host.classList.add('nogl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xe6f2e6, 0x2a2015, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 6); scene.add(sun);

  const world = new THREE.Group(); scene.add(world);
  const TWIN_Y = 3.1;
  const plots = [
    { cx: -3.5, color: 0x4f8a3a, crop: 'cone', name: 'A' },
    { cx: 0, color: 0xc9a54a, crop: 'stalk', name: 'B' },
    { cx: 3.5, color: 0x7a5a3c, crop: null, name: 'C' }
  ];
  const PW = 3.2, PD = 4.4;

  // soil slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.45, 5.4), new THREE.MeshLambertMaterial({ color: 0x4a3828 }));
  slab.position.y = -0.23; world.add(slab);

  const sensors = [];
  plots.forEach(p => {
    const plot = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.08, PD), new THREE.MeshLambertMaterial({ color: p.color }));
    plot.position.set(p.cx, 0.04, 0); world.add(plot);
    if (p.crop) {
      const geo = p.crop === 'cone' ? new THREE.ConeGeometry(0.09, 0.32, 6) : new THREE.CylinderGeometry(0.025, 0.035, 0.34, 5);
      const mat = new THREE.MeshLambertMaterial({ color: p.crop === 'cone' ? 0x7cc25a : 0xe8c766 });
      const rows = p.crop === 'cone' ? 6 : 9, cols = p.crop === 'cone' ? 12 : 16;
      const inst = new THREE.InstancedMesh(geo, mat, rows * cols);
      const m = new THREE.Matrix4(); let k = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        m.makeTranslation(p.cx - PW / 2 + 0.3 + r * (PW - 0.6) / (rows - 1), 0.24, -PD / 2 + 0.3 + c * (PD - 0.6) / (cols - 1));
        inst.setMatrixAt(k++, m);
      }
      world.add(inst);
    }
    sensors.push({ x: p.cx - 0.75, z: -1.05, plot: p }, { x: p.cx + 0.75, z: 1.05, plot: p });
  });

  // soil nodes
  const postMat = new THREE.MeshLambertMaterial({ color: 0xe9ebe4 });
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const panelMat = new THREE.MeshLambertMaterial({ color: 0x1b2a44 });
  sensors.forEach(s => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), postMat);
    post.position.set(s.x, 0.4, s.z); world.add(post);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.16), headMat);
    head.position.set(s.x, 0.82, s.z); world.add(head);
    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.18), panelMat);
    pan.position.set(s.x, 0.92, s.z); pan.rotation.x = -0.35; world.add(pan);
    s.top = 0.95;
  });

  // weather node (shared)
  const wx = { x: 0, z: -3.15 };
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.5, 8), postMat); mast.position.set(wx.x, 0.75, wx.z); world.add(mast);
  const wbox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.22), headMat); wbox.position.set(wx.x, 1.2, wx.z); world.add(wbox);
  const vane = new THREE.Group(); vane.position.set(wx.x, 1.58, wx.z); world.add(vane);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.02), postMat); arm.rotation.y = i * Math.PI * 2 / 3; arm.position.set(Math.cos(i * 2.094) * 0.17, 0, -Math.sin(i * 2.094) * 0.17); vane.add(arm);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), headMat); cup.position.set(Math.cos(i * 2.094) * 0.34, 0, -Math.sin(i * 2.094) * 0.34); vane.add(cup);
  }
  sensors.push({ x: wx.x, z: wx.z, top: 1.62, weather: true });

  // gateway
  const gw = { x: 6.1, z: -2.4 };
  const gmast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 8), postMat); gmast.position.set(gw.x, 1.2, gw.z); world.add(gmast);
  const gbox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.2), headMat); gbox.position.set(gw.x, 1.1, gw.z); world.add(gbox);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), postMat); ant.position.set(gw.x, 2.75, gw.z); world.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x5fd4e8 })); led.position.set(gw.x, 3.12, gw.z); world.add(led);

  // twin layer
  const CYAN = 0x5fd4e8;
  const dry = new THREE.Color(0xd39b45), mid = new THREE.Color(0x6fbf7f), wet = new THREE.Color(0x2f86d6);
  const twinPlanes = plots.map(p => {
    const g = new THREE.PlaneGeometry(PW, PD, 22, 30); g.rotateX(-Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    mesh.position.set(p.cx, TWIN_Y, 0); world.add(mesh);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PW, 0.001, PD)), new THREE.LineBasicMaterial({ color: CYAN }));
    edge.position.copy(mesh.position); world.add(edge);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.PlaneGeometry(PW, PD, 8, 11).rotateX(-Math.PI / 2)), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18 }));
    wire.position.set(p.cx, TWIN_Y + 0.01, 0); world.add(wire);
    return { mesh, p };
  });
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(11.2, 0.001, 5.4)), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 }));
  frame.position.y = TWIN_Y; world.add(frame);

  // data streams: line + rising packets per sensor, ring pulse at ground
  const lineMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.22 });
  const pktGeo = new THREE.SphereGeometry(0.055, 10, 8);
  const pktMat = new THREE.MeshBasicMaterial({ color: CYAN });
  const ringGeo = new THREE.RingGeometry(0.42, 0.5, 40); ringGeo.rotateX(-Math.PI / 2);
  const streams = sensors.map((s, i) => {
    const pts = [new THREE.Vector3(s.x, s.top, s.z), new THREE.Vector3(s.x, TWIN_Y, s.z)];
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    const pk = [0, 1, 2].map(() => { const m = new THREE.Mesh(pktGeo, pktMat); world.add(m); return m; });
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0 }));
    ring.position.set(s.x, s.weather ? 0.02 : 0.1, s.z); world.add(ring);
    const tm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), pktMat); tm.position.set(s.x, TWIN_Y + 0.02, s.z); world.add(tm);
    return { s, pk, ring, off: i * 0.29 };
  });

  // labels
  const mkTag = (txt, cls) => { const d = document.createElement('div'); d.className = 'tag ' + (cls || ''); d.textContent = txt; host.appendChild(d); return d; };
  const tags = [
    { el: mkTag('Your field'), v: new THREE.Vector3(-5.6, 0.2, 2.7) },
    { el: mkTag('Digital twin', 't-twin'), v: new THREE.Vector3(-5.6, TWIN_Y, 2.7) },
    { el: mkTag('Gateway'), v: new THREE.Vector3(gw.x, 3.45, gw.z) },
    { el: mkTag('Weather node'), v: new THREE.Vector3(wx.x, 1.95, wx.z) }
  ];

  // simulated field state
  const moisture = (x, z, t, plot) => {
    let m = 0.5 + 0.18 * Math.sin(x * 1.25 + t * 0.35) * Math.cos(z * 0.85 - t * 0.27);
    if (plot.crop === null) m -= 0.2;
    const irr = Math.max(0, Math.sin(t * 0.22 + plot.cx));
    for (const s of sensors) if (!s.weather && s.plot === plot) {
      const d2 = (x - s.x) ** 2 + (z - s.z) ** 2;
      m += 0.32 * irr * Math.exp(-d2 / 0.9);
    }
    return Math.min(1, Math.max(0, m));
  };
  const col = new THREE.Color();
  function paint(t) {
    for (const tp of twinPlanes) {
      const pos = tp.mesh.geometry.attributes.position, c = tp.mesh.geometry.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + tp.p.cx, z = pos.getZ(i);
        const m = moisture(x, z, t, tp.p);
        if (m < 0.5) col.lerpColors(dry, mid, m / 0.5); else col.lerpColors(mid, wet, (m - 0.5) / 0.5);
        c.setXYZ(i, col.r, col.g, col.b);
      }
      c.needsUpdate = true;
    }
  }

  const hud = { m: document.getElementById('h-moist'), l: document.getElementById('h-leaf'), r: document.getElementById('h-risk'), i: document.getElementById('h-irr') };
  function updateHud(t) {
    const m = moisture(0.75, 1.05, t, plots[1]);
    hud.m.textContent = Math.round(12 + m * 26) + '% vol';
    const leaf = (4 + 4 * (0.5 + 0.5 * Math.sin(t * 0.13))).toFixed(1);
    hud.l.textContent = leaf + ' h';
    hud.r.textContent = leaf > 7 ? 'Elevated' : leaf > 5.5 ? 'Moderate' : 'Low';
    hud.i.textContent = m < 0.4 ? 'Today, 21:00' : m < 0.6 ? 'In 2 days' : 'Not needed';
  }

  // camera orbit with drag
  let angle = 0.62, tilt = 0.5, dragging = false, lastX = 0, lastY = 0;
  const target = new THREE.Vector3(0, 1.45, 0);
  host.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    angle -= (e.clientX - lastX) * 0.006; tilt = Math.min(0.85, Math.max(0.2, tilt + (e.clientY - lastY) * 0.003));
    lastX = e.clientX; lastY = e.clientY; if (reduce) render(0);
  });

  function placeCamera() {
    const W = host.clientWidth, H = host.clientHeight;
    const dist = W < 600 ? 21 : 16.5;
    camera.position.set(target.x + Math.sin(angle) * Math.cos(tilt) * dist, target.y + Math.sin(tilt) * dist, target.z + Math.cos(angle) * Math.cos(tilt) * dist);
    camera.lookAt(target);
    return [W, H];
  }
  const v = new THREE.Vector3();
  function render(t) {
    const [W, H] = placeCamera();
    renderer.render(scene, camera);
    for (const tg of tags) {
      v.copy(tg.v).project(camera);
      const show = v.z < 1 && W >= 420 || tg.el.textContent === 'Your field' || tg.el.textContent === 'Digital twin';
      tg.el.style.display = show ? '' : 'none';
      tg.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%,-50%)`;
    }
  }

  function resize() {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    if (reduce) { paint(4); updateHud(4); render(4); }
  }
  const twinRO = new ResizeObserver(resize); twinRO.observe(host);
  resize();

  let visible = true;
  const twinIO = new IntersectionObserver(e => { visible = e[0].isIntersecting; }); twinIO.observe(host);

  if (reduce) { paint(4); updateHud(4); render(4); return; }

  let lastPaint = -1, lastHud = -1;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = now / 1000;
    if (!dragging) angle += 0.0012;
    if (t - lastPaint > 0.08) { paint(t); lastPaint = t; }
    if (t - lastHud > 0.5) { updateHud(t); lastHud = t; }
    vane.rotation.y = t * 2.2;
    led.material.color.setHex(Math.sin(t * 6) > 0.6 ? 0xffffff : CYAN);
    for (const st of streams) {
      const span = TWIN_Y - st.s.top;
      st.pk.forEach((m, j) => {
        const ph = ((t * 0.32 + st.off + j / 3) % 1);
        m.position.set(st.s.x, st.s.top + ph * span, st.s.z);
        m.scale.setScalar(ph < 0.08 ? ph / 0.08 : ph > 0.92 ? (1 - ph) / 0.08 : 1);
      });
      const rp = ((t * 0.5 + st.off) % 1);
      st.ring.scale.setScalar(0.3 + rp * 1.6);
      st.ring.material.opacity = 0.55 * (1 - rp);
    }
    render(t);
  }
  requestAnimationFrame(loop);
}
start().catch(() => host.classList.add('nogl'));
