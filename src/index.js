const HTML = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arvento API Bağlantı Testi</title>
<style>
:root{--navy:#081d3a;--navy2:#102d57;--red:#d71920;--bg:#f4f6f9;--ink:#172033;--muted:#64748b}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(820px,100%);background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(8,29,58,.18);overflow:hidden}.head{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:22px 26px;border-bottom:4px solid var(--red)}h1{margin:0;font-size:23px}.head p{margin:7px 0 0;opacity:.78;font-size:13px}.body{padding:24px}.row{display:flex;gap:10px;flex-wrap:wrap}.field{flex:1;min-width:260px}label{display:block;font-size:12px;font-weight:800;margin-bottom:7px;color:var(--navy)}input{width:100%;height:44px;border:1px solid #d8dee8;border-radius:11px;padding:0 12px;font:inherit;outline:none}input:focus{border-color:var(--navy2);box-shadow:0 0 0 3px rgba(16,45,87,.1)}button{height:44px;border:0;border-radius:11px;background:var(--red);color:#fff;padding:0 18px;font-weight:900;cursor:pointer;align-self:flex-end}button:disabled{opacity:.55;cursor:wait}.note{font-size:12px;color:var(--muted);line-height:1.55;margin:14px 0 0}.result{margin-top:20px;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;display:none}.result.show{display:block}.result-head{padding:10px 14px;background:#eef2f7;font-size:12px;font-weight:900;color:var(--navy)}pre{margin:0;padding:15px;max-height:470px;overflow:auto;background:#0b1320;color:#d9e6f7;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.ok{color:#0f766e}.err{color:#b91c1c}
</style>
</head>
<body><div class="wrap"><div class="card">
<div class="head"><h1>Arvento API Bağlantı Testi</h1><p>Bu ekran sadece REST bağlantısını doğrulamak içindir. ST haritasında değişiklik yapmaz.</p></div>
<div class="body">
<div class="row"><div class="field"><label>Test Erişim Anahtarı</label><input id="key" type="password" autocomplete="off" placeholder="ARVENTO_TEST_KEY"></div><button id="btn">Arvento'yu Test Et</button></div>
<p class="note">Arvento kullanıcı adı ve şifresi bu ekrana yazılmaz. Cloudflare Secrets içinde tutulur. Test isteği yalnızca <b>GET /api/v1/vehicle</b> endpoint'ine gider ve herhangi bir Arvento verisini değiştirmez.</p>
<div id="result" class="result"><div id="rh" class="result-head">Sonuç</div><pre id="out"></pre></div>
</div></div></div>
<script>
const btn=document.getElementById('btn'),key=document.getElementById('key'),result=document.getElementById('result'),out=document.getElementById('out'),rh=document.getElementById('rh');
btn.addEventListener('click',async()=>{const k=key.value.trim();if(!k){alert('Test erişim anahtarını girin.');return}btn.disabled=true;btn.textContent='Test ediliyor...';result.classList.add('show');rh.textContent='Bağlantı kuruluyor';out.textContent='Arvento REST API yanıtı bekleniyor...';try{const r=await fetch('/api/arvento-test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k})});const j=await r.json();rh.innerHTML=j.ok?'<span class="ok">BAŞARILI</span>':'<span class="err">BAŞARISIZ</span>';out.textContent=JSON.stringify(j,null,2)}catch(e){rh.innerHTML='<span class="err">HATA</span>';out.textContent=String(e)}finally{btn.disabled=false;btn.textContent="Arvento'yu Test Et"}});
</script></body></html>`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    }
  });
}

function truncate(value, max = 12000) {
  const s = String(value ?? "");
  return s.length > max ? s.slice(0, max) + "\n... [yanit kisaltildi]" : s;
}

function safeJsonSample(data) {
  if (Array.isArray(data)) return { type: "array", count: data.length, sample: data.slice(0, 3) };
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    const copy = {};
    for (const k of keys.slice(0, 20)) {
      const v = data[k];
      copy[k] = Array.isArray(v) ? { count: v.length, sample: v.slice(0, 3) } : v;
    }
    return { type: "object", keys, sample: copy };
  }
  return { type: typeof data, sample: data };
}

async function testArvento(env) {
  if (!env.ARVENTO_USERNAME || !env.ARVENTO_PASSWORD) {
    return json({ ok: false, stage: "configuration", message: "ARVENTO_USERNAME veya ARVENTO_PASSWORD Cloudflare Secret olarak tanimli degil." }, 500);
  }

  const base = (env.ARVENTO_API_BASE || "https://ws.arvento.com/api").replace(/\/$/, "");
  const path = env.ARVENTO_VEHICLE_PATH || "/v1/vehicle";
  const url = base + (path.startsWith("/") ? path : "/" + path);
  const mode = String(env.ARVENTO_AUTH_MODE || "BASIC").toUpperCase();

  if (mode !== "BASIC") {
    return json({ ok: false, stage: "configuration", message: "V1 test paketi sadece BASIC auth modunu destekliyor.", authMode: mode }, 500);
  }

  const basic = btoa(`${env.ARVENTO_USERNAME}:${env.ARVENTO_PASSWORD}`);
  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "authorization": `Basic ${basic}`,
        "accept": "application/json, text/plain, */*",
        "user-agent": "KuzeyPet-Arvento-API-Test/1.0"
      },
      redirect: "manual"
    });
  } catch (e) {
    return json({ ok: false, stage: "network", endpoint: url, authMode: mode, message: "Arvento sunucusuna baglanti kurulamadi.", error: String(e) }, 502);
  }

  const contentType = res.headers.get("content-type") || "";
  const location = res.headers.get("location") || null;
  const bodyText = await res.text();
  let parsed = null;
  if (contentType.includes("json") || /^[\s]*[\[{]/.test(bodyText)) {
    try { parsed = JSON.parse(bodyText); } catch {}
  }

  const success = res.ok && parsed !== null;
  const diagnostic = success
    ? "REST endpoint JSON yaniti verdi. Sonraki adimda plaka/konum alanlarini haritaya baglayabiliriz."
    : res.status === 401 || res.status === 403
      ? "Endpoint erisilebilir ancak Basic username/password kimlik dogrulamasi kabul edilmedi. Arvento REST icin token/API key veya farkli auth yontemi gerekebilir."
      : res.status >= 300 && res.status < 400
        ? "Arvento bir yonlendirme cevabi verdi. Bu genellikle farkli kimlik dogrulama veya giris akisi gerektigini gosterebilir."
        : "Endpoint yanit verdi fakat beklenen JSON arac listesi alinmadi. Durum ve ornek yanit asagida.";

  return json({
    ok: success,
    stage: "vehicle-get",
    endpoint: url,
    authMode: mode,
    upstreamStatus: res.status,
    upstreamStatusText: res.statusText,
    contentType,
    redirectLocation: location,
    diagnostic,
    response: parsed !== null ? safeJsonSample(parsed) : { type: "text", sample: truncate(bodyText, 6000) }
  }, success ? 200 : 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "arvento-api-test", configured: Boolean(env.ARVENTO_USERNAME && env.ARVENTO_PASSWORD && env.ARVENTO_TEST_KEY) });
    }
    if (request.method === "POST" && url.pathname === "/api/arvento-test") {
      if (!env.ARVENTO_TEST_KEY) return json({ ok: false, message: "ARVENTO_TEST_KEY Secret tanimli degil." }, 500);
      let body = {};
      try { body = await request.json(); } catch {}
      if (!body.key || body.key !== env.ARVENTO_TEST_KEY) return json({ ok: false, message: "Test erisim anahtari hatali." }, 401);
      return testArvento(env);
    }
    return json({ ok: false, message: "Not found" }, 404);
  }
};
