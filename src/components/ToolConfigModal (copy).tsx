
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Webhook, Settings, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

interface BuiltInTool {
  name: string;
  description: string;
  type: "system";
  response_timeout_secs: number;
  params: {
    system_tool_type: string;
    // Transfer to Agent fields
    agent_id?: string;
    condition?: string;
    delay_ms?: number;
    transfer_message?: string;
    enable_transferred_agent_first_message?: boolean;
    transfers?: Array<{
      agent_id: string;
      condition: string;
      delay_ms?: number;
      transfer_message?: string;
      enable_transferred_agent_first_message?: boolean;
    } | {
      condition: string;
      transfer_destination: {
        phone_number: string;
        type: "phone";
      };
      transfer_type: string;
    }>;
    // Transfer to Number fields
    enable_client_message?: boolean;
  };
}

interface UserTool {
  tool_id: string;
  created_at: string;
}

interface ToolDetails {
  id: string;
  name: string;
  description: string;
  type: string;
  response_timeout_secs?: number;
  api_schema?: any;
  tool_config?: {
    type: "client";
    name: string;
    description: string;
    params?: any;
  };
}

interface Agent {
  agent_id: string;
  name: string;
}

export interface ToolParameter {
  name: string;
  type: "string" | "integer" | "number" | "boolean";
  description: string;
  required: boolean;
  value_type: "llm_prompt" | "fixed_value";
  enum_values: string[];
}

interface ClientToolConfig {
  name: string;
  description: string;
  wait_for_response: boolean;
  disable_interruptions: boolean;
  pre_tool_speech: "auto" | "trigger";
  execution_mode: "immediate" | "manual";
  params: ToolParameter[];
}

interface ToolConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: any;
  agentId?: string;
  onSave: (
    toolIds: string[],
    builtInTools: { [key: string]: BuiltInTool | null },
  ) => void;
  toolIds: string[];
  builtInTools: { [key: string]: BuiltInTool | null };
  editingTool?:
  | { type: "tool_id"; id: string }
  | { type: "built_in"; key: string };
}

const BUILT_IN_TOOL_KEYS = [
  "end_call",
  "language_detection",
  "transfer_to_agent",
  "transfer_to_number",
  "skip_turn",
  "play_keypad_touch_tone",
];

const getBuiltInToolDefaults = (key: string): BuiltInTool => {
  const defaults: { [key: string]: BuiltInTool } = {
    end_call: {
      name: "end_call",
      description: "End the current call",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "end_call",
      },
    },
    language_detection: {
      name: "language_detection",
      description: "Detect the language being spoken",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "language_detection",
      },
    },
    transfer_to_agent: {
      name: "transfer_to_agent",
      description: "Transfer call to another agent",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "transfer_to_agent",
        transfers: [
          {
            agent_id: "", // Target agent's ID
            condition: "", // e.g., "on_no_answer", "on_busy"
            delay_ms: 0, // Optional delay before transfer
            transfer_message: "", // Optional message before transfer
            enable_transferred_agent_first_message: false, // Whether to play first message from agent
          },
        ],
      },
    },

    transfer_to_number: {
      name: "transfer_to_number",
      description: "Transfer call to a phone number",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "transfer_to_number",
        enable_client_message: true,
        transfers: [
          {
            condition: "", // Required - e.g., "on_busy", "on_no_answer"
            transfer_destination: {
              phone_number: "", // or use sip_uri
              type: "phone", // or "sip_uri"
            },
            transfer_type: "conference", // Optional - one of: "conference", "sip_refer"
          },
        ],
      },
    },
    skip_turn: {
      name: "skip_turn",
      description: "Skip the current turn",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "skip_turn",
      },
    },
    play_keypad_touch_tone: {
      name: "play_keypad_touch_tone",
      description: "Play keypad touch tone",
      response_timeout_secs: 20,
      type: "system",
      params: {
        system_tool_type: "play_keypad_touch_tone",
      },
    },
  };

  return defaults[key];
};

export const ToolConfigModal = ({
  isOpen,
  onClose,
  tool,
  onSave,
  agentId,
  toolIds,
  builtInTools,
  editingTool,
}: ToolConfigModalProps) => {
  const [toolType, setToolType] = useState<string>(() => {
    if (editingTool) {
      if (editingTool.type === "tool_id") {
        return editingTool.id;
      } else {
        return editingTool.key;
      }
    }
    return "add_new";
  });



  const [selectedBuiltInKey, setSelectedBuiltInKey] = useState(() => {
    if (editingTool?.type === "built_in") {
      return editingTool.key;
    }
    return "";
  });

  const [builtInToolConfig, setBuiltInToolConfig] =
    useState<BuiltInTool | null>(() => {
      if (editingTool?.type === "built_in") {
        return (
          builtInTools[editingTool.key] ||
          getBuiltInToolDefaults(editingTool.key)
        );
      }
      return null;
    });

  const [newToolConfig, setNewToolConfig] = useState({
    name: "",
    description: "",
    type: "webhook",
    response_timeout_secs: 20,
    api_schema: {
      url: "",
      method: "POST",
      request_body_schema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  });
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(newToolConfig.api_schema?.request_body_schema || {}, null, 2)
  );

  const [ghlConfig, setGhlConfig] = useState({
    ghlApiKey: "",
    ghlCalendarId: "",
    ghlLocationId: "",
  });

  const [calConfig, setCalConfig] = useState({
    calApiKey: "",
  });

  const [userTools, setUserTools] = useState<UserTool[]>([]);
  const [toolDetailsCache, setToolDetailsCache] = useState<{
    [key: string]: ToolDetails;
  }>({});
  const [selectedToolDetails, setSelectedToolDetails] =
    useState<ToolDetails | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [loadingToolDetails, setLoadingToolDetails] = useState(false);
  const [error, setError] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [nameError, setNameError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [transferErrors, setTransferErrors] = useState<{ [key: number]: string }>({});

  // New Client Tool State
  const [clientToolConfig, setClientToolConfig] = useState<ClientToolConfig>({
    name: "",
    description: "",
    wait_for_response: false,
    disable_interruptions: false,
    pre_tool_speech: "auto",
    execution_mode: "immediate",
    params: [],
  });

  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const [newParam, setNewParam] = useState<ToolParameter>({
    name: "",
    type: "string",
    description: "",
    required: true,
    value_type: "llm_prompt",
    enum_values: [],
  });
  const [enumInputValue, setEnumInputValue] = useState("");

  const { user: nativeUser, impersonatedUser } = useAuth();
  console.log("LOGGING THE USERS ", nativeUser, impersonatedUser)
  let user;

  if (impersonatedUser) user = impersonatedUser
  else user = nativeUser

  // Fetch user tools from Firebase
  useEffect(() => {
    const fetchUserTools = async () => {
      if (!user) return;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}`,
          {
            headers: {
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setUserTools(data.tool_config || []);
        }
      } catch (error) {
        console.error("Error fetching user tools:", error);
      }
    };

    if (isOpen) {
      fetchUserTools();
    }
  }, [isOpen, user]);

  // Fetch user agents
  useEffect(() => {
    const fetchUserAgents = async () => {
      if (!user) return;

      try {
        setLoadingAgents(true);
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/agents/${user.uid}`,
          {
            headers: {
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setUserAgents(data.agents || []);
        }
      } catch (error) {
        console.error("Error fetching user agents:", error);
      } finally {
        setLoadingAgents(false);
      }
    };

    if (isOpen) {
      fetchUserAgents();
    }
  }, [isOpen, user]);

  // Fetch tool details when a tool ID is selected
  useEffect(() => {
    const fetchToolDetails = async (toolId: string) => {
      if (!user || !toolId || toolDetailsCache[toolId]) {
        if (toolDetailsCache[toolId]) {
          setSelectedToolDetails(toolDetailsCache[toolId]);
          setSelectedToolId(toolId);
          // Check if it's a GHL tool and extract config
          const cachedTool = toolDetailsCache[toolId];
          if (
            cachedTool.name === "GHL_BOOKING" &&
            cachedTool.api_schema?.request_body_schema?.properties
          ) {
            const props = cachedTool.api_schema.request_body_schema.properties;
            setGhlConfig({
              ghlApiKey: props.apiKey?.constant_value || "",
              ghlCalendarId: props.calendarId?.constant_value || "",
              ghlLocationId: props.locationId?.constant_value || "",
            });
            // Auto-update tool type to ghl_booking for existing GHL tools
            setToolType("ghl_booking");
          } else if (
            cachedTool.name === "CALCOM" &&
            cachedTool.api_schema?.request_body_schema?.properties
          ) {
            const props = cachedTool.api_schema.request_body_schema.properties;
            setCalConfig({
              calApiKey: props.apiKey?.constant_value || "",
            });
            setToolType("calcom");
          }
        }
        return;
      }

      setLoadingToolDetails(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${toolId}`,
          {
            headers: {
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
          },
        );

        if (response.ok) {
          const apiResponse = await response.json();
          const toolDetails = apiResponse.tool_config;
          setToolDetailsCache((prev) => ({ ...prev, [toolId]: toolDetails }));
          setSelectedToolDetails(toolDetails);
          setSelectedToolId(toolId);

          // Check if it's a GHL tool and extract config
          if (
            toolDetails.name === "GHL_BOOKING" &&
            toolDetails.api_schema?.request_body_schema?.properties
          ) {
            const props = toolDetails.api_schema.request_body_schema.properties;
            setGhlConfig({
              ghlApiKey: props.apiKey?.constant_value || "",
              ghlCalendarId: props.calendarId?.constant_value || "",
              ghlLocationId: props.locationId?.constant_value || "",
            });
            // Auto-update tool type to ghl_booking for existing GHL tools
            setToolType("ghl_booking");
          } else if (
            toolDetails.name === "CALCOM" &&
            toolDetails.api_schema?.request_body_schema?.properties
          ) {
            const props = toolDetails.api_schema.request_body_schema.properties;
            setCalConfig({
              calApiKey: props.apiKey?.constant_value || "",
            });
            setToolType("calcom");
          }
        }
      } catch (error) {
        console.error("Error fetching tool details:", error);
        setError("Failed to fetch tool details");
      } finally {
        setLoadingToolDetails(false);
      }
    };

    if (toolType !== "add_new" && !BUILT_IN_TOOL_KEYS.includes(toolType)) {
      fetchToolDetails(toolType);
    }
  }, [toolType, user, toolDetailsCache]);

  const validateToolName = (name: string): string | null => {
    if (!name.trim()) {
      return "Tool name is required";
    }
    const nameRegex = /^[a-zA-Z0-9_-]{1,64}$/;
    if (!nameRegex.test(name)) {
      return "Tool name must be 1-64 characters long and contain only letters, numbers, hyphens, and underscores";
    }
    return null;
  };

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return "Webhook URL is required";
    }
    try {
      new URL(url);
      return null;
    } catch {
      return "Please enter a valid URL";
    }
  };

  const validateTransferPhoneNumber = (value: string, type: string): string | null => {
    if (!value.trim()) {
      return type === "phone_dynamic_variable"
        ? "Dynamic variable name is required"
        : "Phone number is required";
    }

    if (type === "phone_dynamic_variable") {
      // Validate dynamic variable name: only alphanumeric and underscores
      const variableRegex = /^[a-zA-Z0-9_]+$/;
      if (!variableRegex.test(value)) {
        return "Dynamic variable name can only contain alphanumeric characters and underscores";
      }
    } else if (type === "phone") {
      // Validate phone number: should start with + and contain digits
      const phoneRegex = /^\+?[0-9]+$/;
      if (!phoneRegex.test(value)) {
        return "Phone number should contain only digits and optionally start with +";
      }
    }

    return null;
  };

  const handleJsonChange = (value: string) => {
    setJsonInput(value); // always update textarea
    try {
      const parsed = JSON.parse(value);
      setJsonError("");
      setNewToolConfig((prev) => ({
        ...prev,
        api_schema: {
          ...prev.api_schema,
          request_body_schema: parsed,
        },
      }));
    } catch {
      setJsonError("Invalid JSON format");
    }
  };

  const handleJsonBlur = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore
    }
  };

  const handleAddParam = () => {
    if (!newParam.name) return;

    if (editingParamIndex !== null) {
      const updatedParams = [...clientToolConfig.params];
      updatedParams[editingParamIndex] = newParam;
      setClientToolConfig(prev => ({ ...prev, params: updatedParams }));
      setEditingParamIndex(null);
    } else {
      setClientToolConfig(prev => ({
        ...prev,
        params: [...prev.params, newParam]
      }));
    }

    // Reset new param
    setNewParam({
      name: "",
      type: "string",
      description: "",
      required: true,
      value_type: "llm_prompt",
      enum_values: [],
    });
    setEnumInputValue("");
  };

  const handleEditParam = (index: number) => {
    setNewParam(clientToolConfig.params[index]);
    setEditingParamIndex(index);
  };

  const handleDeleteParam = (index: number) => {
    const updatedParams = clientToolConfig.params.filter((_, i) => i !== index);
    setClientToolConfig(prev => ({ ...prev, params: updatedParams }));
  };

  const handleEnumAdd = () => {
    if (!enumInputValue.trim()) return;
    if (newParam.enum_values.includes(enumInputValue.trim())) return;

    setNewParam(prev => ({
      ...prev,
      enum_values: [...prev.enum_values, enumInputValue.trim()]
    }));
    setEnumInputValue("");
  };

  const handleEnumDelete = (value: string) => {
    setNewParam(prev => ({
      ...prev,
      enum_values: prev.enum_values.filter(v => v !== value)
    }));
  };



  const handleClose = () => {
    setError("");
    setJsonError("");
    setNameError("");
    setUrlError("");
    setTransferErrors({});
    if (!editingTool) {
      setToolType("add_new");
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
      setSelectedToolDetails(null);
      setSelectedToolId(null);
      setNewToolConfig({
        name: "",
        description: "",
        type: "webhook",
        response_timeout_secs: 20,
        api_schema: {
          url: "",
          method: "POST",
          request_body_schema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      });
      setGhlConfig({
        ghlApiKey: "",
        ghlCalendarId: "",
        ghlLocationId: "",
      });
      setCalConfig({
        calApiKey: "",
      });
    }
    onClose();
  };

  const handleToolTypeChange = (type: string) => {
    setToolType(type);
    setError("");
    setNameError("");
    setUrlError("");
    setSelectedToolDetails(null);
    setSelectedToolId(null);

    if (BUILT_IN_TOOL_KEYS.includes(type)) {
      setSelectedBuiltInKey(type);
      const existingConfig = builtInTools[type];
      setBuiltInToolConfig(existingConfig || getBuiltInToolDefaults(type));
    } else if (type === "ghl_booking") {
      // Reset GHL config when switching to GHL tool
      setGhlConfig({
        ghlApiKey: "",
        ghlCalendarId: "",
        ghlLocationId: "",
      });
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    } else if (type === "calcom") {
      // Reset Cal.com config when switching to Cal.com tool
      setCalConfig({
        calApiKey: "",
      });
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    } else {
      setSelectedBuiltInKey("");
      setBuiltInToolConfig(null);
    }
  };

  const handleSaveAndClose = async () => {
    if (!user) return;
    console.log("USER", user.uid)

    try {
      if (BUILT_IN_TOOL_KEYS.includes(toolType) && builtInToolConfig) {
        // Handle built-in tool
        const updatedBuiltInTools = {
          ...builtInTools,
          [toolType]: builtInToolConfig,
        };
        onSave(toolIds, updatedBuiltInTools);
      } else if (toolType === "add_new") {
        // Construct tool config from Form State
        const toolConfig = {
          name: clientToolConfig.name,
          description: clientToolConfig.description,
          type: "client", // or "webhook" depending on backend requirement, using "client" to denote this new rich type, but likely needs to map to "webhook" or similar with specific schema
          response_timeout_secs: clientToolConfig.wait_for_response ? 20 : 0, // Simplified logic
          // Mapping Client Tool Flags to Payload - Assuming custom clienttool structure or fitting into existing
          // For now, I will construct a payload that mimics the 11Labs structure
          // but wrapped in our tool creation format
          api_schema: {
            url: newToolConfig.api_schema.url, // Keep URL input for webhook URL
            method: "POST",
            request_body_schema: {
              type: "object",
              properties: clientToolConfig.params.reduce((acc, param) => {
                acc[param.name] = {
                  type: param.type,
                  description: param.description,
                  ...(param.enum_values.length > 0 ? { enum: param.enum_values } : {})
                };
                return acc;
              }, {} as any),
              required: clientToolConfig.params.filter(p => p.required).map(p => p.name)
            }
          },
          // Additional metadata for the UI to reconstruct state
          client_tool_config: {
            wait_for_response: clientToolConfig.wait_for_response,
            disable_interruptions: clientToolConfig.disable_interruptions,
            pre_tool_speech: clientToolConfig.pre_tool_speech,
            execution_mode: clientToolConfig.execution_mode
          }
        };

        // 3. Validate name and URL
        const nameValidation = validateToolName(toolConfig.name);
        if (nameValidation) {
          setNameError(nameValidation);
          return;
        }

        // We still need a URL for the tool execution? 
        // 11Labs "Client Tool" usually means it sends an event to the client SDK.
        // But here we are likely creating a server-side tool definition that 11Labs uses.
        // If it's a "Webhook" tool, it needs a URL.
        // If the user wants 11Labs "Client Tool" (event-based), the type might differ.
        // Assuming "Webhook" based on existing code, so we validate URL.
        // But if it's purely client-side event logic, we might not need URL?
        // Let's assume URL is required as per existing "Add Tool".
        const urlValidation = validateUrl(toolConfig.api_schema.url || "");
        if (urlValidation) {
          setUrlError(urlValidation);
          return;
        }

        // 4. Send to backend
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/create/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              tool_config: toolConfig,
              user_id: user.uid,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to create tool");
        }

        const createdTool = await response.json();
        const updatedToolIds = [...toolIds, createdTool.id];
        onSave(updatedToolIds, builtInTools);
      }
      else if (toolType === "ghl_booking" && !editingTool) {
        // Create new GHL booking tool
        if (
          !ghlConfig.ghlApiKey ||
          !ghlConfig.ghlCalendarId ||
          !ghlConfig.ghlLocationId
        ) {
          setError(
            "All GHL fields (API Key, Calendar ID, Location ID) are required",
          );
          return;
        }

        const ghlToolConfig = {
          name: "GHL_BOOKING",
          description: "Create a booking in GHL calendar",
          type: "webhook",
          response_timeout_secs: 20,
          api_schema: {
            url: `${import.meta.env.VITE_BACKEND_URL}/ghl/book/`,
            method: "POST",
            request_body_schema: {
              type: "object",
              properties: {
                apiKey: {
                  type: "string",
                  constant_value: ghlConfig.ghlApiKey,
                },
                calendarId: {
                  type: "string",
                  constant_value: ghlConfig.ghlCalendarId,
                },
                locationId: {
                  type: "string",
                  constant_value: ghlConfig.ghlLocationId,
                },
                startTime: {
                  type: "string",
                  description:
                    "Event start time in ISO 8601 format with timezone offset (e.g. 2021-06-23T03:30:00+05:30)",
                },
                endTime: {
                  type: "string",
                  description:
                    "Event end time in ISO 8601 format with timezone offset (e.g. 2021-06-23T04:30:00+05:30)",
                },
                title: {
                  type: "string",
                  constant_value: "Consultation Call",
                },
                timezone: {
                  type: "string",
                  constant_value: "Australia/Sydney",
                },
                contactInfo: {
                  type: "object",
                  properties: {
                    phone: {
                      type: "string",
                      description: "Contact phone number with country code",
                    },
                  },
                  required: ["phone"],
                  description: "Contact information for GHL",
                },
              },
              required: [
                "startTime",
                "endTime",
                "title",
                "timezone",
                "contactInfo",
              ],
            },
          },
        };

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/create/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              tool_config: ghlToolConfig,
              user_id: user.uid,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to create GHL tool");
        }

        const createdTool = await response.json();
        const updatedToolIds = [...toolIds, createdTool.id];
        onSave(updatedToolIds, builtInTools);
      } else if (toolType === "calcom" && !editingTool) {
        // Create new Cal.com booking tool
        if (!calConfig.calApiKey) {
          setError("Cal.com API Key is required");
          return;
        }

        const calToolConfig = {
          name: "CALCOM",
          description: "Create a booking in Cal.com",
          type: "webhook",
          response_timeout_secs: 20,
          api_schema: {
            url: `${import.meta.env.VITE_BACKEND_URL}/calcom/book/`,
            method: "POST",
            request_body_schema: {
              type: "object",
              properties: {
                apiKey: {
                  type: "string",
                  constant_value: calConfig.calApiKey,
                },
                start: {
                  type: "string",
                  description:
                    "Event start time in ISO 8601 format with UTC timezone (e.g. 2024-08-13T09:00:00Z)",
                },
                end: {
                  type: "string",
                  description:
                    "Event end time in ISO 8601 format with UTC timezone (e.g. 2024-08-13T10:00:00Z)",
                },
                attendee: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Full name of the attendee",
                    },
                    email: {
                      type: "string",
                      description: "Valid email address of the attendee",
                    },
                    timeZone: {
                      type: "string",
                      description:
                        "IANA timezone identifier (e.g. America/New_York, Europe/London)",
                    },
                  },
                  required: ["name", "email", "timeZone"],
                  description: "Attendee information for the booking",
                },
              },
              required: ["start", "end", "attendee"],
            },
          },
        };

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/create/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              tool_config: calToolConfig,
              user_id: user.uid,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to create Cal.com tool");
        }

        const createdTool = await response.json();
        const updatedToolIds = [...toolIds, createdTool.id];
        onSave(updatedToolIds, builtInTools);
      } else if (
        toolType === "ghl_booking" &&
        editingTool?.type === "tool_id" &&
        selectedToolDetails
      ) {
        // Update existing GHL tool
        if (
          !ghlConfig.ghlApiKey ||
          !ghlConfig.ghlCalendarId ||
          !ghlConfig.ghlLocationId
        ) {
          setError(
            "All GHL fields (API Key, Calendar ID, Location ID) are required",
          );
          return;
        }

        let updatedToolDetails = { ...selectedToolDetails };
        updatedToolDetails.api_schema.request_body_schema.properties = {
          ...selectedToolDetails.api_schema.request_body_schema.properties,
          apiKey: {
            ...selectedToolDetails.api_schema.request_body_schema.properties
              .apiKey,
            constant_value: ghlConfig.ghlApiKey,
          },
          calendarId: {
            ...selectedToolDetails.api_schema.request_body_schema.properties
              .calendarId,
            constant_value: ghlConfig.ghlCalendarId,
          },
          locationId: {
            ...selectedToolDetails.api_schema.request_body_schema.properties
              .locationId,
            constant_value: ghlConfig.ghlLocationId,
          },
        };

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({ tool_config: updatedToolDetails }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to update GHL tool");
        }

        // Keep existing tool IDs since we're updating, not adding
        onSave(toolIds, builtInTools);
      } else if (
        toolType === "calcom" &&
        editingTool?.type === "tool_id" &&
        selectedToolDetails
      ) {
        // Update existing Cal.com tool
        if (!calConfig.calApiKey) {
          setError("Cal.com API Key is required");
          return;
        }

        let updatedToolDetails = { ...selectedToolDetails };
        updatedToolDetails.api_schema.request_body_schema.properties = {
          ...selectedToolDetails.api_schema.request_body_schema.properties,
          apiKey: {
            ...selectedToolDetails.api_schema.request_body_schema.properties
              .apiKey,
            constant_value: calConfig.calApiKey,
          },
        };

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({ tool_config: updatedToolDetails }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to update Cal.com tool");
        }

        // Keep existing tool IDs since we're updating, not adding
        onSave(toolIds, builtInTools);
      } else {
        // Handle existing tool ID selection or update
        if (editingTool?.type === "tool_id" && selectedToolDetails) {
          // Update existing tool
          let updatedToolDetails = { ...selectedToolDetails };

          // Update GHL configuration if it's a GHL tool
          if (
            selectedToolDetails.name === "GHL_BOOKING" &&
            selectedToolDetails.api_schema?.request_body_schema?.properties
          ) {
            if (
              !ghlConfig.ghlApiKey ||
              !ghlConfig.ghlCalendarId ||
              !ghlConfig.ghlLocationId
            ) {
              setError(
                "All GHL fields (API Key, Calendar ID, Location ID) are required",
              );
              return;
            }

            updatedToolDetails.api_schema.request_body_schema.properties = {
              ...selectedToolDetails.api_schema.request_body_schema.properties,
              apiKey: {
                ...selectedToolDetails.api_schema.request_body_schema.properties
                  .apiKey,
                constant_value: ghlConfig.ghlApiKey,
              },
              calendarId: {
                ...selectedToolDetails.api_schema.request_body_schema.properties
                  .calendarId,
                constant_value: ghlConfig.ghlCalendarId,
              },
              locationId: {
                ...selectedToolDetails.api_schema.request_body_schema.properties
                  .locationId,
                constant_value: ghlConfig.ghlLocationId,
              },
            };
          } else if (
            selectedToolDetails.name === "CALCOM" &&
            selectedToolDetails.api_schema?.request_body_schema?.properties
          ) {
            if (!calConfig.calApiKey) {
              setError("Cal.com API Key is required");
              return;
            }

            updatedToolDetails.api_schema.request_body_schema.properties = {
              ...selectedToolDetails.api_schema.request_body_schema.properties,
              apiKey: {
                ...selectedToolDetails.api_schema.request_body_schema.properties
                  .apiKey,
                constant_value: calConfig.calApiKey,
              },
            };
          }

          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user.getIdToken()}`,
              },
              body: JSON.stringify({ tool_config: updatedToolDetails }),
            },
          );

          if (!response.ok) {
            throw new Error("Failed to update tool");
          }
        }

        // Add tool ID to agent if not already present
        if (!toolIds.includes(toolType)) {
          const updatedToolIds = [...toolIds, toolType];
          onSave(updatedToolIds, builtInTools);
        } else {
          // Tool already exists in agent, just save current state
          onSave(toolIds, builtInTools);
        }
      }

      handleClose();
    } catch (error) {
      console.error("Error saving tool:", error);
      setError("Failed to save tool");
    }
  };

  const getToolTypeOptions = () => {
    const options = [
      { value: "add_new", label: "➕ Add New Tool", icon: Plus },
      { value: "ghl_booking", label: "🗓️ GHL Booking Tool", icon: Webhook },
      { value: "calcom", label: "🗓️ Cal.com Booking Tool", icon: Webhook },
    ];

    // Add user's available tools
    userTools.forEach((userTool) => {
      if (!toolIds.includes(userTool.tool_id)) {
        options.push({
          value: userTool.tool_id,
          label: userTool.tool_id,
          icon: Webhook,
        });
      }
    });

    // Add built-in tool keys
    BUILT_IN_TOOL_KEYS.forEach((key) => {
      options.push({
        value: key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        icon: Settings,
      });
    });

    return options;
  };

  const isBuiltInTool = BUILT_IN_TOOL_KEYS.includes(toolType);
  const isNewTool = toolType === "add_new";
  const isGhlTool =
    toolType === "ghl_booking" || selectedToolDetails?.name === "GHL_BOOKING";
  const isCalTool =
    toolType === "calcom" || selectedToolDetails?.name === "CALCOM";
  const isExistingTool =
    !isBuiltInTool && !isNewTool && !isGhlTool && !isCalTool;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-[600px] h-full bg-white dark:bg-dark-200 shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-primary/10 dark:border-primary/20">
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                    {isNewTool ? (
                      <Plus className="w-6 h-6 text-primary dark:text-primary-400" />
                    ) : isBuiltInTool ? (
                      <Settings className="w-6 h-6 text-primary dark:text-primary-400" />
                    ) : (
                      <Webhook className="w-6 h-6 text-primary dark:text-primary-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-lato font-semibold text-primary dark:text-primary-400">
                      {editingTool ? "Edit Tool" : "Add Tool"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {editingTool
                        ? "Edit the selected tool configuration"
                        : "Add a tool to your agent"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                {/* Tool Type Selection */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                      Tool Type
                    </label>
                    <select
                      value={toolType}
                      onChange={(e) => handleToolTypeChange(e.target.value)}
                      disabled={!!editingTool}
                      className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400 disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {getToolTypeOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Loading Tool Details */}
                  {loadingToolDetails && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Loading tool details...
                      </p>
                    </div>
                  )}

                  {/* New Tool Configuration */}
                  {isNewTool && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Create a new custom tool with your own configuration.
                        </p>
                      </div>
                      <div className="space-y-6">
                        {/* General Settings */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                            General Settings
                          </h3>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={clientToolConfig.name}
                              onChange={(e) => {
                                setClientToolConfig(prev => ({ ...prev, name: e.target.value }));
                                setNameError("");
                              }}
                              className={`input ${nameError ? "border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                              placeholder="e.g. check_order_status"
                            />
                            {nameError && (
                              <p className="text-xs text-red-500 mt-1">{nameError}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Use snake_case (e.g., check_availability)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={clientToolConfig.description}
                              onChange={(e) => setClientToolConfig(prev => ({ ...prev, description: e.target.value }))}
                              className="input min-h-[80px]"
                              placeholder="Describe to the LLM how and when to use the tool."
                            />
                          </div>
                        </div>

                        {/* Configuration Flags */}
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-100">
                          <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white flex items-center">
                            Configuration <Settings className="w-4 h-4 ml-2 text-gray-400" />
                          </h3>

                          <div className="space-y-3">
                            <label className="flex items-start space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={clientToolConfig.wait_for_response}
                                onChange={(e) => setClientToolConfig(prev => ({ ...prev, wait_for_response: e.target.checked }))}
                                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-dark-50"
                              />
                              <div>
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Wait for response</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                  Select this box to make the agent wait for the tool to finish executing before resuming the conversation.
                                </span>
                              </div>
                            </label>

                            <label className="flex items-start space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={clientToolConfig.disable_interruptions}
                                onChange={(e) => setClientToolConfig(prev => ({ ...prev, disable_interruptions: e.target.checked }))}
                                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-dark-50"
                              />
                              <div>
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Disable interruptions</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                  Select this box to disable interruptions while the tool is running.
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Pre-tool speech
                              </label>
                              <select
                                value={clientToolConfig.pre_tool_speech}
                                onChange={(e) => setClientToolConfig(prev => ({ ...prev, pre_tool_speech: e.target.value as any }))}
                                className="input"
                              >
                                <option value="auto">Auto</option>
                                <option value="trigger">Trigger</option>
                              </select>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Force agent speech before tool execution.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Execution mode
                              </label>
                              <select
                                value={clientToolConfig.execution_mode}
                                onChange={(e) => setClientToolConfig(prev => ({ ...prev, execution_mode: e.target.value as any }))}
                                className="input"
                              >
                                <option value="immediate">Immediate</option>
                                <option value="manual">Manual</option>
                              </select>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Determines when and how the tool executes.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Wrapper for Webhook URL since we need it for backend payload, though UI focuses on "Client Tool" properties */}
                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-dark-100">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Endpoint URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newToolConfig.api_schema.url}
                            onChange={(e) => {
                              setNewToolConfig(prev => ({
                                ...prev,
                                api_schema: { ...prev.api_schema, url: e.target.value }
                              }));
                              setUrlError("");
                            }}
                            className={`input ${urlError ? "border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                            placeholder="https://api.example.com/webhook"
                          />
                          {urlError && (
                            <p className="text-xs text-red-500 mt-1">{urlError}</p>
                          )}
                        </div>


                        {/* Parameters Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white">
                                Parameters
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Define the parameters that will be sent with the event.
                              </p>
                            </div>
                          </div>

                          {/* Parameter Input Form */}
                          <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg space-y-4 border border-gray-200 dark:border-dark-50">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Data Type
                                </label>
                                <select
                                  value={newParam.type}
                                  onChange={(e) => setNewParam(prev => ({ ...prev, type: e.target.value as any }))}
                                  className="input text-sm"
                                >
                                  <option value="string">String</option>
                                  <option value="integer">Integer</option>
                                  <option value="number">Number</option>
                                  <option value="boolean">Boolean</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Identifier <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={newParam.name}
                                  onChange={(e) => setNewParam(prev => ({ ...prev, name: e.target.value }))}
                                  className="input text-sm"
                                  placeholder="e.g. customer_id"
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newParam.required}
                                onChange={(e) => setNewParam(prev => ({ ...prev, required: e.target.checked }))}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary dark:border-gray-600 dark:bg-dark-50"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Value Type
                              </label>
                              <select
                                value={newParam.value_type}
                                onChange={(e) => setNewParam(prev => ({ ...prev, value_type: e.target.value as any }))}
                                className="input text-sm"
                              >
                                <option value="llm_prompt">LLM Prompt</option>
                                <option value="fixed_value">Fixed Value</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Description
                              </label>
                              <textarea
                                value={newParam.description}
                                onChange={(e) => setNewParam(prev => ({ ...prev, description: e.target.value }))}
                                className="input text-sm min-h-[60px]"
                                placeholder="Pass to the LLM to describe how to extract data..."
                              />
                            </div>

                            {/* Enum Values */}
                            {newParam.type === "string" && (
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Enum Values (Optional)
                                </label>
                                <div className="flex space-x-2">
                                  <input
                                    type="text"
                                    value={enumInputValue}
                                    onChange={(e) => setEnumInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleEnumAdd();
                                      }
                                    }}
                                    className="input text-sm"
                                    placeholder="Enter an enum value"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleEnumAdd}
                                    className="px-3 py-1.5 bg-gray-200 dark:bg-dark-50 hover:bg-gray-300 dark:hover:bg-dark-200 rounded-lg transition-colors"
                                  >
                                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                  </button>
                                </div>
                                {newParam.enum_values.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {newParam.enum_values.map((val) => (
                                      <span key={val} className="inline-flex items-center px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
                                        {val}
                                        <button
                                          onClick={() => handleEnumDelete(val)}
                                          className="ml-1.5 hover:text-blue-900 dark:hover:text-blue-100"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={handleAddParam}
                                disabled={!newParam.name}
                                className="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {editingParamIndex !== null ? "Update Parameter" : "Add Parameter"}
                              </button>
                            </div>
                          </div>


                          {/* Parameters List */}
                          <div className="space-y-3">
                            {clientToolConfig.params.map((param, index) => (
                              <div key={index} className="p-3 border border-gray-200 dark:border-dark-50 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-50/50 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-gray-900 dark:text-white">{param.name}</span>
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        {param.type}
                                      </span>
                                      {param.required && (
                                        <span className="text-xs font-medium text-red-500">Required</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{param.description}</p>
                                    {param.enum_values.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {param.enum_values.map(v => (
                                          <span key={v} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-dark-100 rounded text-gray-500">
                                            {v}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleEditParam(index)}
                                      className="p-1.5 text-gray-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteParam(index)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {clientToolConfig.params.length === 0 && (
                              <p className="text-center text-sm text-gray-500 py-4 italic">No parameters defined</p>
                            )}
                          </div>

                        </div>

                      </div>
                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Response Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          value={newToolConfig.response_timeout_secs}
                          onChange={(e) =>
                            setNewToolConfig((prev) => ({
                              ...prev,
                              response_timeout_secs:
                                parseInt(e.target.value) || 20,
                            }))
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          min="1"
                          max="120"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Request Body Schema
                        </label>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Define the structure of the request body in JSON
                            format
                          </p>
                          <button
                            onClick={() => setShowSampleModal(true)}
                            className="text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-lato font-semibold"
                          >
                            View Sample Schema
                          </button>
                        </div>
                        <div className="relative">
                          <textarea
                            value={jsonInput}
                            onBlur={handleJsonBlur}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            className={cn(
                              "input font-mono text-sm h-[400px] focus:border-primary dark:focus:border-primary-400",
                              jsonError && "border-red-500 dark:border-red-500"
                            )}
                            placeholder="Enter JSON schema..."
                          />
                          {jsonError && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                              {jsonError}
                            </p>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* GHL Tool Configuration */}
                  {(isGhlTool ||
                    selectedToolDetails?.name === "GHL_BOOKING") && (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {isGhlTool
                              ? "Create a GHL booking tool with automatic schema configuration."
                              : "GHL Booking Tool Configuration"}
                          </p>
                        </div>

                        {/* Show tool name and description for existing GHL tools */}
                        {selectedToolDetails && (
                          <>
                            <div>
                              <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                Tool Name
                              </label>
                              <input
                                type="text"
                                value={selectedToolDetails.name}
                                onChange={(e) =>
                                  setSelectedToolDetails((prev) =>
                                    prev
                                      ? { ...prev, name: e.target.value }
                                      : null,
                                  )
                                }
                                className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                Description
                              </label>
                              <textarea
                                value={selectedToolDetails.description}
                                onChange={(e) =>
                                  setSelectedToolDetails((prev) =>
                                    prev
                                      ? { ...prev, description: e.target.value }
                                      : null,
                                  )
                                }
                                className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                                rows={3}
                              />
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            GHL API Key <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={ghlConfig.ghlApiKey}
                            onChange={(e) =>
                              setGhlConfig((prev) => ({
                                ...prev,
                                ghlApiKey: e.target.value,
                              }))
                            }
                            className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            placeholder="Enter your GHL API key"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Calendar ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={ghlConfig.ghlCalendarId}
                            onChange={(e) =>
                              setGhlConfig((prev) => ({
                                ...prev,
                                ghlCalendarId: e.target.value,
                              }))
                            }
                            className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            placeholder="Enter GHL calendar ID"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Location ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={ghlConfig.ghlLocationId}
                            onChange={(e) =>
                              setGhlConfig((prev) => ({
                                ...prev,
                                ghlLocationId: e.target.value,
                              }))
                            }
                            className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            placeholder="Enter GHL location ID"
                          />
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                            {selectedToolDetails
                              ? "API Schema (Auto-configured)"
                              : "Required Parameters (Auto-configured)"}
                          </h3>
                          {selectedToolDetails?.api_schema && (
                            <>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <strong>Endpoint:</strong>{" "}
                                {selectedToolDetails.api_schema?.url || "N/A"}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <strong>Method:</strong>{" "}
                                {selectedToolDetails.api_schema?.method || "N/A"}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                <strong>Required Parameters:</strong>
                              </div>
                            </>
                          )}
                          <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100 overflow-x-auto">
                            {`{
  "startTime": "2025-08-23T03:30:00+10:00",
  "endTime": "2025-08-23T04:30:00+10:00",
  "title": "Consulation Call",
  "timezone": "America/New_York",
  "contactInfo": {
    "phone": "+15551234567"
  }
}`}
                          </pre>
                        </div>
                      </div>
                    )}

                  {/* Cal.com Tool Configuration */}
                  {(isCalTool || selectedToolDetails?.name === "CALCOM") && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {isCalTool
                            ? "Create a Cal.com booking tool with automatic schema configuration."
                            : "Cal.com Booking Tool Configuration"}
                        </p>
                      </div>

                      {/* Show tool name and description for existing Cal.com tools */}
                      {selectedToolDetails && (
                        <>
                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Tool Name
                            </label>
                            <input
                              type="text"
                              value={selectedToolDetails.name}
                              onChange={(e) =>
                                setSelectedToolDetails((prev) =>
                                  prev
                                    ? { ...prev, name: e.target.value }
                                    : null,
                                )
                              }
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Description
                            </label>
                            <textarea
                              value={selectedToolDetails.description}
                              onChange={(e) =>
                                setSelectedToolDetails((prev) =>
                                  prev
                                    ? { ...prev, description: e.target.value }
                                    : null,
                                )
                              }
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Cal.com API Key{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={calConfig.calApiKey}
                          onChange={(e) =>
                            setCalConfig((prev) => ({
                              ...prev,
                              calApiKey: e.target.value,
                            }))
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          placeholder="Enter your Cal.com API key"
                        />
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                          {selectedToolDetails
                            ? "API Schema (Auto-configured)"
                            : "Required Parameters (Auto-configured)"}
                        </h3>
                        {selectedToolDetails?.api_schema && (
                          <>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Endpoint:</strong>{" "}
                              {selectedToolDetails.api_schema?.url || "N/A"}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>Method:</strong>{" "}
                              {selectedToolDetails.api_schema?.method || "N/A"}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <strong>Required Parameters:</strong>
                            </div>
                          </>
                        )}
                        <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100 overflow-x-auto">
                          {`{
  "start": "2024-08-13T09:00:00Z",
  "end": "2024-08-13T10:00:00Z",
  "attendee": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "timeZone": "America/New_York"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Non-GHL Existing Tool Details */}
                  {isExistingTool &&
                    selectedToolDetails &&
                    selectedToolDetails.name !== "GHL_BOOKING" &&
                    selectedToolDetails.name !== "CALCOM" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Using existing tool: {selectedToolDetails.name}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Tool Name
                          </label>
                          <input
                            type="text"
                            value={selectedToolDetails.name}
                            onChange={(e) =>
                              setSelectedToolDetails((prev) =>
                                prev ? { ...prev, name: e.target.value } : null,
                              )
                            }
                            className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Description
                          </label>
                          <textarea
                            value={selectedToolDetails.description}
                            onChange={(e) =>
                              setSelectedToolDetails((prev) =>
                                prev
                                  ? { ...prev, description: e.target.value }
                                  : null,
                              )
                            }
                            className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                            rows={3}
                          />
                        </div>

                        {selectedToolDetails.api_schema && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                Webhook URL{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="url"
                                value={
                                  selectedToolDetails.api_schema?.url || ""
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setSelectedToolDetails((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      api_schema: {
                                        ...prev.api_schema,
                                        url: value,
                                      },
                                    };
                                  });
                                  setUrlError(validateUrl(value) || "");
                                }}
                                className={cn(
                                  "input font-lato font-semibold focus:border-primary dark:focus:border-primary-400",
                                  urlError &&
                                  "border-red-500 dark:border-red-500",
                                )}
                                placeholder="https://your-webhook-url.com"
                              />
                              {urlError && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                  {urlError}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                Response Timeout (seconds)
                              </label>
                              <input
                                type="number"
                                value={
                                  selectedToolDetails.response_timeout_secs ||
                                  20
                                }
                                onChange={(e) =>
                                  setSelectedToolDetails((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      response_timeout_secs:
                                        parseInt(e.target.value) || 20,
                                    };
                                  })
                                }
                                className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                                min="1"
                                max="120"
                              />
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
                                Request Body Schema
                              </h3>
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Define the structure of the request body in
                                  JSON format
                                </p>
                                <button
                                  onClick={() => setShowSampleModal(true)}
                                  className="text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-lato font-semibold"
                                >
                                  View Sample Schema
                                </button>
                              </div>
                              <textarea
                                value={JSON.stringify(
                                  selectedToolDetails.api_schema
                                    ?.request_body_schema,
                                  null,
                                  2,
                                )}
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    setJsonError("");
                                    setSelectedToolDetails((prev) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        api_schema: {
                                          ...prev.api_schema,
                                          request_body_schema: parsed,
                                        },
                                      };
                                    });
                                  } catch (err) {
                                    setJsonError("Invalid JSON format");
                                  }
                                }}
                                className={cn(
                                  "input font-mono text-sm h-[400px] focus:border-primary dark:focus:border-primary-400",
                                  jsonError &&
                                  "border-red-500 dark:border-red-500",
                                )}
                                placeholder="Enter JSON schema..."
                              />
                              {jsonError && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                  {jsonError}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Built-in Tool Configuration */}
                  {isBuiltInTool && builtInToolConfig && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          This is a built-in system tool with predefined
                          functionality.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </label>
                        <textarea
                          value={builtInToolConfig.description}
                          onChange={(e) =>
                            setBuiltInToolConfig({
                              ...builtInToolConfig,
                              description: e.target.value,
                            })
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          rows={3}
                          placeholder="Describe what this tool does"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                          Response Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          value={builtInToolConfig.response_timeout_secs}
                          onChange={(e) =>
                            setBuiltInToolConfig({
                              ...builtInToolConfig,
                              response_timeout_secs:
                                parseInt(e.target.value) || 20,
                            })
                          }
                          className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                          min="1"
                          max="120"
                        />
                      </div>

                      {/* Transfer to Agent Configuration */}
                      {builtInToolConfig.params.system_tool_type === "transfer_to_agent" && (
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-100">
                          <h4 className="text-sm font-lato font-semibold text-gray-900 dark:text-white">
                            Transfer Configuration
                          </h4>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Target Agent{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            {loadingAgents ? (
                              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-100 rounded-lg">
                                Loading agents...
                              </div>
                            ) : (
                              <select
                                value={
                                  builtInToolConfig.params.transfers?.[0]?.agent_id || ""
                                }
                                onChange={(e) =>
                                  setBuiltInToolConfig({
                                    ...builtInToolConfig,
                                    params: {
                                      ...builtInToolConfig.params,
                                      transfers: [
                                        {
                                          ...builtInToolConfig.params.transfers?.[0],
                                          agent_id: e.target.value,
                                          condition:
                                            builtInToolConfig.params.transfers?.[0]?.condition ||
                                            "",
                                          delay_ms:
                                            builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
                                          transfer_message:
                                            builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
                                          enable_transferred_agent_first_message:
                                            builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
                                            false,
                                        },
                                      ],
                                    },
                                  })
                                }
                                className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              >
                                <option value="">Select target agent</option>
                                {userAgents
                                  .filter((agent) => agent.agent_id !== agentId) // Exclude current agent
                                  .map((agent) => (
                                    <option
                                      key={agent.agent_id}
                                      value={agent.agent_id}
                                    >
                                      {agent.name} ({agent.agent_id})
                                    </option>
                                  ))}
                              </select>
                            )}
                            {userAgents.length === 0 && !loadingAgents && (
                              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                                No other agents available for transfer
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Transfer Condition{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={
                                builtInToolConfig.params.transfers?.[0]?.condition || ""
                              }
                              onChange={(e) =>
                                setBuiltInToolConfig({
                                  ...builtInToolConfig,
                                  params: {
                                    ...builtInToolConfig.params,
                                    transfers: [
                                      {
                                        ...builtInToolConfig.params.transfers?.[0],
                                        agent_id:
                                          builtInToolConfig.params.transfers?.[0]?.agent_id || "",
                                        condition: e.target.value,
                                        delay_ms:
                                          builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
                                        transfer_message:
                                          builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
                                        enable_transferred_agent_first_message:
                                          builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
                                          false,
                                      },
                                    ],
                                  },
                                })
                              }
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              placeholder="Enter condition for transfer"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Delay (milliseconds)
                            </label>
                            <input
                              type="number"
                              value={
                                builtInToolConfig.params.transfers?.[0]?.delay_ms || 0
                              }
                              onChange={(e) =>
                                setBuiltInToolConfig({
                                  ...builtInToolConfig,
                                  params: {
                                    ...builtInToolConfig.params,
                                    transfers: [
                                      {
                                        ...builtInToolConfig.params.transfers?.[0],
                                        agent_id:
                                          builtInToolConfig.params.transfers?.[0]?.agent_id || "",
                                        condition:
                                          builtInToolConfig.params.transfers?.[0]?.condition || "",
                                        delay_ms:
                                          parseInt(e.target.value) || 0,
                                        transfer_message:
                                          builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
                                        enable_transferred_agent_first_message:
                                          builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
                                          false,
                                      },
                                    ],
                                  },
                                })
                              }
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              min="0"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                              Transfer Message
                            </label>
                            <textarea
                              value={
                                builtInToolConfig.params.transfers?.[0]?.transfer_message || ""
                              }
                              onChange={(e) =>
                                setBuiltInToolConfig({
                                  ...builtInToolConfig,
                                  params: {
                                    ...builtInToolConfig.params,
                                    transfers: [
                                      {
                                        ...builtInToolConfig.params.transfers?.[0],
                                        agent_id:
                                          builtInToolConfig.params.transfers?.[0]?.agent_id || "",
                                        condition:
                                          builtInToolConfig.params.transfers?.[0]?.condition || "",
                                        delay_ms:
                                          builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
                                        transfer_message: e.target.value,
                                        enable_transferred_agent_first_message:
                                          builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
                                          false,
                                      },
                                    ],
                                  },
                                })
                              }
                              className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                              rows={3}
                              placeholder="Optional message to play before transfer"
                            />
                          </div>

                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="enable_transferred_agent_first_message"
                              checked={
                                builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
                                false
                              }
                              onChange={(e) =>
                                setBuiltInToolConfig({
                                  ...builtInToolConfig,
                                  params: {
                                    ...builtInToolConfig.params,
                                    transfers: [
                                      {
                                        ...builtInToolConfig.params.transfers?.[0],
                                        agent_id:
                                          builtInToolConfig.params.transfers?.[0]?.agent_id || "",
                                        condition:
                                          builtInToolConfig.params.transfers?.[0]?.condition || "",
                                        delay_ms:
                                          builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
                                        transfer_message:
                                          builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
                                        enable_transferred_agent_first_message:
                                          e.target.checked,
                                      },
                                    ],
                                  },
                                })
                              }
                              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                              htmlFor="enable_transferred_agent_first_message"
                              className="text-sm font-lato font-semibold text-gray-900 dark:text-white cursor-pointer"
                            >
                              Enable transferred agent first message
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Transfer to Number Configuration */}
                      {builtInToolConfig.params.system_tool_type === "transfer_to_number" && (
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-100">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-lato font-semibold text-gray-900 dark:text-white">
                              Transfer to Number Configuration
                            </h4>
                            <button
                              onClick={() => {
                                const currentTransfers = builtInToolConfig.params.transfers || [];
                                setBuiltInToolConfig({
                                  ...builtInToolConfig,
                                  params: {
                                    ...builtInToolConfig.params,
                                    transfers: [
                                      ...currentTransfers,
                                      {
                                        condition: "",
                                        transfer_destination: {
                                          phone_number: "",
                                          type: "phone",
                                        },
                                        transfer_type: "conference",
                                      },
                                    ],
                                  },
                                });
                              }}
                              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-lato font-semibold text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Transfer</span>
                            </button>
                          </div>

                          {/* Transfer Entries */}
                          {(builtInToolConfig.params.transfers || []).map((transfer, index) => (
                            <div
                              key={index}
                              className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-100 space-y-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-lato font-semibold text-gray-700 dark:text-gray-300">
                                  Transfer #{index + 1}
                                </h5>
                                {(builtInToolConfig.params.transfers?.length || 0) > 1 && (
                                  <button
                                    onClick={() => {
                                      const currentTransfers = builtInToolConfig.params.transfers || [];
                                      setBuiltInToolConfig({
                                        ...builtInToolConfig,
                                        params: {
                                          ...builtInToolConfig.params,
                                          transfers: currentTransfers.filter((_, i) => i !== index),
                                        },
                                      });
                                    }}
                                    className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                    title="Remove transfer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                  Transfer Condition{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={transfer.condition || ""}
                                  onChange={(e) => {
                                    const currentTransfers = builtInToolConfig.params.transfers || [];
                                    const updatedTransfers = [...currentTransfers];
                                    updatedTransfers[index] = {
                                      ...updatedTransfers[index],
                                      condition: e.target.value,
                                    };
                                    setBuiltInToolConfig({
                                      ...builtInToolConfig,
                                      params: {
                                        ...builtInToolConfig.params,
                                        transfers: updatedTransfers,
                                      },
                                    });
                                  }}
                                  className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                                  placeholder="e.g., on_busy, on_no_answer, test"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                  Destination Type
                                </label>
                                <select
                                  value={transfer.transfer_destination?.type || "phone"}
                                  onChange={(e) => {
                                    const currentTransfers = builtInToolConfig.params.transfers || [];
                                    const updatedTransfers = [...currentTransfers];
                                    const newType = e.target.value;
                                    updatedTransfers[index] = {
                                      ...updatedTransfers[index],
                                      transfer_destination: {
                                        ...updatedTransfers[index].transfer_destination,
                                        type: newType,
                                        // Reset phone_number when switching types
                                        phone_number: "",
                                      },
                                    };
                                    setBuiltInToolConfig({
                                      ...builtInToolConfig,
                                      params: {
                                        ...builtInToolConfig.params,
                                        transfers: updatedTransfers,
                                      },
                                    });

                                    // Clear validation error for this transfer
                                    setTransferErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors[index];
                                      return newErrors;
                                    });
                                  }}
                                  className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                                >
                                  <option value="phone">Phone Number</option>
                                  <option value="phone_dynamic_variable">Phone Number as Dynamic Variable</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                  {transfer.transfer_destination?.type === "phone_dynamic_variable"
                                    ? "Phone Number as Dynamic Variable"
                                    : "Phone Number"}{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={transfer.transfer_destination?.phone_number || ""}
                                  onChange={(e) => {
                                    const currentTransfers = builtInToolConfig.params.transfers || [];
                                    const updatedTransfers = [...currentTransfers];
                                    const value = e.target.value;
                                    const destinationType = updatedTransfers[index].transfer_destination?.type || "phone";

                                    updatedTransfers[index] = {
                                      ...updatedTransfers[index],
                                      transfer_destination: {
                                        ...updatedTransfers[index].transfer_destination,
                                        phone_number: value,
                                        type: destinationType,
                                      },
                                    };
                                    setBuiltInToolConfig({
                                      ...builtInToolConfig,
                                      params: {
                                        ...builtInToolConfig.params,
                                        transfers: updatedTransfers,
                                      },
                                    });

                                    // Validate and set error
                                    const validationError = validateTransferPhoneNumber(value, destinationType);
                                    setTransferErrors(prev => {
                                      const newErrors = { ...prev };
                                      if (validationError) {
                                        newErrors[index] = validationError;
                                      } else {
                                        delete newErrors[index];
                                      }
                                      return newErrors;
                                    });
                                  }}
                                  className={cn(
                                    "input font-lato font-semibold focus:border-primary dark:focus:border-primary-400",
                                    transferErrors[index] && "border-red-500 dark:border-red-500"
                                  )}
                                  placeholder={
                                    transfer.transfer_destination?.type === "phone_dynamic_variable"
                                      ? "phone_number_variable"
                                      : "+1234567890"
                                  }
                                />
                                {transferErrors[index] && (
                                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                    {transferErrors[index]}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                                  Transfer Type
                                </label>
                                <select
                                  value={transfer.transfer_type || "conference"}
                                  onChange={(e) => {
                                    const currentTransfers = builtInToolConfig.params.transfers || [];
                                    const updatedTransfers = [...currentTransfers];
                                    updatedTransfers[index] = {
                                      ...updatedTransfers[index],
                                      transfer_type: e.target.value,
                                    };
                                    setBuiltInToolConfig({
                                      ...builtInToolConfig,
                                      params: {
                                        ...builtInToolConfig.params,
                                        transfers: updatedTransfers,
                                      },
                                    });
                                  }}
                                  className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
                                >
                                  <option value="conference">Conference</option>
                                  <option value="sip_refer">SIP Refer</option>
                                </select>
                              </div>
                            </div>
                          ))}

                          {/* Enable Client Message */}
                          <div className="flex items-center space-x-3 pt-2">
                            <input
                              type="checkbox"
                              id="enable_client_message"
                              checked={
                                builtInToolConfig.params.enable_client_message ?? true
                              }
                              onChange={(e) =>
                                setBuiltInToolConfig({
                                  ...builtInToolConfig,
                                  params: {
                                    ...builtInToolConfig.params,
                                    enable_client_message: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                              htmlFor="enable_client_message"
                              className="text-sm font-lato font-semibold text-gray-900 dark:text-white cursor-pointer"
                            >
                              Enable client message
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Fixed Fields */}
                      <div className="pt-4 border-t border-gray-200 dark:border-dark-100">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          The following fields are system-defined and cannot be
                          modified:
                        </p>

                        <div className="mb-4">
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={builtInToolConfig.name}
                            disabled
                            className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            Type
                          </label>
                          <input
                            type="text"
                            value={builtInToolConfig.type}
                            disabled
                            className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
                            System Tool Type
                          </label>
                          <input
                            type="text"
                            value={builtInToolConfig.params.system_tool_type}
                            disabled
                            className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-100 p-4">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-lato font-semibold text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndClose}
                  disabled={
                    loadingToolDetails ||
                    (isNewTool &&
                      (!newToolConfig.name.trim() ||
                        !newToolConfig.description.trim() ||
                        jsonError ||
                        nameError ||
                        urlError)) ||
                    (isBuiltInTool && !builtInToolConfig) ||
                    (isBuiltInTool &&
                      builtInToolConfig?.params.system_tool_type === "transfer_to_agent" &&
                      (!builtInToolConfig.params.transfers?.[0]?.agent_id?.trim() ||
                        !builtInToolConfig.params.transfers?.[0]?.condition?.trim())) ||
                    (isBuiltInTool &&
                      builtInToolConfig?.params.system_tool_type === "transfer_to_number" &&
                      (!builtInToolConfig.params.transfers?.[0]?.condition?.trim() ||
                        !builtInToolConfig.params.transfers?.[0]?.transfer_destination?.phone_number?.trim())) ||
                    (isGhlTool &&
                      (!ghlConfig.ghlApiKey ||
                        !ghlConfig.ghlCalendarId ||
                        !ghlConfig.ghlLocationId)) ||
                    (isCalTool && !calConfig.calApiKey) ||
                    (isExistingTool &&
                      selectedToolDetails &&
                      (!selectedToolDetails.api_schema?.url?.trim() ||
                        urlError ||
                        jsonError))
                  }
                  className={cn(
                    "px-4 py-2 text-sm font-lato font-semibold text-white bg-primary rounded-lg",
                    "hover:bg-primary-600 transition-colors",
                    (loadingToolDetails ||
                      (isNewTool &&
                        (!newToolConfig.name.trim() ||
                          !newToolConfig.description.trim() ||
                          jsonError ||
                          nameError ||
                          urlError)) ||
                      (isBuiltInTool && !builtInToolConfig) ||
                      (isBuiltInTool &&
                        builtInToolConfig?.params.system_tool_type === "transfer_to_agent" &&
                        (!builtInToolConfig.params.transfers?.[0]?.agent_id?.trim() ||
                          !builtInToolConfig.params.transfers?.[0]?.condition?.trim())) ||
                      (isBuiltInTool &&
                        builtInToolConfig?.params.system_tool_type === "transfer_to_number" &&
                        (!builtInToolConfig.params.transfers?.[0]?.condition?.trim() ||
                          !builtInToolConfig.params.transfers?.[0]?.transfer_destination?.phone_number?.trim())) ||
                      (isGhlTool &&
                        (!ghlConfig.ghlApiKey ||
                          !ghlConfig.ghlCalendarId ||
                          !ghlConfig.ghlLocationId)) ||
                      (isCalTool && !calConfig.calApiKey)) &&
                    "opacity-50 cursor-not-allowed",
                  )}
                >
                  {editingTool ? "Save Changes" : "Add Tool"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sample Schema Modal */}
          <AnimatePresence>
            {showSampleModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[60]"
                  onClick={() => setShowSampleModal(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 m-auto w-[600px] h-[500px] bg-white dark:bg-dark-200 rounded-xl shadow-xl z-[70] flex flex-col"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-100">
                    <h3 className="text-lg font-lato font-semibold text-gray-900 dark:text-white">
                      Sample Schema
                    </h3>
                    <button
                      onClick={() => setShowSampleModal(false)}
                      className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          type: "object",
                          properties: {
                            new_time: {
                              type: "string",
                              description: "The new time",
                            },
                            Laptop: {
                              type: "object",
                              properties: {
                                Screen_size: {
                                  type: "string",
                                  description: "Size of the screen",
                                },
                                operating_system: {
                                  type: "string",
                                  description: "Version of the OS",
                                },
                              },
                              required: ["Screen_size", "operating_system"],
                              description: "Brand of the laptop",
                            },
                            new_date: {
                              type: "string",
                              description: "The new booking date",
                            },
                            country_user: {
                              type: "array",
                              items: {
                                type: "string",
                                description: "Interests",
                              },
                              description: "User's interests",
                            },
                          },
                          required: [
                            "new_time",
                            "Laptop",
                            "new_date",
                            "country_user",
                          ],
                          description: "Type of parameters from the transcript",
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-dark-100">
                    <button
                      onClick={() => {
                        handleJsonChange(
                          JSON.stringify(
                            {
                              type: "object",
                              properties: {
                                new_time: {
                                  type: "string",
                                  description: "The new time",
                                },
                                Laptop: {
                                  type: "object",
                                  properties: {
                                    Screen_size: {
                                      type: "string",
                                      description: "Size of the screen",
                                    },
                                    operating_system: {
                                      type: "string",
                                      description: "Version of the OS",
                                    },
                                  },
                                  required: ["Screen_size", "operating_system"],
                                  description: "Brand of the laptop",
                                },
                                new_date: {
                                  type: "string",
                                  description: "The new booking date",
                                },
                                country_user: {
                                  type: "array",
                                  items: {
                                    type: "string",
                                    description: "Interests",
                                  },
                                  description: "User's interests",
                                },
                              },
                              required: [
                                "new_time",
                                "Laptop",
                                "new_date",
                                "country_user",
                              ],
                              description:
                                "Type of parameters from the transcript",
                            },
                            null,
                            2,
                          ),
                        );
                        setShowSampleModal(false);
                      }}
                      className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 font-lato font-semibold transition-colors"
                    >
                      Use This Schema
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};




// import { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { X, Webhook, Settings, Plus } from "lucide-react";
// import { cn } from "../lib/utils";
// import { useAuth } from "../contexts/AuthContext";

// interface BuiltInTool {
//   name: string;
//   description: string;
//   type: "system";
//   response_timeout_secs: number;
//   params: {
//     system_tool_type: string;
//     // Transfer to Agent fields
//     agent_id?: string;
//     condition?: string;
//     delay_ms?: number;
//     transfer_message?: string;
//     enable_transferred_agent_first_message?: boolean;
//     transfers?: Array<{
//       agent_id: string;
//       condition: string;
//       delay_ms?: number;
//       transfer_message?: string;
//       enable_transferred_agent_first_message?: boolean;
//     } | {
//       condition: string;
//       transfer_destination: {
//         phone_number: string;
//         type: "phone";
//       };
//       transfer_type: string;
//     }>;
//     // Transfer to Number fields
//     enable_client_message?: boolean;
//   };
// }

// interface UserTool {
//   tool_id: string;
//   created_at: string;
// }

// interface ToolDetails {
//   id: string;
//   name: string;
//   description: string;
//   type: string;
//   response_timeout_secs?: number;
//   api_schema?: any;
//   // Add other tool properties as needed
// }

// interface Agent {
//   agent_id: string;
//   name: string;
// }

// interface ToolConfigModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   tool: any;
//   agentId?: string;
//   onSave: (
//     toolIds: string[],
//     builtInTools: { [key: string]: BuiltInTool | null },
//   ) => void;
//   toolIds: string[];
//   builtInTools: { [key: string]: BuiltInTool | null };
//   editingTool?:
//     | { type: "tool_id"; id: string }
//     | { type: "built_in"; key: string };
// }

// const BUILT_IN_TOOL_KEYS = [
//   "end_call",
//   "language_detection",
//   "transfer_to_agent",
//   "transfer_to_number",
//   "skip_turn",
//   "play_keypad_touch_tone",
// ];

// const getBuiltInToolDefaults = (key: string): BuiltInTool => {
//   const defaults: { [key: string]: BuiltInTool } = {
//     end_call: {
//       name: "end_call",
//       description: "End the current call",
//       response_timeout_secs: 20,
//       type: "system",
//       params: {
//         system_tool_type: "end_call",
//       },
//     },
//     language_detection: {
//       name: "language_detection",
//       description: "Detect the language being spoken",
//       response_timeout_secs: 20,
//       type: "system",
//       params: {
//         system_tool_type: "language_detection",
//       },
//     },
//     transfer_to_agent: {
//       name: "transfer_to_agent",
//       description: "Transfer call to another agent",
//       response_timeout_secs: 20,
//       type: "system",
//       params: {
//         system_tool_type: "transfer_to_agent",
//         transfers: [
//           {
//             agent_id: "", // Target agent's ID
//             condition: "", // e.g., "on_no_answer", "on_busy"
//             delay_ms: 0, // Optional delay before transfer
//             transfer_message: "", // Optional message before transfer
//             enable_transferred_agent_first_message: false, // Whether to play first message from agent
//           },
//         ],
//       },
//     },

//     transfer_to_number: {
//       name: "transfer_to_number",
//       description: "Transfer call to a phone number",
//       response_timeout_secs: 20,
//       type: "system",
//       params: {
//         system_tool_type: "transfer_to_number",
//         enable_client_message: true,
//         transfers: [
//           {
//             condition: "", // Required - e.g., "on_busy", "on_no_answer"
//             transfer_destination: {
//               phone_number: "", // or use sip_uri
//               type: "phone", // or "sip_uri"
//             },
//             transfer_type: "phone_number", // Optional - one of: "conference", "sip_refer", "phone_number"
//           },
//         ],
//       },
//     },
//     skip_turn: {
//       name: "skip_turn",
//       description: "Skip the current turn",
//       response_timeout_secs: 20,
//       type: "system",
//       params: {
//         system_tool_type: "skip_turn",
//       },
//     },
//     play_keypad_touch_tone: {
//       name: "play_keypad_touch_tone",
//       description: "Play keypad touch tone",
//       response_timeout_secs: 20,
//       type: "system",
//       params: {
//         system_tool_type: "play_keypad_touch_tone",
//       },
//     },
//   };

//   return defaults[key];
// };

// export const ToolConfigModal = ({
//   isOpen,
//   onClose,
//   tool,
//   onSave,
//   agentId,
//   toolIds,
//   builtInTools,
//   editingTool,
// }: ToolConfigModalProps) => {
//   const [toolType, setToolType] = useState<string>(() => {
//     if (editingTool) {
//       if (editingTool.type === "tool_id") {
//         return editingTool.id;
//       } else {
//         return editingTool.key;
//       }
//     }
//     return "add_new";
//   });

//   const [selectedBuiltInKey, setSelectedBuiltInKey] = useState(() => {
//     if (editingTool?.type === "built_in") {
//       return editingTool.key;
//     }
//     return "";
//   });

//   const [builtInToolConfig, setBuiltInToolConfig] =
//     useState<BuiltInTool | null>(() => {
//       if (editingTool?.type === "built_in") {
//         return (
//           builtInTools[editingTool.key] ||
//           getBuiltInToolDefaults(editingTool.key)
//         );
//       }
//       return null;
//     });

//   const [newToolConfig, setNewToolConfig] = useState({
//     name: "",
//     description: "",
//     type: "webhook",
//     response_timeout_secs: 20,
//     api_schema: {
//       url: "",
//       method: "POST",
//       request_body_schema: {
//         type: "object",
//         properties: {},
//         required: [],
//       },
//     },
//   });

//   const [ghlConfig, setGhlConfig] = useState({
//     ghlApiKey: "",
//     ghlCalendarId: "",
//     ghlLocationId: "",
//   });

//   const [calConfig, setCalConfig] = useState({
//     calApiKey: "",
//   });

//   const [userTools, setUserTools] = useState<UserTool[]>([]);
//   const [toolDetailsCache, setToolDetailsCache] = useState<{
//     [key: string]: ToolDetails;
//   }>({});
//   const [selectedToolDetails, setSelectedToolDetails] =
//     useState<ToolDetails | null>(null);
//   const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
//   const [loadingToolDetails, setLoadingToolDetails] = useState(false);
//   const [error, setError] = useState("");
//   const [jsonError, setJsonError] = useState("");
//   const [nameError, setNameError] = useState("");
//   const [urlError, setUrlError] = useState("");
//   const [showSampleModal, setShowSampleModal] = useState(false);
//   const [userAgents, setUserAgents] = useState<Agent[]>([]);
//   const [loadingAgents, setLoadingAgents] = useState(false);

//   const { user } = useAuth();

//   // Fetch user tools from Firebase
//   useEffect(() => {
//     const fetchUserTools = async () => {
//       if (!user) return;

//       try {
//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}`,
//           {
//             headers: {
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//           },
//         );

//         if (response.ok) {
//           const data = await response.json();
//           setUserTools(data.tool_config || []);
//         }
//       } catch (error) {
//         console.error("Error fetching user tools:", error);
//       }
//     };

//     if (isOpen) {
//       fetchUserTools();
//     }
//   }, [isOpen, user]);

//   // Fetch user agents
//   useEffect(() => {
//     const fetchUserAgents = async () => {
//       if (!user) return;

//       try {
//         setLoadingAgents(true);
//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/agents/${user.uid}`,
//           {
//             headers: {
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//           },
//         );

//         if (response.ok) {
//           const data = await response.json();
//           setUserAgents(data.agents || []);
//         }
//       } catch (error) {
//         console.error("Error fetching user agents:", error);
//       } finally {
//         setLoadingAgents(false);
//       }
//     };

//     if (isOpen) {
//       fetchUserAgents();
//     }
//   }, [isOpen, user]);

//   // Fetch tool details when a tool ID is selected
//   useEffect(() => {
//     const fetchToolDetails = async (toolId: string) => {
//       if (!user || !toolId || toolDetailsCache[toolId]) {
//         if (toolDetailsCache[toolId]) {
//           setSelectedToolDetails(toolDetailsCache[toolId]);
//           setSelectedToolId(toolId);
//           // Check if it's a GHL tool and extract config
//           const cachedTool = toolDetailsCache[toolId];
//           if (
//             cachedTool.name === "GHL_BOOKING" &&
//             cachedTool.api_schema?.request_body_schema?.properties
//           ) {
//             const props = cachedTool.api_schema.request_body_schema.properties;
//             setGhlConfig({
//               ghlApiKey: props.apiKey?.constant_value || "",
//               ghlCalendarId: props.calendarId?.constant_value || "",
//               ghlLocationId: props.locationId?.constant_value || "",
//             });
//             // Auto-update tool type to ghl_booking for existing GHL tools
//             setToolType("ghl_booking");
//           } else if (
//             cachedTool.name === "CALCOM" &&
//             cachedTool.api_schema?.request_body_schema?.properties
//           ) {
//             const props = cachedTool.api_schema.request_body_schema.properties;
//             setCalConfig({
//               calApiKey: props.apiKey?.constant_value || "",
//             });
//             setToolType("calcom");
//           }
//         }
//         return;
//       }

//       setLoadingToolDetails(true);
//       try {
//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${toolId}`,
//           {
//             headers: {
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//           },
//         );

//         if (response.ok) {
//           const apiResponse = await response.json();
//           const toolDetails = apiResponse.tool_config;
//           setToolDetailsCache((prev) => ({ ...prev, [toolId]: toolDetails }));
//           setSelectedToolDetails(toolDetails);
//           setSelectedToolId(toolId);

//           // Check if it's a GHL tool and extract config
//           if (
//             toolDetails.name === "GHL_BOOKING" &&
//             toolDetails.api_schema?.request_body_schema?.properties
//           ) {
//             const props = toolDetails.api_schema.request_body_schema.properties;
//             setGhlConfig({
//               ghlApiKey: props.apiKey?.constant_value || "",
//               ghlCalendarId: props.calendarId?.constant_value || "",
//               ghlLocationId: props.locationId?.constant_value || "",
//             });
//             // Auto-update tool type to ghl_booking for existing GHL tools
//             setToolType("ghl_booking");
//           } else if (
//             toolDetails.name === "CALCOM" &&
//             toolDetails.api_schema?.request_body_schema?.properties
//           ) {
//             const props = toolDetails.api_schema.request_body_schema.properties;
//             setCalConfig({
//               calApiKey: props.apiKey?.constant_value || "",
//             });
//             setToolType("calcom");
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching tool details:", error);
//         setError("Failed to fetch tool details");
//       } finally {
//         setLoadingToolDetails(false);
//       }
//     };

//     if (toolType !== "add_new" && !BUILT_IN_TOOL_KEYS.includes(toolType)) {
//       fetchToolDetails(toolType);
//     }
//   }, [toolType, user, toolDetailsCache]);

//   const validateToolName = (name: string): string | null => {
//     if (!name.trim()) {
//       return "Tool name is required";
//     }
//     const nameRegex = /^[a-zA-Z0-9_-]{1,64}$/;
//     if (!nameRegex.test(name)) {
//       return "Tool name must be 1-64 characters long and contain only letters, numbers, hyphens, and underscores";
//     }
//     return null;
//   };

//   const validateUrl = (url: string): string | null => {
//     if (!url.trim()) {
//       return "Webhook URL is required";
//     }
//     try {
//       new URL(url);
//       return null;
//     } catch {
//       return "Please enter a valid URL";
//     }
//   };

//   const handleJsonChange = (value: string) => {
//     try {
//       const parsed = JSON.parse(value);
//       setJsonError("");
//       setNewToolConfig((prev) => ({
//         ...prev,
//         api_schema: {
//           ...prev.api_schema,
//           request_body_schema: parsed,
//         },
//       }));
//     } catch (err) {
//       setJsonError("Invalid JSON format");
//     }
//   };

//   const handleClose = () => {
//     setError("");
//     setJsonError("");
//     setNameError("");
//     setUrlError("");
//     if (!editingTool) {
//       setToolType("add_new");
//       setSelectedBuiltInKey("");
//       setBuiltInToolConfig(null);
//       setSelectedToolDetails(null);
//       setSelectedToolId(null);
//       setNewToolConfig({
//         name: "",
//         description: "",
//         type: "webhook",
//         response_timeout_secs: 20,
//         api_schema: {
//           url: "",
//           method: "POST",
//           request_body_schema: {
//             type: "object",
//             properties: {},
//             required: [],
//           },
//         },
//       });
//       setGhlConfig({
//         ghlApiKey: "",
//         ghlCalendarId: "",
//         ghlLocationId: "",
//       });
//       setCalConfig({
//         calApiKey: "",
//       });
//     }
//     onClose();
//   };

//   const handleToolTypeChange = (type: string) => {
//     setToolType(type);
//     setError("");
//     setNameError("");
//     setUrlError("");
//     setSelectedToolDetails(null);
//     setSelectedToolId(null);

//     if (BUILT_IN_TOOL_KEYS.includes(type)) {
//       setSelectedBuiltInKey(type);
//       const existingConfig = builtInTools[type];
//       setBuiltInToolConfig(existingConfig || getBuiltInToolDefaults(type));
//     } else if (type === "ghl_booking") {
//       // Reset GHL config when switching to GHL tool
//       setGhlConfig({
//         ghlApiKey: "",
//         ghlCalendarId: "",
//         ghlLocationId: "",
//       });
//       setSelectedBuiltInKey("");
//       setBuiltInToolConfig(null);
//     } else if (type === "calcom") {
//       // Reset Cal.com config when switching to Cal.com tool
//       setCalConfig({
//         calApiKey: "",
//       });
//       setSelectedBuiltInKey("");
//       setBuiltInToolConfig(null);
//     } else {
//       setSelectedBuiltInKey("");
//       setBuiltInToolConfig(null);
//     }
//   };

//   const handleSaveAndClose = async () => {
//     if (!user) return;

//     try {
//       if (BUILT_IN_TOOL_KEYS.includes(toolType) && builtInToolConfig) {
//         // Handle built-in tool
//         const updatedBuiltInTools = {
//           ...builtInTools,
//           [toolType]: builtInToolConfig,
//         };
//         onSave(toolIds, updatedBuiltInTools);
//       } else if (toolType === "add_new") {
//         // Create new tool
//         const nameValidation = validateToolName(newToolConfig.name);
//         if (nameValidation) {
//           setNameError(nameValidation);
//           return;
//         }

//         const urlValidation = validateUrl(newToolConfig.api_schema?.url || "");
//         if (urlValidation) {
//           setUrlError(urlValidation);
//           return;
//         }

//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/create/`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//             body: JSON.stringify({
//               tool_config: newToolConfig,
//               user_id: user.uid,
//             }),
//           },
//         );

//         if (!response.ok) {
//           throw new Error("Failed to create tool");
//         }

//         const createdTool = await response.json();
//         const updatedToolIds = [...toolIds, createdTool.id];
//         onSave(updatedToolIds, builtInTools);
//       } else if (toolType === "ghl_booking" && !editingTool) {
//         // Create new GHL booking tool
//         if (
//           !ghlConfig.ghlApiKey ||
//           !ghlConfig.ghlCalendarId ||
//           !ghlConfig.ghlLocationId
//         ) {
//           setError(
//             "All GHL fields (API Key, Calendar ID, Location ID) are required",
//           );
//           return;
//         }

//         const ghlToolConfig = {
//           name: "GHL_BOOKING",
//           description: "Create a booking in GHL calendar",
//           type: "webhook",
//           response_timeout_secs: 20,
//           api_schema: {
//             url: `${import.meta.env.VITE_BACKEND_URL}/ghl/book/`,
//             method: "POST",
//             request_body_schema: {
//               type: "object",
//               properties: {
//                 apiKey: {
//                   type: "string",
//                   constant_value: ghlConfig.ghlApiKey,
//                 },
//                 calendarId: {
//                   type: "string",
//                   constant_value: ghlConfig.ghlCalendarId,
//                 },
//                 locationId: {
//                   type: "string",
//                   constant_value: ghlConfig.ghlLocationId,
//                 },
//                 startTime: {
//                   type: "string",
//                   description:
//                     "Event start time in ISO 8601 format with timezone offset (e.g. 2021-06-23T03:30:00+05:30)",
//                 },
//                 endTime: {
//                   type: "string",
//                   description:
//                     "Event end time in ISO 8601 format with timezone offset (e.g. 2021-06-23T04:30:00+05:30)",
//                 },
//                 title: {
//                   type: "string",
//                   constant_value: "Consultation Call",
//                 },
//                 timezone: {
//                   type: "string",
//                   constant_value: "Australia/Sydney",
//                 },
//                 contactInfo: {
//                   type: "object",
//                   properties: {
//                     phone: {
//                       type: "string",
//                       description: "Contact phone number with country code",
//                     },
//                   },
//                   required: ["phone"],
//                   description: "Contact information for GHL",
//                 },
//               },
//               required: [
//                 "startTime",
//                 "endTime",
//                 "title",
//                 "timezone",
//                 "contactInfo",
//               ],
//             },
//           },
//         };

//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/create/`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//             body: JSON.stringify({
//               tool_config: ghlToolConfig,
//               user_id: user.uid,
//             }),
//           },
//         );

//         if (!response.ok) {
//           throw new Error("Failed to create GHL tool");
//         }

//         const createdTool = await response.json();
//         const updatedToolIds = [...toolIds, createdTool.id];
//         onSave(updatedToolIds, builtInTools);
//       } else if (toolType === "calcom" && !editingTool) {
//         // Create new Cal.com booking tool
//         if (!calConfig.calApiKey) {
//           setError("Cal.com API Key is required");
//           return;
//         }

//         const calToolConfig = {
//           name: "CALCOM",
//           description: "Create a booking in Cal.com",
//           type: "webhook",
//           response_timeout_secs: 20,
//           api_schema: {
//             url: `${import.meta.env.VITE_BACKEND_URL}/calcom/book/`,
//             method: "POST",
//             request_body_schema: {
//               type: "object",
//               properties: {
//                 apiKey: {
//                   type: "string",
//                   constant_value: calConfig.calApiKey,
//                 },
//                 start: {
//                   type: "string",
//                   description:
//                     "Event start time in ISO 8601 format with UTC timezone (e.g. 2024-08-13T09:00:00Z)",
//                 },
//                 end: {
//                   type: "string",
//                   description:
//                     "Event end time in ISO 8601 format with UTC timezone (e.g. 2024-08-13T10:00:00Z)",
//                 },
//                 attendee: {
//                   type: "object",
//                   properties: {
//                     name: {
//                       type: "string",
//                       description: "Full name of the attendee",
//                     },
//                     email: {
//                       type: "string",
//                       description: "Valid email address of the attendee",
//                     },
//                     timeZone: {
//                       type: "string",
//                       description:
//                         "IANA timezone identifier (e.g. America/New_York, Europe/London)",
//                     },
//                   },
//                   required: ["name", "email", "timeZone"],
//                   description: "Attendee information for the booking",
//                 },
//               },
//               required: ["start", "end", "attendee"],
//             },
//           },
//         };

//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/create/`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//             body: JSON.stringify({
//               tool_config: calToolConfig,
//               user_id: user.uid,
//             }),
//           },
//         );

//         if (!response.ok) {
//           throw new Error("Failed to create Cal.com tool");
//         }

//         const createdTool = await response.json();
//         const updatedToolIds = [...toolIds, createdTool.id];
//         onSave(updatedToolIds, builtInTools);
//       } else if (
//         toolType === "ghl_booking" &&
//         editingTool?.type === "tool_id" &&
//         selectedToolDetails
//       ) {
//         // Update existing GHL tool
//         if (
//           !ghlConfig.ghlApiKey ||
//           !ghlConfig.ghlCalendarId ||
//           !ghlConfig.ghlLocationId
//         ) {
//           setError(
//             "All GHL fields (API Key, Calendar ID, Location ID) are required",
//           );
//           return;
//         }

//         let updatedToolDetails = { ...selectedToolDetails };
//         updatedToolDetails.api_schema.request_body_schema.properties = {
//           ...selectedToolDetails.api_schema.request_body_schema.properties,
//           apiKey: {
//             ...selectedToolDetails.api_schema.request_body_schema.properties
//               .apiKey,
//             constant_value: ghlConfig.ghlApiKey,
//           },
//           calendarId: {
//             ...selectedToolDetails.api_schema.request_body_schema.properties
//               .calendarId,
//             constant_value: ghlConfig.ghlCalendarId,
//           },
//           locationId: {
//             ...selectedToolDetails.api_schema.request_body_schema.properties
//               .locationId,
//             constant_value: ghlConfig.ghlLocationId,
//           },
//         };

//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`,
//           {
//             method: "PATCH",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//             body: JSON.stringify({ tool_config: updatedToolDetails }),
//           },
//         );

//         if (!response.ok) {
//           throw new Error("Failed to update GHL tool");
//         }

//         // Keep existing tool IDs since we're updating, not adding
//         onSave(toolIds, builtInTools);
//       } else if (
//         toolType === "calcom" &&
//         editingTool?.type === "tool_id" &&
//         selectedToolDetails
//       ) {
//         // Update existing Cal.com tool
//         if (!calConfig.calApiKey) {
//           setError("Cal.com API Key is required");
//           return;
//         }

//         let updatedToolDetails = { ...selectedToolDetails };
//         updatedToolDetails.api_schema.request_body_schema.properties = {
//           ...selectedToolDetails.api_schema.request_body_schema.properties,
//           apiKey: {
//             ...selectedToolDetails.api_schema.request_body_schema.properties
//               .apiKey,
//             constant_value: calConfig.calApiKey,
//           },
//         };

//         const response = await fetch(
//           `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`,
//           {
//             method: "PATCH",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${await user.getIdToken()}`,
//             },
//             body: JSON.stringify({ tool_config: updatedToolDetails }),
//           },
//         );

//         if (!response.ok) {
//           throw new Error("Failed to update Cal.com tool");
//         }

//         // Keep existing tool IDs since we're updating, not adding
//         onSave(toolIds, builtInTools);
//       } else {
//         // Handle existing tool ID selection or update
//         if (editingTool?.type === "tool_id" && selectedToolDetails) {
//           // Update existing tool
//           let updatedToolDetails = { ...selectedToolDetails };

//           // Update GHL configuration if it's a GHL tool
//           if (
//             selectedToolDetails.name === "GHL_BOOKING" &&
//             selectedToolDetails.api_schema?.request_body_schema?.properties
//           ) {
//             if (
//               !ghlConfig.ghlApiKey ||
//               !ghlConfig.ghlCalendarId ||
//               !ghlConfig.ghlLocationId
//             ) {
//               setError(
//                 "All GHL fields (API Key, Calendar ID, Location ID) are required",
//               );
//               return;
//             }

//             updatedToolDetails.api_schema.request_body_schema.properties = {
//               ...selectedToolDetails.api_schema.request_body_schema.properties,
//               apiKey: {
//                 ...selectedToolDetails.api_schema.request_body_schema.properties
//                   .apiKey,
//                 constant_value: ghlConfig.ghlApiKey,
//               },
//               calendarId: {
//                 ...selectedToolDetails.api_schema.request_body_schema.properties
//                   .calendarId,
//                 constant_value: ghlConfig.ghlCalendarId,
//               },
//               locationId: {
//                 ...selectedToolDetails.api_schema.request_body_schema.properties
//                   .locationId,
//                 constant_value: ghlConfig.ghlLocationId,
//               },
//             };
//           } else if (
//             selectedToolDetails.name === "CALCOM" &&
//             selectedToolDetails.api_schema?.request_body_schema?.properties
//           ) {
//             if (!calConfig.calApiKey) {
//               setError("Cal.com API Key is required");
//               return;
//             }

//             updatedToolDetails.api_schema.request_body_schema.properties = {
//               ...selectedToolDetails.api_schema.request_body_schema.properties,
//               apiKey: {
//                 ...selectedToolDetails.api_schema.request_body_schema.properties
//                   .apiKey,
//                 constant_value: calConfig.calApiKey,
//               },
//             };
//           }

//           const response = await fetch(
//             `${import.meta.env.VITE_BACKEND_URL}/tools/${user.uid}/${selectedToolId}`,
//             {
//               method: "PATCH",
//               headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${await user.getIdToken()}`,
//               },
//               body: JSON.stringify({ tool_config: updatedToolDetails }),
//             },
//           );

//           if (!response.ok) {
//             throw new Error("Failed to update tool");
//           }
//         }

//         // Add tool ID to agent if not already present
//         if (!toolIds.includes(toolType)) {
//           const updatedToolIds = [...toolIds, toolType];
//           onSave(updatedToolIds, builtInTools);
//         } else {
//           // Tool already exists in agent, just save current state
//           onSave(toolIds, builtInTools);
//         }
//       }

//       handleClose();
//     } catch (error) {
//       console.error("Error saving tool:", error);
//       setError("Failed to save tool");
//     }
//   };

//   const getToolTypeOptions = () => {
//     const options = [
//       { value: "add_new", label: "➕ Add New Tool", icon: Plus },
//       { value: "ghl_booking", label: "🗓️ GHL Booking Tool", icon: Webhook },
//       { value: "calcom", label: "🗓️ Cal.com Booking Tool", icon: Webhook },
//     ];

//     // Add user's available tools
//     userTools.forEach((userTool) => {
//       if (!toolIds.includes(userTool.tool_id)) {
//         options.push({
//           value: userTool.tool_id,
//           label: userTool.tool_id,
//           icon: Webhook,
//         });
//       }
//     });

//     // Add built-in tool keys
//     BUILT_IN_TOOL_KEYS.forEach((key) => {
//       options.push({
//         value: key,
//         label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
//         icon: Settings,
//       });
//     });

//     return options;
//   };

//   const isBuiltInTool = BUILT_IN_TOOL_KEYS.includes(toolType);
//   const isNewTool = toolType === "add_new";
//   const isGhlTool =
//     toolType === "ghl_booking" || selectedToolDetails?.name === "GHL_BOOKING";
//   const isCalTool =
//     toolType === "calcom" || selectedToolDetails?.name === "CALCOM";
//   const isExistingTool =
//     !isBuiltInTool && !isNewTool && !isGhlTool && !isCalTool;

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <>
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
//             onClick={handleClose}
//           />

//           <motion.div
//             initial={{ opacity: 0, x: "100%" }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: "100%" }}
//             transition={{ type: "spring", damping: 25, stiffness: 200 }}
//             className="fixed top-0 right-0 w-[600px] h-full bg-white dark:bg-dark-200 shadow-2xl flex flex-col z-50"
//           >
//             {/* Header */}
//             <div className="flex-shrink-0 border-b border-primary/10 dark:border-primary/20">
//               <div className="p-6 flex justify-between items-center">
//                 <div className="flex items-center space-x-4">
//                   <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
//                     {isNewTool ? (
//                       <Plus className="w-6 h-6 text-primary dark:text-primary-400" />
//                     ) : isBuiltInTool ? (
//                       <Settings className="w-6 h-6 text-primary dark:text-primary-400" />
//                     ) : (
//                       <Webhook className="w-6 h-6 text-primary dark:text-primary-400" />
//                     )}
//                   </div>
//                   <div>
//                     <h2 className="text-xl font-lato font-semibold text-primary dark:text-primary-400">
//                       {editingTool ? "Edit Tool" : "Add Tool"}
//                     </h2>
//                     <p className="text-sm text-gray-500 dark:text-gray-400">
//                       {editingTool
//                         ? "Edit the selected tool configuration"
//                         : "Add a tool to your agent"}
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={handleClose}
//                   className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//             </div>

//             {/* Content */}
//             <div className="flex-1 overflow-y-auto">
//               <div className="p-6 space-y-8">
//                 {error && (
//                   <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
//                     <p className="text-sm text-red-600 dark:text-red-400">
//                       {error}
//                     </p>
//                   </div>
//                 )}

//                 {/* Tool Type Selection */}
//                 <div className="space-y-6">
//                   <div>
//                     <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                       Tool Type
//                     </label>
//                     <select
//                       value={toolType}
//                       onChange={(e) => handleToolTypeChange(e.target.value)}
//                       disabled={!!editingTool}
//                       className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400 disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
//                     >
//                       {getToolTypeOptions().map((option) => (
//                         <option key={option.value} value={option.value}>
//                           {option.label}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   {/* Loading Tool Details */}
//                   {loadingToolDetails && (
//                     <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
//                       <p className="text-sm text-blue-600 dark:text-blue-400">
//                         Loading tool details...
//                       </p>
//                     </div>
//                   )}

//                   {/* New Tool Configuration */}
//                   {isNewTool && (
//                     <div className="space-y-4">
//                       <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
//                         <p className="text-sm text-green-800 dark:text-green-200">
//                           Create a new custom tool with your own configuration.
//                         </p>
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Tool Name <span className="text-red-500">*</span>
//                         </label>
//                         <input
//                           type="text"
//                           value={newToolConfig.name}
//                           onChange={(e) => {
//                             const value = e.target.value;
//                             setNewToolConfig((prev) => ({
//                               ...prev,
//                               name: value,
//                             }));
//                             setNameError(validateToolName(value) || "");
//                           }}
//                           className={cn(
//                             "input font-lato font-semibold focus:border-primary dark:focus:border-primary-400",
//                             nameError && "border-red-500 dark:border-red-500",
//                           )}
//                           placeholder="Enter tool name (letters, numbers, hyphens, underscores only)"
//                         />
//                         {nameError && (
//                           <p className="mt-2 text-sm text-red-600 dark:text-red-400">
//                             {nameError}
//                           </p>
//                         )}
//                         <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
//                           Format: letters, numbers, hyphens, and underscores
//                           only (1-64 characters)
//                         </p>
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Description <span className="text-red-500">*</span>
//                         </label>
//                         <textarea
//                           value={newToolConfig.description}
//                           onChange={(e) =>
//                             setNewToolConfig((prev) => ({
//                               ...prev,
//                               description: e.target.value,
//                             }))
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           rows={3}
//                           placeholder="Describe what this tool does"
//                         />
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Webhook URL <span className="text-red-500">*</span>
//                         </label>
//                         <input
//                           type="url"
//                           value={newToolConfig.api_schema?.url || ""}
//                           onChange={(e) => {
//                             const value = e.target.value;
//                             setNewToolConfig((prev) => ({
//                               ...prev,
//                               api_schema: { ...prev.api_schema, url: value },
//                             }));
//                             setUrlError(validateUrl(value) || "");
//                           }}
//                           className={cn(
//                             "input font-lato font-semibold focus:border-primary dark:focus:border-primary-400",
//                             urlError && "border-red-500 dark:border-red-500",
//                           )}
//                           placeholder="https://your-webhook-url.com"
//                         />
//                         {urlError && (
//                           <p className="mt-2 text-sm text-red-600 dark:text-red-400">
//                             {urlError}
//                           </p>
//                         )}
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Response Timeout (seconds)
//                         </label>
//                         <input
//                           type="number"
//                           value={newToolConfig.response_timeout_secs}
//                           onChange={(e) =>
//                             setNewToolConfig((prev) => ({
//                               ...prev,
//                               response_timeout_secs:
//                                 parseInt(e.target.value) || 20,
//                             }))
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           min="1"
//                           max="120"
//                         />
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Request Body Schema
//                         </label>
//                         <div className="flex items-center justify-between mb-4">
//                           <p className="text-sm text-gray-500 dark:text-gray-400">
//                             Define the structure of the request body in JSON
//                             format
//                           </p>
//                           <button
//                             onClick={() => setShowSampleModal(true)}
//                             className="text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-lato font-semibold"
//                           >
//                             View Sample Schema
//                           </button>
//                         </div>
//                         <div className="relative">
//                           <textarea
//                             value={JSON.stringify(
//                               newToolConfig.api_schema?.request_body_schema ||
//                                 {},
//                               null,
//                               2,
//                             )}
//                             onChange={(e) => handleJsonChange(e.target.value)}
//                             className={cn(
//                               "input font-mono text-sm h-[400px] focus:border-primary dark:focus:border-primary-400",
//                               jsonError && "border-red-500 dark:border-red-500",
//                             )}
//                             placeholder="Enter JSON schema..."
//                           />
//                           {jsonError && (
//                             <p className="mt-2 text-sm text-red-600 dark:text-red-400">
//                               {jsonError}
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   {/* GHL Tool Configuration */}
//                   {(isGhlTool ||
//                     selectedToolDetails?.name === "GHL_BOOKING") && (
//                     <div className="space-y-4">
//                       <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
//                         <p className="text-sm text-blue-800 dark:text-blue-200">
//                           {isGhlTool
//                             ? "Create a GHL booking tool with automatic schema configuration."
//                             : "GHL Booking Tool Configuration"}
//                         </p>
//                       </div>

//                       {/* Show tool name and description for existing GHL tools */}
//                       {selectedToolDetails && (
//                         <>
//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Tool Name
//                             </label>
//                             <input
//                               type="text"
//                               value={selectedToolDetails.name}
//                               onChange={(e) =>
//                                 setSelectedToolDetails((prev) =>
//                                   prev
//                                     ? { ...prev, name: e.target.value }
//                                     : null,
//                                 )
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                             />
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Description
//                             </label>
//                             <textarea
//                               value={selectedToolDetails.description}
//                               onChange={(e) =>
//                                 setSelectedToolDetails((prev) =>
//                                   prev
//                                     ? { ...prev, description: e.target.value }
//                                     : null,
//                                 )
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               rows={3}
//                             />
//                           </div>
//                         </>
//                       )}

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           GHL API Key <span className="text-red-500">*</span>
//                         </label>
//                         <input
//                           type="text"
//                           value={ghlConfig.ghlApiKey}
//                           onChange={(e) =>
//                             setGhlConfig((prev) => ({
//                               ...prev,
//                               ghlApiKey: e.target.value,
//                             }))
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           placeholder="Enter your GHL API key"
//                         />
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Calendar ID <span className="text-red-500">*</span>
//                         </label>
//                         <input
//                           type="text"
//                           value={ghlConfig.ghlCalendarId}
//                           onChange={(e) =>
//                             setGhlConfig((prev) => ({
//                               ...prev,
//                               ghlCalendarId: e.target.value,
//                             }))
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           placeholder="Enter GHL calendar ID"
//                         />
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Location ID <span className="text-red-500">*</span>
//                         </label>
//                         <input
//                           type="text"
//                           value={ghlConfig.ghlLocationId}
//                           onChange={(e) =>
//                             setGhlConfig((prev) => ({
//                               ...prev,
//                               ghlLocationId: e.target.value,
//                             }))
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           placeholder="Enter GHL location ID"
//                         />
//                       </div>

//                       <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
//                         <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
//                           {selectedToolDetails
//                             ? "API Schema (Auto-configured)"
//                             : "Required Parameters (Auto-configured)"}
//                         </h3>
//                         {selectedToolDetails?.api_schema && (
//                           <>
//                             <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
//                               <strong>Endpoint:</strong>{" "}
//                               {selectedToolDetails.api_schema?.url || "N/A"}
//                             </div>
//                             <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
//                               <strong>Method:</strong>{" "}
//                               {selectedToolDetails.api_schema?.method || "N/A"}
//                             </div>
//                             <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
//                               <strong>Required Parameters:</strong>
//                             </div>
//                           </>
//                         )}
//                         <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100 overflow-x-auto">
//                           {`{
//   "startTime": "2025-08-23T03:30:00+10:00",
//   "endTime": "2025-08-23T04:30:00+10:00",
//   "title": "Consulation Call",
//   "timezone": "America/New_York",
//   "contactInfo": {
//     "phone": "+15551234567"
//   }
// }`}
//                         </pre>
//                       </div>
//                     </div>
//                   )}

//                   {/* Cal.com Tool Configuration */}
//                   {(isCalTool || selectedToolDetails?.name === "CALCOM") && (
//                     <div className="space-y-4">
//                       <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
//                         <p className="text-sm text-blue-800 dark:text-blue-200">
//                           {isCalTool
//                             ? "Create a Cal.com booking tool with automatic schema configuration."
//                             : "Cal.com Booking Tool Configuration"}
//                         </p>
//                       </div>

//                       {/* Show tool name and description for existing Cal.com tools */}
//                       {selectedToolDetails && (
//                         <>
//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Tool Name
//                             </label>
//                             <input
//                               type="text"
//                               value={selectedToolDetails.name}
//                               onChange={(e) =>
//                                 setSelectedToolDetails((prev) =>
//                                   prev
//                                     ? { ...prev, name: e.target.value }
//                                     : null,
//                                 )
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                             />
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Description
//                             </label>
//                             <textarea
//                               value={selectedToolDetails.description}
//                               onChange={(e) =>
//                                 setSelectedToolDetails((prev) =>
//                                   prev
//                                     ? { ...prev, description: e.target.value }
//                                     : null,
//                                 )
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               rows={3}
//                             />
//                           </div>
//                         </>
//                       )}

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Cal.com API Key{" "}
//                           <span className="text-red-500">*</span>
//                         </label>
//                         <input
//                           type="text"
//                           value={calConfig.calApiKey}
//                           onChange={(e) =>
//                             setCalConfig((prev) => ({
//                               ...prev,
//                               calApiKey: e.target.value,
//                             }))
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           placeholder="Enter your Cal.com API key"
//                         />
//                       </div>

//                       <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
//                         <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
//                           {selectedToolDetails
//                             ? "API Schema (Auto-configured)"
//                             : "Required Parameters (Auto-configured)"}
//                         </h3>
//                         {selectedToolDetails?.api_schema && (
//                           <>
//                             <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
//                               <strong>Endpoint:</strong>{" "}
//                               {selectedToolDetails.api_schema?.url || "N/A"}
//                             </div>
//                             <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
//                               <strong>Method:</strong>{" "}
//                               {selectedToolDetails.api_schema?.method || "N/A"}
//                             </div>
//                             <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
//                               <strong>Required Parameters:</strong>
//                             </div>
//                           </>
//                         )}
//                         <pre className="text-sm font-mono bg-white dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-100 overflow-x-auto">
//                           {`{
//   "start": "2024-08-13T09:00:00Z",
//   "end": "2024-08-13T10:00:00Z",
//   "attendee": {
//     "name": "John Doe",
//     "email": "john.doe@example.com",
//     "timeZone": "America/New_York"
//   }
// }`}
//                         </pre>
//                       </div>
//                     </div>
//                   )}

//                   {/* Non-GHL Existing Tool Details */}
//                   {isExistingTool &&
//                     selectedToolDetails &&
//                     selectedToolDetails.name !== "GHL_BOOKING" &&
//                     selectedToolDetails.name !== "CALCOM" && (
//                       <div className="space-y-4">
//                         <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg">
//                           <p className="text-sm text-blue-800 dark:text-blue-200">
//                             Using existing tool: {selectedToolDetails.name}
//                           </p>
//                         </div>

//                         <div>
//                           <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                             Tool Name
//                           </label>
//                           <input
//                             type="text"
//                             value={selectedToolDetails.name}
//                             onChange={(e) =>
//                               setSelectedToolDetails((prev) =>
//                                 prev ? { ...prev, name: e.target.value } : null,
//                               )
//                             }
//                             className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           />
//                         </div>

//                         <div>
//                           <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                             Description
//                           </label>
//                           <textarea
//                             value={selectedToolDetails.description}
//                             onChange={(e) =>
//                               setSelectedToolDetails((prev) =>
//                                 prev
//                                   ? { ...prev, description: e.target.value }
//                                   : null,
//                               )
//                             }
//                             className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                             rows={3}
//                           />
//                         </div>

//                         {selectedToolDetails.api_schema && (
//                           <div className="space-y-4">
//                             <div>
//                               <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                                 Webhook URL{" "}
//                                 <span className="text-red-500">*</span>
//                               </label>
//                               <input
//                                 type="url"
//                                 value={
//                                   selectedToolDetails.api_schema?.url || ""
//                                 }
//                                 onChange={(e) => {
//                                   const value = e.target.value;
//                                   setSelectedToolDetails((prev) => {
//                                     if (!prev) return prev;
//                                     return {
//                                       ...prev,
//                                       api_schema: {
//                                         ...prev.api_schema,
//                                         url: value,
//                                       },
//                                     };
//                                   });
//                                   setUrlError(validateUrl(value) || "");
//                                 }}
//                                 className={cn(
//                                   "input font-lato font-semibold focus:border-primary dark:focus:border-primary-400",
//                                   urlError &&
//                                     "border-red-500 dark:border-red-500",
//                                 )}
//                                 placeholder="https://your-webhook-url.com"
//                               />
//                               {urlError && (
//                                 <p className="mt-2 text-sm text-red-600 dark:text-red-400">
//                                   {urlError}
//                                 </p>
//                               )}
//                             </div>

//                             <div>
//                               <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                                 Response Timeout (seconds)
//                               </label>
//                               <input
//                                 type="number"
//                                 value={
//                                   selectedToolDetails.response_timeout_secs ||
//                                   20
//                                 }
//                                 onChange={(e) =>
//                                   setSelectedToolDetails((prev) => {
//                                     if (!prev) return prev;
//                                     return {
//                                       ...prev,
//                                       response_timeout_secs:
//                                         parseInt(e.target.value) || 20,
//                                     };
//                                   })
//                                 }
//                                 className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                                 min="1"
//                                 max="120"
//                               />
//                             </div>

//                             <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
//                               <h3 className="text-sm font-lato font-semibold text-gray-900 dark:text-white mb-3">
//                                 Request Body Schema
//                               </h3>
//                               <div className="flex items-center justify-between mb-4">
//                                 <p className="text-sm text-gray-500 dark:text-gray-400">
//                                   Define the structure of the request body in
//                                   JSON format
//                                 </p>
//                                 <button
//                                   onClick={() => setShowSampleModal(true)}
//                                   className="text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-lato font-semibold"
//                                 >
//                                   View Sample Schema
//                                 </button>
//                               </div>
//                               <textarea
//                                 value={JSON.stringify(
//                                   selectedToolDetails.api_schema
//                                     ?.request_body_schema,
//                                   null,
//                                   2,
//                                 )}
//                                 onChange={(e) => {
//                                   try {
//                                     const parsed = JSON.parse(e.target.value);
//                                     setJsonError("");
//                                     setSelectedToolDetails((prev) => {
//                                       if (!prev) return prev;
//                                       return {
//                                         ...prev,
//                                         api_schema: {
//                                           ...prev.api_schema,
//                                           request_body_schema: parsed,
//                                         },
//                                       };
//                                     });
//                                   } catch (err) {
//                                     setJsonError("Invalid JSON format");
//                                   }
//                                 }}
//                                 className={cn(
//                                   "input font-mono text-sm h-[400px] focus:border-primary dark:focus:border-primary-400",
//                                   jsonError &&
//                                     "border-red-500 dark:border-red-500",
//                                 )}
//                                 placeholder="Enter JSON schema..."
//                               />
//                               {jsonError && (
//                                 <p className="mt-2 text-sm text-red-600 dark:text-red-400">
//                                   {jsonError}
//                                 </p>
//                               )}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     )}

//                   {/* Built-in Tool Configuration */}
//                   {isBuiltInTool && builtInToolConfig && (
//                     <div className="space-y-4">
//                       <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg">
//                         <p className="text-sm text-green-800 dark:text-green-200">
//                           This is a built-in system tool with predefined
//                           functionality.
//                         </p>
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Description
//                         </label>
//                         <textarea
//                           value={builtInToolConfig.description}
//                           onChange={(e) =>
//                             setBuiltInToolConfig({
//                               ...builtInToolConfig,
//                               description: e.target.value,
//                             })
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           rows={3}
//                           placeholder="Describe what this tool does"
//                         />
//                       </div>

//                       <div>
//                         <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                           Response Timeout (seconds)
//                         </label>
//                         <input
//                           type="number"
//                           value={builtInToolConfig.response_timeout_secs}
//                           onChange={(e) =>
//                             setBuiltInToolConfig({
//                               ...builtInToolConfig,
//                               response_timeout_secs:
//                                 parseInt(e.target.value) || 20,
//                             })
//                           }
//                           className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                           min="1"
//                           max="120"
//                         />
//                       </div>

//                       {/* Transfer to Agent Configuration */}
//                       {builtInToolConfig.params.system_tool_type === "transfer_to_agent" && (
//                         <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-100">
//                           <h4 className="text-sm font-lato font-semibold text-gray-900 dark:text-white">
//                             Transfer Configuration
//                           </h4>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Target Agent{" "}
//                               <span className="text-red-500">*</span>
//                             </label>
//                             {loadingAgents ? (
//                               <div className="p-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-100 rounded-lg">
//                                 Loading agents...
//                               </div>
//                             ) : (
//                               <select
//                                 value={
//                                   builtInToolConfig.params.transfers?.[0]?.agent_id || ""
//                                 }
//                                 onChange={(e) =>
//                                   setBuiltInToolConfig({
//                                     ...builtInToolConfig,
//                                     params: {
//                                       ...builtInToolConfig.params,
//                                       transfers: [
//                                         {
//                                           ...builtInToolConfig.params.transfers?.[0],
//                                           agent_id: e.target.value,
//                                           condition:
//                                             builtInToolConfig.params.transfers?.[0]?.condition ||
//                                             "",
//                                           delay_ms:
//                                             builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
//                                           transfer_message:
//                                             builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
//                                           enable_transferred_agent_first_message:
//                                             builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
//                                             false,
//                                         },
//                                       ],
//                                     },
//                                   })
//                                 }
//                                 className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               >
//                                 <option value="">Select target agent</option>
//                                 {userAgents
//                                   .filter((agent) => agent.agent_id !== agentId) // Exclude current agent
//                                   .map((agent) => (
//                                     <option
//                                       key={agent.agent_id}
//                                       value={agent.agent_id}
//                                     >
//                                       {agent.name} ({agent.agent_id})
//                                     </option>
//                                   ))}
//                               </select>
//                             )}
//                             {userAgents.length === 0 && !loadingAgents && (
//                               <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
//                                 No other agents available for transfer
//                               </p>
//                             )}
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Transfer Condition{" "}
//                               <span className="text-red-500">*</span>
//                             </label>
//                             <input
//                               type="text"
//                               value={
//                                 builtInToolConfig.params.transfers?.[0]?.condition || ""
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         agent_id:
//                                           builtInToolConfig.params.transfers?.[0]?.agent_id || "",
//                                         condition: e.target.value,
//                                         delay_ms:
//                                           builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
//                                         transfer_message:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
//                                         enable_transferred_agent_first_message:
//                                           builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
//                                           false,
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               placeholder="Enter condition for transfer"
//                             />
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Delay (milliseconds)
//                             </label>
//                             <input
//                               type="number"
//                               value={
//                                 builtInToolConfig.params.transfers?.[0]?.delay_ms || 0
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         agent_id:
//                                           builtInToolConfig.params.transfers?.[0]?.agent_id || "",
//                                         condition:
//                                           builtInToolConfig.params.transfers?.[0]?.condition || "",
//                                         delay_ms:
//                                           parseInt(e.target.value) || 0,
//                                         transfer_message:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
//                                         enable_transferred_agent_first_message:
//                                           builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
//                                           false,
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               min="0"
//                               placeholder="0"
//                             />
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Transfer Message
//                             </label>
//                             <textarea
//                               value={
//                                 builtInToolConfig.params.transfers?.[0]?.transfer_message || ""
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         agent_id:
//                                           builtInToolConfig.params.transfers?.[0]?.agent_id || "",
//                                         condition:
//                                           builtInToolConfig.params.transfers?.[0]?.condition || "",
//                                         delay_ms:
//                                           builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
//                                         transfer_message: e.target.value,
//                                         enable_transferred_agent_first_message:
//                                           builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
//                                           false,
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               rows={3}
//                               placeholder="Optional message to play before transfer"
//                             />
//                           </div>

//                           <div className="flex items-center space-x-3">
//                             <input
//                               type="checkbox"
//                               id="enable_transferred_agent_first_message"
//                               checked={
//                                 builtInToolConfig.params.transfers?.[0]?.enable_transferred_agent_first_message ||
//                                 false
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         agent_id:
//                                           builtInToolConfig.params.transfers?.[0]?.agent_id || "",
//                                         condition:
//                                           builtInToolConfig.params.transfers?.[0]?.condition || "",
//                                         delay_ms:
//                                           builtInToolConfig.params.transfers?.[0]?.delay_ms || 0,
//                                         transfer_message:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_message || "",
//                                         enable_transferred_agent_first_message:
//                                           e.target.checked,
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                             />
//                             <label
//                               htmlFor="enable_transferred_agent_first_message"
//                               className="text-sm font-lato font-semibold text-gray-900 dark:text-white cursor-pointer"
//                             >
//                               Enable transferred agent first message
//                             </label>
//                           </div>
//                         </div>
//                       )}

//                       {/* Transfer to Number Configuration */}
//                       {builtInToolConfig.params.system_tool_type === "transfer_to_number" && (
//                         <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-100">
//                           <h4 className="text-sm font-lato font-semibold text-gray-900 dark:text-white">
//                             Transfer to Number Configuration
//                           </h4>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Transfer Condition{" "}
//                               <span className="text-red-500">*</span>
//                             </label>
//                             <input
//                               type="text"
//                               value={
//                                 builtInToolConfig.params.transfers?.[0]?.condition || ""
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         condition: e.target.value,
//                                         transfer_destination:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_destination || {
//                                             phone_number: "",
//                                             type: "phone",
//                                           },
//                                         transfer_type:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_type ||
//                                           "phone_number",
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               placeholder="e.g., on_busy, on_no_answer"
//                             />
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Phone Number{" "}
//                               <span className="text-red-500">*</span>
//                             </label>
//                             <input
//                               type="text"
//                               value={
//                                 builtInToolConfig.params.transfers?.[0]?.transfer_destination?.phone_number || ""
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         condition:
//                                           builtInToolConfig.params.transfers?.[0]?.condition || "",
//                                         transfer_destination: {
//                                           ...builtInToolConfig.params.transfers?.[0]?.transfer_destination,
//                                           phone_number: e.target.value,
//                                           type: "phone",
//                                         },
//                                         transfer_type:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_type ||
//                                           "phone_number",
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                               placeholder="+1234567890"
//                             />
//                           </div>

//                           <div>
//                             <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                               Transfer Type
//                             </label>
//                             <select
//                               value={
//                                 builtInToolConfig.params.transfers?.[0]?.transfer_type || "phone_number"
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     transfers: [
//                                       {
//                                         ...builtInToolConfig.params.transfers?.[0],
//                                         condition:
//                                           builtInToolConfig.params.transfers?.[0]?.condition || "",
//                                         transfer_destination:
//                                           builtInToolConfig.params.transfers?.[0]?.transfer_destination || {
//                                             phone_number: "",
//                                             type: "phone",
//                                           },
//                                         transfer_type: e.target.value,
//                                       },
//                                     ],
//                                   },
//                                 })
//                               }
//                               className="input font-lato font-semibold focus:border-primary dark:focus:border-primary-400"
//                             >
//                               <option value="phone_number">Phone Number</option>
//                               <option value="conference">Conference</option>
//                               <option value="sip_refer">SIP Refer</option>
//                             </select>
//                           </div>

//                           <div className="flex items-center space-x-3">
//                             <input
//                               type="checkbox"
//                               id="enable_client_message"
//                               checked={
//                                 builtInToolConfig.params.enable_client_message ?? true
//                               }
//                               onChange={(e) =>
//                                 setBuiltInToolConfig({
//                                   ...builtInToolConfig,
//                                   params: {
//                                     ...builtInToolConfig.params,
//                                     enable_client_message: e.target.checked,
//                                   },
//                                 })
//                               }
//                               className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
//                             />
//                             <label
//                               htmlFor="enable_client_message"
//                               className="text-sm font-lato font-semibold text-gray-900 dark:text-white cursor-pointer"
//                             >
//                               Enable client message
//                             </label>
//                           </div>
//                         </div>
//                       )}

//                       {/* Fixed Fields */}
//                       <div className="pt-4 border-t border-gray-200 dark:border-dark-100">
//                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
//                           The following fields are system-defined and cannot be
//                           modified:
//                         </p>

//                         <div className="mb-4">
//                           <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                             Name
//                           </label>
//                           <input
//                             type="text"
//                             value={builtInToolConfig.name}
//                             disabled
//                             className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
//                           />
//                         </div>

//                         <div className="mb-4">
//                           <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                             Type
//                           </label>
//                           <input
//                             type="text"
//                             value={builtInToolConfig.type}
//                             disabled
//                             className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
//                           />
//                         </div>

//                         <div>
//                           <label className="block text-sm font-lato font-semibold text-gray-900 dark:text-white mb-2">
//                             System Tool Type
//                           </label>
//                           <input
//                             type="text"
//                             value={builtInToolConfig.params.system_tool_type}
//                             disabled
//                             className="input font-lato font-semibold disabled:bg-gray-100 dark:disabled:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-60"
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="sticky bottom-0 bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-100 p-4">
//               <div className="flex justify-end space-x-3">
//                 <button
//                   onClick={handleClose}
//                   className="px-4 py-2 text-sm font-lato font-semibold text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleSaveAndClose}
//                   disabled={
//                     loadingToolDetails ||
//                     (isNewTool &&
//                       (!newToolConfig.name.trim() ||
//                         !newToolConfig.description.trim() ||
//                         jsonError ||
//                         nameError ||
//                         urlError)) ||
//                     (isBuiltInTool && !builtInToolConfig) ||
//                     (isBuiltInTool &&
//                       builtInToolConfig?.params.system_tool_type === "transfer_to_agent" &&
//                       (!builtInToolConfig.params.transfers?.[0]?.agent_id?.trim() ||
//                         !builtInToolConfig.params.transfers?.[0]?.condition?.trim())) ||
//                     (isBuiltInTool &&
//                       builtInToolConfig?.params.system_tool_type === "transfer_to_number" &&
//                       (!builtInToolConfig.params.transfers?.[0]?.condition?.trim() ||
//                         !builtInToolConfig.params.transfers?.[0]?.transfer_destination?.phone_number?.trim())) ||
//                     (isGhlTool &&
//                       (!ghlConfig.ghlApiKey ||
//                         !ghlConfig.ghlCalendarId ||
//                         !ghlConfig.ghlLocationId)) ||
//                     (isCalTool && !calConfig.calApiKey) ||
//                     (isExistingTool &&
//                       selectedToolDetails &&
//                       (!selectedToolDetails.api_schema?.url?.trim() ||
//                         urlError ||
//                         jsonError))
//                   }
//                   className={cn(
//                     "px-4 py-2 text-sm font-lato font-semibold text-white bg-primary rounded-lg",
//                     "hover:bg-primary-600 transition-colors",
//                     (loadingToolDetails ||
//                       (isNewTool &&
//                         (!newToolConfig.name.trim() ||
//                           !newToolConfig.description.trim() ||
//                           jsonError ||
//                           nameError ||
//                           urlError)) ||
//                       (isBuiltInTool && !builtInToolConfig) ||
//                       (isBuiltInTool &&
//                         builtInToolConfig?.params.system_tool_type === "transfer_to_agent" &&
//                         (!builtInToolConfig.params.transfers?.[0]?.agent_id?.trim() ||
//                           !builtInToolConfig.params.transfers?.[0]?.condition?.trim())) ||
//                       (isBuiltInTool &&
//                         builtInToolConfig?.params.system_tool_type === "transfer_to_number" &&
//                         (!builtInToolConfig.params.transfers?.[0]?.condition?.trim() ||
//                           !builtInToolConfig.params.transfers?.[0]?.transfer_destination?.phone_number?.trim())) ||
//                       (isGhlTool &&
//                         (!ghlConfig.ghlApiKey ||
//                           !ghlConfig.ghlCalendarId ||
//                           !ghlConfig.ghlLocationId)) ||
//                       (isCalTool && !calConfig.calApiKey)) &&
//                       "opacity-50 cursor-not-allowed",
//                   )}
//                 >
//                   {editingTool ? "Save Changes" : "Add Tool"}
//                 </button>
//               </div>
//             </div>
//           </motion.div>

//           {/* Sample Schema Modal */}
//           <AnimatePresence>
//             {showSampleModal && (
//               <>
//                 <motion.div
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   exit={{ opacity: 0 }}
//                   className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[60]"
//                   onClick={() => setShowSampleModal(false)}
//                 />
//                 <motion.div
//                   initial={{ opacity: 0, scale: 0.95 }}
//                   animate={{ opacity: 1, scale: 1 }}
//                   exit={{ opacity: 0, scale: 0.95 }}
//                   className="fixed inset-0 m-auto w-[600px] h-[500px] bg-white dark:bg-dark-200 rounded-xl shadow-xl z-[70] flex flex-col"
//                 >
//                   <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-100">
//                     <h3 className="text-lg font-lato font-semibold text-gray-900 dark:text-white">
//                       Sample Schema
//                     </h3>
//                     <button
//                       onClick={() => setShowSampleModal(false)}
//                       className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
//                     >
//                       <X className="w-5 h-5" />
//                     </button>
//                   </div>
//                   <div className="flex-1 p-4 overflow-auto">
//                     <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
//                       {JSON.stringify(
//                         {
//                           type: "object",
//                           properties: {
//                             new_time: {
//                               type: "string",
//                               description: "The new time",
//                             },
//                             Laptop: {
//                               type: "object",
//                               properties: {
//                                 Screen_size: {
//                                   type: "string",
//                                   description: "Size of the screen",
//                                 },
//                                 operating_system: {
//                                   type: "string",
//                                   description: "Version of the OS",
//                                 },
//                               },
//                               required: ["Screen_size", "operating_system"],
//                               description: "Brand of the laptop",
//                             },
//                             new_date: {
//                               type: "string",
//                               description: "The new booking date",
//                             },
//                             country_user: {
//                               type: "array",
//                               items: {
//                                 type: "string",
//                                 description: "Interests",
//                               },
//                               description: "User's interests",
//                             },
//                           },
//                           required: [
//                             "new_time",
//                             "Laptop",
//                             "new_date",
//                             "country_user",
//                           ],
//                           description: "Type of parameters from the transcript",
//                         },
//                         null,
//                         2,
//                       )}
//                     </pre>
//                   </div>
//                   <div className="p-4 border-t border-gray-200 dark:border-dark-100">
//                     <button
//                       onClick={() => {
//                         handleJsonChange(
//                           JSON.stringify(
//                             {
//                               type: "object",
//                               properties: {
//                                 new_time: {
//                                   type: "string",
//                                   description: "The new time",
//                                 },
//                                 Laptop: {
//                                   type: "object",
//                                   properties: {
//                                     Screen_size: {
//                                       type: "string",
//                                       description: "Size of the screen",
//                                     },
//                                     operating_system: {
//                                       type: "string",
//                                       description: "Version of the OS",
//                                     },
//                                   },
//                                   required: ["Screen_size", "operating_system"],
//                                   description: "Brand of the laptop",
//                                 },
//                                 new_date: {
//                                   type: "string",
//                                   description: "The new booking date",
//                                 },
//                                 country_user: {
//                                   type: "array",
//                                   items: {
//                                     type: "string",
//                                     description: "Interests",
//                                   },
//                                   description: "User's interests",
//                                 },
//                               },
//                               required: [
//                                 "new_time",
//                                 "Laptop",
//                                 "new_date",
//                                 "country_user",
//                               ],
//                               description:
//                                 "Type of parameters from the transcript",
//                             },
//                             null,
//                             2,
//                           ),
//                         );
//                         setShowSampleModal(false);
//                       }}
//                       className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 font-lato font-semibold transition-colors"
//                     >
//                       Use This Schema
//                     </button>
//                   </div>
//                 </motion.div>
//               </>
//             )}
//           </AnimatePresence>
//         </>
//       )}
//     </AnimatePresence>
//   );
// };