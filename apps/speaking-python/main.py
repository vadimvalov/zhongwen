from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import tempfile
import json
import os
from dotenv import load_dotenv

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

load_dotenv(env_path)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("Couldn't find OPENAI_API_KEY in .env")

client = OpenAI(api_key=api_key)

SYSTEM_INSTRUCTION = """
Ты — вежливый, но строгий профессор из Northwestern Polytechnical University (NWPU). 
Ты проводишь онлайн-собеседование со студентом-иностранцем на получение стипендии.
Твоя задача: поддерживать диалог на простом китайском языке (уровень HSK 2-3). 
Если студент отвечает с ошибками (опирайся на присланный текст), мягко исправляй его. 

ВАЖНО: Ты должен возвращать ответ СТРОГО в формате JSON:
{
  "hanzi": "Твой ответ китайскими иероглифами",
  "pinyin": "Твой ответ на пиньине с тонами",
  "translation": "Твой ответ, переведенный на английский язык"
}
Отвечай коротко: максимум 2 предложения за раз.
"""

# 1 endpoint: transcribation (for Words)


@app.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="zh",
                # prompt for whisper to better recognize Chinese words, especially for short audios with single words:
                prompt="简体中文。这是一个中文发音测试。请只输出听到的中文词语，不要任何标点符号。"
            )
        return {"text": transcription.text.strip()}
    except Exception as e:
        print(f"Transcribation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(tmp_path)


# 2 endpoint: AI roleplay
@app.post("/chat")
async def chat_endpoint(
    file: UploadFile = File(...),
    history: str = Form("[]")
):
    history_list = json.loads(history)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # 1. Whisper
        with open(tmp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="zh"
            )

        user_text = transcription.text.strip()

        if not user_text:
            return {
                "user_text": "",
                "hanzi": "对不起，我没有听清楚。请再说一遍。",
                "pinyin": "Duìbùqǐ, wǒ méiyǒu tīng qīngchǔ. Qǐng zài shuō yībiàn.",
                "translation": "Sorry, I didn't catch that. Please repeat."
            }

        # 2. GPT-4o-mini
        messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]

        for m in history_list:
            role = "assistant" if m["role"] == "model" else "user"
            messages.append({"role": role, "content": m["parts"]})

        messages.append({"role": "user", "content": user_text})

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={"type": "json_object"}
        )

        ai_response = json.loads(completion.choices[0].message.content)

        return {
            "user_text": user_text,
            "hanzi": ai_response.get("hanzi", ""),
            "pinyin": ai_response.get("pinyin", ""),
            "translation": ai_response.get("translation", "")
        }

    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(tmp_path)
