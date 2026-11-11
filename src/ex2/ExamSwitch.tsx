import { useApp } from "../App";

export function ExamSwitch() {
  const { exam, setExam } = useApp();
  return (
    <div className="switch" role="tablist" aria-label="Exam">
      <button role="tab" aria-selected={exam === 2} className={exam === 2 ? "on" : ""} onClick={() => setExam(2)}>Exam 2</button>
      <button role="tab" aria-selected={exam === 1} className={exam === 1 ? "on" : ""} onClick={() => setExam(1)}>Exam 1</button>
    </div>
  );
}
