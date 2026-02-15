from __future__ import annotations

from typing import List
import numpy as np
from openai import OpenAI

from app import config

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)


def generate_embeddings(texts: List[str]) -> np.ndarray:
    """
    Generate embeddings for a list of texts using OpenAI.
    
    Args:
        texts: List of text strings to embed
        
    Returns:
        numpy array of shape (N, embedding_dimension)
    """
    if not texts:
        return np.array([])
        
    # OpenAI embedding API
    response = client.embeddings.create(
        model=config.OPENAI_EMBED_MODEL,
        input=texts
    )
    
    # Extract embeddings
    embeddings = [item.embedding for item in response.data]
    
    return np.array(embeddings, dtype=np.float32)


def generate_embedding(text: str) -> np.ndarray:
    """
    Generate embedding for a single text.
    
    Args:
        text: Text string to embed
        
    Returns:
        numpy array of shape (embedding_dimension,)
    """
    result = generate_embeddings([text])
    return result[0] if len(result) > 0 else np.array([])
