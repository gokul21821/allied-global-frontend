import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { WorkflowEdgeData } from "../../types/workflow";
import { useWorkflowStore } from "../../store/workflowStore";

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<WorkflowEdgeData>>) {
  const { setSelectedEdgeId } = useWorkflowStore();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const hasForward = data?.forwardConditionType !== "none";
  const hasBackward = data?.backwardConditionType !== "none";

  const forwardText = (data?.forwardLabel || data?.forwardCondition || "").trim();
  const backwardText = (data?.backwardLabel || data?.backwardCondition || "").trim();

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: "#65a30d",
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <>
          {hasForward ? (
            <button
              type="button"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 16}px)`,
              }}
              className="absolute pointer-events-auto"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelectedEdgeId(id);
              }}
            >
              <span
                className={`inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-center text-xs font-medium shadow-sm ${
                  selected
                    ? "border-primary-300 bg-primary-100 text-primary-800 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                    : "border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:border-primary-300 dark:hover:border-primary-600"
                }`}
              >
                <ArrowDown size={12} />
                <span className="truncate">{forwardText || "Forward condition"}</span>
              </span>
            </button>
          ) : null}

          {hasBackward ? (
            <button
              type="button"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + 16}px)`,
              }}
              className="absolute pointer-events-auto"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelectedEdgeId(id);
              }}
            >
              <span
                className={`inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-center text-xs font-medium shadow-sm ${
                  selected
                    ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200"
                    : "border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 hover:border-amber-300 dark:hover:border-amber-600"
                }`}
              >
                <ArrowUp size={12} />
                <span className="truncate">{backwardText || "Backward condition"}</span>
              </span>
            </button>
          ) : null}
        </>
      </EdgeLabelRenderer>

    </>
  );
}

export const EDGE_TYPES = {
  workflowEdge: WorkflowEdge,
} as const;
