export type Lang = "en" | "ru"

export const LANG = {
  en: {
    app_title: "RehabTrack",
    patient_portal: "Patient Portal",
    doctor_portal: "Doctor Portal",
    daily_tasks: "Daily Tasks",
    pain_level: "Pain Level",
    start_session: "Start Session",
    save_session: "Save Session",
    session_history: "Session History",
    no_sessions: "No sessions recorded yet.",
    total_sessions: "Total Sessions",
    avg_quality: "Avg Quality Score",
    best_angle: "Best Max Angle",
    risk_warning:
      "Warning: Recent sessions show low quality scores. Please consult your physical therapist.",
    exercise_instructions: "Exercise Instructions",
  },
  ru: {
    app_title: "RehabTrack",
    patient_portal: "Портал пациента",
    doctor_portal: "Портал врача",
    daily_tasks: "Ежедневные задания",
    pain_level: "Уровень боли",
    start_session: "Начать сеанс",
    save_session: "Сохранить сеанс",
    session_history: "История сеансов",
    no_sessions: "Сеансы ещё не записаны.",
    total_sessions: "Всего сеансов",
    avg_quality: "Средний балл качества",
    best_angle: "Лучший максимальный угол",
    risk_warning:
      "Предупреждение: последние сеансы показывают низкое качество выполнения упражнений. Обратитесь к физиотерапевту.",
    exercise_instructions: "Инструкции к упражнениям",
  },
} as const
