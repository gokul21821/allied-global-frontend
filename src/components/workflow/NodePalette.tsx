import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "../../store/workflowStore";
import { PALETTE_ITEMS, makeNodeData, type PaletteItem } from "./nodeCatalog";

export function NodePalette() {
  const { screenToFlowPosition } = useReactFlow();
  const { addNode } = useWorkflowStore();

  function handleAdd(item: PaletteItem) {
    const id = `${item.nodeType}_${Date.now()}`;
    const position = screenToFlowPosition({ x: 400, y: 250 });

    addNode({
      id,
      type: item.nodeType,
      position,
      data: makeNodeData(item.nodeType),
    });
  }

  return (
    <aside className="w-52 border-r border-gray-100 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 p-3 flex flex-col gap-2 overflow-y-auto shrink-0">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        Add Nodes
      </p>
      {PALETTE_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.nodeType}
            onClick={() => handleAdd(item)}
            className="bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary dark:hover:border-primary-500 transition-all select-none"
            style={{ borderLeft: `3px solid ${item.color}` }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <Icon size={13} style={{ color: item.color }} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {item.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.description}</p>
          </div>
        );
      })}
    </aside>
  );
}
