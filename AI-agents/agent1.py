import asyncio
from agents import Agent, Runner

agent = Agent(
    name="Math Tutor",
    instructions="You provide help with math problems. Explain your reasoning at each step and include examples.",
)

async def main():
    result = await Runner.run(agent, "Solve: 3x + 5 = 20. Find x.")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
