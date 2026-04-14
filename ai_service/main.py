import io
import base64
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from PIL import Image
import torchvision.transforms as transforms
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights
import os
from fastapi.middleware.cors import CORSMiddleware
import torch
torch.set_grad_enabled(False)

app = FastAPI(title="Smart Stay AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NODE_ORIGIN", "https://smart-stay-0gxx.onrender.com")],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

@app.get("/health")
def health():
    return {"status": "ok", "model": "mobilenet_v2"}

# Load pretrained MobileNetV2
weights = MobileNet_V2_Weights.DEFAULT
model = mobilenet_v2(weights=weights)
model.classifier = torch.nn.Identity() # Remove the classification head to get raw features
model.eval()

# Image preprocessing transform
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=weights.transforms().mean, std=weights.transforms().std)
])

class EmbedRequest(BaseModel):
    image_base64: str

class EmbedResponse(BaseModel):
    embedding: List[float]

class Candidate(BaseModel):
    id: str
    embedding: List[float]

class MatchRequest(BaseModel):
    source_embedding: List[float]
    candidates: List[Candidate]

class MatchResult(BaseModel):
    id: str
    score: float

class MatchResponse(BaseModel):
    matches: List[MatchResult]

def get_embedding(image: Image.Image) -> np.ndarray:
    if image.mode != 'RGB':
        image = image.convert('RGB')

    input_tensor = preprocess(image)
    input_batch = input_tensor.unsqueeze(0)

    with torch.no_grad():
        output = model(input_batch)   # ✅ use full model forward

    return output.squeeze().detach().cpu().numpy()

@app.post("/embed", response_model=EmbedResponse)
def embed_image(req: EmbedRequest):
    try:
        # Some base64 strings come with 'data:image/jpeg;base64,' prefix. Remove it if present.
        img_str = req.image_base64
        if ',' in img_str:
            img_str = img_str.split(',', 1)[1]
        
        print("STEP 1: base64 received")
        
        image_data = base64.b64decode(img_str)
        image = Image.open(io.BytesIO(image_data))

        print("STEP 2: image loaded")

        embedding = get_embedding(image)

        print("STEP 3: embedding computed", len(embedding))

        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/similarity", response_model=MatchResponse)
def compute_similarity(req: MatchRequest):
    source = np.array(req.source_embedding)
    norm_source = np.linalg.norm(source)
    if norm_source == 0:
        return {"matches": []}
    source_normed = source / norm_source

    results = []
    for cand in req.candidates:
        c_emb = np.array(cand.embedding)
        norm_c = np.linalg.norm(c_emb)
        if norm_c == 0:
            continue
        score = np.dot(source_normed, c_emb / norm_c)
        if score >= 0.75:
            results.append({"id": cand.id, "score": float(score)})
    
    # Sort descending
    results.sort(key=lambda x: x["score"], reverse=True)
    # Return top 3
    return {"matches": results[:3]}
