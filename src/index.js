const HTML = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arvento API Bağlantı Testi V2</title>
<style>
:root{--navy:#081d3a;--navy2:#102d57;--red:#d71920;--bg:#f4f6f9;--ink:#172033;--muted:#64748b}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(860px,100%);background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(8,29,58,.18);overflow:hidden}.head{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:22px 26px;border-bottom:4px solid var(--red)}h1{margin:0;font-size:23px}.head p{margin:7px 0 0;opacity:.78;font-size:13px;line-height:1.5}.body{padding:24px}.row{display:flex;gap:10px;flex-wrap:wrap}.field{flex:1;min-width:260px}label{display:block;font-size:12px;font-weight:800;margin-bottom:7px;color:var(--navy)}input{width:100%;height:44px;border:1px solid #d8dee8;border-radius:11px;padding:0 12px;font:inherit;outline:none}input:focus{border-color:var(--navy2);box-shadow:0 0 0 3px rgba(16,45,87,.1)}button{height:44px;border:0;border-radius:11px;background:var(--red);color:#fff;padding:0 18px;font-weight:900;cursor:pointer;align-self:flex-end}button:disabled{opacity:.55;cursor:wait}.note{font-size:12px;color:var(--muted);line-height:1.6;margin:14px 0 0}.flow{margin-top:16px;background:#f8fafc;border:1px solid #e7ebf0;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.65}.result{margin-top:20px;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;display:none}.result.show{display:block}.result-head{padding:10px 14px;background:#eef2f7;font-size:12px;font-weight:900;color:var(--navy)}pre{margin:0;padding:15px;max-height:520px;overflow:auto;background:#0b1320;color:#d9e6f7;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.ok{color:#0f766e}.err{color:#b91c1c}
</style>
</head>
<body><div class="wrap"><div class="card">
<div class="head"><h1>Arvento API Bağlantı Testi V2</h1><p>Önce REST username/password denenir. Çalışmazsa otomatik olarak GetVehicleStatusV3 + PIN1/PIN2 denenir.</p></div>
<div class="body">
<div class="row"><div class="field"><label>Test Erişim Anahtarı</label><input id="key" type="password" autocomplete="off" placeholder="ARVENTO_TEST_KEY"></div><button id="btn">Arvento'yu Test Et</button></div>
<div class="flow"><b>Test sırası</b><br>1. GET /api/v1/vehicle + username/password<br>2. Başarısızsa GetVehicleStatusV3 + username/PIN1/PIN2</div>
<p class="note">Arvento kullanıcı adı, şifre ve PIN bilgileri bu ekrana yazılmaz. Cloudflare Secrets içinde kalır. Bu test yalnızca veri okur.</p>
<div id="result" class="result"><div id="rh" class="result-head">Sonuç</div><pre id="out"></pre></div>
</div></div></div>
<script>
const btn=document.getElementById('btn'),key=document.getElementById('key'),result=document.getElementById('result'),out=document.getElementById('out'),rh=document.getElementById('rh');
btn.addEventListener('click',async()=>{const k=key.value.trim();if(!k){alert('Test erişim anahtarını girin.');return}btn.disabled=true;btn.textContent='Test ediliyor...';result.classList.add('show');rh.textContent='Bağlantı kuruluyor';out.textContent='Arvento bağlantı yolları deneniyor...';try{const r=await fetch('/api/arvento-test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k})});const j=await r.json();rh.innerHTML=j.ok?'<span class="ok">BAŞARILI</span>':'<span class="err">BAŞARISIZ</span>';out.textContent=JSON.stringify(j,null,2)}catch(e){rh.innerHTML='<span class="err">HATA</span>';out.textContent=String(e)}finally{btn.disabled=false;btn.textContent="Arvento'yu Test Et"}});
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

function truncate(value, max = 6000) {
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

function xmlDecode(s) {
  return String(s ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? xmlDecode(m[1].trim()) : "";
}

function parseVehicleStatusV3(xml) {
  const packets = [];
  const re = /<LastPacket(?:\s[^>]*)?>([\s\S]*?)<\/LastPacket>/gi;
  let m;
  while ((m = re.exec(xml)) && packets.length < 5000) {
    const b = m[1];
    packets.push({
      node: tag(b, "strNode"),
      plate: tag(b, "strLicensePlate"),
      latitude: Number(tag(b, "dLatitude") || 0),
      longitude: Number(tag(b, "dLongitude") || 0),
      speed: Number(tag(b, "dSpeed") || 0),
      localDateTime: tag(b, "dtLocalDateTime"),
      gmtDateTime: tag(b, "dtGMTDateTime"),
      address: tag(b, "strAddress"),
      region: tag(b, "strRegion"),
      driver: tag(b, "strDriver"),
      odometer: Number(tag(b, "dOdometer") || 0)
    });
  }
  return packets;
}

async function tryRest(env) {
  if (!env.ARVENTO_USERNAME || !env.ARVENTO_PASSWORD) {
    return { ok: false, stage: "rest-config", diagnostic: "ARVENTO_USERNAME veya ARVENTO_PASSWORD tanimli degil." };
  }
  const base = (env.ARVENTO_API_BASE || "https://ws.arvento.com/api").replace(/\/$/, "");
  const path = env.ARVENTO_VEHICLE_PATH || "/v1/vehicle";
  const endpoint = base + (path.startsWith("/") ? path : "/" + path);
  const basic = btoa(`${env.ARVENTO_USERNAME}:${env.ARVENTO_PASSWORD}`);
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "authorization": `Basic ${basic}`,
        "accept": "application/json, text/plain, */*",
        "user-agent": "KuzeyPet-Arvento-API-Test/2.0"
      },
      redirect: "manual"
    });
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    let parsed = null;
    if (contentType.includes("json") || /^[\s]*[\[{]/.test(text)) {
      try { parsed = JSON.parse(text); } catch {}
    }
    const ok = res.ok && parsed !== null;
    return {
      ok,
      stage: "rest",
      endpoint,
      upstreamStatus: res.status,
      upstreamStatusText: res.statusText,
      contentType,
      diagnostic: ok
        ? "REST endpoint JSON cevabi verdi."
        : (res.status === 401 || res.status === 403)
          ? "REST endpoint erisilebilir ancak Basic username/password kabul edilmedi."
          : "REST endpoint beklenen JSON arac listesini vermedi.",
      response: parsed !== null ? safeJsonSample(parsed) : { type: "text", sample: truncate(text, 2500) }
    };
  } catch (e) {
    return { ok: false, stage: "rest-network", endpoint, diagnostic: "REST baglantisi kurulamadı.", error: String(e) };
  }
}

async function tryVehicleStatusV3(env) {
  if (!env.ARVENTO_USERNAME || !env.ARVENTO_PIN1 || !env.ARVENTO_PIN2) {
    return {
      ok: false,
      stage: "legacy-config",
      diagnostic: "GetVehicleStatusV3 icin ARVENTO_USERNAME, ARVENTO_PIN1 ve ARVENTO_PIN2 gerekli."
    };
  }
  const base = (env.ARVENTO_REPORT_BASE || "https://ws.arvento.com/v1/report.asmx").replace(/\/$/, "");
  const endpoint = base + "/GetVehicleStatusV3";
  const form = new URLSearchParams();
  form.set("Username", env.ARVENTO_USERNAME);
  form.set("PIN1", env.ARVENTO_PIN1);
  form.set("PIN2", env.ARVENTO_PIN2);
  form.set("Language", env.ARVENTO_LANGUAGE || "tr");
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "accept": "text/xml, application/xml, */*",
        "user-agent": "KuzeyPet-Arvento-API-Test/2.0"
      },
      body: form.toString(),
      redirect: "manual"
    });
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    const vehicles = parseVehicleStatusV3(text);
    const looksLikeServiceError = /<html|server error|exception|faultcode|soap:Fault/i.test(text);
    const ok = res.ok && vehicles.length > 0 && !looksLikeServiceError;
    return {
      ok,
      stage: "getvehiclestatusv3",
      endpoint,
      upstreamStatus: res.status,
      upstreamStatusText: res.statusText,
      contentType,
      diagnostic: ok
        ? `GetVehicleStatusV3 calisti. ${vehicles.length} arac konumu alindi.`
        : res.ok && vehicles.length === 0
          ? "Servis HTTP 200 dondu ancak LastPacket arac kaydi bulunamadi. Yetki/PIN veya hesapta arac tanimi kontrol edilmeli."
          : "GetVehicleStatusV3 basarisiz oldu.",
      vehicleCount: vehicles.length,
      response: vehicles.length
        ? { type: "vehicles", count: vehicles.length, sample: vehicles.slice(0, 5) }
        : { type: "xml", sample: truncate(text, 3000) }
    };
  } catch (e) {
    return { ok: false, stage: "legacy-network", endpoint, diagnostic: "GetVehicleStatusV3 baglantisi kurulamadı.", error: String(e) };
  }
}

async function testArvento(env) {
  const rest = await tryRest(env);
  if (rest.ok) {
    return json({
      ok: true,
      workingMode: "REST",
      diagnostic: "REST username/password ile calisti. PIN fallback kullanilmadi.",
      rest
    });
  }

  const legacy = await tryVehicleStatusV3(env);
  if (legacy.ok) {
    return json({
      ok: true,
      workingMode: "GETVEHICLESTATUSV3",
      diagnostic: "REST calismadi fakat klasik Arvento GetVehicleStatusV3 servisi PIN1/PIN2 ile basarili oldu.",
      restAttempt: {
        ok: rest.ok,
        stage: rest.stage,
        upstreamStatus: rest.upstreamStatus ?? null,
        diagnostic: rest.diagnostic
      },
      legacy
    });
  }

  return json({
    ok: false,
    workingMode: null,
    diagnostic: "Ne REST ne de GetVehicleStatusV3 testi basarili oldu.",
    rest,
    legacy
  }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "arvento-api-test-v2",
        configured: {
          username: Boolean(env.ARVENTO_USERNAME),
          password: Boolean(env.ARVENTO_PASSWORD),
          pin1: Boolean(env.ARVENTO_PIN1),
          pin2: Boolean(env.ARVENTO_PIN2),
          testKey: Boolean(env.ARVENTO_TEST_KEY)
        }
      });
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
