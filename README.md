# Arvento API Test Worker V3

Bu sürüm REST API'yi test etmez. Arvento'nun klasik Report Web Service tarafındaki 3 metot yetkisini ayrı ayrı kontrol eder:

- `GetNodes`
- `GetLicensePlateNodeMappings`
- `GetVehicleStatusV3`

## Cloudflare Runtime Secrets

Worker > Settings > Variables and Secrets bölümünde Secret olarak:

- `ARVENTO_USERNAME`
- `ARVENTO_PIN1`
- `ARVENTO_PIN2`
- `ARVENTO_TEST_KEY`

`ARVENTO_PASSWORD` V3 testinde kullanılmaz; istersen mevcut Worker'da kalabilir.

## Normal vars

`wrangler.toml` içinde hazır:

- `ARVENTO_REPORT_BASE=https://ws.arvento.com/v1/report.asmx`
- `ARVENTO_LANGUAGE=tr`
- `ARVENTO_GROUP=` (boş)

## Kullanım

Deploy sonrası Worker ana adresini açın. `ARVENTO_TEST_KEY` değerini yazıp **3 Metodu Test Et** butonuna basın.

Sonuçta her metot için ayrı `authorized`, `accessDenied`, `upstreamStatus`, `diagnostic` alanları gösterilir.

`/health` sadece secretların tanımlı olup olmadığını true/false olarak gösterir; secret değerlerini göstermez.
