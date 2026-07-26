import cv2
import sys

def play_video(path):
    cap = cv2.VideoCapture(path)

    if not cap.isOpened():
        print(f"Error: could not open {path}")
        return

    backSub = cv2.createBackgroundSubtractorMOG2()

    # Kernel created once, outside the loop — it doesn't change per frame
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    while True:
        ret, frame = cap.read()

        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        fgMask = backSub.apply(frame)

        # Step 1: strict black/white threshold
        _, thresh = cv2.threshold(fgMask, 200, 255, cv2.THRESH_BINARY)

        # Step 2: opening (erode then dilate) to kill small noise specks
        opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        cv2.imshow("Original", frame)
        cv2.imshow("Raw Mask", fgMask)
        cv2.imshow("Cleaned Mask", opened)

        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python clean_mask.py <path_to_video.mp4>")
        sys.exit(1)

    play_video(sys.argv[1])