import React, { useState, useEffect, useCallback } from 'react';
import MicrophoneButton, { ButtonState } from './components/MicrophoneButton';
import ChatBox, { Message } from './components/ChatBox';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { generateAIResponse } from './services/aiService';

function App() {
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');

  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    reset,
  } = useAudioRecorder();

  const addMessage = useCallback((content: string, type: 'user' | 'ai') => {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const handleMicrophoneClick = useCallback(() => {
    if (buttonState === 'idle') {
      reset();
      startRecording();
      setButtonState('recording');
    } else if (buttonState === 'recording') {
      stopRecording();
      setButtonState('thinking');
    } else if (buttonState === 'speaking') {
      setButtonState('idle');
    }
  }, [buttonState, startRecording, stopRecording, reset]);

  // Ses kaydı tamamlandığında: Whisper'a gönder ve yanıt al
  useEffect(() => {
    if (audioBlob) {
      const transcribeAndRespond = async () => {
        setTranscript('');
        try {
          console.log("📤 Ses dosyası Whisper'a gönderiliyor...");
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');

          const res = await fetch('http://localhost:3001/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          console.log("📄 Whisper sonucu (JSON):", JSON.stringify(data, null, 2));

          const userText = data.text?.trim() || data.answer?.trim();
          if (!userText) throw new Error('Transcript boş geldi.');

          setTranscript(userText);
          addMessage(userText, 'user');

          console.log("🧠 GPT yanıtı isteniyor...");
          const aiResponse = await generateAIResponse(userText);
          addMessage(aiResponse.answer, 'ai');

          setButtonState('speaking');

          // 🎧 Ses dosyasını oynat
          if (aiResponse.audio_url) {
            const audio = new Audio(`http://localhost:3001${aiResponse.audio_url}?t=${Date.now()}`);
            await audio.play().catch((err) => {
              console.error("🎧 Ses oynatma hatası:", err);
            });
          }
        } catch (err) {
          console.error('❌ HATA:', err);
          addMessage('Sorry, something went wrong.', 'ai');
        } finally {
          setButtonState('idle');
        }
      };

      transcribeAndRespond();
    }
  }, [audioBlob, addMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-50"></div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Voice AI Assistant
          </h1>
          <p className="text-lg text-gray-300 max-w-md mx-auto">
            Tap the microphone to start a conversation. Speak naturally and I'll respond with both text and voice.
          </p>
        </div>

        <div className="mb-8">
          <MicrophoneButton state={buttonState} onClick={handleMicrophoneClick} />
        </div>

        {transcript && (
          <div className="mb-8 px-6 py-3 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-md text-center">
            <p className="text-gray-300 text-sm mb-1">You said:</p>
            <p className="text-white">{transcript}</p>
          </div>
        )}

        <div className="mb-8 text-center">
          <p className="text-gray-400 text-sm">
            {buttonState === 'idle' && 'Ready to listen'}
            {buttonState === 'recording' && 'Listening...'}
            {buttonState === 'thinking' && 'Processing...'}
            {buttonState === 'speaking' && 'Speaking...'}
          </p>
        </div>

        {messages.length > 0 && <ChatBox messages={messages} />}
      </div>

      <div className="relative z-10 text-center text-gray-500 text-xs mt-8">
        <p>Powered by Whisper + GPT + Edge TTS • Works best in Chrome/Edge</p>
      </div>
    </div>
  );
}

export default App;
