import { Dumbbell } from "lucide-react";
import { EXERCISE_CATEGORIES, EXERCISES, getExerciseById } from "../data/exercises";
import type { ExerciseId } from "../lib/pose/poseTypes";

interface ExerciseSelectorProps {
  selectedExerciseId: ExerciseId;
  onSelect: (exerciseId: ExerciseId) => void;
}

export function ExerciseSelector({ selectedExerciseId, onSelect }: ExerciseSelectorProps) {
  const selectedExercise = getExerciseById(selectedExerciseId);

  return (
    <div className="exercise-selector" aria-label="Kies oefening">
      <label className="exercise-picker">
        <span>
          <Dumbbell size={16} aria-hidden="true" />
          Oefening
        </span>
        <select value={selectedExerciseId} onChange={(event) => onSelect(event.target.value as ExerciseId)}>
          {EXERCISE_CATEGORIES.map((category) => (
            <optgroup key={category} label={category}>
              {EXERCISES.filter((exercise) => exercise.category === category).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="exercise-meta">
        <strong>{selectedExercise.label}</strong>
        <span>{selectedExercise.category}</span>
      </div>
    </div>
  );
}
