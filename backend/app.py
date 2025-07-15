from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import whisper
import tempfile
import shutil
import os
import subprocess
from datetime import datetime
import json
import asyncio
import edge_tts
from dotenv import load_dotenv
from langchain.schema import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA

# 🌍 .env yükle
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# 🔤 LangChain modelleri yükle
embedding_model = OpenAIEmbeddings(api_key=openai_api_key)
llm = ChatOpenAI(model="gpt-4o", temperature=0, api_key=openai_api_key)

# 📚 Belgeleri yükle
with open("faq_hr.json", "r", encoding="utf-8") as f:
    faq_data = json.load(f)

documents = [
    Document(page_content=f"Soru: {item['question']}\nCevap: {item['answer']}") for item in faq_data
]

persist_directory = "./chroma_faq_db"
vectorstore = Chroma.from_documents(
    documents=documents,
    embedding=embedding_model,
    persist_directory=persist_directory
)

retriever = vectorstore.as_retriever()
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    return_source_documents=False
)

# 🚀 FastAPI app
app = FastAPI()

# 🔓 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📁 Kayıt dizini
RECORDING_DIR = os.path.join(os.path.dirname(__file__), "recordings")
os.makedirs(RECORDING_DIR, exist_ok=True)

# 📦 Text query input için şema
class QueryRequest(BaseModel):
    query: str

# 🎙️ Whisper modeli
model = whisper.load_model("medium", device="cpu")

# 🔊 Edge TTS ile ses üret
async def synthesize_speech(text: str, file_path: str = "output.mp3", voice: str = "tr-TR-AhmetNeural"):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(file_path)

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    print("🟢 Ses dosyası alındı:", file.filename)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        shutil.copyfileobj(file.file, temp_audio)
        webm_path = temp_audio.name

    wav_path = webm_path.replace(".webm", ".wav")

    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_path = os.path.join(RECORDING_DIR, f"audio_{timestamp}.wav")
        shutil.copyfile(wav_path, saved_path)
        print(f"💾 Kayıt edildi: {saved_path}")

        result = model.transcribe(wav_path)
        print("📝 Whisper sonucu:", result)
        text = result.get("text", "").strip()

        if text:
            gpt_result = qa_chain.invoke({"query": text})
            answer = gpt_result["result"]
            await synthesize_speech(answer)  # Edge TTS ile sesi üret
        else:
            answer = "[HATA] Transkript boş."

    except Exception as e:
        print("❌ Whisper hata:", str(e))
        text = ""
        answer = f"[HATA] {str(e)}"

    finally:
        os.remove(webm_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

    return {
        "text": text,
        "answer": answer,
        "audio_url": "/output.mp3"  # frontend burada sesi oynatabilir
    }

@app.get("/output.mp3")
async def get_audio():
    return FileResponse("output.mp3", media_type="audio/mpeg")

@app.post("/ask")
async def ask_question(request: QueryRequest):
    result = qa_chain.invoke({"query": request.query})
    answer = result["result"]
    await synthesize_speech(answer)  # metin sorularda da ses üret
    return {
        "answer": answer,
        "audio_url": "/output.mp3"
    }
