import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useWorkflowStore } from "../../../store/workflowStore";
import { cn } from "../../../lib/utils";
import { NodeActionMenu } from "../NodeActionMenu";

interface BaseNodeProps {
  id: string;
  selected: boolean;
  color: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  hasInputHandle?: boolean;
  hasOutputHandle?: boolean;
  hasSuccessHandle?: boolean;
  hasFailureHandle?: boolean;
  showActionMenu?: boolean;
  deletable?: boolean;
}

export function BaseNode({
  id,
  selected,
  color,
  icon,
  title,
  subtitle,
  hasInputHandle = true,
  hasOutputHandle = true,
  hasSuccessHandle = false,
  hasFailureHandle = false,
  showActionMenu = hasOutputHandle && !hasSuccessHandle && !hasFailureHandle,
  deletable = true,
}: BaseNodeProps) {
  const { setSelectedNodeId, deleteNode } = useWorkflowStore();

  return (
    <div
      className={cn(
        "relative w-64 rounded-xl border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200 shadow-sm",
        "transition-all duration-150 cursor-pointer",
        selected ? "ring-2 ring-primary shadow-lg dark:ring-primary-500" : "hover:shadow-md",
      )}
      style={{ borderLeft: `4px solid ${color}` }}
      onClick={() => setSelectedNodeId(id)}
    >
      {selected && deletable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors nodrag nopan"
          title="Delete node"
        >
          <Trash2 size={14} />
        </button>
      )}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !bg-gray-400 dark:!bg-gray-500 !border-2 !border-white dark:!border-dark-200"
        />
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color }}>{icon}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
            {title}
          </span>
        </div>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        ) : null}
      </div>

      {hasOutputHandle && !hasSuccessHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !bg-primary !border-2 !border-white dark:!border-dark-200"
        />
      )}

      {hasSuccessHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="success"
          style={{ left: "35%" }}
          className="!w-4 !h-4 !bg-green-500 !border-2 !border-white dark:!border-dark-200"
        />
      )}

      {hasFailureHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="failure"
          style={{ left: "65%" }}
          className="!w-4 !h-4 !bg-red-500 !border-2 !border-white dark:!border-dark-200"
        />
      )}

      <NodeActionMenu sourceNodeId={id} disabled={!showActionMenu} />
    </div>
  );
}
