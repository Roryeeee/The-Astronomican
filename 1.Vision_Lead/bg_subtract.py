import cv2
import sys

def play_video(path):
    cap = cv2.VideoCapture(path)

    if not cap.isOpened():
        print(f"Error: could not open {path}")
        return

    # Create the background subtractor ONCE, before the loop
    backSub = cv2.createBackgroundSubtractorMOG2()

    while True:
        ret, frame = cap.read()

        if not ret:
            # End of video reached — rewind to frame 0 and keep playing
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        # Feed the current frame into the model, get back the foreground mask
        fgMask = backSub.apply(frame)

        cv2.imshow("Original", frame)
        cv2.imshow("Foreground Mask", fgMask)

        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python bg_subtract.py <path_to_video.mp4>")
        sys.exit(1)

    play_video(sys.argv[1])