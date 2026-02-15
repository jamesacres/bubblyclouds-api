import { DynamoDBItem, RecordType } from "./types";

export function extractAppFromModelId(modelId: string): string | null {
  const parts = modelId.split("-");
  if (parts.length < 3) {
    return null;
  }
  return parts[1];
}

export function extractAppFromOwner(owner: string): string | null {
  if (!owner.startsWith("party-")) {
    return null;
  }
  const parts = owner.split("-");
  if (parts.length < 3) {
    return null;
  }
  return parts[1];
}

export function extractUserIdFromOwner(owner: string): string | null {
  if (!owner.startsWith("user-")) {
    return null;
  }
  return owner.replace("user-", "");
}

export function getRecordType(modelId: string): RecordType | null {
  if (modelId.startsWith("session-")) {
    return "session";
  }
  if (modelId.startsWith("party-")) {
    return "party";
  }
  if (modelId.startsWith("member-user-")) {
    return "member";
  }
  return null;
}

export function getTimestampField(recordType: RecordType): "updatedAt" | "createdAt" {
  return recordType === "session" ? "updatedAt" : "createdAt";
}

export function extractTimestamp(item: DynamoDBItem): string | null {
  const recordType = getRecordType(item.modelId.S);
  if (!recordType) {
    return null;
  }
  
  const field = getTimestampField(recordType);
  const timestamp = item[field];
  
  return timestamp?.N ?? null;
}

export function matchesPattern(
  modelId: string,
  pattern: "session" | "party" | "member",
): boolean {
  return modelId.startsWith(`${pattern}-`);
}
