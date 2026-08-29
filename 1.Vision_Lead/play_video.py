import cv2
import sys

def play_video(path):
    cap = cv2.VideoCapture(path)

    if not cap.isOpened():
        print(f"Error: could not open {path}")
        return

    while True:
        ret, frame = cap.read()

        if not ret:
            # ret is False when the video ends or a frame fails to read
            print("End of video (or read error).")
            break

        cv2.imshow("Video", frame)

        # waitKey(25) ~ roughly matches a 30-40fps playback pace
        # it also returns the key pressed, so we can quit on 'q'
        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python play_video.py <path_to_video.mp4>")
        sys.exit(1)

    play_video(sys.argv[1])