import React, { useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { ActiveSelection, Canvas, FabricObject } from "fabric";
import useFabricSetup from "@/hooks/useFabricSetup";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown } from "lucide-react";
import FabricCanvasReadOnly from "../FabricCanvasReadOnly";
import BlockMoveControls from "./BlockMoveControls";
import { useEditorI18n } from "../editor.i18n";

const FabricCanvasEditable = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: any) => {
  const { t } = useEditorI18n();
  const { width, height, canvasData } = node.attrs;
  const backgroundColor = "#fafafa";

  const {
    setCanvasSync,
    setSaveState,
    registerCanvas,
    unregisterCanvas,
    isSidebarInteracting,
  } = useCanvasContext();

  const canvasSelectPrevref = useRef(false);
  const canvasDataPrevRef = useRef("");
  const idRef = useRef<string>(uuidv4());
  const isResizing = useRef(false);
  const lastY = useRef(0);

  const onSaveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());
    if (json === canvasDataPrevRef.current) return;
    canvasDataPrevRef.current = json;

    const allObjects = canvas.getObjects();
    const activeObjects = canvas.getActiveObjects();
    const activeIndices = activeObjects.map((o) => allObjects.indexOf(o));

    isSidebarInteracting.current = true;
    updateAttributes({ canvasData: json });

    setTimeout(() => {
      const objects = canvas.getObjects();

      const targets = activeIndices
        .map((i) => objects[i])
        .filter((o): o is FabricObject => o !== undefined);

      if (targets.length === 1 && targets[0]) {
        canvas.setActiveObject(targets[0]);
        targets[0].setCoords();
      } else if (targets.length > 1) {
        const selection = new ActiveSelection(targets, { canvas });
        canvas.setActiveObject(selection);
        selection.setCoords();
      }

      canvas.requestRenderAll();
      isSidebarInteracting.current = false;
    }, 10);
  }, [updateAttributes, isSidebarInteracting]);

  const onFocus = useCallback(() => {
    setSaveState(onSaveState);
    if (typeof getPos === "function") {
      editor.commands.setNodeSelection(getPos());
    }
  }, [editor, getPos, onSaveState, setSaveState]);

  const { canvasRef, canvasElRef } = useFabricSetup({
    onFocus,
    onSaveState,
    width,
    height,
    canvasData,
    backgroundColor,
  });

  useEffect(() => {
    const id = idRef.current;
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      setSaveState(onSaveState);
      canvasSelectPrevref.current = true;
      registerCanvas(id, canvasRef.current, onSaveState);
    }, 0);

    return () => {
      clearTimeout(timer);
      unregisterCanvas(id);
    };
  }, [onSaveState, registerCanvas, unregisterCanvas, setSaveState, canvasRef]);

  useEffect(() => {
    if (selected) {
      canvasSelectPrevref.current = true;
      return;
    }

    if (canvasSelectPrevref.current) {
      canvasSelectPrevref.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (!isSidebarInteracting.current) {
        setCanvasSync(null);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  }, [selected, setCanvasSync, isSidebarInteracting, canvasRef]);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      lastY.current = e.clientY;

      const currentHeightRef = { value: height };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;

        const deltaY = moveEvent.clientY - lastY.current;
        lastY.current = moveEvent.clientY;

        const newHeight = Math.max(100, currentHeightRef.value + deltaY);
        currentHeightRef.value = newHeight;

        updateAttributes({ height: newHeight });
      };

      const onMouseUp = () => {
        isResizing.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        if (canvasRef.current) {
          canvasRef.current.setDimensions({
            width,
            height: currentHeightRef.value,
          });

          onSaveState();
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [height, updateAttributes, width, onSaveState, canvasRef],
  );

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setDimensions({ width, height });
      canvasRef.current.requestRenderAll();
    }
  }, [height, width, canvasRef]);

  return (
    <NodeViewWrapper className="my-6">
      <div
        className={`mx-auto relative group w-fit rounded-lg border overflow-visible transition-shadow duration-200 ${
          selected ? "" : "border-accent-foreground shadow-md"
        }`}
      >
        <BlockMoveControls
          editor={editor}
          getPos={getPos}
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-gray-200 bg-white/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        />

        <canvas ref={canvasElRef} className="block w-full" />

        <div
          onMouseDown={startResizing}
          className="absolute -bottom-4 left-0 right-0 h-4 flex items-center justify-center cursor-ns-resize"
          title={t("Drag to resize height", "ลากเพื่อปรับความสูง")}
        >
          <div className="flex items-center justify-center w-10 h-4 rounded-full bg-white border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted select-none">
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const FabricCanvasView = (props: any) => {
  const { width, height, canvasData } = props.node.attrs;

  if (!props.editor.isEditable) {
    return (
      <NodeViewWrapper className="my-6">
        <FabricCanvasReadOnly
          width={width}
          height={height}
          canvasData={canvasData}
        />
      </NodeViewWrapper>
    );
  }

  return <FabricCanvasEditable {...props} />;
};

export default FabricCanvasView;
