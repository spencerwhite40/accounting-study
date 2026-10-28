import { useState } from "react";
import type { ItemProps } from "../Session";
import { TermText } from "../TermText";
import { Rating, type Grade } from "../../engine/store";

export function Flashcard({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "flashcard") return null;
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(false);
  const grade = (g: Grade) => {
    const adj = Math.max(Rating.Again, g - hints) as Grade;
    setGraded(true);
    onDone({ rating: adj });
  };
  return (
    <>
      <div className="card flash" style={{ position: "relative" }} onClick={() => setFlipped(!flipped)}>
        <span className="lbl muted small">{flipped ? "Answer" : "Tap to flip"}</span>
        <div>{flipped ? <TermText text={item.back} /> : <TermText text={item.front} exclude={[item.concept]} />}</div>
      </div>
      {!flipped && <button className="primary block" onClick={() => setFlipped(true)}>Show answer</button>}
      {flipped && !graded && (
        <div className="grades">
          <button className="g1" onClick={() => grade(Rating.Again)}>Again</button>
          <button className="g2" onClick={() => grade(Rating.Hard)}>Hard</button>
          <button className="g3" onClick={() => grade(Rating.Good)}>Good</button>
          <button className="g4" onClick={() => grade(Rating.Easy)}>Easy</button>
        </div>
      )}
      {graded && <p className="muted small center">Graded{hints ? ` (−${hints} for hints)` : ""}.</p>}
    </>
  );
}
