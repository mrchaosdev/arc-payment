import { getAddress, type Address } from "viem";
import { recipientError } from "./payments";

export type Contact = { id: string; name: string; address: Address };
export function validateContact(name: string, address: string, contacts: Contact[], id?: string) {
  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  if (!trimmedName || trimmedName.length > 48) throw new Error("Enter a contact name between 1 and 48 characters.");
  const invalid = recipientError(trimmedAddress);
  if (invalid) throw new Error(invalid);
  const canonicalAddress = getAddress(trimmedAddress);
  if (contacts.some(contact => contact.id !== id && contact.address.toLowerCase() === canonicalAddress.toLowerCase()))
    throw new Error("This address is already in your contacts.");
  if (!id && contacts.length >= 100) throw new Error("This browser can save up to 100 contacts. Remove one to add another.");
  return { name: trimmedName, address: canonicalAddress };
}
