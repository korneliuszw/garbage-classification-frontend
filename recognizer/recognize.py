import traceback
from flask import Flask, request, jsonify, Response
from werkzeug.utils import secure_filename
import os
import tempfile
import shutil
from ultralytics import YOLO
from PIL import Image
import json
import uuid
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize models
print("Loading models...")
detect = YOLO("recognizer/detect-model.pt")
classify = YOLO("recognizer/ddnU2LQ.pt")
print("Models loaded successfully")

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

def auto_map(class_name):
    class_name = class_name.lower()
    for plastic in ["can", "plastic", "metal", "pop"]:
        if plastic in class_name:
            return "plastik i metal"
    for paper in ["paper", "cardboard", "carton"]:
        if paper in class_name:
            return "papier"
    for bio in ["food", "fruit", "biological"]:
        if bio in class_name:
            return "bio"
    if "glass" in class_name:
        return "szklo"
    if "battery" in class_name:
        return "odpady komunalne"
    else:
        return "zmieszane"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def recognize_image(image_path):
    """Recognize image and return class and confidence"""
    result = classify(image_path)[0]
    predicted_class = result.names[result.probs.top1]
    confidence = float(result.probs.top1conf)
    return predicted_class, confidence

def create_multipart_response(results, image_files, dir):
    """Create multipart response with metadata and image files"""
    boundary = str(uuid.uuid4())
    print(image_files)
    
    def generate():
        # First part: metadata as JSON
        yield f'--{boundary}\r\n'
        yield f'Content-Disposition: form-data; name="metadata"\r\n'
        yield f'Content-Type: application/json\r\n\r\n'
        yield json.dumps({
            'status': 'success',
            'total_objects': len(results),
            'results': results
        }, indent=2)
        yield '\r\n'
        
        # Image file parts
        for i, (result, file_path) in enumerate(zip(results, image_files)):
            print(file_path, "path", os.path.exists(file_path))
            if file_path and os.path.exists(file_path):
                file_extension = os.path.splitext(file_path)[1] or '.webp'
                filename = f"{result['id']}{file_extension}"
                print("Exists", file_path, file_extension, filename)
                
                yield f'--{boundary}\r\n'
                yield f'Content-Disposition: form-data; name="file_{i}"; filename="{filename}"\r\n'
                yield f'Content-Type: image/webp\r\n\r\n'
                
                with open(file_path, 'rb') as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
                yield '\r\n'
        
        # End boundary
        yield f'--{boundary}--\r\n'
        shutil.rmtree(dir)
    
    return Response(
        generate(),
        mimetype=f'multipart/form-data; boundary={boundary}',
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )

@app.route('/recognize', methods=['POST'])
def recognize():
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            print()
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            print("lmao", file.filename)
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Create temporary directory
        with tempfile.TemporaryDirectory(delete=False) as temp_dir:
            # Save uploaded file
            filename = secure_filename(file.filename)
            input_path = os.path.join(temp_dir, filename)
            file.save(input_path)
            
            # Create output directory
            output_path = os.path.join(temp_dir, "output")
            os.makedirs(output_path, exist_ok=True)
            
            results = []
            image_files = []
            print(input_path)
            # sleep(100)
            # Run detection
            detection_results = detect(input_path)
            
            for r_idx, r in enumerate(detection_results):
                if r.boxes is None:
                    # No objects detected, classify the whole image
                    predicted_class, confidence = recognize_image(input_path)
                    
                    # Copy original image to output
                    full_image_path = os.path.join(output_path, f"full_image_{r_idx}.webp")
                    image = Image.open(input_path)
                    image.save(full_image_path, 'WEBP')
                    
                    results.append({
                        'id': f'full_image_{r_idx}',
                        'detected_class': 'full_image',
                        'classified_as': predicted_class,
                        'verdict': auto_map(predicted_class),
                        'confidence': confidence,
                        'detection_confidence': 1.0,
                        'bbox': None,
                        'file_index': len(image_files)
                    })
                    image_files.append(full_image_path)
                else:
                    # Objects detected, crop and classify each
                    image = Image.open(input_path)
                    
                    for box_id, box in enumerate(r.boxes):
                        detected_class = r.names[int(box.cls)]
                        detection_confidence = float(box.conf)
                        
                        # Get bounding box coordinates
                        xyxy = box.xyxy[0].tolist()
                        x1, y1, x2, y2 = map(int, xyxy)
                        
                        # Crop the detected object
                        # cropped = image.crop((x1, y1, x2, y2))
                        print("xyxy", xyxy)
                        crop_margin = 200
                        cropped = image.crop((x1 - crop_margin, y1 - crop_margin, x2 + crop_margin, y2 + crop_margin))
                        cropped_path = os.path.join(output_path, f"object_{r_idx}_{box_id}.webp")
                        cropped.save(cropped_path, 'WEBP')
                        
                        # Classify the cropped object
                        predicted_class, classification_confidence = recognize_image(cropped_path)
                        
                        results.append({
                            'id': f'object_{r_idx}_{box_id}',
                            'detected_class': detected_class,
                            'classified_as': predicted_class,
                            'verdict': auto_map(predicted_class),
                            'confidence': classification_confidence,
                            'detection_confidence': detection_confidence,
                            'bbox': {
                                'x1': x1, 'y1': y1, 
                                'x2': x2, 'y2': y2,
                                'width': x2 - x1,
                                'height': y2 - y1
                            },
                            'file_index': len(image_files)
                        })
                        image_files.append(cropped_path)
            
            # Return multipart response
            predicted_class, classification_confidence = recognize_image(input_path)
            results.append({
                'id': f'object_full',
                'detected_class': 'none',
                'classified_as': predicted_class,
                'verdict': auto_map(predicted_class),
                'confidence': classification_confidence,
                'detection_confident': 0,
                'bbox': {},
                'file_index': len(image_files)
            })
            image_files.append(input_path)
            return create_multipart_response(results, image_files, temp_dir)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'API is running'})

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Image Recognition API',
        'endpoints': {
            'POST /recognize': 'Upload image for recognition (returns multipart with files)',
            'POST /recognize-json': 'Upload image for recognition (returns JSON only)',
            'GET /health': 'Health check',
            'GET /': 'This message'
        },
        'usage': {
            'multipart': 'Send POST to /recognize with form-data "file" field. Returns multipart response with metadata + image files',
            'json_only': 'Send POST to /recognize-json for JSON-only response (no image files)'
        }
    })

if __name__ == '__main__':
    print("Starting Flask API server...")
    app.run(host='0.0.0.0', port=5000, debug=True)