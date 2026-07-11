import { useEffect, useRef } from "react";
import { Canvas } from "fabric";

const FabricCanvasReadOnly = ({
  width,
  height,
  canvasData,
}: {
  width: number;
  height: number;
  canvasData: string;
}) => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasElRef.current) return;

    let cancelled = false;

    const init = setTimeout(() => {
      void (async () => {
        const canvas = new Canvas(canvasElRef.current!, {
          width,
          height,
          backgroundColor: "#fafafa",
          selection: false, // disable group selection
          interactive: false, // disable all interaction at canvas level
          renderOnAddRemove: false,
        });

        if (cancelled) {
          canvas.dispose();
          return;
        }

        canvasRef.current = canvas;

        if (canvasData) {
          try {
            // v6 API: loadFromJSON returns a Promise
            await canvas.loadFromJSON(JSON.parse(canvasData));
          } catch {
            // Bad or empty JSON — keep the blank read-only canvas
          }

          if (cancelled) {
            canvas.dispose();
            canvasRef.current = null;
            return;
          }

          canvas.getObjects().forEach((obj) => {
            obj.set({
              selectable: false,
              evented: false,
              lockMovementX: true, // ← belt-and-suspenders locks
              lockMovementY: true,
              lockRotation: true,
              lockScalingX: true,
              lockScalingY: true,
              hasControls: false,
              hasBorders: false,
              hoverCursor: "default",
            });
          });

          // Disable all mouse events on the canvas element itself
          canvas.off(); // remove all fabric event listeners

          canvas.requestRenderAll();
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(init);
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [canvasData, width, height]);

  return (
    <div className="my-6 mx-auto w-fit rounded-lg border overflow-hidden">
      {/* pointer-events-none is the nuclear option — blocks all mouse events at DOM level */}
      <canvas ref={canvasElRef} className="block pointer-events-none" />
    </div>
  );
};

export default FabricCanvasReadOnly;
