from ultralytics import YOLO
import gradio as gr
import cv2
import numpy as np

# Load your trained YOLOv8 model
model = YOLO("best.pt")  # or "yolov8s.pt" for base model

def detect(image):
    # Run inference
    results = model(image)[0]

    # Draw bounding boxes
    annotated_frame = results.plot()
    
    return annotated_frame

# Gradio Interface (Image input and annotated image output)
demo = gr.Interface(fn=detect, 
                    inputs=gr.Image(type="numpy"), 
                    outputs="image", 
                    title="YOLOv8 Plant Health Detection")

demo.launch()
