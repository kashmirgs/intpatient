- Hastanenin kullanacağı bir web uygulaması geliştir. Temel amacı yabancı hastalardan radyoloji görsel ve doktor raporlarını almak, yazılı belgeleri gerekirse önce scan edip sonra Türkçe'ye çevirip kaydetmektir.
  
- Hastanede çalışan kullanıcılar sisteme login olacaklar. Kullanıcı authentication UpperMind sistemi üzerinden yapılacak. Kullanıcı ekleme vs. de UpperMind sistemi içerisinde olacak, bu uygulama kapsamında değil. UpperMind API collection şuradan öğrenilecek: @UpperMind-Info/CollectionAndEnvironment
- Kullanıcılar sisteme girdikten sonra kayıt ekleme menüsünü seçebilecek.
  -- Kayıt ekleme ekranında 2 seçenek olacak.
  1. Radyoloji Görseli Ekle: Kullanıcı birden çok dosya upload edebilecek. Upload'da görsel formatları (jpg vs.. kabul edilebilecek) Uygulamanın POC versiyonunda şimdilik bu dosyaları bir klasöre kaydedecek.
  2. Rapor Ekle: Kullanıcı birden çok dosya upload edebilecek. Görsel fromatları (jpg vs.) ve pdf desteklenecek. Görsel dosyalarından önce metin scan edilecek daha sonra Türkçe'ye çevrilecek ve şimdilik POC'de bir veritabanına kaydedecek.

**Teknik Altyapı**
Bu sistem öncelikle Nvidia Spark DGX makinesinde çalışacak.
Bu makine üzerinde UpperMind adında bir enterprise AI sistemi de çalışıyor (120b bir modeli vllm inference yapıyor) . Çeviri için UpperMind Patient-Translator agent'ını non-interactive olarak kullan. Bunu kullanmak için uppermin api dokümanını oku.
Görselden metni scan etmek için deepseek-ocr modelini kullan. Inference için ollama tercih et.
Sistem docker container olarak yüklenebilmeli.

