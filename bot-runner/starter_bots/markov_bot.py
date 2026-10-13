"""
starter_bots/markov_bot.py - Bot mau: Chuoi Markov bac 1 du doan nuoc tiep theo
"""
import random
from collections import defaultdict

BEATS = {"ROCK": "PAPER", "PAPER": "SCISSORS", "SCISSORS": "ROCK"}
MOVES = ["ROCK", "PAPER", "SCISSORS"]

def make_move(my_moves, opponent_moves):
    if len(opponent_moves) < 2:
        return random.choice(MOVES)
    
    # Xay dung bang chuyen doi
    transitions = defaultdict(list)
    for i in range(len(opponent_moves) - 1):
        transitions[opponent_moves[i]].append(opponent_moves[i+1])
    
    last_move = opponent_moves[-1]
    if last_move in transitions and transitions[last_move]:
        # Du doan nuoc tiep theo cua doi thu
        predicted = random.choice(transitions[last_move])
        # Danh nuoc thang predicted
        return BEATS.get(predicted, random.choice(MOVES))
    
    return random.choice(MOVES)
