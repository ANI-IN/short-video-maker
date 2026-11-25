"""Visual-engine recommendation (the research agent decides with this as its stated policy; this file is the
transparent fallback/explainer shown when research didn't pick).

  documentary-history  historical / biographical / ancient topics: reigns, wars, empires, monuments, famous lives
  character-story      narrative / mythological / fable topics where named characters act a specific moment
  real-footage         concrete modern things the camera can show: places, products, animals, people, events
  animation style      abstract / explanatory / data / tips -> the closest of the 23 code-animation styles
"""
from __future__ import annotations

import re

RULES = [
    ("character-story", r"\b(dice game|counsel|dialogue|scene where|story of|fable|legend of|panchatantra|jataka|krishna|arjuna|draupadi|ram(a)?\b|sita|hanuman|ravana|shiva|parvati|ganesh|akbar.*birbal|tenali)\b",
     "a narrative moment with named characters who need to act it out"),
    ("documentary-history", r"\b(history|historical|ancient|empire|dynasty|reign|war|battle|king|queen|emperor|mughal|maratha|chola|maurya|gupta|british raj|independence|partition|colonial|medieval|pharaoh|rome|roman|greek|viking|biography|life of|who was|mahabharat|ramayan|epic|monument|fort|temple)\b",
     "history/biography: cut between archive imagery, maps, timelines and short reenactments"),
    ("real-footage", r"\b(city|country|travel|places?|food|recipe|animal|wildlife|car|phone|gadget|product|building|bridge|ocean|mountain|festival|sport|space|planet)\b",
     "concrete things the camera can show — licensed photos/clips beat drawings"),
]
STYLE_BY_TOPIC = [
    (r"\b(statistic|percent|data|survey|growth|market|price|economy|gdp)\b", "bar-pie-chart"),
    (r"\b(timeline|evolution|history of|over the years)\b", "timeline-roadmap"),
    (r"\b(code|coding|programming|ai|hack|software|computer|tech)\b", "typewriter-terminal"),
    (r"\b(compare|vs|versus|difference|better)\b", "split-screen"),
    (r"\b(how to|tips?|hacks?|study|learn|explain)\b", "whiteboard"),
    (r"\b(health|sleep|fitness|food|habit)\b", "emoji-pop"),
    (r"\b(myth|facts?|did you know|secret)\b", "kinetic-typography"),
]


def recommend(topic: str) -> dict:
    t = topic.lower()
    for engine, pat, why in RULES:
        if re.search(pat, t):
            return {"engine": engine, "style": engine, "reasoning": why}
    for pat, style in STYLE_BY_TOPIC:
        if re.search(pat, t):
            return {"engine": "animation", "style": style, "reasoning": "abstract/explanatory topic: a punchy code-animation style fits"}
    return {"engine": "animation", "style": "kinetic-typography", "reasoning": "no concrete imagery or characters implied: bold kinetic type"}


if __name__ == "__main__":
    import sys
    for t in sys.argv[1:] or ["5 shocking facts about the Mahabharat war", "Krishna's counsel to Arjuna", "the partition of India 1947",
                               "how noise cancelling headphones work", "Tokyo's best street food", "is AI coding replacing developers"]:
        print(t, "->", recommend(t))
