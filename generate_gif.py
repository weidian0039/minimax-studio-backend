#!/usr/bin/env python3
"""Capture animated mission demo HTML as a GIF using Playwright + PIL."""

import os
import io
import time
from PIL import Image
from playwright.sync_api import sync_playwright

HTML_PATH = os.path.join(os.path.dirname(__file__), "mission-demo-animated.html")
OUTPUT_GIF = os.path.join(os.path.dirname(__file__), "mission-demo-animated.gif")
FRAME_DIR = os.path.join(os.path.dirname(__file__), "frames")
os.makedirs(FRAME_DIR, exist_ok=True)

FPS = 4  # frames per second for the output GIF
DURATION = 7  # seconds of animation to capture

# Animation timeline reference:
# 0.0s - Logo fades in
# 0.7s - Tagline fades in
# 1.2s - Step 1 card reveals
# 1.9s - Arrow 1 reveals
# 2.4s - Step 2 card reveals
# 3.1s - Arrow 2 reveals
# 3.6s - Step 3 card reveals
# 4.5s - Bottom note fades in, active classes added
# 5.0s+ - Step highlight cycle begins (7s total cycle)

# Capture timestamps (seconds into animation)
# We want to capture every 0.25s for smooth animation
timestamps = [round(i * 0.25, 2) for i in range(1, int(DURATION * 4) + 1)]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1200, "height": 700})

        # Load the HTML file
        page.goto(f"file://{HTML_PATH}")
        page.bring_to_front()

        # Wait for initial load
        page.wait_for_timeout(500)

        frames = []

        for i, ts in enumerate(timestamps):
            # Wait until this specific time
            page.wait_for_timeout(int((ts - (timestamps[i-1] if i > 0 else 0)) * 1000))
            # Screenshot
            img_bytes = page.screenshot(type="png")
            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            frames.append(img)
            print(f"Captured frame {i+1}/{len(timestamps)} at t={ts}s")

        browser.close()

    # Resize frames to a manageable size for GIF
    target_w, target_h = 960, 560
    resized = [f.resize((target_w, target_h), Image.LANCZOS) for f in frames]

    # Convert RGBA to RGB (GIF doesn't support transparency)
    rgb_frames = [f.convert("RGB") for f in resized]

    # Save as GIF — each frame = 1/FPS seconds
    frame_duration = int(1000 / FPS)  # milliseconds per frame

    # Optimize and deduplicate frames for smaller file
    rgb_frames[0].save(
        OUTPUT_GIF,
        save_all=True,
        append_images=rgb_frames[1:],
        duration=frame_duration,
        loop=0,  # infinite loop
        optimize=True,
    )

    size_mb = os.path.getsize(OUTPUT_GIF) / (1024 * 1024)
    print(f"\nGIF saved: {OUTPUT_GIF}")
    print(f"Size: {size_mb:.2f} MB")
    print(f"Frames: {len(rgb_frames)}, Duration: {len(rgb_frames)/FPS:.1f}s, Loop: infinite")

if __name__ == "__main__":
    main()
