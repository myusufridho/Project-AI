import cv2
import torch
import os
from gtts import gTTS
import pygame


# Inisialisasi Pygame
pygame.mixer.init()

# Inisialisasi variabel
play_audio = True
# Model
model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

# Capture video
vid = cv2.VideoCapture(0)

while True:
    # Capture video frame
    ret, frame = vid.read()
  
    # Display the resulting frame
    cv2.imshow('frame', frame)
      
    # Check for key press
    key = cv2.waitKey(1) & 0xFF
    
    # Exit loop if 'q' is pressed
    if key == ord('q'):
        break
    
    # Toggle audio playback on/off if 'p' is pressed
    if key == ord('p'):
        play_audio = not play_audio
        
    # Perform object detection
    results = model(frame)
    df = results.pandas().xyxy[0]
    
    # Extract labels
    labels = " ".join(df['name'].tolist())

    if labels:
        tts = gTTS(text=labels, lang='en')
        tts.save('ttsku8.mp3')
        audio_file = "ttsku8.mp3"
    # Memainkan file audio
        pygame.mixer.music.load(audio_file)
        pygame.mixer.music.play()

    # Tunggu hingga audio selesai
    while pygame.mixer.music.get_busy():
        continue

# Release video capture and close windows
vid.release()
cv2.destroyAllWindows()
os.remove("ttsku8.mp3")
