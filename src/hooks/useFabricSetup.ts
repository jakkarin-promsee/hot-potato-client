import { useCanvasContext } from "@/contexts/CanvasContext";
import { wireRichLinesOnCanvas } from "@/hooks/useFabric";
import { Canvas, Line } from "fabric";
import { useEffect, useRef } from "react";

type useFabricSetupOptions = {
  onFocus?: () => void;
  onSaveState?: () => void;
  width: number;
  height: number;
  canvasData?: string;
  backgroundColor?: string;
};

function useFabricSetup({
  onFocus,
  onSaveState,
  width,
  height,
  canvasData,
  backgroundColor = "#fafafa",
}: useFabricSetupOptions) {
  const canvasRef = useRef<Canvas>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  const {
    canvasRef: canvasContextRef,
    setSelectedObjects,
    setCanvasSync,
    saveStateRef,
  } = useCanvasContext();

  // Call onForcus Prop
  const onFocusRef = useRef<() => void>(null);
  useEffect(() => {
    if (onFocus) {
      onFocusRef.current = onFocus;
    }
  }, [onFocus]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current) return;

    // Create canvas
    const c = new Canvas(canvasElRef.current, {
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    // Save create state
    canvasRef.current = c;
    setCanvasSync(canvasRef.current);

    // When user click it, set the canvas to context
    c.on("mouse:down", () => {
      if (canvasContextRef.current !== canvasRef.current) {
        setTimeout(() => {
          setCanvasSync(canvasRef.current);
        }, 10);
      }

      onFocusRef?.current?.();
    });

    // Snap-to-guide helpers
    const SNAP_THRESHOLD = 8;
    const guidelines: Line[] = [];

    const clearGuidelines = () => {
      guidelines.forEach((line) => c.remove(line));
      guidelines.length = 0;
    };

    // Add guidline
    const addGuideline = (points: number[]) => {
      const line = new Line(points as [number, number, number, number], {
        stroke: "#1F1F1F",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 4],
      });
      (line as any).__isGuideline = true;
      c.add(line);
      guidelines.push(line);
    };

    c.on("object:moving", (e) => {
      clearGuidelines();
      const obj = e.target;
      if (!obj) return;

      const centerX = width / 2;
      const centerY = height / 2;
      const objCenterX = obj.left! + (obj.width! * (obj.scaleX || 1)) / 2;
      const objCenterY = obj.top! + (obj.height! * (obj.scaleY || 1)) / 2;

      if (Math.abs(objCenterX - centerX) < SNAP_THRESHOLD) {
        obj.set("left", centerX - (obj.width! * (obj.scaleX || 1)) / 2);
        obj.setCoords();
        addGuideline([centerX, 0, centerX, height]);
      }

      if (Math.abs(objCenterY - centerY) < SNAP_THRESHOLD) {
        obj.set("top", centerY - (obj.height! * (obj.scaleY || 1)) / 2);
        obj.setCoords();
        addGuideline([0, centerY, width, centerY]);
      }
    });

    canvasRef.current?.on("object:modified", () => {
      clearGuidelines();
      saveStateRef.current?.();
    });

    canvasRef.current?.on("selection:created", (e) => {
      setSelectedObjects(e.selected || []);
    });
    canvasRef.current?.on("selection:updated", (e) => {
      setSelectedObjects(e.selected || []);
    });
    canvasRef.current?.on("selection:cleared", () => {
      setSelectedObjects([]);
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = c.getActiveObjects();
        if (active.length) {
          e.preventDefault();
          e.stopImmediatePropagation();

          active.forEach((obj) => c.remove(obj));
          c.discardActiveObject();
          c.requestRenderAll();
          saveStateRef.current?.();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    // Force save state before useContext update
    setTimeout(() => {
      onSaveState?.();
    }, 100);

    canvasRef.current?.renderAll();

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      c.dispose();
      setCanvasSync(null);
    };
  }, []);

  // Load data
  const lastLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!canvasData || canvasData === "{}") return;
    if (!canvasRef.current) return;
    if (lastLoadedRef.current === canvasData) return; // ✅ skip if same data!

    const loadCanvas = async () => {
      try {
        lastLoadedRef.current = canvasData;
        await canvasRef.current?.loadFromJSON(JSON.parse(canvasData));
        if (canvasRef.current) {
          wireRichLinesOnCanvas(canvasRef.current, saveStateRef);
        }
        canvasRef.current?.renderAll();
      } catch (e) {
        console.error("load error:", e); // check what error comes out!
      }
    };
    setTimeout(() => {
      loadCanvas();
    }, 0); // prevent race condition from create useState
  }, [canvasData]);
  return {
    canvasRef,
    canvasElRef,
  };
}

export default useFabricSetup;
