from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# ---------- Shell route ----------
@app.get("/")
def index():
    return render_template("index.html")

# ---------- Partials (HTML snippets for SPA) ----------
@app.get("/partials/<name>")
def partials(name):
    allowed = {"dashboard", "labs_request", "camera_request"}
    if name not in allowed:
        return ("Not found", 404)
    return render_template(f"partials/{name}.html")

# ---------- Demo REST APIs (replace with DB logic) ----------
@app.get("/api/labs")
def get_labs():
    labs = [
        {"id": 1, "name": "Lab 1", "total_cameras": 3, "online": 2},
        {"id": 2, "name": "Lab 2", "total_cameras": 3, "online": 1},
    ]
    return jsonify(labs)

@app.post("/api/labs")
def create_lab():
    data = request.get_json(force=True)
    # TODO: Validate + insert into DB
    return jsonify({"ok": True, "lab": data}), 201

@app.get("/api/cameras")
def get_cameras():
    cameras = [
        {"id": 1, "name": "Cam A", "lab_id": 1},
        {"id": 2, "name": "Cam B", "lab_id": 1},
        {"id": 3, "name": "Cam C", "lab_id": 1},
        {"id": 4, "name": "Cam A", "lab_id": 2},
        {"id": 5, "name": "Cam B", "lab_id": 2},
        {"id": 6, "name": "Cam C", "lab_id": 2},
    ]
    return jsonify(cameras)

@app.post("/api/camera-request")
def camera_request():
    payload = request.get_json(force=True)
    # TODO: Persist request and return an id from DB
    return jsonify({"request_id": 1234, "received": payload})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
