#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from typing import Any, Dict

def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, text=True, capture_output=True)
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(proc.returncode)

def main() -> None:
    path = os.environ.get("SECRETS_FILE", "secrets.json")
    region = os.environ.get("AWS_REGION", "us-east-1")

    if not os.path.isfile(path):
        raise SystemExit(f"secrets file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data: Dict[str, Any] = json.load(f)

    if not isinstance(data, dict) or not data:
        raise SystemExit("secrets.json must be a non-empty JSON object mapping secret names -> values")

    for secret_name, secret_value in data.items():
        if not isinstance(secret_name, str) or not secret_name.strip():
            raise SystemExit(f"invalid secret name: {secret_name!r}")

        # Store JSON payload as SecretString
        secret_string = json.dumps(secret_value, separators=(",", ":"), ensure_ascii=False)

        print(f"Updating {secret_name} ...")
        run([
            "aws", "secretsmanager", "put-secret-value",
            "--region", region,
            "--secret-id", secret_name,
            "--secret-string", secret_string
        ])

    print("Done.")

if __name__ == "__main__":
    main()