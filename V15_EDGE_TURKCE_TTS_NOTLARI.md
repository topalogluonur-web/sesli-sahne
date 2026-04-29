# v15 - Keysiz Türkçe Neural TTS

Bu sürüm Windows yerel SAPI sesleri yerine varsayılan olarak `edge_online` provider kullanır.

- API key gerekmez.
- Türkçe neural sesler kullanılır:
  - `tr-TR-EmelNeural` kadın
  - `tr-TR-AhmetNeural` erkek
- MP3 üretir.
- İnternet bağlantısı gerekir.

Windows yerel sesleri hâlâ durur, ancak Windows ayarlarında görünen Türkçe sesler System.Speech/SAPI tarafında her zaman seçilebilir olmayabilir. Loglarda `Microsoft Zira Desktop (en-US)` seçiliyorsa Windows SAPI Türkçe sesi yoktur; bu yüzden Edge online provider önerilir.

## Kullanım

1. Paketi mevcut klasörün üzerine kopyalayın.
2. Backend klasöründe bağımlılıkları güncelleyin:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm install
```

3. Ana klasörde keysiz Edge TTS modunu aktif edin:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne
.\USE_EDGE_TTS.bat
```

4. Backend'i yeniden başlatın:

```powershell
cd C:\Users\Onurt\Desktop\sesli-sahne\backend
npm run dev
```

5. Admin panelde TTS yöntemi olarak `Keysiz Türkçe neural ses (Edge online)` seçin.
