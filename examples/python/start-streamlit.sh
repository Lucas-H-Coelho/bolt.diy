#!/bin/bash
# Default Streamlit app file is app.py, adjust if your main file is different
STREAMLIT_APP_FILE=${STREAMLIT_APP_FILE:-app.py}
STREAMLIT_SERVER_ADDRESS=${STREAMLIT_SERVER_ADDRESS:-0.0.0.0}
STREAMLIT_SERVER_PORT=${STREAMLIT_SERVER_PORT:-8501}

echo "Starting Streamlit app $STREAMLIT_APP_FILE on $STREAMLIT_SERVER_ADDRESS:$STREAMLIT_SERVER_PORT..."
streamlit run $STREAMLIT_APP_FILE --server.address=$STREAMLIT_SERVER_ADDRESS --server.port=$STREAMLIT_SERVER_PORT --server.enableCORS=false --server.headless=true
