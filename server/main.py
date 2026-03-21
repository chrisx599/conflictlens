from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import assessment, dialogue, practice, summary, screenshot, roleplay

app = FastAPI(title="ConflictLens API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assessment.router)
app.include_router(dialogue.router)
app.include_router(practice.router)
app.include_router(summary.router)
app.include_router(screenshot.router)
app.include_router(roleplay.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
