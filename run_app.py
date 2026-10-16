import subprocess
import sys
import os
import time

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    python_bin = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    if not os.path.exists(python_bin):
        python_bin = sys.executable

    print("=" * 60)
    print("🚀 SMART STACK AI - UNIFIED APPLICATION LAUNCHER")
    print("=" * 60)
    print("• Backend API & SSE Stream: http://localhost:8000")
    print("• Interactive Dashboard:    http://localhost:5173")
    print("• API Documentation:        http://localhost:8000/docs")
    print("=" * 60)

    # 1. Start Backend with Uvicorn
    backend_proc = subprocess.Popen(
        [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir
    )

    # 2. Start Frontend with Vite
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Smart Stack AI servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("Done.")

if __name__ == "__main__":
    main()

