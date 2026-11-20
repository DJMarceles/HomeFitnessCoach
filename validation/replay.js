import * as current from "@mediapipe/tasks-vision";
import { pilotPose } from "../src/lib/pose/pilot";
import { SessionEngine } from "../src/lib/pose/sessionEngine";
const el = (id) => document.getElementById(id);
const video = document.querySelector("video");
let reportUrl;
function eventOnce(name, action) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(name, done);
      video.removeEventListener("error", fail);
    };
    const done = () => {
        cleanup();
        resolve();
      },
      fail = () => {
        cleanup();
        reject(Error("Video niet leesbaar: " + name));
      };
    const timer = setTimeout(fail, 15000);
    video.addEventListener(name, done);
    video.addEventListener("error", fail);
    action();
  });
}
el("run").onclick = async () => {
  const clip = el("clip").files[0],
    code = el("code").value.trim(),
    id = el("exercise").value;
  if (!clip || !/^[A-Za-z0-9_-]{1,60}$/.test(code)) {
    el("status").textContent = "Kies een opname en geef een anonieme setcode op.";
    return;
  }
  const sdk = el("sdk").value,
    model = el("model").value;
  const url = URL.createObjectURL(clip);
  el("run").disabled = true;
  el("save").hidden = true;
  el("result").textContent = "";
  el("status").textContent = "Model laden…";
  let detector;
  try {
    const local = location.pathname.replace(/\/[^/]*$/, "/") + ".assets/";
    const old = await import(/* @vite-ignore */ local + "baseline.mjs");
    const api =
      sdk === "0.10.35" ? current : await import(/* @vite-ignore */ local + "candidate/vision_bundle.mjs");
    const files = await api.FilesetResolver.forVisionTasks(
      sdk === "0.10.35" ? "/vendor/mediapipe" : local + "candidate/wasm",
    );
    const create = (delegate) =>
      api.PoseLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: model === "Lite" ? "/models/pose_landmarker_lite.task" : "/models/pose_landmarker_full.task",
          delegate,
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
    let delegate = "GPU";
    try {
      detector = await create(delegate);
    } catch {
      delegate = "CPU";
      detector = await create(delegate);
    }
    await eventOnce("loadeddata", () => {
      video.src = url;
      video.load();
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0)
      throw Error("Opname heeft geen eindige duur.");
    const engines = [new SessionEngine(), new SessionEngine()],
      aspect = video.videoWidth / video.videoHeight;
    let oldStats = old.EMPTY_STATS,
      phase = { current: "up" },
      oldReview = null;
    const times = [[], [], []],
      durations = [];
    for (let ms = 0; ms < video.duration * 1000; ms += 80) {
      if (ms)
        await eventOnce("seeked", () => {
          video.currentTime = ms / 1000;
        });
      const start = performance.now(),
        r = detector.detectForVideo(video, ms + 1);
      durations.push(performance.now() - start);
      const points = r.landmarks[0] ?? [],
        world = r.worldLandmarks[0] ?? [];
      if (points.length) {
        const a = old.analyzePose(id, points, ms),
          next = old.updateStats(oldStats, a, old.getRepUpdate(a, phase));
        if (next.reps > oldStats.reps) times[0].push(ms);
        oldStats = next;
        if (!oldReview && next.reps >= 8) oldReview = old.buildSetFeedback(next, id);
      }
      engines.forEach((engine, i) => {
        const prev = engine.stats.reps;
        engine.feed(pilotPose(id, points, ms, aspect, i === 1 ? world : undefined));
        if (engine.stats.reps > prev) times[i + 1].push(ms);
      });
      if (ms % 800 === 0) el("status").textContent = Math.round(ms / (video.duration * 10)) + "%";
    }
    const rows = engines.map((e, i) => ({
      rules: i ? "3D" : "2D",
      endsMs: times[i + 1],
      heldSeconds: e.stats.heldSeconds,
      review: !!e.stats.review,
      assessed: e.stats.review?.assessed ?? null,
      tips: e.stats.review?.tips.map((t) => t.key) ?? [],
    }));
    rows.unshift({
      rules: "baseline",
      endsMs: times[0],
      heldSeconds: 0,
      review: !!oldReview,
      assessed: null,
      tips: oldReview?.tips.filter((t) => t.key !== "good").map((t) => t.key) ?? [],
    });
    const sorted = durations.sort((a, b) => a - b);
    const report = {
      schema: 1,
      code,
      exercise: id,
      sdk,
      model,
      delegate,
      stepMs: 80,
      frames: sorted.length,
      inferenceP95ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      rows,
    };
    const json = JSON.stringify(report, null, 2);
    el("result").textContent = json;
    if (reportUrl) URL.revokeObjectURL(reportUrl);
    reportUrl = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = el("save");
    link.href = reportUrl;
    link.download = code + "-" + sdk + "-" + model + ".json";
    link.hidden = false;
    el("status").textContent = "Klaar. Geen videobeelden of lichaamscoördinaten in het rapport.";
  } catch (e) {
    el("status").textContent = "Vergelijking mislukt: " + e.message;
  } finally {
    detector?.close();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    el("run").disabled = false;
  }
};
