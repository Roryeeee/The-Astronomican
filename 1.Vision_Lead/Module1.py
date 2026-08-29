"""
OrbitPoint — Module 1: Vision & Ingestion
-------------------------------------------
Reads a telescope .mp4, isolates the moving object against the static
star field, and exports a Contract A JSON file for the Backend module.

Pipeline: BackgroundSub (MOG2) -> Threshold/Morphology -> Contours
          -> Area filter -> Nearest-neighbor pick -> Centroid -> JSON

Usage:
    python track.py --input sample_pass.mp4 --output detections.json
"""

import cv2
import json
import argparse
import math


# ---------------------------------------------------------------------
# Pipeline components (created once, reused every frame)
# ---------------------------------------------------------------------

def create_pipeline_components():
    backSub = cv2.createBackgroundSubtractorMOG2(detectShadows=False)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    return backSub, kernel


def get_foreground_mask(frame, backSub):
    return backSub.apply(frame)


def clean_mask(fgMask, kernel, thresh_val=200):
    _, thresh = cv2.threshold(fgMask, thresh_val, 255, cv2.THRESH_BINARY)
    opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    return opened


def find_candidate_contours(mask, min_area=5, max_area=500):
    """Weekend 6: reject noise (too small) AND clouds/lens flare (too large)."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [c for c in contours if min_area < cv2.contourArea(c) < max_area]


def get_centroid(contour):
    """Weekend 5: image moments -> precise center point."""
    M = cv2.moments(contour)
    if M['m00'] == 0:
        return None
    cx = M['m10'] / M['m00']
    cy = M['m01'] / M['m00']
    return cx, cy


def pick_best_contour(contours, last_point):
    """
    Weekend 6: if multiple valid blobs survive filtering, pick the one
    closest to the previous frame's position (simple nearest-neighbor,
    not a tracking library). If there's no prior point yet, fall back
    to the largest contour.
    """
    if not contours:
        return None

    if last_point is None:
        return max(contours, key=cv2.contourArea)

    def dist_to_last(c):
        centroid = get_centroid(c)
        if centroid is None:
            return math.inf
        cx, cy = centroid
        lx, ly = last_point
        return math.hypot(cx - lx, cy - ly)

    return min(contours, key=dist_to_last)


# ---------------------------------------------------------------------
# Main extraction loop
# ---------------------------------------------------------------------

def extract_detections(video_path, min_area=5, max_area=500, show=False):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise IOError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    backSub, kernel = create_pipeline_components()

    detections = []
    last_point = None
    frame_number = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break  # end of video — extraction runs once through, no looping

        fgMask = get_foreground_mask(frame, backSub)
        mask = clean_mask(fgMask, kernel)
        candidates = find_candidate_contours(mask, min_area, max_area)
        best = pick_best_contour(candidates, last_point)

        if best is not None:
            centroid = get_centroid(best)
            if centroid is not None:
                cx, cy = centroid
                last_point = (cx, cy)

                detections.append({
                    "frame_number": frame_number,
                    "timestamp_sec": round(frame_number / fps, 3),
                    "pixel_x": round(cx, 1),
                    "pixel_y": round(cy, 1),
                })

                if show:
                    x, y, w, h = cv2.boundingRect(best)
                    cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        if show:
            cv2.imshow("Tracked", frame)
            cv2.imshow("Cleaned Mask", mask)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        frame_number += 1

    cap.release()
    if show:
        cv2.destroyAllWindows()

    meta = {
        "frame_width": frame_width,
        "frame_height": frame_height,
        "fps": fps,
        "total_frames": frame_number,
        "detections_found": len(detections),
    }
    return detections, meta


# ---------------------------------------------------------------------
# Contract A export
# ---------------------------------------------------------------------

def build_contract_a(video_id, detections, meta,
                      observer=None, telescope=None,
                      recording_start_utc=None):
    """
    Assembles the exact JSON shape Module 2 expects.
    observer/telescope/recording_start_utc can be hardcoded stand-ins
    for early integration tests, per the Shared Foundations doc.
    """
    return {
        "video_id": video_id,
        "frame_width": meta["frame_width"],
        "frame_height": meta["frame_height"],
        "fps": meta["fps"],
        "observer": observer or {
            "latitude_deg": 27.7172,
            "longitude_deg": 85.3240,
            "elevation_m": 1400
        },
        "telescope": telescope or {
            "center_azimuth_deg": 180.0,
            "center_elevation_deg": 45.0,
            "horizontal_fov_deg": 2.5,
            "vertical_fov_deg": 1.5
        },
        "recording_start_utc": recording_start_utc or "2026-01-01T00:00:00Z",
        "detections": detections,
    }


# ---------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OrbitPoint Module 1 — extract moving-object centroids from telescope video"
    )
    parser.add_argument("--input", required=True, help="Path to input .mp4 video")
    parser.add_argument("--output", required=True, help="Path to output Contract A .json file")
    parser.add_argument("--video-id", default=None, help="video_id to embed in output (defaults to filename)")
    parser.add_argument("--min-area", type=float, default=5, help="Minimum contour area (noise floor)")
    parser.add_argument("--max-area", type=float, default=500, help="Maximum contour area (rejects clouds/flare)")
    parser.add_argument("--show", action="store_true", help="Display tracking windows while processing")
    args = parser.parse_args()

    video_id = args.video_id or args.input.rsplit("/", 1)[-1].rsplit(".", 1)[0]

    print(f"Processing {args.input} ...")
    detections, meta = extract_detections(
        args.input, min_area=args.min_area, max_area=args.max_area, show=args.show
    )

    print(f"Frames processed: {meta['total_frames']}")
    print(f"Detections found: {meta['detections_found']}")

    if not detections:
        print("WARNING: no detections found in this video. "
              "Check --min-area/--max-area or that the target is actually moving.")

    contract_a = build_contract_a(video_id, detections, meta)

    with open(args.output, "w") as f:
        json.dump(contract_a, f, indent=2)

    print(f"Wrote Contract A output to {args.output}")


if __name__ == "__main__":
    main()