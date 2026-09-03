import { customAlphabet } from "nanoid";

// Excludes visually ambiguous characters (0/O, 1/I/L) for codes people read aloud/type
const nanoid = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 5);

export const generateRoomCode = () => nanoid();