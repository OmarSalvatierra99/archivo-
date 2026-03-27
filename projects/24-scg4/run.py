#!/usr/bin/env python3
"""Entry point for SCG4"""

import os
from app import create_app

app = create_app(os.environ.get("FLASK_ENV", "default"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5022))
    app.run(host="0.0.0.0", port=port)
