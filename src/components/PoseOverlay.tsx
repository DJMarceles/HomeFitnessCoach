import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { FeedbackLevel } from "../lib/pose/poseTypes";
import type { VideoFitMode } from "./CameraStage";

const CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

interface PoseOverlayProps {
  fitMode: VideoFitMode;
  landmarks: NormalizedLandmark[];
  level: FeedbackLevel;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function PoseOverlay({ fitMode, landmarks, level, videoRef }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    resizeCanvas(canvas);
    drawPose(canvas, landmarks, getPoseColor(level), getVideoContentRect(canvas, videoRef.current, fitMode));
  }, [fitMode, landmarks, level, videoRef]);

  return <canvas className="pose-canvas" ref={canvasRef} aria-hidden="true" />;
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
}

function drawPose(canvas: HTMLCanvasElement, landmarks: NormalizedLandmark[], color: string, contentRect: ContentRect): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  drawConnections(context, landmarks, canvas, color, contentRect);
  drawLandmarkPoints(context, landmarks, canvas, color, contentRect);
}

function drawConnections(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvas: HTMLCanvasElement,
  color: string,
  contentRect: ContentRect,
): void {
  context.strokeStyle = color;
  context.lineWidth = Math.max(3, canvas.width * 0.004);

  CONNECTIONS.forEach(([from, to]) => {
    if (!isVisible(landmarks[from]) || !isVisible(landmarks[to])) {
      return;
    }

    context.beginPath();
    context.moveTo(toCanvasX(landmarks[from].x, contentRect), toCanvasY(landmarks[from].y, contentRect));
    context.lineTo(toCanvasX(landmarks[to].x, contentRect), toCanvasY(landmarks[to].y, contentRect));
    context.stroke();
  });
}

function drawLandmarkPoints(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvas: HTMLCanvasElement,
  color: string,
  contentRect: ContentRect,
): void {
  context.fillStyle = color;

  landmarks.forEach((landmark, index) => {
    if (!CONNECTIONS.flat().includes(index) || !isVisible(landmark)) {
      return;
    }

    context.beginPath();
    context.arc(toCanvasX(landmark.x, contentRect), toCanvasY(landmark.y, contentRect), 5, 0, Math.PI * 2);
    context.fill();
  });
}

function getVideoContentRect(canvas: HTMLCanvasElement, video: HTMLVideoElement | null, fitMode: VideoFitMode): ContentRect {
  const sourceWidth = video?.videoWidth || canvas.width;
  const sourceHeight = video?.videoHeight || canvas.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const canvasRatio = canvas.width / canvas.height;

  if (!Number.isFinite(sourceRatio) || sourceRatio <= 0) {
    return { height: canvas.height, width: canvas.width, x: 0, y: 0 };
  }

  if (fitMode === "contain") {
    return getContainedRect(canvas, sourceRatio, canvasRatio);
  }

  return getCoveredRect(canvas, sourceRatio, canvasRatio);
}

function getContainedRect(canvas: HTMLCanvasElement, sourceRatio: number, canvasRatio: number): ContentRect {
  if (sourceRatio > canvasRatio) {
    const height = canvas.width / sourceRatio;
    return { height, width: canvas.width, x: 0, y: (canvas.height - height) / 2 };
  }

  const width = canvas.height * sourceRatio;
  return { height: canvas.height, width, x: (canvas.width - width) / 2, y: 0 };
}

function getCoveredRect(canvas: HTMLCanvasElement, sourceRatio: number, canvasRatio: number): ContentRect {
  if (sourceRatio > canvasRatio) {
    const width = canvas.height * sourceRatio;
    return { height: canvas.height, width, x: (canvas.width - width) / 2, y: 0 };
  }

  const height = canvas.width / sourceRatio;
  return { height, width: canvas.width, x: 0, y: (canvas.height - height) / 2 };
}

function toCanvasX(value: number, contentRect: ContentRect): number {
  return contentRect.x + value * contentRect.width;
}

function toCanvasY(value: number, contentRect: ContentRect): number {
  return contentRect.y + value * contentRect.height;
}

function isVisible(landmark?: NormalizedLandmark): boolean {
  return Boolean(landmark && landmark.visibility > 0.35);
}

function getPoseColor(level: FeedbackLevel): string {
  if (level === "good") {
    return "#13a884";
  }

  if (level === "danger") {
    return "#e05f4f";
  }

  return "#f0a928";
}

interface ContentRect {
  height: number;
  width: number;
  x: number;
  y: number;
}
