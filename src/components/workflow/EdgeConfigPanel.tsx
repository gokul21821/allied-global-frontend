import { useWorkflowStore } from "../../store/workflowStore";
import { useMemo, useState } from "react";

type EdgeDirection = "forward" | "backward";
type SelectorValue = "none" | "llm";

export function EdgeConfigPanel() {
  const { edges, selectedEdgeId, updateEdgeData, setSelectedEdgeId } =
    useWorkflowStore();
  const edge = edges.find((item) => item.id === selectedEdgeId);
  const [activeTab, setActiveTab] = useState<EdgeDirection>("forward");

  if (!edge || !edge.data) return null;

  const edgeId = edge.id;
  const data = edge.data;
  const tabMeta = useMemo(
    () => ({
      forward: {
        title: "Forward condition",
        type: data.forwardConditionType,
        condition: data.forwardCondition,
        label: data.forwardLabel,
      },
      backward: {
        title: "Backward condition",
        type: data.backwardConditionType,
        condition: data.backwardCondition,
        label: data.backwardLabel,
      },
    }),
    [data],
  );

  const current = tabMeta[activeTab];
  const selectedType: SelectorValue = current.type === "llm" ? "llm" : "none";

  function updateCurrentDirection(patch: Partial<typeof current>) {
    if (activeTab === "forward") {
      updateEdgeData(edgeId, {
        forwardConditionType: (patch.type as SelectorValue | undefined) ?? data.forwardConditionType,
        forwardCondition: patch.condition ?? data.forwardCondition,
        forwardLabel: patch.label ?? data.forwardLabel,
      });
      return;
    }

    updateEdgeData(edgeId, {
      backwardConditionType:
        (patch.type as SelectorValue | undefined) ?? data.backwardConditionType,
      backwardCondition: patch.condition ?? data.backwardCondition,
      backwardLabel: patch.label ?? data.backwardLabel,
    });
  }

  return (
    <aside className="w-80 border-l border-gray-100 dark:border-dark-100 bg-white dark:bg-dark-200 p-4 space-y-4 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-white">Edge Condition</h3>
        <button
          onClick={() => setSelectedEdgeId(null)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          x
        </button>
      </div>

      <div className="flex gap-2 rounded-lg border border-gray-200 dark:border-dark-100 p-1">
        {([
          { key: "forward", label: "Forward" },
          { key: "backward", label: "Backward" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
              activeTab === tab.key
                ? "bg-primary text-white dark:bg-primary-500"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {current.title}
        </label>
        <select
          className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
          value={selectedType}
          onChange={(event) => {
            const nextType = event.target.value as SelectorValue;
            updateCurrentDirection({
              type: nextType,
              condition: nextType === "none" ? "" : current.condition,
              label: nextType === "none" ? "" : current.label,
            });
          }}
        >
          <option value="none">None</option>
          <option value="llm">LLM Condition</option>
        </select>
      </div>

      {selectedType === "llm" ? (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Label
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
              value={current.label}
              placeholder='e.g. "User asks for retry"'
              onChange={(event) => updateCurrentDirection({ label: event.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              LLM Condition
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary focus:border-primary"
              value={current.condition}
              placeholder='e.g. "The user provided invalid input"'
              onChange={(event) =>
                updateCurrentDirection({ condition: event.target.value })
              }
            />
          </div>
        </>
      ) : null}
    </aside>
  );
}
