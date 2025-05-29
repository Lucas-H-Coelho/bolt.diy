#!/bin/bash
# Default Flask app file is app.py, adjust if your main file is different
FLASK_APP_FILE=${FLASK_APP_FILE:-app.py}
FLASK_RUN_HOST=${FLASK_RUN_HOST:-0.0.0.0}
FLASK_RUN_PORT=${FLASK_RUN_PORT:-5000}

echo "Starting Flask app $FLASK_APP_FILE on $FLASK_RUN_HOST:$FLASK_RUN_PORT..."
python3 -m flask run --host=$FLASK_RUN_HOST --port=$FLASK_RUN_PORT --app=$FLASK_APP_FILE
