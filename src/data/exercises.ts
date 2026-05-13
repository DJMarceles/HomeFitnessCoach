import type { ExerciseId, ExerciseProfile } from "../lib/pose/poseTypes";

export interface CameraPlacement {
  position: string;
  distance: string;
  height: string;
  angle: string;
  framing: string;
  lighting: string;
}

export interface ExerciseConfig {
  id: ExerciseId;
  label: string;
  shortLabel: string;
  category: string;
  profile: ExerciseProfile;
  focus: string;
  setupCue: string;
  voiceStart: string;
  muscles: string[];
  camera: CameraPlacement;
}

const CAMERA_PRESETS = {
  standingFront: {
    position: "Voor je, licht schuin op 10-15 graden.",
    distance: "2,0 tot 3,0 meter afstand.",
    height: "Heup- tot borsthoogte.",
    angle: "Camera recht, niet omhoog of omlaag gekanteld.",
    framing: "Voeten, knieen, heupen en schouders volledig in beeld.",
    lighting: "Licht van voren of zijkant, geen fel raam achter je.",
  },
  floorSide: {
    position: "Naast je mat, in zijaanzicht.",
    distance: "1,8 tot 2,5 meter afstand.",
    height: "Knie- tot heuphoogte.",
    angle: "Camera parallel aan je lichaam.",
    framing: "Hoofd, schouders, heupen, knieen en voeten in beeld.",
    lighting: "Gelijkmatig licht over de mat.",
  },
  floorFront: {
    position: "Voor je mat, iets boven vloerniveau.",
    distance: "1,8 tot 2,5 meter afstand.",
    height: "Kniehoogte of lager.",
    angle: "Camera licht naar beneden gericht.",
    framing: "Volledige mat, handen, schouders, heupen en voeten zichtbaar.",
    lighting: "Geen schaduw over handen en gezicht.",
  },
  cardioWide: {
    position: "Voor je, met extra ruimte links en rechts.",
    distance: "2,5 tot 3,5 meter afstand.",
    height: "Borsthoogte.",
    angle: "Camera recht vooruit.",
    framing: "Volledig lichaam plus een halve meter bewegingsruimte rondom.",
    lighting: "Heldere ruimte zonder bewegende achtergrond.",
  },
} satisfies Record<string, CameraPlacement>;

export const DEFAULT_EXERCISE_ID: ExerciseId = "squat";

export const EXERCISES: ExerciseConfig[] = [
  makeExercise("squat", "Squat", "Onderlichaam", "squat", "Rug neutraal, knieen volgen tenen, tempo rustig.", CAMERA_PRESETS.standingFront),
  makeExercise("reverse-lunge", "Reverse lunge", "Onderlichaam", "lunge", "Voorste knie stabiel, romp lang, stap gecontroleerd terug.", CAMERA_PRESETS.standingFront),
  makeExercise("forward-lunge", "Forward lunge", "Onderlichaam", "lunge", "Voorste knie volgt tenen, achterste knie zakt rustig.", CAMERA_PRESETS.standingFront),
  makeExercise("split-squat", "Split squat", "Onderlichaam", "lunge", "Heupen recht, knie stabiel, verticale romp.", CAMERA_PRESETS.standingFront),
  makeExercise("glute-bridge", "Glute bridge", "Onderlichaam", "bridge", "Heupen hoog, ribben laag, knieen blijven parallel.", CAMERA_PRESETS.floorSide),
  makeExercise("hip-thrust", "Hip thrust", "Onderlichaam", "bridge", "Kin licht in, heupen volledig strekken, core vast.", CAMERA_PRESETS.floorSide),
  makeExercise("calf-raise", "Calf raise", "Onderlichaam", "balance", "Enkels recht, romp stabiel, rustig omhoog en omlaag.", CAMERA_PRESETS.standingFront),
  makeExercise("wall-sit", "Wall sit", "Onderlichaam", "squat", "Kniehoek stabiel, rug tegen muur, voeten onder knieen.", CAMERA_PRESETS.standingFront),
  makeExercise("step-up", "Step-up", "Onderlichaam", "lunge", "Heupen recht, knie boven voet, volledig uitstappen.", CAMERA_PRESETS.standingFront),
  makeExercise("pushup", "Push-up", "Bovenlichaam", "pushup", "Lichaam in een lijn, ellebogen gecontroleerd, schouders stabiel.", CAMERA_PRESETS.floorSide),
  makeExercise("knee-pushup", "Knee push-up", "Bovenlichaam", "pushup", "Schouders stabiel, heupen in lijn, borst zakt gecontroleerd.", CAMERA_PRESETS.floorSide),
  makeExercise("triceps-dip", "Triceps dip", "Bovenlichaam", "dip", "Schouders laag, ellebogen naar achteren, borst open.", CAMERA_PRESETS.floorSide),
  makeExercise("plank", "Plank", "Core", "plank", "Heupen stabiel, schouders boven ellebogen, nek lang.", CAMERA_PRESETS.floorSide),
  makeExercise("side-plank", "Side plank", "Core", "plank", "Heupen hoog, schouders gestapeld, lichaam lang.", CAMERA_PRESETS.floorSide),
  makeExercise("shoulder-tap", "Shoulder tap", "Core", "plank", "Heupen stil, handen onder schouders, tik gecontroleerd.", CAMERA_PRESETS.floorFront),
  makeExercise("mountain-climber", "Mountain climber", "Core", "pushup", "Schouders boven handen, heupen laag, knieen ritmisch.", CAMERA_PRESETS.floorSide),
  makeExercise("crunch", "Crunch", "Core", "core", "Kin los van borst, ribben sluiten, tempo rustig.", CAMERA_PRESETS.floorSide),
  makeExercise("bicycle-crunch", "Bicycle crunch", "Core", "core", "Schouder roteert, onderrug blijft rustig, wissel gecontroleerd.", CAMERA_PRESETS.floorFront),
  makeExercise("russian-twist", "Russian twist", "Core", "core", "Borst open, rotatie vanuit romp, voeten stabiel.", CAMERA_PRESETS.floorFront),
  makeExercise("dead-bug", "Dead bug", "Core", "core", "Onderrug rustig, tegengestelde arm en been bewegen langzaam.", CAMERA_PRESETS.floorFront),
  makeExercise("bird-dog", "Bird dog", "Core", "balance", "Heupen recht, rug lang, arm en been reiken gecontroleerd.", CAMERA_PRESETS.floorSide),
  makeExercise("superman", "Superman", "Rug", "hinge", "Nek lang, billen aangespannen, rustig optillen.", CAMERA_PRESETS.floorSide),
  makeExercise("burpee", "Burpee", "Cardio", "cardio", "Land zacht, plankpositie strak, beweeg gecontroleerd.", CAMERA_PRESETS.cardioWide),
  makeExercise("jumping-jack", "Jumping jack", "Cardio", "cardio", "Zachte landing, knieen licht gebogen, armen volledig mee.", CAMERA_PRESETS.cardioWide),
  makeExercise("high-knees", "High knees", "Cardio", "cardio", "Romp rechtop, knieen actief omhoog, landing zacht.", CAMERA_PRESETS.cardioWide),
];

export const EXERCISE_CATEGORIES = Array.from(new Set(EXERCISES.map((exercise) => exercise.category)));

/** Returns the exercise config for an id, falling back to the default. */
export function getExerciseById(id: ExerciseId): ExerciseConfig {
  return EXERCISES.find((exercise) => exercise.id === id) ?? EXERCISES[0];
}

function makeExercise(
  id: ExerciseId,
  label: string,
  category: string,
  profile: ExerciseProfile,
  focus: string,
  camera: CameraPlacement,
): ExerciseConfig {
  return {
    id,
    label,
    shortLabel: label,
    category,
    profile,
    focus,
    camera,
    muscles: getMuscles(category),
    setupCue: camera.framing,
    voiceStart: `${label} gestart. ${focus}`,
  };
}

function getMuscles(category: string): string[] {
  const groups: Record<string, string[]> = {
    Onderlichaam: ["Benen", "Core", "Stabiliteit"],
    Bovenlichaam: ["Borst", "Schouders", "Armen"],
    Core: ["Core", "Schouders", "Controle"],
    Rug: ["Rug", "Billen", "Core"],
    Cardio: ["Conditie", "Benen", "Coordinatie"],
  };

  return groups[category] ?? ["Core", "Controle"];
}
