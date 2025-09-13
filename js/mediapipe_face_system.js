// MediaPipe Face Recognition System
class MediaPipeFaceSystem {
    constructor() {
        this.faceDetector = null;
        this.isInitialized = false;
        this.videoElement = null;
        this.isDetecting = false;
        this.onFaceDetection = null;
        this.detectionInterval = null;
    }

    async initialize() {
        try {
            // Load MediaPipe vision tasks
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            
            this.faceDetector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                minDetectionConfidence: 0.5,
                minSuppressionThreshold: 0.3
            });

            this.isInitialized = true;
            console.log('MediaPipe Face System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MediaPipe Face System:', error);
            throw error;
        }
    }

    setVideoElement(videoElement) {
        this.videoElement = videoElement;
    }

    startDetection() {
        if (!this.isInitialized || !this.videoElement || this.isDetecting) {
            return;
        }

        this.isDetecting = true;
        
        const detectFrame = () => {
            if (!this.isDetecting) return;

            try {
                const detections = this.faceDetector.detectForVideo(
                    this.videoElement,
                    performance.now()
                );

                const processedDetections = this.processDetections(detections);
                
                if (this.onFaceDetection && processedDetections.length > 0) {
                    this.onFaceDetection(processedDetections);
                }
            } catch (error) {
                console.error('Detection error:', error);
            }

            if (this.isDetecting) {
                requestAnimationFrame(detectFrame);
            }
        };

        detectFrame();
    }

    stopDetection() {
        this.isDetecting = false;
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
    }

    processDetections(detections) {
        const processedDetections = [];

        if (detections.detections) {
            detections.detections.forEach(detection => {
                const confidence = detection.categories[0]?.score || 0;
                
                if (confidence > 0.6) {
                    // Extract face embedding for this detection
                    const embedding = this.generateFaceEmbedding(detection);
                    
                    processedDetections.push({
                        confidence,
                        embedding,
                        boundingBox: detection.boundingBox
                    });
                }
            });
        }

        return processedDetections;
    }

    generateFaceEmbedding(detection) {
        // Simplified embedding generation placeholder
        // Use your actual face recognition model here
        const bbox = detection.boundingBox;
        const embedding = [];
        
        for (let i = 0; i < 128; i++) {
            embedding.push(
                Math.random() * 0.1 + 
                (bbox.originX + bbox.width / 2) * 0.01 + 
                (bbox.originY + bbox.height / 2) * 0.01 +
                Math.sin(i * 0.1) * 0.05
            );
        }

        return embedding;
    }

    async extractFaceEmbedding(videoElement) {
        if (!this.isInitialized || !videoElement) {
            return null;
        }

        try {
            const detections = this.faceDetector.detectForVideo(
                videoElement,
                performance.now()
            );

            if (detections.detections && detections.detections.length > 0) {
                const bestDetection = detections.detections.reduce((best, current) => {
                    const currentScore = current.categories[0]?.score || 0;
                    const bestScore = best.categories[0]?.score || 0;
                    return currentScore > bestScore ? current : best;
                });

                return this.generateFaceEmbedding(bestDetection);
            }

            return null;
        } catch (error) {
            console.error('Face extraction error:', error);
            return null;
        }
    }

    calculateSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude > 0 ? dotProduct / magnitude : 0;
    }

    dispose() {
        this.stopDetection();
        this.videoElement = null;
        this.onFaceDetection = null;
        
        if (this.faceDetector) {
            this.faceDetector.close();
        }
    }
}

window.MediaPipeFaceSystem = MediaPipeFaceSystem;
