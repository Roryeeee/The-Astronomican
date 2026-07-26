import cv2
import sys

def play_video(path):
    cap = cv2.VideoCapture(path)

    if not cap.isOpened():
        print(f"Error: could not open {path}")
        return

    backSub = cv2.createBackgroundSubtractorMOG2()
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    min_area = 50  # tune based on your footage

    while True:
        ret, frame = cap.read()

        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        fgMask = backSub.apply(frame)
        _, thresh = cv2.threshold(fgMask, 200, 255, cv2.THRESH_BINARY)
        opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        # Find contours in the cleaned mask
        contours, hierarchy = cv2.findContours(
            opened, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Filter out tiny noise contours
        large_contours = [c for c in contours if cv2.contourArea(c) > min_area]

        # Draw a bounding box on the ORIGINAL frame for each surviving blob
        for c in large_contours:
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # Optional: label it with its area, handy for debugging/tuning
            area = int(cv2.contourArea(c))
            cv2.putText(frame, f"area={area}", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        cv2.imshow("Tracked", frame)
        cv2.imshow("Cleaned Mask", opened)

        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python contours.py <path_to_video.mp4>")
        sys.exit(1)

    play_video(sys.argv[1])