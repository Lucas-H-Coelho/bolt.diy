from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World from Flask!</p>"

if __name__ == "__main__":
    # This is for running locally, e.g., python app.py
    # For Docker, use the start-flask.sh script or direct flask run command
    app.run(host='0.0.0.0', port=5000, debug=True)
