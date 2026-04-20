import io
import base64
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from PIL import Image
import torchvision.transforms as transforms
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights
import torch
import torch.nn.functional as F
import os
from fastapi.middleware.cors import CORSMiddleware

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
    return {"status": "ok", "model": "mobilenet_v2_features"}

# Load MobileNetV2 and use ONLY the feature extractor (before classifier)
weights = MobileNet_V2_Weights.DEFAULT
_full_model = mobilenet_v2(weights=weights)
# features gives a 1280-dim vector after AdaptiveAvgPool — much better than Identity on classifier
model = _full_model.features
model.eval()

# Global average pool to collapse spatial dims
gap = torch.nn.AdaptiveAvgPool2d((1, 1))

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
    
    input_tensor = preprocess(image).unsqueeze(0)
    
    with torch.no_grad():
        features = model(input_tensor)          # shape: [1, 1280, 7, 7]
        pooled = gap(features)                  # shape: [1, 1280, 1, 1]
        vec = pooled.squeeze()                  # shape: [1280]
        # L2-normalize so cosine similarity = dot product
        normed = F.normalize(vec.unsqueeze(0), p=2, dim=1).squeeze()
    
    return normed.cpu().numpy()


@app.post("/embed", response_model=EmbedResponse)
def embed_image(req: EmbedRequest):
    try:
        img_str = req.image_base64
        if ',' in img_str:
            img_str = img_str.split(',', 1)[1]

        print("STEP 1: base64 received")

        image_data = base64.b64decode(img_str)
        image = Image.open(io.BytesIO(image_data))

        print("STEP 2: image loaded")

        embedding = get_embedding(image)

        print("STEP 3: embedding computed, dim =", len(embedding))

        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/similarity", response_model=MatchResponse)
def compute_similarity(req: MatchRequest):
    source = np.array(req.source_embedding, dtype=np.float32)
    norm_source = np.linalg.norm(source)
    
    # If embeddings are already L2-normalized (from new /embed), dot = cosine directly
    # If old un-normalized embeddings exist in DB, normalize here too for safety
    if norm_source == 0:
        return {"matches": []}
    source_normed = source / norm_source

    results = []
    for cand in req.candidates:
        c_emb = np.array(cand.embedding, dtype=np.float32)
        norm_c = np.linalg.norm(c_emb)
        if norm_c == 0:
            continue
        score = float(np.dot(source_normed, c_emb / norm_c))
        # Lowered threshold: 0.60 works well for real-world same-object photos
        if score >= 0.60:
            results.append({"id": cand.id, "score": score})

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"matches": results[:3]}