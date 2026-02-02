# Voice Mode - LLM Chat Spracherkennung

## Übersicht

Der LLM-Chat Assistent unterstützt einen **Voice Mode**, der automatische Spracherkennung mit automatischem Senden ermöglicht. Der User muss nicht mehr ständig auf das Mikrofon klicken.

## Funktionsweise

### Toggle-Prinzip

- **1x Klick auf Mikrofon** → Voice Mode **AN** (grüner Button)
- **Nochmal klicken** → Voice Mode **AUS**

### Wenn Voice Mode AN ist:

1. System lauscht automatisch auf Sprache
2. Bei erkannter Sprache wird transkribiert
3. Text erscheint live im Input-Feld
4. Nach **3 Sekunden Pause** wird automatisch an LLM gesendet
5. Nach dem Senden beginnt das Lauschen erneut

### Wenn Voice Mode AUS ist:

- Nur Text-Eingabe möglich
- Normales Chat-Verhalten

## Browser-Unterstützung

| Browser | Technologie | Status |
|---------|-------------|--------|
| Chrome | Web Speech API (nativ) | ✅ Vollständig |
| Edge | Whisper.js (Fallback) | ✅ Vollständig |
| Firefox | Whisper.js (Fallback) | ✅ Vollständig |
| Safari | Web Speech API | ⚠️ Eingeschränkt |

## Architektur

### Komponenten

```
src/app/
├── presentation/aside/llm-chat/
│   ├── llm-chat.component.ts          # Haupt-Chat-Komponente
│   ├── llm-chat.component.html        # Template mit Voice-Button
│   ├── llm-chat.component.scss        # Styling (Toggle, Animationen)
│   └── services/
│       └── speech-recognition.service.ts  # Spracherkennungs-Service
│
└── infrastructure/services/speech/
    ├── whisper-streaming.service.ts   # Whisper.js Streaming für Edge/Firefox
    └── whisper-transcription.service.ts # Basis Whisper Service
```

### Wichtige Klassen und Methoden

#### LLMChatComponent

```typescript
// Toggle-Status
voiceModeEnabled = false;

// Hauptmethoden
toggleVoiceMode()        // Schaltet Voice Mode um
enableVoiceMode()        // Aktiviert Voice Mode
disableVoiceMode()       // Deaktiviert Voice Mode
startVoiceListening()    // Startet das Lauschen
handleSilenceTimeout()   // Wird bei Pause aufgerufen → sendet automatisch
```

#### SpeechRecognitionService

```typescript
// Signals
isListening              // Aktuell am Lauschen
isTranscribing           // Whisper transkribiert gerade
isWhisperLoading         // Whisper-Modell wird geladen

// Observables
interimResults           // Live-Text während Sprache
results                  // Finaler Text nach Stopp
errors                   // Fehlermeldungen

// Methoden
startListening(language) // Startet Spracherkennung
stopListening()          // Stoppt und gibt finalen Text
getDiagnostics()         // Browser/Feature-Info
```

#### WhisperStreamingService

- Lädt Whisper-Modell (~40MB, gecacht)
- Audio-Level-basierte Voice Activity Detection (VAD)
- Erkennt Pausen und transkribiert Chunks
- Akkumuliert Text über mehrere Sprach-Segmente

## Konfiguration

### Timing-Parameter

```typescript
// In llm-chat.component.ts
SILENCE_AUTO_SEND_DELAY_MS = 3000;  // 3 Sekunden Pause → Auto-Send

// In whisper-streaming.service.ts
SILENCE_THRESHOLD = 15;             // Audio-Level für "Stille"
SILENCE_DURATION_MS = 1500;         // Pause für Chunk-Transkription
MIN_AUDIO_DURATION_MS = 500;        // Mindest-Audio für Transkription
```

## CSS-Klassen

```scss
.btn-voice {
  &.voice-enabled      // Voice Mode ist AN (grüner Button)
  &.listening          // Aktiv am Lauschen (pulsiert)
  &.transcribing       // Whisper transkribiert (Wellen-Animation)
  &.not-supported      // Spracherkennung nicht verfügbar
}
```

## Übersetzungen

Neue Keys in allen Sprachen (de, en, fr, it):

```json
"llm-chat.voice-mode-on": "Sprachmodus aktivieren",
"llm-chat.voice-mode-off": "Sprachmodus deaktivieren"
```

## Bekannte Einschränkungen

1. **Whisper Modell-Download**: Beim ersten Mal ~40MB Download (wird gecacht)
2. **Whisper Latenz**: Transkription dauert 1-3 Sekunden pro Chunk
3. **Chrome Web Speech**: Benötigt Internet-Verbindung (Google Server)
4. **HTTPS erforderlich**: Spracherkennung nur über HTTPS oder localhost

## Nächste Schritte / TODOs

- [ ] Visuelle Anzeige für "lauscht auf Sprache" vs "Stille erkannt"
- [ ] Einstellungen für Pause-Dauer (User-konfigurierbar)
- [ ] Offline-Modus mit lokalem Whisper für Chrome
- [ ] Tastatur-Shortcut für Voice Mode Toggle
- [ ] Sound-Feedback bei Auto-Send

## Dateien geändert in dieser Session

- `src/app/presentation/aside/llm-chat/llm-chat.component.ts`
- `src/app/presentation/aside/llm-chat/llm-chat.component.html`
- `src/app/presentation/aside/llm-chat/llm-chat.component.scss`
- `src/app/presentation/aside/llm-chat/services/speech-recognition.service.ts`
- `src/app/infrastructure/services/speech/whisper-streaming.service.ts` (NEU)
- `src/assets/i18n/de.json`
- `src/assets/i18n/en.json`
- `src/assets/i18n/fr.json`
- `src/assets/i18n/it.json`
- `src/assets/standard-styles/colors.scss` (waveColor, waveBackgroundColor)

## Dependencies

```json
"@huggingface/transformers": "^3.x"  // Whisper.js
"@ricky0123/vad-web": "^0.x"         // Voice Activity Detection (installiert, noch nicht aktiv genutzt)
```
