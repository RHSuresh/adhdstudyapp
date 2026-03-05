from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama
from better_profanity import profanity
import re
from flask_socketio import SocketIO, emit

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

client = ollama.Client()

# changed the model to recieve faster response (Initially, Llama 3.1)
CHAT_MODEL = "phi3:mini"
# model used for filtering
GUARD_MODEL = "llama-guard3"

# loads all innapropriate words form basic library
profanity.load_censor_words()  

# check if any word in text is within the profanity library, and returns true or false based on it
def needs_moderation(text: str) -> bool:
    return profanity.contains_profanity(text)


def is_safe(text: str) -> bool:
    # Uses the Llama Guard model to check if text is safe, returns boolean value
    try:
        response = client.generate(
            model=GUARD_MODEL,
            prompt=text
        )

        verdict = (
            response.get("response", "")
            if isinstance(response, dict)
            else getattr(response, "response", "")
        ).lower()

        return "unsafe" not in verdict
    except Exception as e:
        print("Guard model error:", e)
        # Fail-safe
        return False


def parse_actions(message: str):
    actions = []
    msg_lower = message.lower()
    
    # Set timer: "set timer to 25 minutes", "set a timer for 30 min", etc.
    set_match = re.search(r'set.*(?:timer|time|pomodoro).*?(\d+).*?(?:min|minutes)', msg_lower)
    if set_match:
        minutes = int(set_match.group(1))
        actions.append({"type": "set_timer", "focusMinutes": minutes})
    
    # Start timer: "start timer", "begin pomodoro", "set and start", etc.
    if re.search(r'\b(?:start|begin|set and start)\b.*?(?:timer|time|pomodoro)', msg_lower):
        actions.append({"type": "timer_start"})
    
    # Pause timer: "pause timer"
    if "pause timer" in msg_lower or "pause time" in msg_lower or "pause pomodoro" in msg_lower:
        actions.append({"type": "timer_pause"})
    
    # Reset timer: "reset timer"
    if "reset timer" in msg_lower or "reset time" in msg_lower or "reset pomodoro" in msg_lower:
        actions.append({"type": "timer_reset"})
    
    # Complete task: "complete task test", "mark task as done: study"
    complete_match = re.search(r'(?:complete|mark).*?task.*?(.+)', msg_lower)
    if complete_match:
        task_title = complete_match.group(1).strip()
        actions.append({"type": "complete_task", "title": task_title})
    
    return actions


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # INPUT MODERATION
    if needs_moderation(user_message) or not is_safe(user_message):
        return jsonify({"reply": "Sorry, I can't help with that request."})

    try:
        # Parse timer actions from user message
        actions = parse_actions(user_message)
        
        # If actions are detected, provide a simple confirmation instead of generating a full response
        if actions:
            if any(a['type'] == 'create_task' for a in actions):
                reply_text = "Task created! I've added it to your list. 📝"
            elif any(a['type'] == 'complete_task' for a in actions):
                reply_text = "Task completed! Great job! ✅"
            else:
                reply_text = "Got it! I've set up and started your timer. Let's focus! ⏱️"
        else:
            # Chatbot response generation
            response = client.generate(
                model=CHAT_MODEL,
                prompt=user_message,
                options={
                    "num_predict": 200, # tokens used to create response
                    "temperature": 0.7 # creativity of the chatbot's response
                }
            )

            reply_text = (
                response.get("response", "")
                if isinstance(response, dict)
                else getattr(response, "response", "")
            )

        # OUTPUT MODERATION
        if needs_moderation(reply_text) or not is_safe(reply_text):
            reply_text = "Sorry, I can't respond to that."

        # Return reply and any actions
        result = {"reply": reply_text}
        if actions:
            result["actions"] = actions
            # Emit actions directly to connected clients for real-time control
            socketio.emit('timer_actions', actions)
        
        return jsonify(result)

    except Exception as e:
        print("Backend error:", e)
        return jsonify({"error": "Model error"}), 500


if __name__ == "__main__":
    print("Chatbot API running on http://127.0.0.1:5001/api/chat")
    socketio.run(app, host="0.0.0.0", port=5001, debug=True)
