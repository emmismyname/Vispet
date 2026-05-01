import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
DATABASE = BASE_DIR / "vitalpet.db"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                total_steps INTEGER NOT NULL DEFAULT 0,
                food_rations INTEGER NOT NULL DEFAULT 10,
                pet_level INTEGER NOT NULL DEFAULT 1,
                pet_exp INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()


def normalize_username(value):
    if not isinstance(value, str):
        return None
    username = value.strip()
    return username or None


def row_to_status(row):
    return {
        "username": row["username"],
        "level": row["pet_level"],
        "exp": row["pet_exp"],
        "food": row["food_rations"],
        "total_steps": row["total_steps"],
    }


def get_or_create_user(conn, username):
    row = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,),
    ).fetchone()

    if row is None:
        conn.execute(
            """
            INSERT INTO users (username, total_steps, food_rations, pet_level, pet_exp)
            VALUES (?, 0, 10, 1, 0)
            """,
            (username,),
        )
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    return row


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.route("/api/sync_health", methods=["POST", "OPTIONS"])
def sync_health():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    username = normalize_username(data.get("username"))
    steps = data.get("steps")

    if username is None:
        return jsonify({"status": "error", "message": "username is required"}), 400

    try:
        steps = int(steps)
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "steps must be an integer"}), 400

    if steps < 0:
        return jsonify({"status": "error", "message": "steps must be non-negative"}), 400

    added_food = steps // 1000

    with get_db() as conn:
        get_or_create_user(conn, username)
        conn.execute(
            """
            UPDATE users
            SET total_steps = total_steps + ?,
                food_rations = food_rations + ?
            WHERE username = ?
            """,
            (steps, added_food, username),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    return jsonify(
        {
            "status": "success",
            "message": "Health data synced",
            "added_food": added_food,
            "pet": row_to_status(row),
        }
    )


@app.route("/api/pet_status", methods=["GET"])
def pet_status():
    username = normalize_username(request.args.get("username"))

    if username is None:
        return jsonify({"status": "error", "message": "username is required"}), 400

    with get_db() as conn:
        row = get_or_create_user(conn, username)
        conn.commit()

    return jsonify(row_to_status(row))


@app.route("/api/feed", methods=["POST", "OPTIONS"])
def feed():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    username = normalize_username(data.get("username"))

    if username is None:
        return jsonify({"status": "error", "message": "username is required"}), 400

    with get_db() as conn:
        row = get_or_create_user(conn, username)

        if row["food_rations"] <= 0:
            conn.commit()
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Not enough food rations",
                        "pet": row_to_status(row),
                    }
                ),
                400,
            )

        food = row["food_rations"] - 1
        exp = row["pet_exp"] + 10
        level = row["pet_level"]

        while exp >= 100:
            exp -= 100
            level += 1

        conn.execute(
            """
            UPDATE users
            SET food_rations = ?,
                pet_exp = ?,
                pet_level = ?
            WHERE username = ?
            """,
            (food, exp, level, username),
        )
        conn.commit()

        updated = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    return jsonify({"status": "success", "message": "+10 EXP", "pet": row_to_status(updated)})


init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
