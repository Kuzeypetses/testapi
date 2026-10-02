# Arvento API Test Worker V2

Bu paket Arvento erisimini iki adimda test eder:

1. REST: `GET https://ws.arvento.com/api/v1/vehicle` - HTTP Basic username/password
2. REST basarisizsa klasik Arvento Web Service: `GetVehicleStatusV3` - Username + PIN1 + PIN2

Mevcut ST haritasini degistirmez.

## Cloudflare Secrets

Worker -> Settings -> Variables and Secrets bolumunde asagidaki 5 degeri **Secret** olarak ekleyin:

- `ARVENTO_USERNAME`
- `ARVENTO_PASSWORD`
- `ARVENTO_PIN1`
- `ARVENTO_PIN2`
- `ARVENTO_TEST_KEY`

PIN1 ve PIN2 size verilen parola ile ayni ise ayni degeri bu iki Secret'a da yazabilirsiniz.

Gercek degerleri GitHub'a, README'ye veya `wrangler.toml` dosyasina yazmayin.

## Deploy

V1 reposunu kullaniyorsaniz repo icindeki dosyalari V2 ile degistirip commit/push etmeniz yeterlidir. Worker adi ayni tutuldu: `arvento-api-test`.

## Test

Worker URL'sini acin. Yalnizca `ARVENTO_TEST_KEY` degerini ekrana yazip **Arvento'yu Test Et** butonuna basin.

V2 once REST yolunu dener. REST calismazsa PIN1/PIN2 tanimliysa otomatik olarak `GetVehicleStatusV3` HTTP POST servisini dener.

Basarili klasik servis sonucunda ekranda:

- `ok: true`
- `workingMode: "GETVEHICLESTATUSV3"`
- arac sayisi
- ilk birkac aracin plaka / koordinat / hiz / tarih gibi ornek alanlari

gosterilir.

## Guvenlik

- Arvento credential'lari browser'a gonderilmez.
- Credential'lar test sonucuna yazdirilmaz.
- Test endpoint'i `ARVENTO_TEST_KEY` ile korunur.
- Her iki test de sadece veri okur; Arvento tarafinda kayit degisikligi yapmaz.
