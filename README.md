# Arvento API Test Worker V1

Bu paket sadece Arvento REST API erisimini test eder. Mevcut ST haritasini degistirmez.

## GitHub -> Cloudflare Worker

1. Bu klasorun icindekileri yeni bir GitHub reposuna yukleyin.
2. Cloudflare Dashboard -> Workers & Pages -> Create -> Import a repository.
3. Repo'yu secin ve deploy edin.
4. Worker acildiktan sonra Settings -> Variables and Secrets bolumune gidin.

### Secret olarak ekleyin

- `ARVENTO_USERNAME` = Arvento yetkili kullanici adiniz
- `ARVENTO_PASSWORD` = Arvento sifreniz
- `ARVENTO_TEST_KEY` = Sizin belirleyeceginiz guclu bir test erisim anahtari

Bu 3 degerin tipi **Secret** olmali. GitHub'a, wrangler.toml'a veya kaynak koda gercek degerleri yazmayin.

### Normal Variables

Paketin `wrangler.toml` dosyasinda hazir gelir:

- `ARVENTO_API_BASE=https://ws.arvento.com/api`
- `ARVENTO_VEHICLE_PATH=/v1/vehicle`
- `ARVENTO_AUTH_MODE=BASIC`

Ilk testte bunlari degistirmeyin.

## Test

Worker URL'sini acin. Ornegin:

`https://arvento-api-test.<hesabiniz>.workers.dev/`

Sayfadaki tek alana `ARVENTO_TEST_KEY` icin belirlediginiz degeri yazin ve **Arvento'yu Test Et** butonuna basin.

### Basarili sonuc

- `ok: true`
- `upstreamStatus: 200`
- JSON arac listesi veya arac listesini iceren obje gorunur.

### 401 / 403 sonucu

Bu, `GET /api/v1/vehicle` endpoint'inin erisilebilir oldugunu ancak normal username/password ile **Basic Authentication** kabul etmedigini gosterir. Bu durumda Arvento'dan REST API icin gereken token/API key/authentication yontemini netlestiririz veya PIN1/PIN2 ile Report Web Service'e geceriz.

### Neden ARVENTO_TEST_KEY var?

Basarili REST cevabi arac/plaka/konum gibi hassas operasyonel veriler icerebilir. Bu nedenle test endpoint'i herkese acik bir URL uzerinden dogrudan cevap vermez.

## Guvenlik

- Kullanici adi/sifre browser'a gonderilmez.
- Kullanici adi/sifre HTML veya JavaScript'e gomulmez.
- Cloudflare Secret olarak tutulur.
- Worker loglarina credential yazdirilmaz.
- Test sadece GET arac listesi endpoint'ini cagirir; Arvento'da veri degisikligi yapmaz.
