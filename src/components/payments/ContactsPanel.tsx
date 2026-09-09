"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useContacts } from "@/store/contacts";
import { useHydrated } from "@/hooks/useHydrated";

export function ContactsPanel() {
  const { contacts, save, remove } = useContacts();
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState<string>();
  const [removing, setRemoving] = useState<string>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const visible = hydrated ? contacts.filter(contact => `${contact.name} ${contact.address}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  function reset() { setName(""); setAddress(""); setEditing(undefined); setError(""); }

  return <div className="contacts-page mx-auto max-w-4xl">
    <h1 className="contacts-title text-3xl font-semibold">Recipient contacts</h1>
    <p className="contacts-description mt-2 text-sm text-[var(--text-muted)]">Save a name and address for your next USDC payment. Contacts stay in this browser.</p>
    <form className="contacts-form mt-6 space-y-4 border border-[var(--border)] bg-[var(--surface)] p-5" onSubmit={event => {
      event.preventDefault(); setError(""); setNotice("");
      try { save(name, address, editing); setNotice(editing ? "Contact updated." : "Contact saved."); reset(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save contact."); }
    }}>
      <h2 className="contacts-form-title text-base font-semibold">{editing ? "Edit contact" : "Add recipient"}</h2>
      <label className="contacts-name-label block text-sm">Name
        <input ref={nameInput} className="contacts-name-input payment-input mt-2" value={name} onChange={event => setName(event.target.value)} maxLength={48} required autoComplete="off" />
      </label>
      <label className="contacts-address-label block text-sm">Wallet address
        <input className="contacts-address-input payment-input mt-2 font-mono text-xs" value={address} onChange={event => setAddress(event.target.value)} required autoComplete="off" spellCheck={false} placeholder="0x..." />
      </label>
      <p className="contacts-address-hint text-xs text-[var(--text-muted)]">Verify this address with the recipient. A saved name does not verify ownership.</p>
      {error && <p role="alert" className="contacts-error text-sm text-[var(--negative)]">{error}</p>}
      <div className="contacts-form-actions flex gap-2">
        <Button className="contacts-save-button" type="submit" disabled={!hydrated}>{editing ? "Save changes" : "Save contact"}</Button>
        {editing && <Button className="contacts-cancel-button" type="button" variant="ghost" onClick={reset}>Cancel edit</Button>}
      </div>
    </form>
    {notice && <p role="status" className="contacts-notice mt-3 text-sm text-[var(--positive)]">{notice}</p>}
    <label className="contacts-search-label mt-6 block text-sm">Search contacts
      <input className="contacts-search-input payment-input mt-2" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or address" />
    </label>
    <ul className="contacts-list mt-4 divide-y divide-[var(--border)] border border-[var(--border)]">
      {visible.map(contact => <li key={contact.id} className="contacts-item p-4">
        <p className="contacts-item-name font-semibold">{contact.name}</p>
        <p className="contacts-item-address mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{contact.address}</p>
        <div className="contacts-item-actions mt-3 flex flex-wrap items-center gap-4 text-xs">
          <Link className="contacts-send-link py-2 text-[var(--action)]" href={{ pathname: "/pay", query: { to: contact.address } }}>Send USDC</Link>
          <button className="contacts-edit-button py-2" type="button" onClick={() => { setEditing(contact.id); setName(contact.name); setAddress(contact.address); setError(""); setNotice(""); nameInput.current?.focus(); }}>Edit</button>
          <button className="contacts-remove-button py-2 text-[var(--negative)]" type="button" onClick={() => setRemoving(contact.id)}>Remove</button>
        </div>
        {removing === contact.id && <div className="contacts-remove-confirmation mt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="contacts-remove-prompt">Remove {contact.name}?</span>
          <button className="contacts-confirm-remove py-2 text-[var(--negative)]" type="button" onClick={() => { remove(contact.id); setRemoving(undefined); if (editing === contact.id) reset(); setNotice("Contact removed."); }}>Confirm removal</button>
          <button className="contacts-cancel-remove py-2" type="button" onClick={() => setRemoving(undefined)}>Keep contact</button>
        </div>}
      </li>)}
    </ul>
    {!visible.length && <p className="contacts-empty py-8 text-center text-sm text-[var(--text-muted)]">{!hydrated ? "Loading contacts…" : contacts.length ? "No matching contacts." : "Add your first recipient above."}</p>}
  </div>;
}
