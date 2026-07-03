#!/usr/bin/env python
"""
Django Backend Startup Script for WE ARE UNITED
Starts the Django development server on port 8000
"""

import os
import sys
import subprocess
import platform

# Set the backend directory
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')

# Change to backend directory
os.chdir(backend_dir)

# Determine the virtual environment Python executable
if platform.system() == 'Windows':
    venv_python = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
else:
    venv_python = os.path.join(backend_dir, 'venv', 'bin', 'python')

# Use venv python if it exists, otherwise use system python
python_exe = venv_python if os.path.exists(venv_python) else sys.executable

# Run the Django development server
print("=" * 60)
print("WE ARE UNITED - Django Backend Server")
print("=" * 60)
print(f"Working directory: {os.getcwd()}")
print(f"Python executable: {python_exe}")
print("Starting Django development server on http://localhost:8000")
print("Django Admin: http://localhost:8000/admin")
print("Username: admin")
print("Password: admin123")
print("Press Ctrl+C to stop")
print("=" * 60)
print()

# Run manage.py
subprocess.run([python_exe, '-u', 'manage.py', 'runserver', '0.0.0.0:8000'])
