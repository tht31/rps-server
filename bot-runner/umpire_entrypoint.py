"""
bot-runner/umpire_entrypoint.py
Duoc Worker goi: python3 umpire_entrypoint.py /path/to/bot.py

Protocol:
  - Doc JSON tu stdin moi luot: {"myMoves": [...], "opponentMoves": [...], "turn": N}
  - Import ham make_move(my_moves, opponent_moves) tu bot cua sinh vien
  - In ra stdout: nuoc di (ROCK/PAPER/SCISSORS/LIZARD/SPOCK)
  - Flush ngay lap tuc sau moi luot
"""
import sys
import json
import importlib.util
import signal
import traceback

# Timeout signal cho moi luot
def timeout_handler(signum, frame):
    print("INVALID", flush=True)

# Nap bot cua sinh vien
def load_bot(bot_path: str):
    spec = importlib.util.spec_from_file_location("student_bot", bot_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def main():
    if len(sys.argv) < 2:
        print("Usage: umpire_entrypoint.py <bot_path>", file=sys.stderr)
        sys.exit(1)

    bot_path = sys.argv[1]
    
    try:
        bot_module = load_bot(bot_path)
        if not hasattr(bot_module, 'make_move'):
            print("Bot is missing make_move(my_moves, opponent_moves) function", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Bot load error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

    # Vong lap nhan lenh tu Umpire
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            my_moves = data.get("myMoves", [])
            opponent_moves = data.get("opponentMoves", [])
            turn = data.get("turn", 0)

            # Goi ham sinh vien voi timeout Linux (Unix only)
            try:
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(1)  # 1 giay tong the cho moi luot
            except AttributeError:
                pass  # Windows khong co SIGALRM

            try:
                result = bot_module.make_move(my_moves, opponent_moves)
                valid_moves = {"ROCK", "PAPER", "SCISSORS", "LIZARD", "SPOCK"}
                move = str(result).strip().upper() if result else "INVALID"
                if move not in valid_moves:
                    move = "INVALID"
            except Exception:
                move = "INVALID"
            finally:
                try:
                    signal.alarm(0)
                except AttributeError:
                    pass

            print(move, flush=True)

        except json.JSONDecodeError:
            print("INVALID", flush=True)
        except Exception:
            print("INVALID", flush=True)

if __name__ == "__main__":
    main()
