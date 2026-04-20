import { useReactFlow } from "@xyflow/react";
import { FileStack, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useState } from "react";
import { deserializeWorkflow } from "../../lib/workflowDeserializer";
import { workflowTemplates } from "../../templates";
import { useWorkflowStore } from "../../store/workflowStore";

export function TemplatesButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { fitView } = useReactFlow();
  const { setNodes, setEdges } = useWorkflowStore();

  function handleSelectTemplate(template: Record<string, unknown>) {
    try {
      const { nodes, edges } = deserializeWorkflow(template);
      setNodes(nodes, { dirty: true });
      setEdges(edges, { dirty: true });
      setIsOpen(false);
      setTimeout(() => fitView({ padding: 0.2, duration: 450 }), 50);
    } catch (err) {
      console.error("Failed to load template:", err);
    }
  }

  const dialog = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-100">
              <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                Workflow Templates
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid gap-4">
              {workflowTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.template)}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-dark-100 hover:border-primary dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-500/10 text-left transition-all group"
                >
                  <span className="font-medium text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary-400">
                    {tpl.name}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tpl.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 hover:bg-gray-50 dark:hover:bg-dark-100 text-gray-600 dark:text-gray-400 shadow-sm transition-all"
        title="Load workflow template"
        type="button"
      >
        <FileStack size={13} />
        Templates
      </button>
      {dialog}
    </>
  );
}
