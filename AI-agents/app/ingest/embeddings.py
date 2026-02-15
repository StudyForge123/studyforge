from __future__ import annotations

from typing import List
from openai import OpenAI
from app import config

client = OpenAI(api_key=config.OPENAI_API_KEY)


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a batch of text strings using OpenAI embeddings.
    Returns a list of embedding vectors.
    """
    if not texts:
        return []
    
    response = client.embeddings.create(
        model=config.OPENAI_EMBED_MODEL,
        input=texts
    )
    
    return [item.embedding for item in response.data]


def embed_single(text: str) -> List[float]:
    """
    Embed a single text string.
    """
    vecs = embed_texts([text])
    return vecs[0] if vecs else []
