import appointmentTemplate from "./appointment-agent.json";
import hotelTemplate from "./hotel-booking.json";
import insuranceTemplate from "./insurance-agent.json";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  template: Record<string, unknown>;
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "appointment",
    name: "Hospital Appointment Agent",
    description:
      "Triages patients to general physician, cardiology, or dermatology, then books appointments and collects contact details.",
    template: appointmentTemplate as Record<string, unknown>,
  },
  {
    id: "insurance",
    name: "Insurance Lead Sales Agent",
    description:
      "Qualifies leads for health, life, or vehicle insurance and captures contact details for advisor follow-up.",
    template: insuranceTemplate as Record<string, unknown>,
  },
  {
    id: "hotel",
    name: "Hotel Booking Agent",
    description:
      "Routes guests to room booking, modification, or cancellation flows and guides them through each process.",
    template: hotelTemplate as Record<string, unknown>,
  },
];
