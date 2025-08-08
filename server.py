import time  # Standard library for time-related operations (e.g., creating timestamps, delays)
import requests  # For making HTTP requests (used to control the camera's PTZ and zoom actions)
import cv2  # OpenCV library for handling video capture and image processing
from requests.auth import (
    HTTPDigestAuth,
)  # Provides digest authentication support for HTTP requests
from flask import Flask, request, jsonify, render_template, Response, send_file
import socket
import threading

# Imports from Flask for creating the web application and endpoints:
#   - Flask: the main application object.
#   - request: to access incoming request data.
#   - jsonify: to create JSON responses.
#   - render_template: to render HTML templates.
#   - Response: to send HTTP responses (useful for streaming).
#   - send_file: to send files (used for snapshots).
import os  # For file system operations such as saving and deleting files
import threading  # To run long-running tasks (recording video) in a background thread without blocking the web server


# Initialize the Flask application
app = Flask(__name__)

# CP PLUS Camera Credentials
CPPLUS_SERVER = "http://192.168.1.250"  # Base URL for camera HTTP commands
USERNAME = "admin"  # Username for the camera authentication
PASSWORD = "admin123"  # Password for the camera authentication


def timestamp():
    """
    Generate a timestamp string in the format YYYY-MM-DD_HH-MM-SS.

    Returns:
    - str: Current timestamp formatted as a string.
    """
    return time.strftime("%Y-%m-%d_%H-%M-%S")


# RTSP Stream URL (Real-Time Streaming Protocol) - used to fetch live video feed from the camera
RTSP_URL = f"rtsp://{USERNAME}:{PASSWORD}@192.168.1.250:554/cam/realmonitor?channel=1&subtype=0"


def perform_ptz(cam_id, action, direction=None, speed=5):
    """
    Send PTZ (Pan-Tilt-Zoom) control commands to a specified CP PLUS camera.

    Parameters:
    - cam_id (str): Camera ID (used to fetch the correct IP, credentials).
    - action (str): "start" or "stop"
    - direction (str, optional): Direction to move (e.g., "Left", "Right", "Up", "Down")
    - speed (int, optional): Speed of movement (default is 5)

    Returns:
    - dict: Response indicating success or failure.
    """

    # Define camera configurations
    camera_config = {
        "CAM1": {
            "ip": "192.168.1.250",
            "username": "admin",
            "password": "admin123",
        },
        "CAM2": {
            "ip": "192.168.1.251",
            "username": "admin",
            "password": "admin123",
        },
        "CAM3": {
            "ip": "192.168.1.252",
            "username": "admin",
            "password": "admin123",
        },
        "CAM4": {
            "ip": "192.168.1.253",
            "username": "admin",
            "password": "admin123",
        },
    }

    # Fetch camera info
    cam = camera_config.get(cam_id)
    if not cam:
        return {"error": f"Camera {cam_id} not found."}

    ip = cam["ip"]
    username = cam["username"]
    password = cam["password"]

    # Construct PTZ command URL
    url = f"http://{ip}/cgi-bin/ptz.cgi?action={action}&channel=1"
    if direction:
        url += f"&code={direction}&arg1=0&arg2={speed}&arg3=0"

    try:
        response = requests.get(url, auth=HTTPDigestAuth(username, password), timeout=3)
        if response.status_code == 200:
            return {
                "message": f"PTZ {action} {direction if direction else ''} successful"
            }
        else:
            return {
                "error": "Failed to control PTZ",
                "status_code": response.status_code,
                "response": response.text,
            }
    except requests.RequestException as e:
        return {"error": "PTZ request failed", "exception": str(e)}


def generate_frames(cam_id):
    # Map camera IDs to RTSP URLs
    camera_rtsp = {
        "1": "rtsp://admin:admin123@192.168.1.250:554/cam/realmonitor?channel=1&subtype=0",
        "2": "rtsp://admin:admin123@192.168.1.251:554/cam/realmonitor?channel=1&subtype=0",
        "3": "rtsp://admin:admin123@192.168.1.252:554/cam/realmonitor?channel=1&subtype=0",
        "4": "rtsp://admin:admin123@192.168.1.253:554/cam/realmonitor?channel=1&subtype=0",
    }
    rtsp_url = camera_rtsp.get(cam_id)
    if not rtsp_url:
        yield b""
        return

    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    if not cap.isOpened():
        print(f"Error: Can't open RTSP stream for cam {cam_id}")
        return

    try:
        while True:
            cap.grab()
            success, frame = cap.retrieve()
            if not success or frame is None:
                print(f"Failed to read frame from cam {cam_id}")
                break

            _, buffer = cv2.imencode(".jpg", frame)
            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
    finally:
        cap.release()
        with stream_lock:
            active_streams[cam_id] -= 1
            if active_streams[cam_id] == 0:
                del active_streams[cam_id]


@app.route("/")
def index():
    """
    Render the web interface for camera control.

    The corresponding HTML file (index.html) should provide UI controls
    for live streaming and PTZ control.
    """
    return render_template("index.html")


# Globals for stream tracking
active_streams = {}  # maps cam_id -> count of viewers
MAX_STREAMS = 4
stream_lock = threading.Lock()


@app.route("/video_feed/<cam_id>")
def video_feed(cam_id):
    with stream_lock:
        total_streams = sum(active_streams.values())
        if cam_id in active_streams:
            active_streams[cam_id] += 1
        elif total_streams < MAX_STREAMS:
            active_streams[cam_id] = 1
        else:
            return "Maximum concurrent streams reached", 429

    return Response(
        generate_frames(cam_id), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/ptz_control", methods=["POST"])
def ptz_control():
    """
    Handle PTZ control requests via HTTP POST.

    Expects a JSON payload with:
    - "cam_id": Camera ID (e.g., "CAM1")
    - "action": "start" or "stop"
    - "direction" (optional): Movement direction (e.g., "Left", "Right")
    - "speed" (optional): Movement speed (default is 5)
    """
    data = request.json
    cam_id = data.get("cam_id")
    action = data.get("action")
    direction = data.get("direction", None)
    speed = data.get("speed", 5)

    if not cam_id or not action:
        return jsonify({"error": "Missing 'cam_id' or 'action' in request"}), 400

    # Use updated function that supports camera-specific control
    result = perform_ptz(cam_id, action, direction, speed)
    return jsonify(result)


@app.route("/zoom_control", methods=["POST"])
def zoom_control():
    """
    Handle Zoom In/Out requests via HTTP POST.

    Expects a JSON payload with:
    - "zoom": "ZoomTele" (zoom in) or "ZoomWide" (zoom out)
    - "action": "start" or "stop"
    """
    data = request.json
    zoom_direction = data.get("zoom")  # 'ZoomTele' for zoom in, 'ZoomWide' for zoom out
    action = data.get("action", "start")  # "start" or "stop"

    # Construct the URL for zoom control
    url = f"{CPPLUS_SERVER}/cgi-bin/ptz.cgi?action={action}&channel=1&code={zoom_direction}&arg1=0&arg2=5&arg3=0"

    # Send HTTP request for zoom control
    response = requests.get(url, auth=HTTPDigestAuth(USERNAME, PASSWORD))

    if response.status_code == 200:
        return jsonify({"message": f"Zoom {action} {zoom_direction} successful"})
    else:
        return (
            jsonify(
                {"error": "Failed to control zoom", "status_code": response.status_code}
            ),
            response.status_code,
        )


def capture_snapshot():
    """
    Capture a snapshot (image) from the camera stream.

    This function:
    - Connects to the RTSP video stream.
    - Captures a single frame from the stream.
    - Saves the frame as a JPEG image at a specified file path.
    - Returns the file path of the saved image if successful, otherwise returns None.

    Useful for taking still images from the live camera feed.
    """

    # Open a connection to the RTSP video stream
    cap = cv2.VideoCapture(RTSP_URL)

    # Attempt to capture a single frame from the video stream
    success, frame = cap.read()

    # Check if a frame was successfully captured
    if success:
        # Define the file path where the snapshot will be saved
        snapshot_path = "./static/capture/" + timestamp() + ".jpg"

        # Save the captured frame as a JPEG image
        cv2.imwrite(snapshot_path, frame)

        # Release the video capture object to free system resources
        cap.release()

        # Return the file path of the saved snapshot
        return snapshot_path
    else:
        # If the frame could not be captured, release resources and return None
        cap.release()
        return None


@app.route("/snapshot")
def snapshot():
    """
    Capture and provide a snapshot for download.

    This route:
    - Calls the `capture_snapshot()` function to take a snapshot from the camera stream.
    - If successful, sends the snapshot file to the client as a downloadable JPEG.
    - If the snapshot fails, returns a JSON response with an error message.

    Returns:
    - `send_file()`: Sends the captured image file as a response.
    - `jsonify()`: Returns an error message if snapshot capture fails.
    - HTTP Status Code 200: If successful.
    - HTTP Status Code 500: If snapshot capture fails.
    """

    # Attempt to capture a snapshot and store the file path
    snapshot_path = capture_snapshot()

    # Check if snapshot capture was successful
    if snapshot_path:
        # Send the snapshot image file to the client for download
        return send_file(
            snapshot_path,  # Path to the captured image
            mimetype="image/jpeg",  # MIME type to specify it's a JPEG image
            as_attachment=True,  # Forces the browser to download the file instead of displaying it
        )
    else:
        # If the snapshot capture failed, return a JSON error response
        return (
            jsonify({"error": "Failed to capture snapshot"}),
            500,
        )  # HTTP 500 (Internal Server Error)


camera_locks = {}  # Tracks which client has control of which camera


def handle_client(client_socket, address, camera_api_handler):
    print(f"{address} connected.")
    try:
        while True:
            message = client_socket.recv(1024).decode().strip()
            if not message:
                break

            print(f"[RECEIVED] {message}")
            if message.startswith("$REQUEST_CAM,"):
                cam_id = (
                    message.split(",")[1].split("#")[0].strip()
                )  # ensures '1' is extracted from '1#\r\n'
                if cam_id not in camera_locks:
                    camera_locks[cam_id] = client_socket
                    client_socket.sendall(f"$ACK_CAM,{cam_id}#\r\n".encode())
                    print(f"[LOCKED] {cam_id} by {address}")
                    print(f"camera_locks: {camera_locks}")
                else:
                    client_socket.sendall(f"$NACK_CAM,{cam_id}#\r\n".encode())
                    print(
                        f"[NACK] {cam_id} already locked by {camera_locks[cam_id].getpeername()}"
                    )

            elif message.startswith("$PTZ,") or message.startswith("$SNAP,"):
                cleaned_message = message.split("#")[0].strip()
                parts = cleaned_message.split(",")
                cam_id = parts[1]

                if camera_locks.get(cam_id) == client_socket:
                    if message.startswith("$PTZ,"):
                        action = parts[2]
                        perform_ptz(cam_id, action)
                        client_socket.sendall(
                            f"$ACK_PTZ,{cam_id},{action}#\r\n".encode()
                        )
                        print(f"[PTZ] {action} command sent for {cam_id} by {address}")
                    elif message.startswith("$SNAP,"):
                        capture_snapshot(cam_id)
                        client_socket.sendall(f"$ACK_SNAP,{cam_id}#\r\n".encode())
                        print(f"[SNAP] Snapshot captured for {cam_id} by {address}")
                else:
                    client_socket.sendall(f"$UNAUTHORIZED,{cam_id}#\r\n".encode())
                    print(
                        f"[UNAUTHORIZED] {address} tried to control {cam_id} without lock"
                    )

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        # Release camera locks held by this client
        for cam_id, owner in list(camera_locks.items()):
            if owner == address:
                del camera_locks[cam_id]
        client_socket.close()
        print(f"[DISCONNECTED] {address} disconnected.")


def start_tcp_server(camera_api_handler, host="192.168.31.73", port=12345):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((host, port))
    server.listen(5)
    print(f"TCP Server running on {host}:{port}")

    while True:
        client_socket, addr = server.accept()
        thread = threading.Thread(
            target=handle_client, args=(client_socket, addr, camera_api_handler)
        )
        thread.start()


# def camera_api_handler(command_type, cam_id, action=None):
#     if command_type == "ptz":
#         print(f"PTZ Command for CAM {cam_id}: {action}")
#         send_ptz_command("start", direction=action)  # Modify logic as needed
#         send_ptz_command("stop", direction=action)
#     elif command_type == "snap":
#         print(f"Snapshot Command for CAM {cam_id}")
#         capture_snapshot()  # You may want to log or return the path

if __name__ == "__main__":
    # Start TCP server in a separate thread
    threading.Thread(target=start_tcp_server, args=(None,), daemon=True).start()

    # Start Flask app
    app.run(
        port=5000, debug=True, use_reloader=False
    )  # Disable reloader to avoid multiple threads
