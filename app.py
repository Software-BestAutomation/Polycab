# app.py
import time
import os
import cv2
import threading
import requests
from flask import Flask, request, jsonify, render_template, Response, send_file
from requests.auth import HTTPDigestAuth

app = Flask(__name__)

# ---- Camera inventory ----
# If all use same credentials, keep here. If different, set per entry.
USERNAME = "admin"
PASSWORD = "admin123"

CAMERAS = {
    # id: { ip, rtsp(ch=1,subtype=0 main), http_base }
    1: {"ip": "192.168.1.250"},
    2: {"ip": "192.168.1.251"},
    3: {"ip": "192.168.1.252"},
    4: {"ip": "192.168.1.253"},
}


def rtsp_url(ip, user=USERNAME, pwd=PASSWORD, channel=1, subtype=0, port=554):
    return f"rtsp://{user}:{pwd}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype={subtype}"


def http_base(ip):
    return f"http://{ip}"


def timestamp():
    return time.strftime("%Y-%m-%d_%H-%M-%S")


def send_ptz(ip, action, code=None, speed=5):
    """
    CP Plus style:
      /cgi-bin/ptz.cgi?action={start|stop}&channel=1&code={Left|Right|Up|Down|ZoomTele|ZoomWide|FocusNear|FocusFar}&arg1=0&arg2={speed}&arg3=0
    """
    base = http_base(ip)
    url = f"{base}/cgi-bin/ptz.cgi?action={action}&channel=1"
    if code:
        url += f"&code={code}&arg1=0&arg2={speed}&arg3=0"

    r = requests.get(url, auth=HTTPDigestAuth(USERNAME, PASSWORD), timeout=4)
    if r.status_code == 200:
        return True, f"PTZ {action} {code or ''} ok"
    return False, f"PTZ failed ({r.status_code})"


def mjpeg_generator(rtsp):
    cap = cv2.VideoCapture(rtsp, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    if not cap.isOpened():
        print(f"Error: cannot open stream: {rtsp}")
        return
    while True:
        # grab/retrieve to skip buffered frames
        cap.grab()
        ok, frame = cap.retrieve()
        if not ok or frame is None:
            break
        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            continue
        yield (
            b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
        )
    cap.release()

from flask import send_from_directory

# --- SPA partials loader ---
@app.route("/partials/<name>.html")
def send_partial(name):
    # Only allow the known pages
    allowed = {"dashboard", "labs", "cameras", "requests", "sessions", "settings"}
    if name not in allowed:
        return "Not found", 404
    return send_from_directory(os.path.join(app.root_path, "templates", "partials"), f"{name}.html")



@app.route("/")
def index():
    return render_template("index.html")  # your 4-cam UI


@app.route("/video_feed")
def video_feed():
    """
    GET /video_feed?cam_id=1
    """
    try:
        cam_id = int(request.args.get("cam_id", "0"))
    except ValueError:
        return "bad cam_id", 400

    cam = CAMERAS.get(cam_id)
    if not cam:
        return "unknown camera", 404
    rtsp = rtsp_url(cam["ip"])
    return Response(
        mjpeg_generator(rtsp), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/ptz_control", methods=["POST"])
def ptz_control():
    """
    JSON: { cam_id: 1, action: "start"|"stop", direction: "Left"|"Right"|"Up"|"Down"|"FocusNear"|"FocusFar", speed: 1..8 }
    """
    data = request.get_json(force=True, silent=True) or {}
    cam_id = int(data.get("cam_id", 0))
    action = data.get("action")
    direction = data.get("direction")
    speed = int(data.get("speed", 5))

    cam = CAMERAS.get(cam_id)
    if not cam:
        return jsonify({"error": "unknown camera"}), 404
    if action not in ("start", "stop"):
        return jsonify({"error": "invalid action"}), 400

    ok, msg = send_ptz(cam["ip"], action, direction, speed)
    if ok:
        return jsonify({"message": msg})
    return jsonify({"error": msg}), 500


@app.route("/zoom_control", methods=["POST"])
def zoom_control():
    """
    JSON: { cam_id: 1, action: "start"|"stop", zoom: "ZoomTele"|"ZoomWide" }
    """
    data = request.get_json(force=True, silent=True) or {}
    cam_id = int(data.get("cam_id", 0))
    action = data.get("action", "start")
    zoom_code = data.get("zoom")

    cam = CAMERAS.get(cam_id)
    if not cam:
        return jsonify({"error": "unknown camera"}), 404

    ok, msg = send_ptz(cam["ip"], action, zoom_code, speed=5)
    if ok:
        return jsonify({"message": msg})
    return jsonify({"error": msg}), 500


def take_snapshot(rtsp, out_dir="./static/capture"):
    os.makedirs(out_dir, exist_ok=True)
    cap = cv2.VideoCapture(rtsp, cv2.CAP_FFMPEG)
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        return None
    path = os.path.join(out_dir, f"snapshot_{timestamp()}.jpg")
    cv2.imwrite(path, frame)
    return path


@app.route("/snapshot")
def snapshot():
    """
    GET /snapshot?cam_id=1
    """
    try:
        cam_id = int(request.args.get("cam_id", "0"))
    except ValueError:
        return "bad cam_id", 400
    cam = CAMERAS.get(cam_id)
    if not cam:
        return "unknown camera", 404
    path = take_snapshot(rtsp_url(cam["ip"]))
    if not path:
        return jsonify({"error": "capture failed"}), 500
    return send_file(path, mimetype="image/jpeg", as_attachment=True)


if __name__ == "__main__":
    # For MJPEG streaming, keep threaded=True to avoid blocking streams
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
