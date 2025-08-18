# app.py
import time
import os
import cv2
import threading
import requests
from flask import Flask, request, jsonify, render_template, Response, send_file
from requests.auth import HTTPDigestAuth
from db import get_conn, init_db

app = Flask(__name__)
init_db()

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
    base = http_base(ip)
    ptz_action = "start" if action == "start" else "stop"
    url = f"{base}/cgi-bin/ptz.cgi?action={ptz_action}&channel=1"
    if code:
        url += f"&code={code}&arg1=0&arg2={speed}&arg3=0"
    print("url: ", url)
    r = requests.get(url, auth=HTTPDigestAuth(USERNAME, PASSWORD), timeout=4)
    if r.status_code == 200:
        return True, f"PTZ {ptz_action} {code or ''} ok"
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
    return send_from_directory(
        os.path.join(app.root_path, "templates", "partials"), f"{name}.html"
    )


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


# DB API's


# -------- GET labs (list) ----------
@app.route("/api/labs", methods=["GET"])
def get_labs():
    con = get_conn()
    cur = con.cursor()
    cur.execute(
        """
        SELECT Lab_ID, Lab_name, Max_Cameras, Total_Cameras, Online_Cameras, Status, Description
        FROM Lab_Setting
    """
    )
    rows = cur.fetchall()
    labs = []
    for row in rows:
        labs.append(
            {
                "id": row.Lab_ID,
                "name": row.Lab_name,
                "maxCameras": row.Max_Cameras,
                "totalCameras": row.Total_Cameras,
                "onlineCameras": row.Online_Cameras,
                "status": row.Status,
                "description": row.Description,
            }
        )
    return jsonify(labs)


# GET /api/cameras
@app.route("/api/cameras", methods=["GET"])
def get_cameras():
    con = get_conn()
    cur = con.cursor()
    cur.execute(
        """
        SELECT c.Camera_ID,
               c.Camera_Name,
               c.Camera_IP,
               c.Status,
               c.PTZ_Support,
               l.Lab_name
        FROM Camera_Setting c
        LEFT JOIN Lab_Setting l ON c.Camera_ID = l.Camera_ID
    """
    )
    rows = cur.fetchall()
    cameras = []
    for row in rows:
        cameras.append(
            {
                "id": row.Camera_ID,
                "name": row.Camera_Name,
                "ipAddress": row.Camera_IP,
                "lab": row.Lab_name,
                "status": row.Status,
                "ptzSupport": bool(row.PTZ_Support),
            }
        )
    return jsonify(cameras)


# -------- ADD lab ----------
@app.route("/api/labs", methods=["POST"])
def add_lab():
    data = request.get_json(force=True)
    name = data.get("name")
    max_cameras = int(data.get("maxCameras"))
    status = data.get("status")
    description = data.get("description")

    con = get_conn()
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO Lab_Setting (Lab_name, Max_Cameras, Total_Cameras, Online_Cameras, Status, Description)
        VALUES (?, ?, 0, 0, ?, ?)
    """,
        (name, max_cameras, status, description),
    )
    con.commit()
    return jsonify({"message": "Lab added"}), 201


# -------- UPDATE lab ----------
@app.route("/api/labs/<int:lab_id>", methods=["PUT"])
def update_lab(lab_id):
    data = request.get_json(force=True)
    name = data.get("name")
    max_cameras = int(data.get("maxCameras"))
    status = data.get("status")
    description = data.get("description")

    con = get_conn()
    cur = con.cursor()
    cur.execute(
        """
        UPDATE Lab_Setting
        SET Lab_name = ?, Max_Cameras = ?, Status = ?, Description = ?
        WHERE Lab_ID = ?
    """,
        (name, max_cameras, status, description, lab_id),
    )
    con.commit()
    return jsonify({"message": "Lab updated"})


# -------- DELETE lab ----------
@app.route("/api/labs/<int:lab_id>", methods=["DELETE"])
def delete_lab(lab_id):
    con = get_conn()
    cur = con.cursor()
    cur.execute("DELETE FROM Lab_Setting WHERE Lab_ID = ?", (lab_id,))
    con.commit()
    return jsonify({"message": "Lab deleted"})


@app.route("/api/cameras", methods=["POST"])
def add_camera():
    data = request.get_json(force=True)
    name = data.get("name")
    ip = data.get("ipAddress")
    lab_name = data.get("lab")  # name of lab
    ptz = data.get("ptzSupport")  # boolean

    con = get_conn()
    cur = con.cursor()

    if lab_name:
        row = cur.execute(
            "SELECT Lab_ID, Total_Cameras, Max_Cameras FROM Lab_Setting WHERE Lab_name = ?",
            (lab_name,),
        ).fetchone()

        if not row:
            return jsonify({"error": f"Lab '{lab_name}' not found."}), 400

        if row.Total_Cameras >= row.Max_Cameras:
            return jsonify({"error": "Max streams reached for this lab."}), 409

    # insert camera with default values
    ptz_value = 1 if ptz else 0
    cur.execute(
        "INSERT INTO Camera_Setting (Camera_Name, Camera_IP, Status, PTZ_Support) VALUES (?,?,?,?)",
        (name, ip, "offline", ptz_value),
    )
    camera_id = cur.execute("SELECT @@IDENTITY").fetchval()

    # update mapping + increment total
    if lab_name:
        lab_id = row.Lab_ID
        cur.execute(
            "UPDATE Lab_Setting SET Total_Cameras = Total_Cameras + 1, Camera_ID = ? WHERE Lab_ID = ?",
            (camera_id, lab_id),
        )

    con.commit()
    return jsonify({"message": "Camera added"}), 201


# PUT /api/cameras/<camera_id>
@app.route("/api/cameras/<int:camera_id>", methods=["PUT"])
def update_camera(camera_id):
    data = request.get_json(force=True)
    name = data.get("name")
    ip = data.get("ipAddress")
    lab = data.get("lab")
    status = data.get("status")
    ptz_support = 1 if data.get("ptzSupport") else 0

    con = get_conn()
    cur = con.cursor()

    cur.execute(
        """
        UPDATE Camera_Setting
        SET Camera_Name = ?, Camera_IP = ?, Status = ?, PTZ_Support = ?
        WHERE Camera_ID = ?
    """,
        (name, ip, status, ptz_support, camera_id),
    )

    # update lab mapping
    if lab:
        cur.execute(
            "UPDATE Lab_Setting SET Camera_ID = NULL WHERE Camera_ID = ?", (camera_id,)
        )
        lab_id = cur.execute(
            "SELECT Lab_ID FROM Lab_Setting WHERE Lab_name = ?", (lab,)
        ).fetchval()
        if lab_id:
            cur.execute(
                "UPDATE Lab_Setting SET Camera_ID = ? WHERE Lab_ID = ?",
                (camera_id, lab_id),
            )

    con.commit()
    return jsonify({"message": "Camera updated"})


# DELETE /api/cameras/<camera_id>
@app.route("/api/cameras/<int:camera_id>", methods=["DELETE"])
def delete_camera(camera_id):
    con = get_conn()
    cur = con.cursor()
    cur.execute(
        "UPDATE Lab_Setting SET Camera_ID = NULL WHERE Camera_ID = ?", (camera_id,)
    )
    cur.execute("DELETE FROM Camera_Setting WHERE Camera_ID = ?", (camera_id,))
    con.commit()
    return jsonify({"message": "Camera deleted"})


if __name__ == "__main__":
    # For MJPEG streaming, keep threaded=True to avoid blocking streams
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
