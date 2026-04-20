import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Volume2,
  Thermometer,
  Sparkles,
  Globe,
  Settings,
  Speech,
  Webhook,
  ChevronRight,
  Plus,
  Database,
  Trash2,
  Zap,
  CheckCircle2,
  ArrowRight,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import CallTesting from "../../components/CallTesting";
import { KnowledgeBaseSelect } from "../../components/KnowledgeBaseSelect";
import { VoiceModal } from "../../components/VoiceModal"; // <-- The updated VoiceModal
import { ModelSelect } from "../../components/ModelSelect";
import { DataCollectionVariable } from "../../components/DataCollectionVariable";
import { WebhookVariable } from "../../components/WebhookVariable";
import { ToolConfigModal } from "../../components/ToolConfigModal";
import { LanguageSelect } from "../../components/LanguageSelect";
import { AdditionalLanguagesSelect } from "../../components/AdditionalLanguagesSelect";
import { Loader, PageLoader } from "../../components/Loader";
import { useAgentLoad } from "../../hooks/useAgentLoad";
import { useAgentSave } from "../../hooks/useAgentSave";
import { WorkflowCanvas } from "../../components/workflow/WorkflowCanvas";
import { NodeConfigPanel } from "../../components/workflow/NodeConfigPanel";
import { EdgeConfigPanel } from "../../components/workflow/EdgeConfigPanel";
import { deserializeWorkflow } from "../../lib/workflowDeserializer";
import { serializeWorkflow } from "../../lib/workflowSerializer";
import { validateWorkflow } from "../../lib/workflowValidator";
import { useWorkflowStore } from "../../store/workflowStore";
import type { ELWorkflow } from "../../types/workflow";
import {
  getModelId,
  getLanguageName,
  llmOptions,
  getAvailableModels,
} from "../../lib/constants";

interface DynamicVariable {
  type: string; // "boolean" | "string" | "number" | "integer"
  description?: string;
  dynamic_variable?: string;
  constant_value?: string; // "string" | "integer" | "double" | "boolean"
}

interface PrivacySettings {
  record_voice?: boolean;
  retention_days?: number;
  delete_transcript_and_pii?: boolean;
  delete_audio?: boolean;
  apply_to_existing_conversations?: boolean;
  zero_retention_mode?: boolean;
}

interface BuiltInTool {
  name: string;
  description: string;
  response_timeout_secs: number;
  type: "system";
  params: {
    system_tool_type: string;
    // Transfer to Agent fields
    agent_id?: string;
    condition?: string;
    delay_ms?: number;
    transfer_message?: string;
    enable_transferred_agent_first_message?: boolean;
    transfers?: Array<
      | {
          agent_id: string;
          condition: string;
          delay_ms?: number;
          transfer_message?: string;
          enable_transferred_agent_first_message?: boolean;
        }
      | {
          condition: string;
          transfer_destination: {
            phone_number: string;
            type: "phone";
          };
          transfer_type: string;
        }
    >;
    // Transfer to Number fields
    enable_client_message?: boolean;
  };
}

interface AgentDetails {
  agent_id: string;
  name: string;
  platform_settings: {
    data_collection: {
      [key: string]: DynamicVariable;
    };
    workspace_overrides: {
      conversation_initiation_client_data_webhook?: {
        url: string;
        request_headers: {
          "Content-Type": string;
        };
      };
    };
    privacy?: PrivacySettings;
  };
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        custom_llm?: CustomLlm;
        knowledge_base: {
          id: string;
          name: string;
          type: string;
        }[];
        tool_ids: string[];
        built_in_tools: {
          [key: string]: BuiltInTool | null;
        };
      };
      first_message: string;
      language: string;
      additional_languages?: Array<{
        language_code: string;
        voice_id?: string;
        first_message?: string;
      }>;
    };
    tts: {
      voice_id: string;
      model_id: string;
      optimize_streaming_latency: number; // The optimization for streaming latency
      stability: number; // The stability of generated speech ( double, >=0 to <=1, defaults to 0.5)
      speed: number; // The speed of generated speech ( double, >=0.7 to <=1.2, defaults to 1)
      similarity_boost: number; // The similarity boost for generated speech ( double, >=0 to <=1, defaults to 0.8)
    };
    turn: {
      turn_timeout: number; //Maximum wait time for the user's reply before re-engaging the user (double, defaults to 7)
      silence_end_call_timeout: number; // Maximum wait time since the user last spoke before terminating the call (double, defaults to -1)
      mode: string; // enum: "silence" or "turn"
    };
    asr?: {
      keywords?: string[];
    };
  };
  workflow?: ELWorkflow | null;
}

interface CustomLlm {
  url: string;
  model_id?: string;
  api_key: {
    secret_id: string;
  };
}

interface LLMUsageResponse {
  llm_prices: Array<{
    llm: string;
    price_per_minute: number;
  }>;
}

interface EditForm {
  name: string;
  prompt: string;
  llm: string;
  temperature: number;
  first_message: string;
  voice_id: string;
  language: string;
  additional_languages: Array<{
    language_code: string;
    voice_id?: string;
    first_message?: string;
  }>;
  modelType: string;
  custom_llm?: CustomLlm;
  platform_settings?: {
    data_collection: {
      [key: string]: DynamicVariable;
    };
    workspace_overrides?: {
      conversation_initiation_client_data_webhook?: {
        url: string;
        request_headers: {
          "Content-Type": string;
        };
      };
    };
    privacy?: PrivacySettings;
  };
  knowledge_base: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  tool_ids: string[];
  built_in_tools: {
    [key: string]: BuiltInTool | null;
  };
  tts?: {
    optimize_streaming_latency?: number;
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  };
  turn?: {
    turn_timeout?: number;
    silence_end_call_timeout?: number;
    mode?: string;
  };
  asr?: {
    keywords?: string[];
  };
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Basic agent icon logic
const agentIcons = [{ icon: Speech, color: "primary" }];
const getAgentIcon = (agentId: string) => {
  const index =
    Math.abs(
      agentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    ) % agentIcons.length;
  return agentIcons[index];
};

const AgentDetails = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getEffectiveUser, user: originalUser } = useAuth();
  const user = getEffectiveUser();

  const {
    agent,
    voice,
    setVoice,
    voices,
    knowledgeBase,
    tools,
    loading,
    loadingVoices,
    loadingKnowledgeBase,
    error,
    setError,
    fetchAgentDetails,
    refreshTools,
  } = useAgentLoad({
    backendUrl: BACKEND_URL,
    effectiveUser: user,
    authUser: originalUser,
    agentId,
  });
  const { saveAgent } = useAgentSave({
    backendUrl: BACKEND_URL,
    effectiveUser: user,
    authUser: originalUser,
    agentId,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const [dynamicVariableErrors, setDynamicVariableErrors] = useState<{
    first_message: string[];
    prompt: string[];
  }>({
    first_message: [],
    prompt: [],
  });
  // UI toggles
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [isCreatingTool, setIsCreatingTool] = useState(false);
  const [editingTool, setEditingTool] = useState<
    { type: "tool_id"; id: string } | { type: "built_in"; key: string } | null
  >(null);
  const [showAdvancedVoiceSettings, setShowAdvancedVoiceSettings] =
    useState(false);
  const [
    showAdvancedConversationSettings,
    setShowAdvancedConversationSettings,
  ] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showLLMUsageModal, setShowLLMUsageModal] = useState(false);

  const [editingVarName, setEditingVarName] = useState<string | null>(null);
  const [editingVarValue, setEditingVarValue] = useState<string>("");

  // The form data
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    prompt: "",
    llm: "",
    temperature: 0.7,
    first_message: "",
    voice_id: "",
    language: "en",
    additional_languages: [],
    modelType: "turbo",
    custom_llm: {
      url: "",
      model_id: "",
      api_key: {
        secret_id: "",
      },
    },
    knowledge_base: [],
    tool_ids: [],
    built_in_tools: {},
    platform_settings: {
      data_collection: {},
      workspace_overrides: {
        conversation_initiation_client_data_webhook: {
          url: "",
          request_headers: {
            "Content-Type": "application/json",
          },
        },
      },
      privacy: {
        record_voice: true,
        retention_days: -1,
        delete_transcript_and_pii: false,
        delete_audio: false,
        apply_to_existing_conversations: false,
        zero_retention_mode: false,
      },
    },
    tts: {
      optimize_streaming_latency: 0,
      stability: 0.5,
      speed: 1.0,
      similarity_boost: 0.8,
    },
    turn: {
      turn_timeout: 7,
      silence_end_call_timeout: -1,
      mode: "silence",
    },
    asr: {
      keywords: [],
    },
  });
  const [editedForm, setEditedForm] = useState<EditForm>(editForm);

  const [conversationInitiationMode, setConversationInitiationMode] = useState(
    editForm.first_message === "" ? "user" : "bot",
  );
  const [asrKeywordsInput, setAsrKeywordsInput] = useState("");
  const [secretName, setSecretName] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [generatingSecret, setGeneratingSecret] = useState(false);
  const [updatingSecret, setUpdatingSecret] = useState(false);
  const [dynamicVariablePlaceholders, setDynamicVariablePlaceholders] =
    useState<{ [key: string]: string }>({});
  const [llmUsageData, setLlmUsageData] = useState<any>(null);
  const [loadingLLMUsage, setLoadingLLMUsage] = useState(false);
  const [llmUsageError, setLlmUsageError] = useState("");
  const [userPromptLength, setUserPromptLength] = useState<string>("");
  const [userNumberOfPages, setUserNumberOfPages] = useState<string>("");
  const [mode, setMode] = useState<"simple" | "workflow">("simple");
  const [showAgentModeConfirm, setShowAgentModeConfirm] = useState(false);
  const [hasUserToggledMode, setHasUserToggledMode] = useState(false);
  const toolsById = new Map(tools.map((tool) => [tool.tool_id, tool.name]));
  const workflowIsDirty = useWorkflowStore((state) => state.isDirty);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorkflowStore((state) => state.selectedEdgeId);
  const workflowNodes = useWorkflowStore((state) => state.nodes);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  useEffect(() => {
    fetchAgentDetails();
  }, [fetchAgentDetails]);

  useEffect(() => {
    if (!agent) return;

    const workflow = (agent as AgentDetails).workflow;
    if (workflow?.nodes && Object.keys(workflow.nodes).length > 0) {
      const { nodes, edges } = deserializeWorkflow(workflow, knowledgeBase);
      useWorkflowStore.getState().setNodes(nodes, { dirty: false });
      useWorkflowStore.getState().setEdges(edges, { dirty: false });
      useWorkflowStore.getState().markClean();
    } else {
      useWorkflowStore.getState().resetWorkflow();
    }
  }, [agent, knowledgeBase]);

  useEffect(() => {
    if (mode === "simple") {
      useWorkflowStore.getState().resetWorkflow();
    } else if (mode === "workflow") {
      const workflow = (agent as AgentDetails | null)?.workflow;
      if (workflow?.nodes && Object.keys(workflow.nodes).length > 0) {
        const { nodes, edges } = deserializeWorkflow(workflow, knowledgeBase);
        useWorkflowStore.getState().setNodes(nodes, { dirty: false });
        useWorkflowStore.getState().setEdges(edges, { dirty: false });
        useWorkflowStore.getState().markClean();
      } else {
        useWorkflowStore.getState().initializeWorkflow();
      }
    }
  }, [mode, agent, knowledgeBase]);

  // Validate data collection variables
  const validateDataCollectionVariables = () => {
    const dataCollection = editedForm.platform_settings?.data_collection || {};
    for (const [varName, varConfig] of Object.entries(dataCollection)) {
      if (varConfig.description !== undefined) {
        if (!varConfig.description || varConfig.description.trim() === "") {
          throw new Error(`Description is required for variable "${varName}"`);
        }
      } else if (varConfig.constant_value !== undefined) {
        if (
          !varConfig.constant_value ||
          varConfig.constant_value.trim() === ""
        ) {
          throw new Error(
            `Constant value is required for variable "${varName}"`,
          );
        }
      } else if (varConfig.dynamic_variable !== undefined) {
        if (
          !varConfig.dynamic_variable ||
          varConfig.dynamic_variable.trim() === ""
        ) {
          throw new Error(
            `Dynamic variable is required for variable "${varName}"`,
          );
        }
      }
    }
  };

  // Check if there are any dynamic variable validation errors
  const hasDynamicVariableErrors = () => {
    return (
      dynamicVariableErrors.first_message.length > 0 ||
      dynamicVariableErrors.prompt.length > 0
    );
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!user || !agentId) return;
    // In workflow mode, allow save even with dynamic variable errors (user can't fix them in workflow view)
    if (mode === "simple" && hasDynamicVariableErrors()) return;

    try {
      setSaving(true);
      setError("");

      // Validate data collection variables before saving
      validateDataCollectionVariables();

      const payload = {
        name: editedForm.name,
        conversation_config: {
          agent: {
            prompt: {
              prompt: editedForm.prompt,
              llm: editedForm.llm,
              temperature: editedForm.temperature,
              ...(editedForm.llm === "custom-llm" && editedForm.custom_llm
                ? {
                    custom_llm: editedForm.custom_llm,
                  }
                : {}),
              knowledge_base: editedForm.knowledge_base,
              tool_ids: editedForm.tool_ids,
              built_in_tools: Object.fromEntries(
                Object.entries(editedForm.built_in_tools || {}).filter(
                  ([_, value]) => value !== null,
                ),
              ),
            },
            ...(conversationInitiationMode === "user"
              ? {}
              : { first_message: editedForm.first_message }),
            language: editedForm.language,
            ...(Array.isArray(editedForm.additional_languages) &&
            editedForm.additional_languages.length > 0
              ? { additional_languages: editedForm.additional_languages }
              : {}),
            ...(() => {
              const firstMessage =
                conversationInitiationMode === "user"
                  ? ""
                  : editedForm.first_message;
              const dynamicVarsAll = extractAllDynamicVariables(
                firstMessage,
                editedForm.prompt,
              );

              if (
                dynamicVarsAll.length > 0 &&
                Object.keys(dynamicVariablePlaceholders).length > 0
              ) {
                return {
                  dynamic_variables: {
                    dynamic_variable_placeholders: dynamicVariablePlaceholders,
                  },
                };
              }
              return {
                dynamic_variables: {
                  dynamic_variable_placeholders: {},
                },
              };
            })(),
          },
          tts: {
            voice_id: editedForm.voice_id,
            model_id: getModelId(editedForm.modelType, editedForm.language),
            optimize_streaming_latency:
              editedForm.tts?.optimize_streaming_latency || 0,
            stability: editedForm.tts?.stability || 0.5,
            speed: editedForm.tts?.speed || 1.0,
            similarity_boost: editedForm.tts?.similarity_boost || 0.8,
          },
          turn: {
            turn_timeout: editedForm.turn?.turn_timeout || 7,
            silence_end_call_timeout:
              editedForm.turn?.silence_end_call_timeout || -1,
            mode: editedForm.turn?.mode || "silence",
          },
          asr: {
            keywords: editedForm.asr?.keywords || [],
          },
        },
        platform_settings: {
          data_collection: Object.fromEntries(
            Object.entries(
              editedForm.platform_settings?.data_collection || {},
            ).map(([key, value]) => {
              const { constant_value_type, ...rest } = value;
              return [key, rest];
            }),
          ),
          workspace_overrides: (() => {
            const webhookUrl =
              editedForm.platform_settings?.workspace_overrides
                ?.conversation_initiation_client_data_webhook?.url;
            if (webhookUrl && webhookUrl.trim()) {
              return {
                conversation_initiation_client_data_webhook: {
                  url: webhookUrl,
                  request_headers: {
                    "Content-Type": "application/json",
                  },
                },
              };
            }
            return {};
          })(),
          privacy: editedForm.platform_settings?.privacy || {
            record_voice: true,
            retention_days: -1,
            delete_transcript_and_pii: false,
            delete_audio: false,
            apply_to_existing_conversations: false,
            zero_retention_mode: false,
          },
        },
      } as Record<string, unknown>;

      if (mode === "workflow") {
        const { nodes, edges } = useWorkflowStore.getState();
        const validationIssues = validateWorkflow(nodes, edges);
        const blockingIssue = validationIssues.find(
          (issue) => issue.severity === "error",
        );

        if (blockingIssue) {
          setError(blockingIssue.message);
          setSaving(false);
          return;
        }

        const warningIssue = validationIssues.find(
          (issue) => issue.severity === "warning",
        );
        if (warningIssue) {
          setError(`Warning: ${warningIssue.message}`);
          setSaving(false);
          return;
        }

        payload.workflow = serializeWorkflow(nodes, edges);
      } else {
        payload.workflow = null;
      }

      await saveAgent(payload);

      // Wait a brief moment to ensure ElevenLabs API has processed the update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch updated agent details to ensure UI reflects latest state
      await fetchAgentDetails();
      setHasChanges(false);
      useWorkflowStore.getState().markClean();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Error updating agent:", err);
      const message =
        err instanceof Error ? err.message : "Failed to update agent. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setEditedForm(editForm);
    setHasChanges(false);

    // Reset ASR keywords input
    setAsrKeywordsInput(editForm.asr?.keywords?.join(", ") || "");

    // Reset voice display to original voice
    const originalVoice = voices.find((v) => v.voice_id === editForm.voice_id);
    setVoice(originalVoice || null);

    // Reset conversation initiation mode
    setConversationInitiationMode(
      editForm.first_message === "" ? "user" : "bot",
    );

    // Reset dynamic variable placeholders to original state
    const originalFirstMessage = editForm.first_message;
    const originalPrompt = editForm.prompt;
    const originalDynamicVars = extractAllDynamicVariables(
      originalFirstMessage,
      originalPrompt,
    );
    const originalPlaceholders: { [key: string]: string } = {};

    // Restore original placeholders from the backend data
    if (
      agent?.conversation_config?.agent?.dynamic_variables
        ?.dynamic_variable_placeholders
    ) {
      Object.keys(
        agent.conversation_config.agent.dynamic_variables
          .dynamic_variable_placeholders,
      ).forEach((key) => {
        originalPlaceholders[key] =
          agent.conversation_config.agent.dynamic_variables
            .dynamic_variable_placeholders[key] || "";
      });
    }

    // Ensure all variables found in original first message and prompt have entries
    originalDynamicVars.forEach((varName) => {
      if (originalPlaceholders[varName] === undefined) {
        originalPlaceholders[varName] = "";
      }
    });

    setDynamicVariablePlaceholders(originalPlaceholders);

    // Reset dynamic variable errors to original state
    const originalFirstMessageErrors =
      findInvalidDynamicVariables(originalFirstMessage);
    const originalPromptErrors = findInvalidDynamicVariables(originalPrompt);

    setDynamicVariableErrors({
      first_message: originalFirstMessageErrors,
      prompt: originalPromptErrors,
    });

    setShowModelDropdown(false);
    setShowLanguageDropdown(false);

    if (mode === "workflow") {
      const workflow = (agent as AgentDetails | null)?.workflow;
      if (workflow?.nodes && Object.keys(workflow.nodes).length > 0) {
        const { nodes, edges } = deserializeWorkflow(workflow, knowledgeBase);
        useWorkflowStore.getState().setNodes(nodes, { dirty: false });
        useWorkflowStore.getState().setEdges(edges, { dirty: false });
        useWorkflowStore.getState().markClean();
      } else {
        useWorkflowStore.getState().initializeWorkflow();
      }
    }
  };

  const handleRequestSimpleMode = () => {
    if (mode === "workflow") {
      setShowAgentModeConfirm(true);
      return;
    }
    setHasUserToggledMode(true);
    setMode("simple");
  };

  const handleConfirmSimpleMode = () => {
    setShowAgentModeConfirm(false);
    setHasUserToggledMode(true);
    setMode("simple");
  };

  // Extract dynamic variables from text (first message or prompt)
  const extractDynamicVariables = (text: string): string[] => {
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return [...new Set(matches)]; // Remove duplicates
  };

  // Find invalid dynamic variable patterns
  const findInvalidDynamicVariables = (text: string): string[] => {
    const regex = /\{\{([^}]*)\}\}/g;
    const invalidVars = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const varName = match[1];
      // Check if variable name contains invalid characters
      if (!/^[a-zA-Z0-9_]+$/.test(varName) || varName.trim() === "") {
        invalidVars.push(match[0]); // Return the full {{variable}} syntax
      }
    }
    return [...new Set(invalidVars)]; // Remove duplicates
  };

  // Extract dynamic variables from both first message and prompt
  const extractAllDynamicVariables = (
    firstMessage: string,
    prompt: string,
  ): string[] => {
    const firstMessageVars = extractDynamicVariables(firstMessage);
    const promptVars = extractDynamicVariables(prompt);
    return [...new Set([...firstMessageVars, ...promptVars])]; // Combine and remove duplicates
  };

  useEffect(() => {
    if (!agent) return;

    const modelType = agent.conversation_config.tts.model_id;
    const additionalLanguages =
      agent.conversation_config?.agent?.additional_languages || [];
    const parsedAdditionalLanguages = Array.isArray(additionalLanguages)
      ? additionalLanguages.map((lang) => {
          if (typeof lang === "string") {
            return { language_code: lang };
          }
          return lang;
        })
      : [];

    const initialForm = {
      name: agent.name,
      prompt: agent.conversation_config.agent.prompt.prompt,
      llm: agent.conversation_config.agent.prompt.llm,
      temperature: agent.conversation_config.agent.prompt.temperature,
      first_message: agent.conversation_config.agent.first_message,
      voice_id: agent.conversation_config.tts.voice_id,
      language: agent.conversation_config.agent.language || "en",
      additional_languages: parsedAdditionalLanguages,
      modelType,
      custom_llm: agent.conversation_config.agent.prompt.custom_llm || {
        url: "",
        model_id: "",
        api_key: {
          secret_id: "",
        },
      },
      knowledge_base: agent.conversation_config.agent.prompt.knowledge_base || [],
      tool_ids: agent.conversation_config.agent.prompt.tool_ids || [],
      built_in_tools: agent.conversation_config.agent.prompt.built_in_tools || {},
      platform_settings: {
        data_collection: agent.platform_settings?.data_collection || {},
        workspace_overrides: {
          conversation_initiation_client_data_webhook: agent.platform_settings
            ?.workspace_overrides?.conversation_initiation_client_data_webhook || {
            url: "",
            request_headers: {
              "Content-Type": "application/json",
            },
          },
        },
        privacy: agent.platform_settings?.privacy || {
          record_voice: true,
          retention_days: -1,
          delete_transcript_and_pii: false,
          delete_audio: false,
          apply_to_existing_conversations: false,
          zero_retention_mode: false,
        },
      },
      tts: {
        optimize_streaming_latency:
          agent.conversation_config.tts.optimize_streaming_latency || 0,
        stability: agent.conversation_config.tts.stability || 0.5,
        speed: agent.conversation_config.tts.speed || 1.0,
        similarity_boost: agent.conversation_config.tts.similarity_boost || 0.8,
      },
      turn: {
        turn_timeout: agent.conversation_config.turn.turn_timeout || 7,
        silence_end_call_timeout:
          agent.conversation_config.turn.silence_end_call_timeout || -1,
        mode: agent.conversation_config.turn.mode || "silence",
      },
      asr: agent.conversation_config.asr
        ? { ...agent.conversation_config.asr }
        : { keywords: [] },
    };

    setEditForm(initialForm);
    setEditedForm(initialForm);
    setConversationInitiationMode(
      initialForm.first_message === "" ? "user" : "bot",
    );
    setAsrKeywordsInput(initialForm.asr?.keywords?.join(", ") || "");

    const dynamicVars = extractAllDynamicVariables(
      initialForm.first_message,
      initialForm.prompt,
    );
    const placeholders: { [key: string]: string } = {};
    const savedPlaceholders =
      agent.conversation_config.agent.dynamic_variables
        ?.dynamic_variable_placeholders || {};

    Object.keys(savedPlaceholders).forEach((key) => {
      placeholders[key] = savedPlaceholders[key] || "";
    });

    dynamicVars.forEach((varName) => {
      if (placeholders[varName] === undefined) {
        placeholders[varName] = "";
      }
    });

    setDynamicVariablePlaceholders(placeholders);

    const firstMessageErrors = findInvalidDynamicVariables(
      initialForm.first_message,
    );
    const promptErrors = findInvalidDynamicVariables(initialForm.prompt);

    setDynamicVariableErrors({
      first_message: firstMessageErrors,
      prompt: promptErrors,
    });

    setSecretName("");
    setSecretValue("");
    setUpdatingSecret(false);
  }, [agent]);

  // Utility for updating editedForm and marking unsaved changes
  const handleChange = (
    field: keyof EditForm,
    value: string | number | any[],
  ) => {
    setEditedForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // If updating first_message or prompt, validate and extract dynamic variables
    if (
      (field === "first_message" || field === "prompt") &&
      typeof value === "string"
    ) {
      const firstMessage =
        field === "first_message" ? value : editedForm.first_message;
      const prompt = field === "prompt" ? value : editedForm.prompt;

      // Check for invalid dynamic variables
      const firstMessageErrors = findInvalidDynamicVariables(firstMessage);
      const promptErrors = findInvalidDynamicVariables(prompt);

      setDynamicVariableErrors({
        first_message: firstMessageErrors,
        prompt: promptErrors,
      });

      // Extract valid dynamic variables
      const dynamicVars = extractAllDynamicVariables(firstMessage, prompt);
      const newPlaceholders = { ...dynamicVariablePlaceholders };

      // Add new variables
      dynamicVars.forEach((varName) => {
        if (!newPlaceholders[varName]) {
          newPlaceholders[varName] = "";
        }
      });

      // Remove variables that are no longer in first message or prompt
      Object.keys(newPlaceholders).forEach((varName) => {
        if (!dynamicVars.includes(varName)) {
          delete newPlaceholders[varName];
        }
      });

      setDynamicVariablePlaceholders(newPlaceholders);
    }
  };

  // Open tool modal for adding new tool
  const handleCreateTool = () => {
    setSelectedTool({});
    setIsCreatingTool(true);
    setEditingTool(null);
  };

  // Handle tool save from modal (Agent/simple mode)
  const handleToolSave = (
    toolIds: string[],
    builtInTools: { [key: string]: BuiltInTool },
  ) => {
    handleChange("tool_ids", toolIds);
    handleChange("built_in_tools", builtInTools);
    setSelectedTool(null);
    setIsCreatingTool(false);
    setEditingTool(null);
  };

  // Handle tool save from modal (Workflow mode - subagent node)
  const handleToolSaveWorkflow = (
    toolIds: string[],
    _builtInTools: { [key: string]: BuiltInTool | null },
  ) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, { toolIds });
    }
    refreshTools();
    setSelectedTool(null);
    setIsCreatingTool(false);
    setEditingTool(null);
  };

  // Called when user picks a new voice in the VoiceModal
  const handleVoiceChange = (voiceId: string) => {
    handleChange("voice_id", voiceId);
    const newVoice = voices.find((v) => v.voice_id === voiceId) || null;
    setVoice(newVoice);
  };

  // Generate secret ID via API call
  const handleGenerateSecret = async () => {
    if (!user || !secretName.trim() || !secretValue.trim()) return;

    try {
      setGeneratingSecret(true);
      setError("");

      const response = await fetch(`${BACKEND_URL}/secrets/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await originalUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          name: secretName.trim(),
          value: secretValue.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create secret");
      }

      const data = await response.json();

      // Update the custom_llm configuration with the received secret_id
      handleChange("custom_llm", {
        ...editedForm.custom_llm,
        api_key: {
          secret_id: data.secret_id,
        },
      });

      // Clear the input fields since secret is now generated
      setSecretName("");
      setSecretValue("");
    } catch (err) {
      console.error("Error generating secret:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate secret. Please try again.",
      );
    } finally {
      setGeneratingSecret(false);
    }
  };

  // Start updating secret - show input fields
  const handleStartUpdate = () => {
    setUpdatingSecret(true);
    // Clear the input fields when starting update
    setSecretName("");
    setSecretValue("");
  };

  // Cancel updating secret - hide input fields
  const handleCancelUpdate = () => {
    setUpdatingSecret(false);
    setSecretName("");
    setSecretValue("");
  };

  // Update existing secret via API call
  const handleUpdateSecret = async () => {
    if (
      !user ||
      !secretName.trim() ||
      !secretValue.trim() ||
      !editedForm.custom_llm?.api_key?.secret_id
    )
      return;

    try {
      setGeneratingSecret(true);
      setError("");

      const response = await fetch(
        `${BACKEND_URL}/secrets/${editedForm.custom_llm.api_key.secret_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await originalUser?.getIdToken()}`,
          },
          body: JSON.stringify({
            name: secretName.trim(),
            value: secretValue.trim(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update secret");
      }

      const data = await response.json();

      // Update the custom_llm configuration with the updated secret_id
      handleChange("custom_llm", {
        ...editedForm.custom_llm,
        api_key: {
          secret_id: data.secret_id,
        },
      });

      // Clear the input fields and exit update mode
      setSecretName("");
      setSecretValue("");
      setUpdatingSecret(false);
    } catch (err) {
      console.error("Error updating secret:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update secret. Please try again.",
      );
    } finally {
      setGeneratingSecret(false);
    }
  };

  // Calculate LLM Usage
  const calculateLLMUsage = async (
    userPromptLength?: number,
    userNumberOfPages?: number,
  ) => {
    if (!user) return;

    try {
      setLoadingLLMUsage(true);
      setLlmUsageError("");

      // Use user input or default values
      const promptLength = userPromptLength ?? editedForm.prompt.length;
      const numberOfPages =
        userNumberOfPages ?? editedForm.knowledge_base.length * 10;

      const response = await fetch(`${BACKEND_URL}/llm-usage/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt_length: promptLength,
          number_of_pages: numberOfPages,
          rag_enabled: false, // Always false as requested
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate LLM usage");
      }

      const data: LLMUsageResponse = await response.json();
      setLlmUsageData(data);
    } catch (err) {
      console.error("Error calculating LLM usage:", err);
      setLlmUsageError(
        err instanceof Error
          ? err.message
          : "Failed to calculate LLM usage. Please try again.",
      );
    } finally {
      setLoadingLLMUsage(false);
    }
  };

  const agentWorkflow = (agent as AgentDetails | null)?.workflow;
  const loadedMode: "simple" | "workflow" =
    agentWorkflow?.nodes && Object.keys(agentWorkflow.nodes).length > 0
      ? "workflow"
      : "simple";
  const modeChanged = loadedMode !== mode;
  const hasUnsavedChanges =
    hasChanges ||
    (hasUserToggledMode && modeChanged) ||
    (mode === "workflow" && workflowIsDirty);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  if (loading) {
    return <PageLoader />;
  }

  if (!agent) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-2">
            Agent not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The agent you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Link
            to="/dashboard/agents"
            className="inline-flex items-center text-primary hover:text-primary-600 dark:hover:text-primary-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  const { icon: Icon, color } = getAgentIcon(agent.agent_id);
  const colorClasses: Record<string, string> = {
    primary:
      "from-primary/20 to-primary/10 text-primary dark:from-primary/30 dark:to-primary/20",
    indigo: "from-indigo-500/20 to-indigo-500/10 text-indigo-500",
    rose: "from-rose-500/20 to-rose-500/10 text-rose-500",
    sky: "from-sky-500/20 to-sky-500/10 text-sky-500",
    yellow: "from-yellow-500/20 to-yellow-500/10 text-yellow-500",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-200"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium">Changes saved successfully.</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-8">
        <div className="flex-1">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-dark-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    to="/dashboard/agents"
                    className="p-2 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>

                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editedForm.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className="text-2xl font-heading font-bold text-gray-900 dark:text-white bg-transparent border-0 focus:ring-0 p-0 focus:border-0"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Agent ID: {agent.agent_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-100 p-1 rounded-lg">
                  <button
                    onClick={handleRequestSimpleMode}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      mode === "simple"
                        ? "bg-white dark:bg-dark-200 shadow text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    onClick={() => {
                      setHasUserToggledMode(true);
                      setMode("workflow");
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                      mode === "workflow"
                        ? "bg-white dark:bg-dark-200 shadow text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    Workflow
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {error && (
                <motion.div
                  ref={errorRef}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-start space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}

              {mode === "workflow" ? (
                <div className="h-[600px] w-full min-w-0 border border-gray-200 dark:border-dark-100 rounded-xl overflow-hidden">
                  <WorkflowCanvas
                    tools={tools}
                    voices={voices}
                    knowledgeDocs={knowledgeBase.map((doc) => ({
                      id: doc.id,
                      name: doc.name,
                      type: doc.type,
                    }))}
                  />
                </div>
              ) : (
                <>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Model Card */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowModelDropdown((prev) => !prev);
                  }}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 relative cursor-pointer hover:from-primary/10 hover:to-primary/20 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Model
                    </h3>
                  </div>
                  {!showModelDropdown ? (
                    <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                      {editedForm.llm}
                    </p>
                  ) : (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={editedForm.llm}
                        onChange={(e) => handleChange("llm", e.target.value)}
                        className="rounded-lg border-2 border-primary bg-white dark:bg-dark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                      >
                        {llmOptions.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </button>

                {/* Voice Card (opens VoiceModal) */}
                <button
                  onClick={() => setShowVoiceModal(true)}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 relative cursor-pointer hover:from-primary/10 hover:to-primary/20 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Volume2 className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Voice
                    </h3>
                  </div>
                  {/* Selected voice name */}
                  <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                    {voice?.name || "Not Set"}
                  </p>

                  {/* Additional labels */}
                  {voice?.labels && (
                    <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
                      {voice.labels.accent && (
                        <li>
                          <strong>Accent:</strong> {voice.labels.accent}
                        </li>
                      )}
                      {voice.labels.description && (
                        <li>
                          <strong>Description:</strong>{" "}
                          {voice.labels.description}
                        </li>
                      )}
                      {voice.labels.age && (
                        <li>
                          <strong>Age:</strong> {voice.labels.age}
                        </li>
                      )}
                      {voice.labels.gender && (
                        <li>
                          <strong>Gender:</strong> {voice.labels.gender}
                        </li>
                      )}
                      {voice.labels.use_case && (
                        <li>
                          <strong>Use Case:</strong> {voice.labels.use_case}
                        </li>
                      )}
                    </ul>
                  )}
                </button>

                {/* Language Card */}
                <button
                  onClick={() => setShowLanguageDropdown((prev) => !prev)}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 relative cursor-pointer hover:from-primary/10 hover:to-primary/20 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Globe className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Language
                    </h3>
                  </div>
                  {!showLanguageDropdown ? (
                    <p className="text-2xl font-heading font-bold text-primary dark:text-primary-400">
                      {getLanguageName(editedForm.language)}
                    </p>
                  ) : (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <LanguageSelect
                        value={editedForm.language}
                        onChange={(value) => handleChange("language", value)}
                      />
                    </div>
                  )}
                </button>
              </div>

              {/* Additional Languages Section */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    Additional Languages
                  </h3>
                </div>
                <div className="pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                  <AdditionalLanguagesSelect
                    primaryLanguage={editedForm.language}
                    additionalLanguages={editedForm.additional_languages}
                    onChange={(languages) =>
                      handleChange("additional_languages", languages)
                    }
                    languageDetectionEnabled={
                      !!editedForm.built_in_tools?.language_detection
                    }
                    onLanguageDetectionChange={(enabled) => {
                      const updatedBuiltInTools = {
                        ...editedForm.built_in_tools,
                      };
                      if (enabled) {
                        updatedBuiltInTools.language_detection = {
                          name: "language_detection",
                          description: "Detect the language being spoken",
                          response_timeout_secs: 20,
                          type: "system",
                          params: {
                            system_tool_type: "language_detection",
                          },
                        };
                      } else {
                        // Remove the key instead of setting to null
                        delete updatedBuiltInTools.language_detection;
                      }
                      handleChange("built_in_tools", updatedBuiltInTools);
                    }}
                  />
                </div>
              </div>

              {/* Custom LLM Configuration */}
              {editedForm.llm === "custom-llm" && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-primary dark:text-primary-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Custom LLM Configuration
                    </h3>
                  </div>
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* URL Field - Required */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={editedForm.custom_llm?.url || ""}
                        onChange={(e) =>
                          handleChange("custom_llm", {
                            ...editedForm.custom_llm,
                            url: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="https://api.example.com/v1/chat/completions"
                        required
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        The URL of the Chat Completions compatible endpoint
                      </p>
                    </div>

                    {/* Model ID Field - Optional */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Model ID
                      </label>
                      <input
                        type="text"
                        value={editedForm.custom_llm?.model_id || ""}
                        onChange={(e) =>
                          handleChange("custom_llm", {
                            ...editedForm.custom_llm,
                            model_id: e.target.value,
                          })
                        }
                        className="input"
                        placeholder="gpt-4"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        The model ID to be used if URL serves multiple models
                      </p>
                    </div>

                    {/* API Key Secret Configuration */}
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        API Key Secret <span className="text-red-500">*</span>
                      </label>

                      {/* Show input fields only when no secret ID exists or when updating */}
                      {(!editedForm.custom_llm?.api_key?.secret_id ||
                        updatingSecret) && (
                        <>
                          {/* Secret Name Field */}
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                              Secret Name
                            </label>
                            <input
                              type="text"
                              value={secretName}
                              onChange={(e) => setSecretName(e.target.value)}
                              className="input"
                              placeholder="my-api-key"
                            />
                          </div>

                          {/* Secret Value Field */}
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                              Secret Value (API Key)
                            </label>
                            <input
                              type="password"
                              value={secretValue}
                              onChange={(e) => setSecretValue(e.target.value)}
                              className="input"
                              placeholder="sk-..."
                            />
                          </div>
                        </>
                      )}

                      {/* Generated Secret ID Display */}
                      {editedForm.custom_llm?.api_key?.secret_id && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Generated Secret ID
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-dark-100 rounded-lg border">
                            <code className="text-sm text-gray-900 dark:text-gray-100">
                              {editedForm.custom_llm.api_key.secret_id}
                            </code>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!editedForm.custom_llm?.api_key?.secret_id ? (
                        /* Generate Secret Button */
                        <button
                          type="button"
                          onClick={handleGenerateSecret}
                          disabled={
                            !secretName.trim() ||
                            !secretValue.trim() ||
                            generatingSecret
                          }
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {generatingSecret ? (
                            <>
                              <Loader />
                              <span>Generating Secret...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Generate Secret ID</span>
                            </>
                          )}
                        </button>
                      ) : updatingSecret ? (
                        /* Update and Cancel Buttons when in update mode */
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCancelUpdate}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdateSecret}
                            disabled={
                              !secretName.trim() ||
                              !secretValue.trim() ||
                              generatingSecret
                            }
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {generatingSecret ? (
                              <>
                                <Loader />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Update</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        /* Update Button when secret exists and not in update mode */
                        <button
                          type="button"
                          onClick={handleStartUpdate}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Update Secret</span>
                        </button>
                      )}

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Create a secret in Workspace to securely store your API
                        key
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Model Selection */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-primary dark:text-primary-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Voice Model
                  </h3>
                </div>
                <ModelSelect
                  modelType={editedForm.modelType}
                  onChange={(value) => handleChange("modelType", value)}
                  availableModels={getAvailableModels(editedForm.language)}
                />
              </div>

              {/* Temperature Slider */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-4 h-4 text-primary dark:text-primary-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Temperature ({editedForm.temperature})
                  </h3>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editedForm.temperature}
                  onChange={(e) =>
                    handleChange("temperature", parseFloat(e.target.value))
                  }
                  className="w-full"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Adjust creativity level: 0 for focused responses, 1 for more
                  creative outputs
                </p>
              </div>

              {/* Advanced Voice Settings */}
              <div className="space-y-4 mt-8">
                <button
                  onClick={() =>
                    setShowAdvancedVoiceSettings(!showAdvancedVoiceSettings)
                  }
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Advanced Voice Settings
                    </h3>
                  </div>
                  {showAdvancedVoiceSettings ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {showAdvancedVoiceSettings && (
                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* Optimize Streaming Latency */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Optimize Streaming Latency (
                          {editedForm.tts?.optimize_streaming_latency || 0})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={editedForm.tts?.optimize_streaming_latency || 0}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            optimize_streaming_latency: parseInt(
                              e.target.value,
                            ),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Higher values prioritize speed over quality (0-4)
                      </p>
                    </div>

                    {/* Stability */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Stability (
                          {editedForm.tts?.stability?.toFixed(2) || "0.50"})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={editedForm.tts?.stability || 0.5}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            stability: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Consistency of voice characteristics (0.0-1.0)
                      </p>
                    </div>

                    {/* Speed */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Speed ({editedForm.tts?.speed?.toFixed(2) || "1.00"})
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.2"
                        step="0.01"
                        value={editedForm.tts?.speed || 1.0}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            speed: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Speech rate (0.7-1.2, default 1.0)
                      </p>
                    </div>

                    {/* Similarity Boost */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Similarity Boost (
                          {editedForm.tts?.similarity_boost?.toFixed(2) ||
                            "0.80"}
                          )
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={editedForm.tts?.similarity_boost || 0.8}
                        onChange={(e) =>
                          handleChange("tts", {
                            ...editedForm.tts,
                            similarity_boost: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enhances voice similarity to original (0.0-1.0)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Conversation Settings */}
              <div className="space-y-4 mt-8">
                <button
                  onClick={() =>
                    setShowAdvancedConversationSettings(
                      !showAdvancedConversationSettings,
                    )
                  }
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Advanced Conversation Settings
                    </h3>
                  </div>
                  {showAdvancedConversationSettings ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {showAdvancedConversationSettings && (
                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* Turn Timeout */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Turn Timeout (
                          {editedForm.turn?.turn_timeout?.toFixed(1) || "7.0"}s)
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.5"
                        value={editedForm.turn?.turn_timeout || 7}
                        onChange={(e) =>
                          handleChange("turn", {
                            ...editedForm.turn,
                            turn_timeout: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Maximum wait time for user's reply before re-engaging
                        (1-30 seconds)
                      </p>
                    </div>

                    {/* Silence End Call Timeout */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Silence End Call Timeout (
                          {editedForm.turn?.silence_end_call_timeout === -1
                            ? "Disabled"
                            : `${editedForm.turn?.silence_end_call_timeout?.toFixed(1) || "60.0"}s`}
                          )
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="300"
                        step="1"
                        value={editedForm.turn?.silence_end_call_timeout || -1}
                        onChange={(e) =>
                          handleChange("turn", {
                            ...editedForm.turn,
                            silence_end_call_timeout: parseFloat(
                              e.target.value,
                            ),
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Maximum silence before ending call (-1 to disable, 0-300
                        seconds)
                      </p>
                    </div>

                    {/* Mode Switch */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-primary dark:text-primary-400" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Turn Mode
                        </h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="turnMode"
                            value="silence"
                            checked={editedForm.turn?.mode === "silence"}
                            onChange={(e) =>
                              handleChange("turn", {
                                ...editedForm.turn,
                                mode: e.target.value,
                              })
                            }
                            className="radio-switch"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Silence
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="turnMode"
                            value="turn"
                            checked={editedForm.turn?.mode === "turn"}
                            onChange={(e) =>
                              handleChange("turn", {
                                ...editedForm.turn,
                                mode: e.target.value,
                              })
                            }
                            className="radio-switch"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Turn
                          </span>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose how the agent detects when the user has finished
                        speaking
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Calculate LLM Usage Button - placed above ASR Keywords */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setShowLLMUsageModal(true);
                    setUserPromptLength("");
                    setUserNumberOfPages("");
                    setLlmUsageData(null);
                    setLlmUsageError("");
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-lato font-semibold text-white bg-primary hover:bg-primary-600 dark:bg-primary-400 dark:hover:bg-primary-500 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Calculate LLM Usage</span>
                </button>
              </div>

              {/* ASR Keywords Section */}
              <div className="space-y-4 mt-8">
                <div className="flex items-center space-x-2">
                  <Speech className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    ASR Keywords
                  </h3>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter keywords to improve speech recognition accuracy.
                  </p>
                  <input
                    type="text"
                    value={asrKeywordsInput}
                    onChange={(e) => {
                      setAsrKeywordsInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Process keywords when user finishes editing
                      const keywords = e.target.value
                        .split(",")
                        .map((keyword) => keyword.trim())
                        .filter(Boolean);
                      handleChange("asr", { ...editedForm.asr, keywords });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        // Process keywords when user presses Enter
                        const keywords = e.currentTarget.value
                          .split(",")
                          .map((keyword) => keyword.trim())
                          .filter(Boolean);
                        handleChange("asr", { ...editedForm.asr, keywords });
                      }
                    }}
                    className="input"
                    placeholder="Enter keywords, separated by commas"
                  />
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4 mt-8">
                <button
                  onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-dark-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Privacy Settings
                    </h3>
                  </div>
                  {showPrivacySettings ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {showPrivacySettings && (
                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    {/* Record Voice */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Record Voice
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to record the conversation
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              editedForm.platform_settings?.privacy
                                ?.record_voice ?? true
                            }
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  record_voice: e.target.checked,
                                },
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.record_voice ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                          ></div>
                        </label>
                      </div>
                    </div>

                    {/* Retention Days */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Retention Days (
                          {editedForm.platform_settings?.privacy
                            ?.retention_days === -1
                            ? "No limit"
                            : `${editedForm.platform_settings?.privacy?.retention_days || 0} days`}
                          )
                        </h4>
                      </div>
                      <input
                        type="range"
                        min="-1"
                        max="365"
                        step="1"
                        value={
                          editedForm.platform_settings?.privacy
                            ?.retention_days ?? -1
                        }
                        onChange={(e) => {
                          handleChange("platform_settings", {
                            ...editedForm.platform_settings,
                            privacy: {
                              ...editedForm.platform_settings?.privacy,
                              retention_days: parseInt(e.target.value),
                            },
                          });
                        }}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        The number of days to retain the conversation. -1
                        indicates no retention limit
                      </p>
                    </div>

                    {/* Delete Transcript and PII */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Delete Transcript and PII
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to delete the transcript and PII
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              editedForm.platform_settings?.privacy
                                ?.delete_transcript_and_pii ?? false
                            }
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  delete_transcript_and_pii: e.target.checked,
                                },
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.delete_transcript_and_pii ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                          ></div>
                        </label>
                      </div>
                    </div>

                    {/* Delete Audio */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Delete Audio
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to delete the audio
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              editedForm.platform_settings?.privacy
                                ?.delete_audio ?? false
                            }
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  delete_audio: e.target.checked,
                                },
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.delete_audio ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                          ></div>
                        </label>
                      </div>
                    </div>

                    {/* Apply to Existing Conversations */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Apply to Existing Conversations
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to apply the privacy settings to existing
                            conversations
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              editedForm.platform_settings?.privacy
                                ?.apply_to_existing_conversations ?? false
                            }
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  apply_to_existing_conversations:
                                    e.target.checked,
                                },
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.apply_to_existing_conversations ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                          ></div>
                        </label>
                      </div>
                    </div>

                    {/* Zero Retention Mode */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Zero Retention Mode
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Whether to enable zero retention mode - no PII data
                            is stored
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              editedForm.platform_settings?.privacy
                                ?.zero_retention_mode ?? false
                            }
                            onChange={(e) => {
                              handleChange("platform_settings", {
                                ...editedForm.platform_settings,
                                privacy: {
                                  ...editedForm.platform_settings?.privacy,
                                  zero_retention_mode: e.target.checked,
                                },
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/50 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${editedForm.platform_settings?.privacy?.zero_retention_mode ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                          ></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* First Message Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    Conversation Initiation
                  </h3>
                </div>

                {/* Conversation Initiation Switch */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conversationInitiation"
                        value="bot"
                        checked={conversationInitiationMode === "bot"}
                        onChange={() => {
                          setConversationInitiationMode("bot");
                          if (editedForm.first_message === "") {
                            handleChange(
                              "first_message",
                              "Hello! How can I help you today?",
                            );
                          }
                        }}
                        className="radio-switch"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Bot starts conversation
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conversationInitiation"
                        value="user"
                        checked={conversationInitiationMode === "user"}
                        onChange={() => {
                          setConversationInitiationMode("user");
                          handleChange("first_message", "");
                        }}
                        className="radio-switch"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        User starts conversation
                      </span>
                    </label>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose whether the bot should greet the user first or wait
                    for the user to speak.
                  </p>
                </div>

                {/* First Message Configuration - Only show when bot starts */}
                {conversationInitiationMode === "bot" && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose a predefined opening message or create a custom one
                      for your agent.
                    </p>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Bot's Opening Message
                    </h4>

                    {/* Predefined Messages Dropdown */}
                    <select
                      value={(() => {
                        const predefinedMessages = [
                          "Hello! How can I help you today?",
                          "Hi there! What can I assist you with?",
                          "Good day! I'm here to help. What do you need?",
                          "Welcome! How may I be of service?",
                          "Hello! Thank you for calling. How can I assist you today?",
                          "Hi! I'm ready to help. What questions do you have?",
                        ];
                        return predefinedMessages.includes(
                          editedForm.first_message,
                        )
                          ? editedForm.first_message
                          : "custom";
                      })()}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          // Keep current message if it's already custom
                          if (
                            ![
                              "Hello! How can I help you today?",
                              "Hi there! What can I assist you with?",
                              "Good day! I'm here to help. What do you need?",
                              "Welcome! How may I be of service?",
                              "Hello! Thank you for calling. How can I assist you today?",
                              "Hi! I'm ready to help. What questions do you have?",
                            ].includes(editedForm.first_message)
                          ) {
                            return;
                          }
                          handleChange(
                            "first_message",
                            "Enter your custom message...",
                          );
                        } else {
                          handleChange("first_message", e.target.value);
                        }
                      }}
                      className="input"
                    >
                      <option value="Hello! How can I help you today?">
                        Hello! How can I help you today?
                      </option>
                      <option value="Hi there! What can I assist you with?">
                        Hi there! What can I assist you with?
                      </option>
                      <option value="Good day! I'm here to help. What do you need?">
                        Good day! I'm here to help. What do you need?
                      </option>
                      <option value="Welcome! How may I be of service?">
                        Welcome! How may I be of service?
                      </option>
                      <option value="Hello! Thank you for calling. How can I assist you today?">
                        Hello! Thank you for calling. How can I assist you
                        today?
                      </option>
                      <option value="Hi! I'm ready to help. What questions do you have?">
                        Hi! I'm ready to help. What questions do you have?
                      </option>
                      <option value="custom">Custom message...</option>
                    </select>

                    {/* Custom Input Field - shows when custom is selected or when message doesn't match predefined ones */}
                    {(() => {
                      const predefinedMessages = [
                        "Hello! How can I help you today?",
                        "Hi there! What can I assist you with?",
                        "Good day! I'm here to help. What do you need?",
                        "Welcome! How may I be of service?",
                        "Hello! Thank you for calling. How can I assist you today?",
                        "Hi! I'm ready to help. What questions do you have?",
                      ];
                      return !predefinedMessages.includes(
                        editedForm.first_message,
                      );
                    })() && (
                      <>
                        {/* Error display for first message */}
                        {dynamicVariableErrors.first_message.length > 0 && (
                          <div className="mb-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                  Invalid Dynamic Variables in Bot's Opening
                                  Message
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                  Dynamic variables must contain only letters,
                                  numbers, and underscores:{" "}
                                  {dynamicVariableErrors.first_message.join(
                                    ", ",
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <textarea
                          value={editedForm.first_message}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Prevent switching to user starts if field is being cleared
                            // Set a placeholder message to maintain bot starts mode
                            if (value.trim() === "") {
                              handleChange(
                                "first_message",
                                "Enter your custom message...",
                              );
                            } else {
                              handleChange("first_message", value);
                            }
                          }}
                          rows={2}
                          className={`input ${dynamicVariableErrors.first_message.length > 0 ? "border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                          placeholder="Enter your custom first message..."
                          onFocus={(e) => {
                            // Clear placeholder text when user focuses
                            if (
                              e.target.value === "Enter your custom message..."
                            ) {
                              // Set to empty but don't trigger handleChange to avoid switching modes
                              setEditedForm((prev) => ({
                                ...prev,
                                first_message: "",
                              }));
                            }
                          }}
                          onBlur={(e) => {
                            // If user leaves field empty, restore placeholder
                            if (e.target.value.trim() === "") {
                              handleChange(
                                "first_message",
                                "Enter your custom message...",
                              );
                            }
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Variable Placeholders Section */}
              {Object.keys(dynamicVariablePlaceholders).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Dynamic Variable Placeholders
                    </h3>
                  </div>
                  <div className="space-y-3 pl-4 border-l-2 border-primary/20 dark:border-primary/30">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Define values for the dynamic variables found in your
                      first message and prompt. These will be used as defaults
                      during conversations.
                    </p>
                    {Object.keys(dynamicVariablePlaceholders).map((varName) => (
                      <div key={varName} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {varName}{" "}
                          <span className="text-gray-500 dark:text-gray-400 font-normal">
                            (from {`{{${varName}}}`})
                          </span>
                        </label>
                        <input
                          type="text"
                          value={dynamicVariablePlaceholders[varName]}
                          onChange={(e) => {
                            setDynamicVariablePlaceholders((prev) => ({
                              ...prev,
                              [varName]: e.target.value,
                            }));
                            setHasChanges(true);
                          }}
                          className="input text-sm"
                          placeholder={`Enter value for ${varName}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Prompt
                    </h3>
                  </div>
                  {dynamicVariableErrors.prompt.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Invalid Dynamic Variables in Prompt
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            Dynamic variables must contain only letters, numbers,
                            and underscores:{" "}
                            {dynamicVariableErrors.prompt.join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <textarea
                    value={editedForm.prompt}
                    onChange={(e) => handleChange("prompt", e.target.value)}
                    rows={6}
                    className={`input ${dynamicVariableErrors.prompt.length > 0 ? "border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="Enter the agent's behavior and instructions..."
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You can use dynamic variables like {`{{variable_name}}`} in
                    your prompt. Variables must contain only letters, numbers, and
                    underscores.
                  </p>
                </div>

              {/* Dynamic Variables Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Data Collection Variables
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      const newVar = {
                        name: `variable_${Date.now()}`,
                        config: {
                          type: "string",
                          description: "",
                        },
                      };
                      const updatedCollection = {
                        ...editedForm.platform_settings?.data_collection,
                        [newVar.name]: newVar.config,
                      };
                      handleChange("platform_settings", {
                        ...editedForm.platform_settings,
                        data_collection: updatedCollection,
                      });
                    }}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-lato font-semibold text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Variable</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {Object.entries(
                    editedForm.platform_settings?.data_collection || {},
                  ).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-dark-100 rounded-xl">
                      <Database className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No data collection variables configured
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-dark-100">
                      {Object.entries(
                        editedForm.platform_settings?.data_collection || {},
                      ).map(([varName, varConfig]) => (
                        <DataCollectionVariable
                          key={varName}
                          varName={varName}
                          varConfig={varConfig}
                          editingVarName={editingVarName}
                          editingVarValue={editingVarValue}
                          onEdit={(name, value) => {
                            setEditingVarName(name);
                            setEditingVarValue(value);
                          }}
                          onSave={(oldName, newName) => {
                            const oldConfig =
                              editedForm.platform_settings?.data_collection?.[
                                oldName
                              ];
                            const newDataCollection = {
                              ...editedForm.platform_settings?.data_collection,
                            };
                            delete newDataCollection[oldName];
                            newDataCollection[newName] = oldConfig;

                            setEditedForm((prev) => ({
                              ...prev,
                              platform_settings: {
                                ...prev.platform_settings,
                                data_collection: newDataCollection,
                              },
                            }));
                            setEditingVarName(null);
                            setHasChanges(true);
                          }}
                          onCancel={() => setEditingVarName(null)}
                          onDelete={(name) => {
                            const { [name]: _, ...rest } =
                              editedForm.platform_settings?.data_collection ||
                              {};
                            handleChange("platform_settings", {
                              ...editedForm.platform_settings,
                              data_collection: rest,
                            });
                          }}
                          onChange={(name, config) => {
                            handleChange("platform_settings", {
                              ...editedForm.platform_settings,
                              data_collection: {
                                ...editedForm.platform_settings
                                  ?.data_collection,
                                [name]: config,
                              },
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tools Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Tools
                    </h3>
                  </div>
                  <button
                    onClick={handleCreateTool}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-lato font-semibold text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50/50 dark:bg-primary-400/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Tool</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editedForm.tool_ids.length === 0 &&
                  Object.values(editedForm.built_in_tools).filter(
                    (tool) => tool !== null,
                  ).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-dark-100 rounded-xl">
                      <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No tools configured
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Add webhook tools or built-in system tools
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-dark-100">
                      {/* Built-in Tools */}
                      {Object.entries(editedForm.built_in_tools)
                        .filter(([_, builtInTool]) => builtInTool !== null)
                        .map(([key, builtInTool]) => (
                          <div
                            key={key}
                            className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="flex items-center space-x-3"
                                onClick={() => {
                                  setSelectedTool({
                                    ...builtInTool!,
                                    type: "system",
                                  });
                                  setEditingTool({ type: "built_in", key });
                                }}
                                style={{ cursor: "pointer" }}
                              >
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 dark:from-green-500/30 dark:to-green-500/20 flex items-center justify-center">
                                  <Settings className="w-5 h-5 text-green-500 dark:text-green-400" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                    {builtInTool!.name}
                                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                                      System
                                    </span>
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {builtInTool!.description ||
                                      `Built-in ${builtInTool!.name} tool`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const updatedBuiltInTools = {
                                      ...editedForm.built_in_tools,
                                    };
                                    updatedBuiltInTools[key] = null;
                                    handleChange(
                                      "built_in_tools",
                                      updatedBuiltInTools,
                                    );
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <ChevronRight
                                  className="w-5 h-5 text-gray-400 dark:text-gray-500"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setSelectedTool({
                                      ...builtInTool!,
                                      type: "system",
                                    });
                                    setEditingTool({ type: "built_in", key });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Webhook Tools - Display tool IDs */}
                      {editedForm.tool_ids.map((toolId, index) => (
                        <div
                          key={index}
                          className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors rounded-lg"
                        >
                          {(() => {
                            const toolName = toolsById.get(toolId) || toolId;
                            return (
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center space-x-3 cursor-pointer"
                              onClick={() => {
                                setSelectedTool({
                                  name: toolName,
                                  type: "webhook",
                                });
                                setEditingTool({ type: "tool_id", id: toolId });
                              }}
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                                <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {toolName}
                                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                    Webhook
                                  </span>
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Tool ID: {toolId}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const updatedToolIds =
                                    editedForm.tool_ids.filter(
                                      (id) => id !== toolId,
                                    );
                                  handleChange("tool_ids", updatedToolIds);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Webhook Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Webhook className="w-5 h-5 text-primary dark:text-primary-400" />
                  <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                    Webhook
                  </h3>
                </div>
                <WebhookVariable
                  url={
                    editedForm.platform_settings?.workspace_overrides
                      ?.conversation_initiation_client_data_webhook?.url || ""
                  }
                  onChange={(url) => {
                    handleChange("platform_settings", {
                      ...editedForm.platform_settings,
                      workspace_overrides: {
                        ...editedForm.platform_settings?.workspace_overrides,
                        conversation_initiation_client_data_webhook: {
                          url,
                          request_headers: {
                            "Content-Type": "application/json",
                          },
                        },
                      },
                    });
                  }}
                />
              </div>

              {/* Knowledge Base Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary dark:text-primary-400" />
                    <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                      Knowledge Base Documents
                    </h3>
                  </div>
                  <Link
                    to="/dashboard/knowledge"
                    className="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Manage Documents
                  </Link>
                </div>

                {loadingKnowledgeBase ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader />
                  </div>
                ) : knowledgeBase.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-dark-100 rounded-xl">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No knowledge base documents found.
                    </p>
                    <Link
                      to="/dashboard/knowledge"
                      className="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400 mt-2 inline-block"
                    >
                      Add documents to knowledge base
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Select documents to include in your agent's knowledge
                        base. The agent will use these documents to provide more
                        accurate and contextual responses.
                      </p>
                    </div>
                    <div className="pb-[300px]">
                      <KnowledgeBaseSelect
                        documents={knowledgeBase}
                        selectedDocuments={editedForm.knowledge_base.map(
                          (kb) => kb.id,
                        )}
                        onSelectionChange={(selectedIds) => {
                          const selectedDocs = selectedIds.map((id) => {
                            const doc = knowledgeBase.find(
                              (kb) => kb.id === id,
                            );
                            return {
                              id: doc!.id,
                              name: doc!.name,
                              type: doc!.type,
                            };
                          });
                          handleChange("knowledge_base", selectedDocs);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar: workflow mode = stacked NodeConfigPanel + CallTesting; agent mode = CallTesting only */}
        {mode === "workflow" ? (
          <div className="w-80 flex flex-col gap-4 overflow-y-auto shrink-0">
            {selectedNodeId ? (
              <div className="shrink-0 max-h-[60vh] min-h-0 overflow-y-auto rounded-xl border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200">
                <NodeConfigPanel
                  tools={tools}
                  voices={voices}
                  knowledgeDocs={knowledgeBase.map((doc) => ({
                    id: doc.id,
                    name: doc.name,
                    type: doc.type,
                  }))}
                  onAddToolClick={handleCreateTool}
                />
              </div>
            ) : null}
            {selectedEdgeId && !selectedNodeId ? (
              <div className="shrink-0 max-h-[40vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200">
                <EdgeConfigPanel />
              </div>
            ) : null}
            {agent && (
              <CallTesting
                agentId={agent.agent_id}
                dynamicVariables={dynamicVariablePlaceholders}
                hasErrors={hasDynamicVariableErrors()}
              />
            )}
          </div>
        ) : (
        <div className="w-96">
          {agent && (
            <CallTesting
              agentId={agent.agent_id}
              dynamicVariables={dynamicVariablePlaceholders}
              hasErrors={hasDynamicVariableErrors()}
            />
          )}
        </div>
        )}
      </div>

      {/* Voice Modal - uses the updated VoiceModal above */}
      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        voices={voices}
        selectedVoiceId={editedForm.voice_id}
        onVoiceChange={handleVoiceChange}
        onVoicesUpdate={fetchAgentDetails}
      />

      {/* Tool Configuration Modal */}
      {selectedTool && (
        <ToolConfigModal
          isOpen={!!selectedTool}
          onClose={() => {
            setSelectedTool(null);
            setIsCreatingTool(false);
            setEditingTool(null);
          }}
          tool={selectedTool}
          onSave={
            mode === "workflow" && selectedNodeId
              ? handleToolSaveWorkflow
              : handleToolSave
          }
          agentId={agentId}
          toolIds={
            mode === "workflow" && selectedNodeId
              ? (workflowNodes.find((n) => n.id === selectedNodeId)?.data as { toolIds?: string[] })?.toolIds ?? []
              : editedForm.tool_ids
          }
          builtInTools={
            mode === "workflow" && selectedNodeId ? {} : editedForm.built_in_tools
          }
          editingTool={mode === "workflow" && selectedNodeId ? undefined : (editingTool ?? undefined)}
        />
      )}

      {/* LLM Usage Modal */}
      <AnimatePresence>
        {showLLMUsageModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowLLMUsageModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                      LLM Usage Calculator
                    </h2>
                    <button
                      onClick={() => setShowLLMUsageModal(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Input Fields */}
                  <div className="mb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">
                          Prompt Length (characters)
                        </label>
                        <input
                          type="number"
                          value={userPromptLength}
                          onChange={(e) => setUserPromptLength(e.target.value)}
                          placeholder={editedForm.prompt.length.toString()}
                          className="input"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Current: {editedForm.prompt.length} characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">
                          Number of Pages
                        </label>
                        <input
                          type="number"
                          value={userNumberOfPages}
                          onChange={(e) => setUserNumberOfPages(e.target.value)}
                          placeholder={(
                            editedForm.knowledge_base.length * 10
                          ).toString()}
                          className="input"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Current: {editedForm.knowledge_base.length * 10} pages
                          (estimated)
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Current Model:</strong> {editedForm.llm}
                      </p>
                    </div>
                  </div>

                  {/* Calculate Button */}
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        const promptLength = userPromptLength
                          ? parseInt(userPromptLength)
                          : undefined;
                        const numberOfPages = userNumberOfPages
                          ? parseInt(userNumberOfPages)
                          : undefined;
                        calculateLLMUsage(promptLength, numberOfPages);
                      }}
                      disabled={loadingLLMUsage}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loadingLLMUsage ? (
                        <>
                          <Loader />
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Calculate Usage & Costs</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Error Display */}
                  {llmUsageError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                            Error
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {llmUsageError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results Display */}
                  {llmUsageData && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                        Estimated Costs Per Minute
                      </h3>
                      <div className="space-y-3">
                        {llmUsageData.llm_prices.map(
                          (item: any, index: number) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border-2 ${
                                item.llm === editedForm.llm
                                  ? "border-primary bg-primary-50/50 dark:border-primary-400 dark:bg-primary-400/10"
                                  : "border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-100"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      item.llm === editedForm.llm
                                        ? "bg-primary"
                                        : "bg-gray-400 dark:bg-gray-500"
                                    }`}
                                  />
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {item.llm}
                                    {item.llm === editedForm.llm && (
                                      <span className="ml-2 text-xs font-lato font-semibold text-primary dark:text-primary-400">
                                        (Current)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="text-lg font-heading font-bold text-gray-900 dark:text-white">
                                  ${item.price_per_minute.toFixed(4)}/min
                                </span>
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Note:</strong> These are estimated costs based
                          on your current configuration. Actual costs may vary
                          depending on conversation length and complexity.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm switching from Workflow to Agent mode */}
      <AnimatePresence>
        {showAgentModeConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowAgentModeConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-md rounded-xl bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Switch to Agent mode?
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    If you have unsaved changes switching to Agent mode will clear your workflow. This cannot
                    be undone. Are you sure?
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAgentModeConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                      onClick={handleConfirmSimpleMode}
                    >
                      Switch to Agent
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sticky Save/Cancel Buttons */}
      <AnimatePresence>
        {hasUnsavedChanges && !selectedTool && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-100 shadow-lg z-50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                {mode === "simple" && hasDynamicVariableErrors() && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2 sm:mr-auto">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Fix dynamic variable errors in first message or prompt before saving.
                  </p>
                )}
                <div className="flex justify-end space-x-4">
                  <button onClick={handleCancel} className="btn btn-secondary">
                    <X className="w-4 h-4 mr-2" />
                    <span>Cancel</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={handleSave}
                      disabled={
                      saving ||
                      (mode === "simple" && hasDynamicVariableErrors())
                    }
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                      mode === "simple" && hasDynamicVariableErrors()
                        ? "Fix dynamic variable errors before saving"
                        : ""
                    }
                    >
                    {saving ? (
                      <>
                        <Loader />
                        <span className="ml-2">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentDetails;
