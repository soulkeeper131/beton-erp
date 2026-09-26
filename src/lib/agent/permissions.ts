// Кои инструменти на агента може да ползва дадена роля.
// Агентът действа от името на потребителя — не може да дава повече права от UI-то.

// Само за админ: потребители, настройки (вкл. API ключове), backup
export const ADMIN_ONLY_TOOLS = new Set([
  "list_users",
  "create_user",
  "update_user",
  "get_settings",
  "update_settings",
  "create_backup",
]);

export function canUseAgent(role: string | undefined): boolean {
  // Бригадирът няма достъп до финансовите модули — и агентът не е за него
  return !!role && role !== "brigadir";
}

export function toolAllowedForRole(tool: string, role: string | undefined): boolean {
  if (!canUseAgent(role)) return false;
  if (role === "admin") return true;
  return !ADMIN_ONLY_TOOLS.has(tool);
}
