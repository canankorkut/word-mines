# Kelime Mayınları

Kelime Mayınları, iki oyuncu arasında oynanan sıra tabanlı Türkçe kelime oyunudur. Oyuncular ellerindeki harflerle 15x15 oyun tahtasında stratejik kelimeler oluşturarak puan kazanırken, gizli mayınlar ve ödüllerle dolu rekabetçi bir deneyim yaşarlar.

## 📸 Ekran Görüntüleri

### Kullanıcı İşlemleri
| Karşılama Ekranı | Giriş Ekranı | Kayıt Ekranı |
|------------------|--------------|--------------|
| ![Image](https://github.com/user-attachments/assets/1ab056ae-47a7-4a1d-83c0-eb7158f37d28) | ![Image](https://github.com/user-attachments/assets/41434d5d-19e5-4a26-89bf-25a4eed1cd5e) | ![Image](https://github.com/user-attachments/assets/f5e7bd4f-d356-4dc1-83b1-d96473ab9a83) |

### Ana Menü ve Oyun
| Ana Menü | Oyun Alanı |
|----------|------------|
| ![Image](https://github.com/user-attachments/assets/f6cefcc8-801b-4235-a1d8-85e910496bd4) | ![Image](https://github.com/user-attachments/assets/569e2cf8-9d7a-4414-99ce-6ac83d189d07) |

## ✨ Özellikler

### Oyun Mekanikleri
- **15x15 Oyun Tahtası:** Özel bonus alanları ile gelişmiş puanlama sistemi  
- **Sıralı Oyun Sistemi:** Zamana karşı strateji (2dk, 5dk, 12sa, 24sa seçenekleri)  
- **Gerçek Zamanlı Çoklu Oyuncu:** Firebase ile anlık eşleştirme ve oyun takibi  
- **100 Harfli Havuz Sistemi:** Türkçe harf dağılımına uygun puan sistemi  

### Bonus Sistemleri
- **Harf Bonusları:** 2x ve 3x harf puanı çarpanları  
- **Kelime Bonusları:** 2x ve 3x kelime puanı çarpanları  
- **Gizli Mayınlar:** 4 farklı ceza türü ile stratejik zorluk  
- **Özel Ödüller:** 3 farklı güçlendirme türü  

### Kullanıcı Sistemi
- **Üyelik Sistemi:** Güvenli kayıt ve giriş işlemleri  
- **İstatistik Takibi:** Başarı yüzdesi ve oyun geçmişi  
- **Aktif Oyun Yönetimi:** Devam eden ve tamamlanan oyunları takip  

### Teknolojiler
**Frontend:** React Native  
**Backend:** Firebase  
- Authentication (Kullanıcı yönetimi)  
- Firestore (Veritabanı)  
- Real-time Database (Anlık oyun durumu)  
- Kelime Doğrulama: Türkçe Kelime Listesi  

## 🚀 Kurulum

### Gereksinimler
- Node.js (v14 veya üstü)  
- React Native CLI  
- Android Studio / Xcode  
- Firebase hesabı  

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone https://github.com/canankorkut/word-mines.git
cd word-mines
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
# veya
yarn install
```

3. **Firebase konfigürasyonu**
```bash
# Firebase proje ayarlarından google-services.json (Android) ve GoogleService-Info.plist (iOS) dosyalarını indirin
# Android: android/app/ klasörüne google-services.json kopyalayın
```

4. **Çalıştırma**
```bash
# Android
npx react-native run-android
```

## 🎯 Oyun Kuralları

### Temel Kurallar
1. Her oyuncu 7 harf ile başlar
2. İlk kelime oyun tahtasının merkezinden geçmeli
3. Sonraki kelimeler mevcut harflere temas etmeli
4. Kelimeler yatay veya dikey olabilir
5. Geçersiz kelimeler kabul edilmez

### Puanlama Sistemi
- Her harfin kendine özel puanı vardır
- Bonus alanları puanları çarpar
- Mayınlar ceza uygular
- Ödüller özel yetenekler verir

### Mayın Türleri
- **Puan Bölünmesi** (5 adet): %70 puan kaybı
- **Puan Transferi** (4 adet): Puan rakibe geçer
- **Ekstra Hamle Engeli** (2 adet): Bonus alanları iptal
- **Kelime İptali** (2 adet): Hiç puan alınmaz

### Ödül Türleri
- **Bölge Yasağı** (2 adet): Rakibi yarı tahtaya sınırlar
- **Harf Yasağı** (3 adet): Rakibin 2 harfini dondurur
- **Ekstra Hamle** (2 adet): İkinci kelime hakkı

## 📞 İletişim

- **Geliştirici**: Canan Korkut
- **Email**: canankorkut1@gmail.com
