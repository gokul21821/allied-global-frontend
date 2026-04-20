import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import { llmOptions } from "../../lib/constants";
import { useWorkflowStore } from "../../store/workflowStore";
import type {
  EndNodeData,
  StartNodeData,
  SubagentNodeData,
  ToolCallNodeData,
  TransferNodeData,
} from "../../types/workflow";

interface ToolItem {
  tool_id: string;
  name: string;
}

interface VoiceItem {
  voice_id: string;
  name: string;
}

interface KnowledgeDoc {
  id: string;
  name: string;
  type: string;
}

interface NodeConfigPanelProps {
  tools: ToolItem[];
  voices: VoiceItem[];
  knowledgeDocs: KnowledgeDoc[];
  /** Called when Add Tool is clicked in subagent Tools tab. Opens the tool creation sidebar. */
  onAddToolClick?: () => void;
}

type TabId =
  | "overview"
  | "general"
  | "behavior"
  | "tools"
  | "knowledge"
  | "routing";

interface TabItem {
  id: TabId;
  label: string;
}

function getTabsForNodeType(nodeType: string): TabItem[] {
  switch (nodeType) {
    case "subagent":
      return [
        { id: "general", label: "General" },
        { id: "behavior", label: "Behavior" },
        { id: "tools", label: "Tools" },
        { id: "knowledge", label: "Knowledge Base" },
      ];
    case "tool_call":
      return [
        { id: "general", label: "General" },
        { id: "tools", label: "Tools" },
      ];
    case "transfer_to_number":
    case "agent_transfer":
      return [
        { id: "general", label: "General" },
        { id: "routing", label: "Routing" },
      ];
    case "start":
    case "end":
    default:
      return [{ id: "overview", label: "Overview" }];
  }
}

export function NodeConfigPanel({
  tools,
  voices,
  knowledgeDocs,
  onAddToolClick,
}: NodeConfigPanelProps) {
  const { nodes, selectedNodeId, updateNodeData, setSelectedNodeId } =
    useWorkflowStore();

  const node = nodes.find((item) => item.id === selectedNodeId);
  const nodeType = node?.data.nodeType ?? "start";
  const tabs = getTabsForNodeType(nodeType);
  const [activeTab, setActiveTab] = useState<TabId>(tabs[0]?.id ?? "overview");

  useEffect(() => {
    setActiveTab(getTabsForNodeType(nodeType)[0]?.id ?? "overview");
  }, [nodeType, node?.id]);

  if (!node) return null;

  const data = node.data;

  return (
    <aside className="w-80 border-l border-gray-100 dark:border-dark-100 bg-white dark:bg-dark-200 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-100">
        <h3 className="font-semibold text-gray-800 dark:text-white capitalize">
          {data.nodeType.replace(/_/g, " ")}
        </h3>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
        >
          x
        </button>
      </div>

      <div className="border-b border-gray-100 dark:border-dark-100 px-2 pt-2">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-100 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {data.nodeType === "subagent" ? (
          <SubagentConfig
            nodeId={node.id}
            data={data}
            updateNodeData={updateNodeData}
            tools={tools}
            voices={voices}
            knowledgeDocs={knowledgeDocs}
            activeTab={activeTab}
            onAddToolClick={onAddToolClick}
          />
        ) : null}

        {data.nodeType === "tool_call" ? (
          <ToolCallConfig
            nodeId={node.id}
            data={data}
            updateNodeData={updateNodeData}
            tools={tools}
            activeTab={activeTab}
          />
        ) : null}

        {data.nodeType === "transfer_to_number" ||
        data.nodeType === "agent_transfer" ? (
          <TransferConfig
            nodeId={node.id}
            data={data}
            updateNodeData={updateNodeData}
            activeTab={activeTab}
          />
        ) : null}

        {data.nodeType === "end" ? (
          <EndConfig
            nodeId={node.id}
            data={data}
            updateNodeData={updateNodeData}
          />
        ) : null}

        {data.nodeType === "start" ? <StartConfig data={data} /> : null}
      </div>
    </aside>
  );
}

interface CommonConfigProps<T> {
  nodeId: string;
  data: T;
  updateNodeData: (id: string, data: Partial<any>) => void;
}

interface ScrollableSelectOption {
  value: string;
  label: string;
}

function ScrollableSelect({
  value,
  options,
  onChange,
  placeholder,
  "data-testid": dataTestId,
}: {
  value: string;
  options: ScrollableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const openDropdown = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? value;

  return (
    <div className="relative" data-testid={dataTestId}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        className="w-full flex items-center justify-between gap-2 border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white text-left hover:border-gray-400 dark:hover:border-dark-50"
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={(el) => {
              dropdownRef.current = el;
            }}
            className="fixed z-[9999] rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200 shadow-lg max-h-[300px] overflow-y-auto"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-100 first:rounded-t-lg last:rounded-b-lg ${
                  opt.value === value
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h4>
      {description ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}
    </div>
  );
}

function LabelField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
        Node Label
      </label>
      <input
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 dark:border-dark-50 px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-dark-100 disabled:text-gray-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SubagentConfig({
  nodeId,
  data,
  updateNodeData,
  tools,
  voices,
  knowledgeDocs,
  activeTab,
  onAddToolClick,
}: CommonConfigProps<SubagentNodeData> & {
  tools: ToolItem[];
  voices: VoiceItem[];
  knowledgeDocs: KnowledgeDoc[];
  activeTab: TabId;
  onAddToolClick?: () => void;
}) {
  const selectedKnowledgeBase = data.knowledgeBase ?? [];

  if (activeTab === "general") {
    return (
      <>
        <SectionTitle
          title="Prompt Setup"
          description="Configure the label and system prompt for this conversational step."
        />
        <LabelField
          value={data.label}
          onChange={(value) => updateNodeData(nodeId, { label: value })}
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            System Prompt
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className={`text-xs px-2 py-0.5 rounded border ${
                !data.systemPromptOverride
                  ? "bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-700"
                  : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-50"
              }`}
              onClick={() =>
                updateNodeData(nodeId, { systemPromptOverride: false })
              }
            >
              Append
            </button>
            <button
              type="button"
              className={`text-xs px-2 py-0.5 rounded border ${
                data.systemPromptOverride
                  ? "bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-700"
                  : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-50"
              }`}
              onClick={() =>
                updateNodeData(nodeId, { systemPromptOverride: true })
              }
            >
              Override
            </button>
          </div>
          <textarea
            rows={8}
            className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary focus:border-primary"
            value={data.systemPrompt}
            placeholder="Prompt for this node..."
            onChange={(event) =>
              updateNodeData(nodeId, { systemPrompt: event.target.value })
            }
          />
        </div>
      </>
    );
  }

  if (activeTab === "tools") {
    return (
      <>
        <SectionTitle
          title="Tools"
          description="Add webhook tools or select from existing tools for this node."
        />
        {onAddToolClick ? (
          <button
            type="button"
            onClick={onAddToolClick}
            className="flex items-center gap-2 w-full justify-center px-3 py-2 text-sm font-medium text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 rounded-lg border border-primary-200 dark:border-primary-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Tool
          </button>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Selected Tools
          </label>
          <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-200 dark:border-dark-100 rounded-lg p-2 bg-white dark:bg-dark-100">
            {tools.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">No tools available</p>
            ) : null}
            {tools.map((tool) => (
              <label
                key={tool.tool_id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.toolIds.includes(tool.tool_id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...data.toolIds, tool.tool_id]
                      : data.toolIds.filter((id) => id !== tool.tool_id);
                    updateNodeData(nodeId, { toolIds: next });
                  }}
                />
                {tool.name}
              </label>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (activeTab === "behavior") {
    return (
      <>
        <SectionTitle
          title="Behavior"
          description="Adjust model, turn-taking, and voice overrides for this node."
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            LLM Model
          </label>
          <ScrollableSelect
            value={data.llm}
            options={[
              ...(!llmOptions.includes(data.llm) && data.llm
                ? [{ value: data.llm, label: data.llm }]
                : []),
              ...llmOptions.map((m) => ({ value: m, label: m })),
            ]}
            onChange={(val) => updateNodeData(nodeId, { llm: val })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Turn Eagerness
          </label>
          <div className="flex gap-2">
            {(["eager", "normal", "patient"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateNodeData(nodeId, { turnEagerness: option })}
                className={`flex-1 text-xs py-1.5 rounded-lg border capitalize ${
                  data.turnEagerness === option
                    ? "bg-primary text-white border-primary dark:bg-primary-500 dark:border-primary-500"
                    : "bg-white dark:bg-dark-100 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-50 hover:bg-gray-50 dark:hover:bg-dark-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Voice Override
          </label>
          <ScrollableSelect
            value={data.voiceId}
            options={[
              { value: "", label: "Use agent default" },
              ...voices.map((v) => ({ value: v.voice_id, label: v.name })),
            ]}
            onChange={(val) => updateNodeData(nodeId, { voiceId: val })}
            placeholder="Use agent default"
          />
        </div>

      </>
    );
  }

  if (activeTab === "knowledge") {
    return (
      <>
        <SectionTitle
          title="Knowledge Base"
          description="Choose which knowledge documents this subagent can use."
        />
        {!knowledgeDocs?.length ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No knowledge base documents found.{" "}
            <a
              href="/dashboard/knowledge"
              className="text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Manage documents
            </a>
            .
          </p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-dark-100 rounded-lg p-2 bg-white dark:bg-dark-100">
            {knowledgeDocs.map((doc) => {
              const checked = selectedKnowledgeBase.some((kb) => kb.id === doc.id);
              return (
                <label
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-50"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [
                              ...selectedKnowledgeBase,
                              { id: doc.id, name: doc.name, type: doc.type },
                            ]
                          : selectedKnowledgeBase.filter((kb) => kb.id !== doc.id);
                        updateNodeData(nodeId, { knowledgeBase: next });
                      }}
                    />
                    <span className="truncate text-gray-800 dark:text-gray-200">
                      {doc.name}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-gray-100 dark:bg-dark-50 px-2 py-0.5 text-[10px] uppercase text-gray-500 dark:text-gray-400">
                    {doc.type}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return null;
}

function ToolCallConfig({
  nodeId,
  data,
  updateNodeData,
  tools,
  activeTab,
}: CommonConfigProps<ToolCallNodeData> & {
  tools: ToolItem[];
  activeTab: TabId;
}) {
  if (activeTab === "general") {
    return (
      <>
        <SectionTitle
          title="Tool Call"
          description="Name this step and describe where the workflow executes a tool."
        />
        <LabelField
          value={data.label}
          onChange={(value) => updateNodeData(nodeId, { label: value })}
        />
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          This node exposes success and failure handles for manual branching.
        </div>
      </>
    );
  }

  return (
    <>
      <SectionTitle
        title="Tool Selection"
        description="Choose the tool executed by this step."
      />
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tool
          </label>
          <select
            className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
            value={data.toolId}
          onChange={(event) =>
            updateNodeData(nodeId, { toolId: event.target.value })
          }
        >
          <option value="">Select tool</option>
          {tools.map((tool) => (
            <option key={tool.tool_id} value={tool.tool_id}>
              {tool.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function TransferConfig({
  nodeId,
  data,
  updateNodeData,
  activeTab,
}: CommonConfigProps<TransferNodeData> & { activeTab: TabId }) {
  const isPhoneTransfer = data.nodeType === "transfer_to_number";

  if (activeTab === "general") {
    return (
      <>
        <SectionTitle
          title="General"
          description="Name this transfer step before configuring the routing target."
        />
        <LabelField
          value={data.label}
          onChange={(value) => updateNodeData(nodeId, { label: value })}
        />
      </>
    );
  }

  return (
    <>
      <SectionTitle
        title="Routing Target"
        description={
          isPhoneTransfer
            ? "Choose the phone number and message for this handoff."
            : "Choose the target agent and message for this handoff."
        }
      />
      {isPhoneTransfer ? (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Phone Number
          </label>
          <input
            className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
            value={data.phoneNumber || ""}
            onChange={(event) =>
              updateNodeData(nodeId, { phoneNumber: event.target.value })
            }
            placeholder="+1..."
          />
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Agent ID
          </label>
          <input
            className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
            value={data.agentId || ""}
            onChange={(event) =>
              updateNodeData(nodeId, { agentId: event.target.value })
            }
            placeholder="agent_..."
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Transfer Message
        </label>
        <textarea
          rows={3}
          className="w-full border border-gray-300 dark:border-dark-50 rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-100 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary focus:border-primary"
          value={data.message || ""}
          onChange={(event) =>
            updateNodeData(nodeId, { message: event.target.value })
          }
        />
      </div>
    </>
  );
}

function EndConfig({
  nodeId,
  data,
  updateNodeData,
}: CommonConfigProps<EndNodeData>) {
  return (
    <>
      <SectionTitle
        title="End Node"
        description="This node terminates the conversation path."
      />
      <LabelField
        value={data.label}
        onChange={(value) => updateNodeData(nodeId, { label: value })}
      />
      <div className="rounded-lg bg-gray-50 dark:bg-dark-100 p-3 text-xs text-gray-500 dark:text-gray-400">
        Any path that reaches this node ends the workflow.
      </div>
    </>
  );
}

function StartConfig({ data }: { data: StartNodeData }) {
  return (
    <>
      <SectionTitle
        title="Start Node"
        description="This is the frontend-only workflow anchor. It is not sent to the backend."
      />
      <LabelField value={data.label} onChange={() => undefined} disabled />
      <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-3 text-xs text-teal-800 dark:text-teal-200">
        Connect this node to the first real step in the workflow.
      </div>
    </>
  );
}
