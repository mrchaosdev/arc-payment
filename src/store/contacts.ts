"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { validateContact, type Contact } from "@/lib/contacts";

export const useContacts = create<{
  contacts: Contact[];
  save: (name: string, address: string, id?: string) => void;
  remove: (id: string) => void;
}>()(persist((set, get) => ({
  contacts: [],
  save(name, address, id) {
    const contacts = get().contacts;
    if (id && !contacts.some(contact => contact.id === id)) throw new Error("This contact no longer exists. Add it again.");
    const valid = validateContact(name, address, contacts, id);
    const contact = { ...valid, id: id ?? crypto.randomUUID() };
    set({ contacts: id ? contacts.map(item => item.id === id ? contact : item) : [...contacts, contact] });
  },
  remove: id => set(state => ({ contacts: state.contacts.filter(contact => contact.id !== id) })),
}), { name: "sealpay-contacts-v1" }));
