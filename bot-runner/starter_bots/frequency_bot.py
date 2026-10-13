"""
starter_bots/frequency_bot.py - Bot mau: Dem tan suat nuoc doi thu va dung nuoc khac chiet
"""
import random
from collections import Counter

BEATS = {"ROCK": "PAPER", "PAPER": "SCISSORS", "SCISSORS": "ROCK"}

def make_move(my_moves, opponent_moves):
    if not opponent_moves:
        return random.choice(["ROCK", "PAPER", "SCISSORS"])
    
    # Tim nuoc pho bien nhat cua doi thu
    counts = Counter(opponent_moves)
    most_common = counts.most_common(1)[0][0]
    
    # Danh nuoc that bai nuoc do
    return BEATS.get(most_common, "ROCK")
