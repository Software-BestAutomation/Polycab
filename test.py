# server.py
from flask import Flask, Response, request
import cv2
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Camera IP / credentials
CAMERA_IP   = "192.168.1.250"
USERNAME    = "admin"
PASSWORD    = "admin123"

API_KEY = "mysecretkey"

def rtsp_url():
    return f"rtsp://{USERNAME}:{PASSWORD}@{CAMERA_IP}:554/cam/realmonitor?channel=1&subtype=0"

def mjpeg_generator(rtsp):
    cap = cv2.VideoCapture(rtsp, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print("RTSP failed")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        _, buf = cv2.imencode('.jpg', frame)
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
    cap.release()

def require_key(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.headers.get("X-API-KEY") != API_KEY:
            return "Unauthorized", 401
        return fn(*args, **kwargs)
    return wrapper

@app.route('/video')
def video():
    # check key from query parameters
    if request.args.get("key") != API_KEY:
        return "Unauthorized", 401

    return Response(mjpeg_generator(rtsp_url()),
                    mimetype="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
