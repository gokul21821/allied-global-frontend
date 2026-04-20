import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { useWorkflowStore } from "../../store/workflowStore";
import { PALETTE_ITEMS, makeNodeData, type PaletteNodeType } from "./nodeCatalog";

interface NodeActionMenuProps {
  sourceNodeId: string;
  disabled?: boolean;
  sourceHandle?: string;
}

const X_OFFSETS = [0, -180, 180, -360, 360];

export function NodeActionMenu({
  sourceNodeId,
  disabled = false,
  sourceHandle,
}: NodeActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    addNode,
    addWorkflowEdge,
    setSelectedNodeId,
  } = useWorkflowStore();

  const sourceNode = nodes.find((node) => node.id === sourceNodeId);
  const menuItems = useMemo(
    () =>
      PALETTE_ITEMS.filter(
        (item) => item.nodeType !== "tool_call", // tool_call commented out
      ),
    [],
  );

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownRect({
        left: rect.left + rect.width / 2 - 128,
        top: rect.bottom + 8,
      });
    } else {
      setDropdownRect(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  if (!sourceNode || disabled) return null;

  function handleAddNode(nodeType: PaletteNodeType) {
    if (!sourceNode) return;
    const outgoingCount = edges.filter((edge) => edge.source === sourceNodeId).length;
    const position = {
      x: sourceNode.position.x + (X_OFFSETS[outgoingCount] ?? outgoingCount * 180),
      y: sourceNode.position.y + 200,
    };
    const newNodeId = `${nodeType}_${Date.now()}`;

    addNode({
      id: newNodeId,
      type: nodeType,
      position,
      data: makeNodeData(nodeType),
    });

    addWorkflowEdge({
      id: `edge-${sourceNodeId}-${newNodeId}-${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      sourceHandle,
      type: "workflowEdge",
      data: {
        forwardConditionType: "none",
        forwardCondition: "",
        forwardLabel: "",
        backwardConditionType: "none",
        backwardCondition: "",
        backwardLabel: "",
      },
    });

    setSelectedNodeId(newNodeId);
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 -bottom-11 z-20 -translate-x-1/2"
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200 text-gray-600 dark:text-gray-400 shadow-sm transition hover:border-primary hover:text-primary dark:hover:text-primary-400 nodrag nopan"
        title="Add connected node"
      >
        <Plus size={16} />
      </button>

      {isOpen && dropdownRect
        ? createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] w-64 rounded-xl border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200 p-2 shadow-xl"
              style={{
                left: dropdownRect.left,
                top: dropdownRect.top,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Add connected node
              </p>
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.nodeType}
                      type="button"
                      onClick={() => handleAddNode(item.nodeType)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition",
                        "hover:bg-gray-50 dark:hover:bg-dark-100",
                      )}
                    >
                      <span
                        className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-gray-50 dark:bg-dark-100"
                        style={{ color: item.color }}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800 dark:text-white">
                          {item.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
