from __future__ import annotations
from openai import OpenAI
from app import config

# Initialize OpenAI client
client = OpenAI(api_key=config.OPENAI_API_KEY)

# Initial system prompts for different modes
PROMPTS = {
    "Study Session": "You are a helpful study companion. Help the student understand topics they ask about. Be encouraging and clear.",
    "Practice Quiz": "You are a quiz master. When the student asks for a quiz on a topic, generate 3 multiple choice questions. Check their answers and explain the correct ones.",
    "Practice Exam": "You are an exam proctor. Generate a harder, open-ended question for the student to answer. Grade their response on a scale of 1-10 and provide feedback."
}

def process_chat(mode: str, message: str) -> str:
    """
    Process a chat message from the student based on the selected mode.
    """
    system_prompt = PROMPTS.get(mode, PROMPTS["Study Session"])
    
    try:
        response = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in chat processing: {e}")
        return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later."
