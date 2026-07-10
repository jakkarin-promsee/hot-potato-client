import type {
  FormulaAction,
  FormulaInsertLocation,
  FormulaNode,
  FormulaNodeType,
  FormulaState,
  PowerPosition,
  WrappableFormulaNodeType,
} from "./types";

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `formula_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createFormulaNode(
  type: FormulaNodeType,
  partial: Partial<FormulaNode> = {},
): FormulaNode {
  return {
    id: partial.id ?? createId(),
    type,
    value: partial.value,
    children: partial.children,
    slots: partial.slots,
    powerPosition: partial.powerPosition,
  };
}

export function createFormulaRow(children: FormulaNode[] = []): FormulaNode {
  return createFormulaNode("row", { children });
}

export function createInitialFormulaState(): FormulaState {
  return {
    root: createFormulaRow(),
  };
}

function unwrapContent(node: FormulaNode): FormulaNode {
  const slots = node.slots ?? {};
  switch (node.type) {
    case "power":
      return slots.base ?? createFormulaRow();
    case "fraction":
      return slots.numerator ?? createFormulaRow();
    case "sqrt":
    case "abs":
    case "paren":
    case "bracket":
      return slots.content ?? createFormulaRow();
    case "summation":
      return slots.body ?? createFormulaRow();
    case "trig":
    case "invtrig":
    case "ln":
      return slots.argument ?? createFormulaRow();
    case "log":
      return slots.argument ?? createFormulaRow();
    case "integral":
      return slots.integrand ?? createFormulaRow();
    default:
      return node;
  }
}

function ensureRow(node?: FormulaNode): FormulaNode {
  if (!node) return createFormulaRow();
  if (node.type === "row") return node;
  return createFormulaRow([node]);
}

function insertIntoRow(
  row: FormulaNode,
  nodeToInsert: FormulaNode,
  index?: number,
): FormulaNode {
  const prevChildren = row.children ?? [];
  const safeIndex =
    typeof index === "number"
      ? Math.max(0, Math.min(index, prevChildren.length))
      : prevChildren.length;
  const nextChildren = [
    ...prevChildren.slice(0, safeIndex),
    nodeToInsert,
    ...prevChildren.slice(safeIndex),
  ];
  return { ...row, children: nextChildren };
}

function insertNodeByParentId(
  current: FormulaNode,
  parentId: string,
  nodeToInsert: FormulaNode,
  location: FormulaInsertLocation,
): FormulaNode {
  if (current.id === parentId) {
    if (location.kind === "row") {
      if (current.type !== "row") return current;
      return insertIntoRow(current, nodeToInsert, location.index);
    }

    const slotName = location.slot;
    const prevSlots = current.slots ?? {};
    const existing = prevSlots[slotName];
    let nextSlot: FormulaNode;

    if (!existing || location.replace) {
      nextSlot = nodeToInsert;
    } else if (existing.type === "row") {
      nextSlot = insertIntoRow(existing, nodeToInsert);
    } else {
      nextSlot = createFormulaRow([existing, nodeToInsert]);
    }

    return {
      ...current,
      slots: {
        ...prevSlots,
        [slotName]: nextSlot,
      },
    };
  }

  const nextChildren = current.children?.map((child) =>
    insertNodeByParentId(child, parentId, nodeToInsert, location),
  );

  const nextSlots = current.slots
    ? Object.fromEntries(
        Object.entries(current.slots).map(([key, slotNode]) => [
          key,
          slotNode
            ? insertNodeByParentId(slotNode, parentId, nodeToInsert, location)
            : slotNode,
        ]),
      )
    : undefined;

  return {
    ...current,
    children: nextChildren,
    slots: nextSlots,
  };
}

function deleteNodeById(current: FormulaNode, nodeId: string): FormulaNode {
  const nextChildren = current.children
    ?.filter((child) => child.id !== nodeId)
    .map((child) => deleteNodeById(child, nodeId));

  const nextSlots = current.slots
    ? Object.fromEntries(
        Object.entries(current.slots).map(([key, slotNode]) => {
          if (!slotNode) return [key, slotNode];
          if (slotNode.id === nodeId) return [key, createFormulaRow()];
          return [key, deleteNodeById(slotNode, nodeId)];
        }),
      )
    : undefined;

  return {
    ...current,
    children: nextChildren,
    slots: nextSlots,
  };
}

function updateValueById(
  current: FormulaNode,
  nodeId: string,
  value: string,
): FormulaNode {
  if (current.id === nodeId) return { ...current, value };

  const nextChildren = current.children?.map((child) =>
    updateValueById(child, nodeId, value),
  );
  const nextSlots = current.slots
    ? Object.fromEntries(
        Object.entries(current.slots).map(([key, slotNode]) => [
          key,
          slotNode ? updateValueById(slotNode, nodeId, value) : slotNode,
        ]),
      )
    : undefined;

  return {
    ...current,
    children: nextChildren,
    slots: nextSlots,
  };
}

function wrapNode(
  target: FormulaNode,
  action: Extract<FormulaAction, { type: "WRAP_IN" }>,
) {
  const makeFunctionName = (fallback: string) =>
    action.functionName ?? fallback;
  const powerPosition: PowerPosition = action.powerPosition ?? "top-right";
  const empty = createFormulaRow();

  const byType: Record<WrappableFormulaNodeType, FormulaNode> = {
    power: createFormulaNode("power", {
      slots: {
        base: target,
        exponent: empty,
      },
      powerPosition,
    }),
    sqrt: createFormulaNode("sqrt", {
      slots: {
        content: target,
        index: empty,
      },
    }),
    fraction: createFormulaNode("fraction", {
      slots: {
        numerator: target,
        denominator: empty,
      },
    }),
    abs: createFormulaNode("abs", {
      slots: { content: target },
    }),
    paren: createFormulaNode("paren", {
      slots: { content: target },
    }),
    bracket: createFormulaNode("bracket", {
      slots: { content: target },
    }),
    summation: createFormulaNode("summation", {
      slots: {
        upper: empty,
        lower: empty,
        body: target,
      },
    }),
    trig: createFormulaNode("trig", {
      value: makeFunctionName("sin"),
      slots: {
        argument: target,
      },
    }),
    invtrig: createFormulaNode("invtrig", {
      value: makeFunctionName("sin"),
      slots: {
        argument: target,
      },
    }),
    log: createFormulaNode("log", {
      slots: {
        base: empty,
        argument: target,
      },
    }),
    ln: createFormulaNode("ln", {
      slots: {
        argument: target,
      },
    }),
    integral: createFormulaNode("integral", {
      slots: {
        upper: empty,
        lower: empty,
        integrand: target,
        variable: createFormulaNode("variable", { value: "x" }),
      },
    }),
  };

  return byType[action.wrapperType];
}

function replaceNodeById(
  current: FormulaNode,
  nodeId: string,
  makeReplacement: (target: FormulaNode) => FormulaNode,
): FormulaNode {
  if (current.id === nodeId) return makeReplacement(current);

  const nextChildren = current.children?.map((child) =>
    replaceNodeById(child, nodeId, makeReplacement),
  );

  const nextSlots = current.slots
    ? Object.fromEntries(
        Object.entries(current.slots).map(([key, slotNode]) => [
          key,
          slotNode
            ? replaceNodeById(slotNode, nodeId, makeReplacement)
            : slotNode,
        ]),
      )
    : undefined;

  return {
    ...current,
    children: nextChildren,
    slots: nextSlots,
  };
}

export function formulaReducer(
  state: FormulaState,
  action: FormulaAction,
): FormulaState {
  switch (action.type) {
    case "INSERT_NODE": {
      return {
        ...state,
        root: insertNodeByParentId(
          state.root,
          action.parentId,
          action.node,
          action.location,
        ),
      };
    }
    case "DELETE_NODE": {
      if (action.nodeId === state.root.id) return state;
      return {
        ...state,
        root: ensureRow(deleteNodeById(state.root, action.nodeId)),
      };
    }
    case "UPDATE_VALUE": {
      return {
        ...state,
        root: updateValueById(state.root, action.nodeId, action.value),
      };
    }
    case "WRAP_IN": {
      return {
        ...state,
        root: replaceNodeById(state.root, action.nodeId, (target) =>
          wrapNode(target, action),
        ),
      };
    }
    case "UNWRAP": {
      return {
        ...state,
        root: replaceNodeById(state.root, action.nodeId, (target) =>
          unwrapContent(target),
        ),
      };
    }
    default:
      return state;
  }
}
