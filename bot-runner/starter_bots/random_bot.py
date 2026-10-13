"""
starter_bots/random_bot.py - Bot mau BTC: Nuoc di ngau nhien
Sinh vien co the dung bot nay de luyen tap
"""
import random

def make_move(my_moves, opponent_moves):
    """
    Tra ve 1 trong: ROCK, PAPER, SCISSORS
    (Vong chung ket them: LIZARD, SPOCK)
    
    my_moves: Danh sach nuoc di cua chinh minh (cu nhat truoc)
    opponent_moves: Danh sach nuoc di cua doi thu
    """
    return random.choice(["ROCK", "PAPER", "SCISSORS"])
