const HTML = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arvento Web Service Yetki Testi V3</title>
<style>
:root{--navy:#081d3a;--navy2:#102d57;--red:#d71920;--bg:#f4f6f9;--ink:#172033;--muted:#64748b;--green:#0f766e}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(980px,100%);background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(8,29,58,.18);overflow:hidden}.head{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:22px 26px;border-bottom:4px solid var(--red)}h1{margin:0;font-size:23px}.head p{margin:7px 0 0;opacity:.8;font-size:13px;line-height:1.5}.body{padding:24px}.row{display:flex;gap:10px;flex-wrap:wrap}.field{flex:1;min-width:260px}label{display:block;font-size:12px;font-weight:800;margin-bottom:7px;color:var(--navy)}input{width:100%;height:44px;border:1px solid #d8dee8;border-radius:11px;padding:0 12px;font:inherit;outline:none}input:focus{border-color:var(--navy2);box-shadow:0 0 0 3px rgba(16,45,87,.1)}button{height:44px;border:0;border-radius:11px;background:var(--red);color:#fff;padding:0 18px;font-weight:900;cursor:pointer;align-self:flex-end}button:disabled{opacity:.55;cursor:wait}.note{font-size:12px;color:var(--muted);line-height:1.6;margin:14px 0 0}.flow{margin-top:16px;background:#f8fafc;border:1px solid #e7ebf0;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.75}.result{margin-top:20px;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;display:none}.result.show{display:block}.result-head{padding:10px 14px;background:#eef2f7;font-size:12px;font-weight:900;color:var(--navy)}pre{margin:0;padding:15px;max-height:620px;overflow:auto;background:#0b1320;color:#d9e6f7;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.ok{color:var(--green)}.err{color:#b91c1c}
</style>
</head>
<body><div class="wrap"><div class="card">
<div class="head"><h1>Arvento Web Service Yetki Testi V3</h1><p>REST'i devre dışı bırakır. Klasik Arvento Report Web Service üzerinde üç yetkiyi ayrı ayrı test eder.</p></div>
<div class="body">
<div class="row"><div class="field"><label>Test Erişim Anahtarı</label><input id="key" type="password" autocomplete="off" placeholder="ARVENTO_TEST_KEY"></div><button id="btn">3 Metodu Test Et</button></div>
<div class="flow"><b>Test edilen klasik metotlar</b><br>1. GetNodes — kullanıcıya tanımlı cihazlar<br>2. GetLicensePlateNodeMappings — cihaz/plaka eşleşmeleri<br>3. GetVehicleStatusV3 — araçların son konum bilgileri</div>
<p class="note">Arvento kullanıcı adı, şifre ve PIN bilgileri tarayıcıya gönderilmez; Cloudflare runtime Secrets içinde kalır. Testler yalnızca veri okur.</p>
<div id="result" class="result"><div id="rh" class="result-head">Sonuç</div><pre id="out"></pre></div>
</div></div></div>
<script>
const btn=document.getElementById('btn'),key=document.getElementById('key'),result=document.getElementById('result'),out=document.getElementById('out'),rh=document.getElementById('rh');
btn.addEventListener('click',async()=>{const k=key.value.trim();if(!k){alert('Test erişim anahtarını girin.');return}btn.disabled=true;btn.textContent='Test ediliyor...';result.classList.add('show');rh.textContent='Klasik web servis metotları deneniyor';out.textContent='GetNodes, GetLicensePlateNodeMappings ve GetVehicleStatusV3 test ediliyor...';try{const r=await fetch('/api/arvento-test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k})});const j=await r.json();rh.innerHTML=j.ok?'<span class="ok">TEST TAMAMLANDI</span>':'<span class="err">TEST HATASI</span>';out.textContent=JSON.stringify(j,null,2)}catch(e){rh.innerHTML='<span class="err">HATA</span>';out.textContent=String(e)}finally{btn.disabled=false;btn.textContent='3 Metodu Test Et'}});
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

function truncate(value, max = 5000) {
  const s = String(value ?? "");
  return s.length > max ? s.slice(0, max) + "\n... [yanit kisaltildi]" : s;
}

function xmlDecode(s) {
  return String(s ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(s) {
  return xmlDecode(String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function tag(block, name) {
  const m = String(block ?? "").match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? xmlDecode(m[1].trim()) : "";
}

function isAccessDenied(text) {
  return /access\s*denied|yetki(?:niz)?\s*yok|unauthori[sz]ed|forbidden/i.test(stripTags(text));
}

function isServiceFault(text) {
  return /<html|server error|exception|faultcode|soap:Fault/i.test(String(text ?? ""));
}

function parseTableRows(xml, limit = 5) {
  const rows = [];
  const re = /<Table(?:\s[^>]*)?>([\s\S]*?)<\/Table>/gi;
  let m;
  while ((m = re.exec(xml)) && rows.length < limit) {
    const block = m[1];
    const obj = {};
    const cellRe = /<([A-Za-z_][A-Za-z0-9_.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
    let c;
    while ((c = cellRe.exec(block))) {
      const value = stripTags(c[2]);
      if (value && Object.keys(obj).length < 20) obj[c[1]] = value;
    }
    rows.push(obj);
  }
  const total = (xml.match(/<Table(?:\s[^>]*)?>/gi) || []).length;
  return { total, sample: rows };
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

function authConfigMissing(env) {
  return !env.ARVENTO_USERNAME || !env.ARVENTO_PIN1 || !env.ARVENTO_PIN2;
}

async function callClassicMethod(env, method, extraFields = {}) {
  if (authConfigMissing(env)) {
    return {
      ok: false,
      authorized: false,
      method,
      stage: "config",
      diagnostic: `${method} icin ARVENTO_USERNAME, ARVENTO_PIN1 ve ARVENTO_PIN2 gerekli.`
    };
  }

  const base = (env.ARVENTO_REPORT_BASE || "https://ws.arvento.com/v1/report.asmx").replace(/\/$/, "");
  const endpoint = `${base}/${method}`;
  const form = new URLSearchParams();
  form.set("Username", env.ARVENTO_USERNAME);
  form.set("PIN1", env.ARVENTO_PIN1);
  form.set("PIN2", env.ARVENTO_PIN2);
  for (const [k, v] of Object.entries(extraFields)) form.set(k, String(v ?? ""));

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "accept": "text/xml, application/xml, */*",
        "user-agent": "KuzeyPet-Arvento-API-Test/3.0"
      },
      body: form.toString(),
      redirect: "manual"
    });
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    const denied = isAccessDenied(text);
    const fault = isServiceFault(text);
    const httpOk = res.ok;
    const authorized = httpOk && !denied && !fault;

    return {
      ok: authorized,
      authorized,
      method,
      endpoint,
      upstreamStatus: res.status,
      upstreamStatusText: res.statusText,
      contentType,
      accessDenied: denied,
      rawText: text,
      diagnostic: denied
        ? `${method}: Arvento "Access denied" dondurdu. Metot/kullanici web service yetkisi kontrol edilmeli.`
        : fault
          ? `${method}: servis hata/fault cevabi dondurdu.`
          : httpOk
            ? `${method}: HTTP 200 ve yetki reddi bulunmadi.`
            : `${method}: HTTP ${res.status} dondurdu.`
    };
  } catch (e) {
    return {
      ok: false,
      authorized: false,
      method,
      endpoint,
      stage: "network",
      diagnostic: `${method}: Arvento baglantisi kurulamadı.`,
      error: String(e)
    };
  }
}

function publicDatasetResult(result) {
  if (!result.rawText) return result;
  const parsed = parseTableRows(result.rawText, 5);
  const hasRows = parsed.total > 0;
  const publicResult = { ...result };
  delete publicResult.rawText;
  publicResult.rowCount = parsed.total;
  publicResult.response = hasRows
    ? { type: "dataset", count: parsed.total, sample: parsed.sample }
    : { type: "xml", sample: truncate(result.rawText, 1800) };
  if (result.authorized && !hasRows) {
    publicResult.diagnostic += " Veri satiri bulunamadi; bu metot icin grup/cihaz tanimi ayrica kontrol edilebilir.";
  }
  return publicResult;
}

function publicVehicleResult(result) {
  if (!result.rawText) return result;
  const vehicles = parseVehicleStatusV3(result.rawText);
  const validVehicles = vehicles.filter(v => v.plate || v.latitude || v.longitude || (v.node && !/access denied/i.test(v.node)));
  const publicResult = { ...result };
  delete publicResult.rawText;
  publicResult.vehicleCount = validVehicles.length;
  publicResult.response = validVehicles.length
    ? { type: "vehicles", count: validVehicles.length, sample: validVehicles.slice(0, 5) }
    : { type: "xml", sample: truncate(result.rawText, 1800) };
  if (result.authorized && vehicles.length > 0 && validVehicles.length === 0) {
    publicResult.ok = false;
    publicResult.authorized = false;
    publicResult.accessDenied = true;
    publicResult.diagnostic = "GetVehicleStatusV3: cevap yapisinda gecersiz/Access denied kaydi bulundu; yetki basarili sayilmadi.";
  } else if (result.authorized && validVehicles.length > 0) {
    publicResult.diagnostic = `GetVehicleStatusV3: ${validVehicles.length} gecerli arac konumu alindi.`;
  } else if (result.authorized && validVehicles.length === 0) {
    publicResult.diagnostic += " Gecerli arac konumu bulunamadi.";
  }
  return publicResult;
}

async function testClassicMethods(env) {
  const group = env.ARVENTO_GROUP || "";
  const language = env.ARVENTO_LANGUAGE || "tr";

  const [nodesRaw, mappingsRaw, statusRaw] = await Promise.all([
    callClassicMethod(env, "GetNodes", { Group: group }),
    callClassicMethod(env, "GetLicensePlateNodeMappings", { Language: language }),
    callClassicMethod(env, "GetVehicleStatusV3", { Language: language })
  ]);

  const nodes = publicDatasetResult(nodesRaw);
  const licensePlateMappings = publicDatasetResult(mappingsRaw);
  const vehicleStatusV3 = publicVehicleResult(statusRaw);

  const methods = [nodes, licensePlateMappings, vehicleStatusV3];
  const authorizedCount = methods.filter(x => x.authorized).length;
  const deniedMethods = methods.filter(x => x.accessDenied).map(x => x.method);

  return json({
    ok: true,
    workingMode: "CLASSIC_WEB_SERVICE",
    summary: {
      tested: methods.length,
      authorized: authorizedCount,
      denied: deniedMethods.length,
      deniedMethods,
      allAuthorized: authorizedCount === methods.length
    },
    diagnostic: authorizedCount === methods.length
      ? "Uc klasik Arvento metodu da yetkili gorunuyor."
      : `${authorizedCount}/${methods.length} metot yetkili. Access denied veren metotlar ayrica listelendi.`,
    tests: {
      getNodes: nodes,
      getLicensePlateNodeMappings: licensePlateMappings,
      getVehicleStatusV3: vehicleStatusV3
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "arvento-api-test-v3",
        mode: "classic-web-service-method-permission-test",
        configured: {
          username: Boolean(env.ARVENTO_USERNAME),
          pin1: Boolean(env.ARVENTO_PIN1),
          pin2: Boolean(env.ARVENTO_PIN2),
          testKey: Boolean(env.ARVENTO_TEST_KEY),
          reportBase: Boolean(env.ARVENTO_REPORT_BASE)
        }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/arvento-test") {
      if (!env.ARVENTO_TEST_KEY) return json({ ok: false, message: "ARVENTO_TEST_KEY Secret tanimli degil." }, 500);
      let body = {};
      try { body = await request.json(); } catch {}
      if (!body.key || body.key !== env.ARVENTO_TEST_KEY) return json({ ok: false, message: "Test erisim anahtari hatali." }, 401);
      return testClassicMethods(env);
    }

    return json({ ok: false, message: "Not found" }, 404);
  }
};
