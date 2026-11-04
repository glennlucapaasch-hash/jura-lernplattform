import { handle, ok } from "@/lib/http";
import { db } from "@/lib/db";
export const GET = handle(async () => ok({ chats: db().prepare("SELECT * FROM chats ORDER BY updated_at DESC LIMIT 100").all() }));
