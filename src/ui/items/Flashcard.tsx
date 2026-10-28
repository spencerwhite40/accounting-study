import { useRef, useState } from "react";
import type { ItemProps } from "../Session";
import { TermText } from "../TermText";
import { Rating, type Grade, previewIntervals } from "../../engine/store";
import { useApp } from "../../App";
import { haptic } from "../bits";

/** Tap to flip; after flipping, swipe left = Again, right = Good, up = Easy, or use the buttons. */
export function Flashcard({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "flashcard") return null;
  const { progress } = useApp();
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<Grade | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const iv = previewIntervals(progress, item.concept);

  const grade = (g: Grade) => {
    if (graded !== null) return;
    const adj = Math.max(Rating.Again, g - hints) as Grade;
    setGraded(adj);
    haptic(adj === Rating.Again ? "bad" : "ok");
    onDone({ rating: adj });
  };
  const onDown = (e: React.PointerEvent) => {
    if (!flipped || graded !== null) return;
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const onUp = () => {
    if (!start.current) return;
    const d = drag;
    start.current = null;
    setDrag(null);
    if (!d) return;
    if (d.y < -90 && Math.abs(d.x) < 70) grade(Rating.Easy);
    else if (d.x > 90) grade(Rating.Good);
    else if (d.x < -90) grade(Rating.Again);
  };
  const dx = drag?.x ?? 0;
  const dy = drag?.y ?? 0;
  const style = drag ? { transform: `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg) rotateY(180deg)` } : undefined;
  const verdict = drag ? (dy < -90 && Math.abs(dx) < 70 ? "Easy" : dx > 90 ? "Good" : dx < -90 ? "Again" : null) : null;
  const labels: Record<Grade, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

  return (
    <>
      <div className="flash-wrap">
        <div
          className={`card flash ${flipped ? "flipped" : ""} ${drag ? "dragging" : ""}`}
          style={style}
          onClick={() => { if (!drag && graded === null) { setFlipped(true); haptic("tap"); } }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        >
          <div className="face front"><span className="lbl">Prompt · tap to flip</span><div><TermText text={item.front} exclude={[item.concept]} /></div></div>
          <div className="face back"><span className="lbl">{verdict ?? "Answer"}</span><div><TermText text={item.back} /></div></div>
        </div>
      </div>
      {!flipped && <button className="primary block" style={{ marginTop: 10 }} onClick={() => setFlipped(true)}>Show answer</button>}
      {flipped && graded === null && (
        <>
          <div className="swipe-hint"><span>◀ swipe: Again</span><span>▲ Easy</span><span>Good: swipe ▶</span></div>
          <div className="grades" style={{ marginTop: 8 }}>
            <button className="g1" onClick={() => grade(Rating.Again)}>Again<span>{iv.again}</span></button>
            <button className="g2" onClick={() => grade(Rating.Hard)}>Hard<span>{iv.hard}</span></button>
            <button className="g3" onClick={() => grade(Rating.Good)}>Good<span>{iv.good}</span></button>
            <button className="g4" onClick={() => grade(Rating.Easy)}>Easy<span>{iv.easy}</span></button>
          </div>
        </>
      )}
      {graded !== null && (
        <div className={`feedback ${graded === Rating.Again ? "bad" : graded === Rating.Hard ? "hard" : "ok"}`}>
          {labels[graded]}{hints ? ` (−${hints} for hints)` : ""} · next in {graded === 1 ? iv.again : graded === 2 ? iv.hard : graded === 3 ? iv.good : iv.easy}
        </div>
      )}
    </>
  );
}
