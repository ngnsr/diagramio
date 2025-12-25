from fastapi import FastAPI, UploadFile, HTTPException
from faster_whisper import WhisperModel
import io

app = FastAPI()
model = WhisperModel("base")  # Options: tiny, base, small, medium, large

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided")

    audio_bytes = await file.read()
    audio_buffer = io.BytesIO(audio_bytes)

    segments, info = model.transcribe(audio_buffer)
    text = " ".join([segment.text for segment in segments])

    return {"text": text}
