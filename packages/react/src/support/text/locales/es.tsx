import type { SupportLocaleMessages } from "./keys";

const es: SupportLocaleMessages = {
	"common.actions.askQuestion": "Haznos una pregunta",
	"common.actions.attachFiles": "Adjuntar archivos",
	"common.actions.removeFile": ({ variables }) =>
		`Eliminar ${variables.fileName}`,
	"common.brand.watermark": "Impulsado por",
	"common.fallbacks.aiAssistant": "Asistente de IA",
	"common.fallbacks.cossistant": "Cossistant",
	"common.fallbacks.someone": "Alguien",
	"common.fallbacks.supportTeam": "Soporte",
	"common.fallbacks.unknown": "Desconocido",
	"common.fallbacks.you": "Tú",
	"common.labels.aiAgentIndicator": "Agente IA",
	"common.labels.supportOnline": "Soporte en línea",
	"page.conversationHistory.showMore": ({ variables, utils }) =>
		`+${utils.formatNumber(variables.count)} más`,
	"page.conversationHistory.title": "Historial de conversaciones",
	"page.home.greeting": ({ variables, context, utils }) => {
		const period = utils.timeOfDay();
		const prefixes: Record<typeof period.token, string> = {
			morning: "Buenos días",
			afternoon: "Buenas tardes",
			evening: "Buenas noches",
		};
		const prefix = prefixes[period.token];
		const visitorName =
			variables?.visitorName || context.visitor?.contact?.name;
		return `${prefix}${visitorName ? ` ${visitorName}` : ""}, ¿en qué podemos ayudarte?`;
	},
	"page.home.history.more": ({ variables, utils }) => {
		const count = variables.count;
		const noun = utils.pluralize(count, {
			one: "conversación más",
			other: "conversaciones más",
		});
		return `+ ${utils.formatNumber(count)} ${noun}`;
	},
	"page.home.tagline": ({ variables, context, utils }) => {
		const websiteName = variables?.websiteName || context.website?.name || "";
		return websiteName ? `Soporte ${utils.titleCase(websiteName)}` : "Soporte";
	},
	"component.conversationButtonLink.fallbackTitle": "Conversación sin título",
	"component.conversationButtonLink.lastMessage.agent": ({ variables }) =>
		`${variables.name} - ${variables.time}`,
	"component.conversationButtonLink.lastMessage.visitor": ({ variables }) =>
		`Tú - ${variables.time}`,
	"component.conversationButtonLink.typing": ({ variables }) =>
		`${variables.name} está escribiendo...`,
	"component.conversationButtonLink.status.open": "Abierta",
	"component.conversationButtonLink.status.resolved": "Resuelta",
	"component.conversationButtonLink.status.spam": "Spam",
	"component.conversationEvent.assigned": ({ variables }) =>
		`${variables.actorName} asignó la conversación`,
	"component.conversationEvent.unassigned": ({ variables }) =>
		`${variables.actorName} retiró la asignación de la conversación`,
	"component.conversationEvent.default": ({ variables }) =>
		`${variables.actorName} realizó una acción`,
	"component.conversationEvent.participantJoined": ({ variables }) =>
		`${variables.actorName} se unió a la conversación`,
	"component.conversationEvent.participantLeft": ({ variables }) =>
		`${variables.actorName} salió de la conversación`,
	"component.conversationEvent.participantRequested": ({ variables }) =>
		`${variables.actorName} solicitó unirse`,
	"component.conversationEvent.priorityChanged": ({ variables }) =>
		`${variables.actorName} cambió la prioridad`,
	"component.conversationEvent.reopened": ({ variables }) =>
		`${variables.actorName} reabrió la conversación`,
	"component.conversationEvent.resolved": ({ variables }) =>
		`${variables.actorName} resolvió la conversación`,
	"component.conversationEvent.statusChanged": ({ variables }) =>
		`${variables.actorName} cambió el estado`,
	"component.conversationEvent.tagAdded": ({ variables }) =>
		`${variables.actorName} agregó una etiqueta`,
	"component.conversationEvent.tagRemoved": ({ variables }) =>
		`${variables.actorName} quitó una etiqueta`,
	"component.conversationEvent.visitorBlocked": ({ variables }) =>
		`${variables.actorName} bloqueó al visitante`,
	"component.conversationEvent.visitorUnblocked": ({ variables }) =>
		`${variables.actorName} desbloqueó al visitante`,
	"component.multimodalInput.placeholder": "Escribe tu mensaje...",
	"component.multimodalInput.remove": ({ variables }) =>
		`Eliminar ${variables.fileName}`,
	"component.navigation.articles": "Artículos",
	"component.navigation.home": "Inicio",
	"component.message.timestamp.aiIndicator": "• Agente IA",
};

export default es;
